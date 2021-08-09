import { NxtpError } from "@connext/nxtp-utils";
import axios from "axios";
import { BigNumber, Signer, Wallet, providers } from "ethers";
import { okAsync, ResultAsync } from "neverthrow";
import PriorityQueue from "p-queue";
import { BaseLogger } from "pino";

import { TransactionServiceConfig, validateProviderConfig, ChainConfig } from "./config";
import {
  parseError,
  RpcError,
  TransactionError,
  TransactionReadError,
  TransactionReverted,
  TransactionServiceFailure,
  UnpredictableGasLimit,
} from "./error";
import { FullTransaction, CachedGas, ReadTransaction } from "./types";

const { StaticJsonRpcProvider, FallbackProvider } = providers;

const HARDCODED_GAS_PRICE: Record<number, string> = {
  69: "15000000", // optimism
};

// TODO: Manage the security of our transactions in the event of a reorg. Possibly raise quorum value,
// implement a lookback, etc.

/**
 * @classdesc A transaction service provider wrapper that handles the connections to remote providers and parses
 * the responses.
 */
export class ChainRpcProvider {
  // Saving the list of underlying JsonRpcProviders used in FallbackProvider for the event
  // where we need to do a send() call directly on each one (Fallback doesn't raise that interface).
  private readonly _providers: providers.JsonRpcProvider[];
  private readonly provider: providers.FallbackProvider;
  private readonly signer: Signer;
  private readonly queue: PriorityQueue = new PriorityQueue({ concurrency: 1 });
  private readonly quorum: number;
  private cachedGas?: CachedGas;

  public readonly confirmationsRequired: number;
  public readonly confirmationTimeout: number;

  // The current nonce of the signer is tracked locally here. It will be used for comparison
  // to the nonce we get back from the pending transaction count call to our providers.
  // NOTE: Should not be accessed outside of the helper methods, getNonce and incrementNonce.
  private _nonce = 0;

  /**
   * A class for managing the usage of an ethers FallbackProvider, and for wrapping calls in
   * retries. Will ensure provider(s) are ready before any use case.
   *
   * @param logger pino.BaseLogger used for logging.
   * @param signer Signer instance or private key used for signing transactions.
   * @param chainId The ID of the chain for which this class's providers will be servicing.
   * @param chainConfig Configuration for this specified chain, including the providers we'll
   * be using for it.
   * @param config The shared TransactionServiceConfig with general configuration.
   *
   * @throws ChainError.reasons.ProviderNotFound if no valid providers are found in the
   * configuration.
   */
  constructor(
    private readonly logger: BaseLogger,
    signer: string | Signer,
    public readonly chainId: number,
    private readonly chainConfig: ChainConfig,
    private readonly config: TransactionServiceConfig,
  ) {
    this.confirmationsRequired = chainConfig.confirmations ?? config.defaultConfirmationsRequired;
    this.confirmationTimeout = chainConfig.confirmationTimeout ?? config.defaultConfirmationTimeout;
    // TODO: Quorum is set to 1 here, but we may want to reconfigure later. Normally it is half the sum of the weights,
    // which might be okay in our case, but for now we have a low bar.
    // NOTE: This only applies to fallback provider case below.
    this.quorum = 1;

    // Register a provider for each url.
    // Make sure all providers are ready()
    const providerConfigs = chainConfig.providers;
    const filteredConfigs = providerConfigs.filter((config) => {
      const valid = validateProviderConfig(config);
      if (!valid) {
        this.logger.error({ config }, "Configuration was invalid for provider.");
      }
      return valid;
    });
    if (filteredConfigs.length > 0) {
      const hydratedConfigs = filteredConfigs.map((config) => ({
        provider: new StaticJsonRpcProvider(
          {
            url: config.url,
            user: config.user,
            password: config.password,
          },
          this.chainId,
        ),
        priority: config.priority ?? 1,
        weight: config.weight ?? 1,
        stallTimeout: config.stallTimeout,
      }));
      this.provider = new FallbackProvider(hydratedConfigs, this.quorum);
      this._providers = hydratedConfigs.map((p) => p.provider);
    } else {
      // Not enough valid providers were found in configuration.
      // We must throw here, as the router won't be able to support this chain without valid provider configs.
      throw new TransactionServiceFailure(
        `No valid providers were supplied in configuration for chain ${this.chainId}.`,
      );
    }

    // TODO: We may ought to do this instantiation in the txservice constructor.
    this.signer = typeof signer === "string" ? new Wallet(signer, this.provider) : signer.connect(this.provider);
  }

  /**
   * Send the transaction request to the provider.
   * @param tx The full transaction data for the request.
   * @returns An object containing the response or error if an error occurred,
   * and a success boolean indicating whether the process did result in an error.
   */
  public sendTransaction(tx: FullTransaction): ResultAsync<providers.TransactionResponse, TransactionError> {
    // Do any parsing and value handling work here if necessary.
    const transaction = {
      ...tx,
      value: BigNumber.from(tx.value || 0),
    };

    return this.resultWrapper<providers.TransactionResponse>(async () => {
      // Queue up the execution of the transaction.
      const result = await this.queue.add(
        async (): Promise<{ response: providers.TransactionResponse | Error; success: boolean }> => {
          try {
            // NOTE: This call must be serialized within the queue, as it is depenedent on pending transaction count.
            transaction.nonce = transaction.nonce ?? (await this.getNonce());

            // Send the transaction.
            const response = await this.signer.sendTransaction(transaction);

            // Check to see if ethers returned null or undefined for the response; if so, handle as error case.
            if (response == null) {
              throw new TransactionServiceFailure("Ethers returned a null or undefined transaction response.", {
                transaction,
                response,
              });
            }

            // We increment the nonce here, as we know the transaction was sent (response is defined).
            this.incrementNonce();
            return { response, success: true };
          } catch (e) {
            return { response: e, success: false };
          }
        },
      );
      if (result.success) {
        return result.response as providers.TransactionResponse;
      } else {
        throw result.response;
      }
    });
  }

  /**
   * Execute a read transaction using the passed in transaction data, which includes
   * the target contract which we are reading from.
   * @param tx Minimal transaction data needed to read from chain.
   * @returns A string of data read from chain.
   * @throws ChainError.reasons.ContractReadFailure in the event of a failure
   * to read from chain.
   */
  public readTransaction(tx: ReadTransaction): ResultAsync<string, TransactionError> {
    return this.resultWrapper<string>(async () => {
      try {
        return await this.signer.call(tx);
      } catch (error) {
        throw new TransactionReadError(TransactionReadError.reasons.ContractReadError, { error });
      }
    });
  }

  /**
   * Get the receipt for the transaction with the specified hash, optionally blocking
   * until a specified timeout.
   *
   * @param hash The hexadecimal hash string of the transaction.
   * @param confirmations Optional parameter to override the configured number of confirmations
   * required to validate the receipt.
   * @param timeout Optional timeout parameter to override the configured parameter.
   *
   * @returns The ethers TransactionReceipt, if mined, otherwise null.
   *
   */
  public confirmTransaction(
    response: providers.TransactionResponse,
    confirmations?: number,
    timeout?: number,
  ): ResultAsync<providers.TransactionReceipt, TransactionError> {
    return this.resultWrapper<providers.TransactionReceipt>(() => {
      // The only way to access the functionality internal to ethers for handling replacement tx.
      // See issue: https://github.com/ethers-io/ethers.js/issues/1775
      return (response as any).wait(confirmations ?? this.confirmationsRequired, timeout ?? this.confirmationTimeout);
    });
  }

  /**
   * Get the current gas price for the chain for which this instance is servicing.
   * @returns The BigNumber value for the current gas price.
   */
  public getGasPrice(): ResultAsync<BigNumber, TransactionError> {
    const hardcoded = HARDCODED_GAS_PRICE[this.chainId];
    if (hardcoded) {
      this.logger.info({ chainId: this.chainId, hardcoded }, "Using hardcoded gas price for chain");
      return okAsync(BigNumber.from(hardcoded));
    }

    // If it's been less than a minute since we retrieved gas price, send the last update in gas price.
    if (this.cachedGas && Date.now() - this.cachedGas.timestamp < 60000) {
      return okAsync(this.cachedGas.price);
    }

    return this.resultWrapper<BigNumber>(async () => {
      const { gasInitialBumpPercent, gasMinimum } = this.config;
      let gasPrice: BigNumber | undefined = undefined;

      if (this.chainId === 1) {
        try {
          const gasNowResponse = await axios.get(`https://www.gasnow.org/api/v3/gas/price`);
          const { rapid } = gasNowResponse.data;
          gasPrice = typeof rapid !== "undefined" ? BigNumber.from(rapid) : undefined;
        } catch (e) {
          this.logger.warn({ error: e }, "Gasnow failed, using provider");
        }
      }

      if (!gasPrice) {
        try {
          gasPrice = await this.provider.getGasPrice();
        } catch (error) {
          this.logger.error(
            { chainId: this.chainId, error },
            "getGasPrice failure, attempting to default to backup gas value.",
          );
          // Default to initial gas price, if available. Otherwise, throw.
          gasPrice = BigNumber.from(this.chainConfig.defaultInitialGas);
          if (!gasPrice) {
            throw error;
          }
        }
        gasPrice = gasPrice.add(gasPrice.mul(gasInitialBumpPercent).div(100));
      }

      // If the gas price is less than the gas minimum, bump it up to minimum.
      const min = BigNumber.from(gasMinimum);
      if (gasPrice.lt(min)) {
        gasPrice = min;
      }

      // Cache the latest gas price.
      this.cachedGas = { price: gasPrice, timestamp: Date.now() };
      return gasPrice;
    });
  }

  /**
   * Get the current balance for the specified address.
   *
   * @param address The hexadecimal string address whose balance we are getting.
   *
   * @returns A BigNumber representing the current value held by the wallet at the
   * specified address.
   */
  public getBalance(address: string): ResultAsync<BigNumber, TransactionError> {
    return this.resultWrapper<BigNumber>(async () => {
      return await this.provider.getBalance(address);
    });
  }

  /**
   * Estimate gas cost for the specified transaction.
   *
   * @remarks
   *
   * Because estimateGas is almost always our "point of failure" - the point where its
   * indicated by the provider that our tx would fail on chain - and ethers obscures the
   * revert error code when it fails through its typical API, we had to implement our own
   * estimateGas call through RPC directly.
   *
   * @param transaction The ethers TransactionRequest data in question.
   *
   * @returns A BigNumber representing the estimated gas value.
   */
  public estimateGas(transaction: providers.TransactionRequest): ResultAsync<BigNumber, TransactionError> {
    return this.resultWrapper<BigNumber>(async () => {
      const errors: any[] = [];
      // TODO: If quorum > 1, we should make this call to multiple providers.
      for (const provider of this._providers) {
        let result: string;
        try {
          // This call will prepare the transaction params for us (hexlify tx, etc).
          // TODO: Is there any reason prepare should be called for each iteration?
          const args = provider.prepareRequest("estimateGas", { transaction });
          result = await provider.send(args[0], args[1]);
        } catch (error) {
          const sanitizedError = parseError(error);
          // If we get a TransactionReverted error, we can assume that the transaction will fail,
          // and we ought to just throw here.
          if (sanitizedError instanceof TransactionReverted) {
            throw sanitizedError;
          } else {
            errors.push(error);
            continue;
          }
        }

        try {
          return BigNumber.from(result);
        } catch (error) {
          throw new TransactionServiceFailure(TransactionServiceFailure.reasons.GasEstimateInvalid, {
            invalidEstimate: result,
            error: error.message,
          });
        }
      }
      throw new UnpredictableGasLimit({ errors });
    });
  }

  /// HELPERS
  /**
   * The result wrapper used for executing multiple retries for RPC requests to providers.
   * This is to circumvent any issues related to unreliable internet/network issues, whether locally,
   * or externally (for the provider's network).
   *
   * @param method The method callback to execute and wrap in retries.
   */
  private resultWrapper<T>(method: () => Promise<T>): ResultAsync<T, NxtpError> {
    return ResultAsync.fromPromise(
      this.isReady().then(() => {
        // TODO: Reimplement retry ability.
        return method();
      }),
      (error) => {
        // Parse error into TransactionError, etc.
        return parseError(error);
      },
    );
  }

  /**
   * Checks whether our providers are ready for execution. Should be called every time we do any
   * operation in this class.
   */
  private async isReady(): Promise<boolean> {
    const method = this.isReady.name;
    // TODO: Do we need both ready and the check below, or is this redundant?
    // provider.ready returns a Promise which will stall until the network has heen established, ignoring
    // errors due to the target node not being active yet. This will ensure we wait until the node is up
    // and running smoothly.
    const ready = await this.provider.ready;
    if (!ready) {
      // Error out, not enough providers are ready.
      throw new RpcError(RpcError.reasons.OutOfSync, {
        method,
        chainId: this.chainId,
      });
    }
    return true;
  }

  /**
   * Get the current nonce value for our signer.
   *
   * @remarks
   * Caller should still be prepared to get the incorrect nonce back. For instance,
   * if the provider that just handled our sent tx has suddenly gone offline, this
   * method may give the wrong nonce. This can be solved by making additional calls to
   * submit the tx.
   *
   * @returns A number value for the current nonce.
   *
   * @throws RpcError if we fail to get transaction count from all providers.
   */
  private async getNonce(): Promise<number> {
    const pending = await this.signer.getTransactionCount("pending");
    // Update nonce value to greatest of all nonce values retrieved.
    this._nonce = Math.max(pending, this._nonce);
    return this._nonce;
  }

  /**
   * Increment the local nonce for our signer by 1.
   */
  private incrementNonce() {
    this._nonce++;
  }
}
