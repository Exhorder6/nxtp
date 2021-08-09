import { BigNumber, providers, Signer, utils, Wallet } from "ethers";
import Sinon, { restore, reset, createStubInstance, SinonStubbedInstance } from "sinon";
import { expect } from "@connext/nxtp-utils/src/expect";
import pino from "pino";

import { ChainRpcProvider } from "../src/provider";
import { ChainConfig, DEFAULT_CONFIG } from "../src/config";
import {
  makeChaiReadable,
  TEST_FULL_TX,
  TEST_READ_TX,
  TEST_SENDER_CHAIN_ID,
  TEST_TX_RECEIPT,
  TEST_TX_RESPONSE,
  DEFAULT_GAS_LIMIT,
} from "./constants";
import { getRandomAddress, getRandomBytes32 } from "@connext/nxtp-utils";
import { TransactionReadError } from "../src/error";

// TODO: main tests:
// - isReady
// - sendTransaction
// - readTransaction
// - getGasPrice
// - getBalance
// - estimateGas

// TODO: Error cases to handle here (i.e. make sure ChainRpcProvider handles correctly):
// - rpc failure
// - provider stops responding
// - no providers are in sync
// - bad data ?

const logger = pino({ level: process.env.LOG_LEVEL ?? "silent", name: "TransactionServiceTest" });

let signer: SinonStubbedInstance<Wallet>;
let chainProvider: ChainRpcProvider;
let coreProvider: SinonStubbedInstance<providers.FallbackProvider>;

describe("ChainRpcProvider", () => {
  beforeEach(async () => {
    signer = createStubInstance(Wallet);
    signer.sendTransaction.resolves(TEST_TX_RESPONSE);
    signer.getTransactionCount.resolves(TEST_TX_RESPONSE.nonce);
    signer.connect.returns(signer);

    const chainId = TEST_SENDER_CHAIN_ID;
    const chainConfig: ChainConfig = {
      providers: [
        {
          url: "https://-------------",
        },
      ],
      confirmations: 1,
      confirmationTimeout: 10_000,
    };
    chainProvider = new ChainRpcProvider(logger, signer, chainId, chainConfig, {
      ...DEFAULT_CONFIG,
      gasInitialBumpPercent: 20,
    });

    coreProvider = createStubInstance(providers.FallbackProvider);
    (chainProvider as any).provider = coreProvider;
    Sinon.stub(coreProvider, "ready").get(() => true);
  });

  afterEach(() => {
    restore();
    reset();
  });

  describe("sendTransaction", () => {
    it("happy: should send the transaction", async () => {
      const result = await chainProvider.sendTransaction(TEST_FULL_TX);

      expect(signer.sendTransaction.callCount).to.equal(1);
      expect(makeChaiReadable(signer.sendTransaction.getCall(0).args[0])).to.deep.equal(
        makeChaiReadable({
          ...TEST_FULL_TX,
          nonce: TEST_TX_RESPONSE.nonce,
        }),
      );
      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? makeChaiReadable(result.value) : null).to.be.deep.eq(makeChaiReadable(TEST_TX_RESPONSE));
    });

    it("should return error result if the signer sendTransaction call throws", async () => {
      const testError = new Error("test error");
      signer.sendTransaction.rejects(testError);

      const result = await chainProvider.sendTransaction(TEST_FULL_TX);

      expect(result.isErr()).to.be.true;
      expect(result.isErr() ? result.error : null).to.be.eq(testError);
    });
  });

  describe("readTransaction", () => {
    it("happy: should read the transaction", async () => {
      const fakeData = getRandomBytes32();
      signer.call.resolves(fakeData);

      const result = await chainProvider.readTransaction(TEST_READ_TX);

      expect(signer.call.callCount).to.equal(1);
      expect(signer.call.getCall(0).args[0]).to.deep.equal(TEST_READ_TX);
      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? result.value : null).to.be.eq(fakeData);
    });

    it("should return error result if the signer readTransaction call throws", async () => {
      const testError = new Error("test error");
      signer.call.rejects(testError);

      const result = await chainProvider.readTransaction(TEST_READ_TX);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        expect(result.error instanceof TransactionReadError).to.be.true;
        expect(result.error.context.error).to.be.eq(testError);
      }
    });
  });

  describe("confirmTransaction", () => {
    it("happy: should confirm the transaction using response argument's wait method", async () => {
      const stub = Sinon.stub();
      stub.resolves(TEST_TX_RECEIPT);
      const testTransaction = {
        ...TEST_TX_RESPONSE,
        wait: stub,
      };

      const result = await chainProvider.confirmTransaction(testTransaction);

      expect(stub.callCount).to.equal(1);
      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? makeChaiReadable(result.value) : null).to.be.deep.eq(makeChaiReadable(TEST_TX_RECEIPT));
    });

    it("should return error result if the transaction wait method throws", async () => {
      const testError = new Error("test error");
      const stub = Sinon.stub();
      stub.rejects(testError);
      const testTransaction = {
        ...TEST_TX_RESPONSE,
        wait: stub,
      };

      const result = await chainProvider.confirmTransaction(testTransaction);

      expect(result.isErr()).to.be.true;
      expect(result.isErr() ? result.error : null).to.be.eq(testError);
    });
  });

  describe("getGasPrice", () => {
    it("happy: should return the gas price", async () => {
      const testGasPrice = utils.parseUnits("100", "gwei") as BigNumber;
      // Gas price gets bumped by X% in this method.
      const expectedGas = testGasPrice
        .add(testGasPrice.mul((chainProvider as any).config.gasInitialBumpPercent).div(100))
        .toString();
      coreProvider.getGasPrice.resolves(testGasPrice);

      const result = await chainProvider.getGasPrice();

      expect(coreProvider.getGasPrice.callCount).to.equal(1);
      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? result.value.toString() : null).to.be.eq(expectedGas);
    });

    it("should use cached gas price if calls < 1 minute apart", async () => {
      const testGasPrice = utils.parseUnits("80", "gwei") as BigNumber;
      const expectedGas = testGasPrice
        .add(testGasPrice.mul((chainProvider as any).config.gasInitialBumpPercent).div(100))
        .toString();
      coreProvider.getGasPrice.resolves(testGasPrice);

      // First call should use provider.
      let result = await chainProvider.getGasPrice();

      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? result.value.toString() : null).to.be.eq(expectedGas);

      // Throwing in a bunk value to make sure this isn't called.
      coreProvider.getGasPrice.resolves(utils.parseUnits("1300", "gwei") as BigNumber);

      // Second call should use cached value.
      result = await chainProvider.getGasPrice();

      // Values should be the same.
      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? result.value.toString() : null).to.be.eq(expectedGas);
      // Provider should have only been called once.
      expect(coreProvider.getGasPrice.callCount).to.equal(1);
    });

    it("should bump gas price up to minimum if it is below that", async () => {
      // For test reliability, start from the config value and work backwards.
      const expectedGas = (chainProvider as any).config.gasMinimum;
      const testGasPrice = BigNumber.from(expectedGas)
        .sub(
          BigNumber.from(expectedGas)
            .mul((chainProvider as any).config.gasInitialBumpPercent)
            .div(100),
        )
        .sub(utils.parseUnits("1", "gwei") as BigNumber);
      coreProvider.getGasPrice.resolves(testGasPrice);

      const result = await chainProvider.getGasPrice();

      expect(result.isOk()).to.be.true;
      expect(result.isOk() ? result.value.toString() : null).to.be.eq(expectedGas);
    });
  });

  describe("getBalance", () => {
    it("happy: should return the balance", async () => {
      const testBalance = utils.parseUnits("42", "ether");
      const testAddress = getRandomAddress();
      coreProvider.getBalance.resolves(testBalance);

      const result = await chainProvider.getBalance(testAddress);

      expect(result.isOk()).to.be.true;
      expect(result.isOk() && result.value.eq(testBalance)).to.be.true;
      expect(coreProvider.getBalance.callCount).to.equal(1);
      expect(coreProvider.getBalance.getCall(0).args[0]).to.deep.eq(testAddress);
    });
  });

  describe("estimateGas", () => {
    it("should return the gas estimate", async () => {
      const rawCommand = "estimateGas";
      const rpcCommand = `eth_${rawCommand}`;
      const testGasLimit = DEFAULT_GAS_LIMIT;
      const testTx = {
        chainId: TEST_SENDER_CHAIN_ID,
        to: getRandomAddress(),
        from: getRandomAddress(),
        data: getRandomBytes32(),
        value: utils.parseUnits("1", "ether"),
      };
      const hexlifiedTx = {
        chainId: utils.hexlify(TEST_SENDER_CHAIN_ID),
        to: utils.hexlify(testTx.to),
        from: utils.hexlify(testTx.from),
        data: utils.hexlify(testTx.data),
        value: utils.hexlify(testTx.value),
      };
      const prepareResult: [string, any[]] = [rpcCommand, [hexlifiedTx]];
      // Overwrite the _providers core providers. We're going to have one "bad" provider
      // that rejects/fails, and one good one that will resolve.
      const badRpcProvider = createStubInstance(providers.StaticJsonRpcProvider);
      const goodRpcProvider = createStubInstance(providers.StaticJsonRpcProvider);
      (chainProvider as any)._providers = [badRpcProvider, goodRpcProvider];
      badRpcProvider.prepareRequest.returns(prepareResult);
      goodRpcProvider.prepareRequest.returns(prepareResult);
      badRpcProvider.send.rejects(new Error("test error"));
      goodRpcProvider.send.resolves(testGasLimit);

      const result = await chainProvider.estimateGas(testTx);

      // First, make sure we get the correct value back.
      expect(result.isOk(), result.isErr() ? result.error.toString() : "unknown").to.be.true;
      expect(result.isOk() && result.value.eq(BigNumber.from(testGasLimit))).to.be.true;

      // Now we make sure that all of the calls were made as expected.
      // prepareRequest:
      const prepareTransactionArg = {
        transaction: makeChaiReadable(testTx),
      };

      expect(badRpcProvider.prepareRequest.callCount).to.equal(1);
      let arg = {
        transaction: makeChaiReadable(badRpcProvider.prepareRequest.getCall(0).args[1].transaction),
      };
      expect(arg).to.deep.eq(prepareTransactionArg);

      expect(goodRpcProvider.prepareRequest.callCount).to.equal(1);
      arg = {
        transaction: makeChaiReadable(goodRpcProvider.prepareRequest.getCall(0).args[1].transaction),
      };
      expect(arg).to.deep.eq(prepareTransactionArg);

      // send:
      const prepareResultReadable = [prepareResult[0], makeChaiReadable(prepareResult[1])];
      expect(badRpcProvider.send.callCount).to.equal(1);
      let args = badRpcProvider.send.getCall(0).args;
      expect([args[0], makeChaiReadable(args[1])]).to.deep.eq(prepareResultReadable);
      expect(goodRpcProvider.send.callCount).to.equal(1);
      args = goodRpcProvider.send.getCall(0).args;
      expect([args[0], makeChaiReadable(args[1])]).to.deep.eq(prepareResultReadable);
    });
  });

  describe("isReady", () => {
    it("should give RpcError if provider network not ready", async () => {
      Sinon.stub(coreProvider, "ready").get(() => false);
    });
  });
});
