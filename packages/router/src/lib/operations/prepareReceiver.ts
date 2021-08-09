import { getUuid, RequestContext } from "@connext/nxtp-utils";
import { BigNumber, providers } from "ethers/lib/ethers";

import { getContext } from "../../router";
import { ActiveTransaction } from "../entities";
import { AuctionSignerInvalid, ExpiryInvalid, NotEnoughLiquidity, SenderChainDataInvalid } from "../errors";
import { decodeAuctionBid, getReceiverAmount, getReceiverExpiry, recoverAuctionBid, validExpiry } from "../helpers";

export const receiverPreparing: Map<string, boolean> = new Map();

export const prepareReceiver = async (
  tx: ActiveTransaction,
  requestContext: RequestContext,
): Promise<providers.TransactionReceipt | undefined> => {
  const method = "prepareReceiver";
  const methodId = getUuid();

  const { logger, wallet, contractWriter, contractReader } = getContext();
  logger.info({ method, methodId, tx, requestContext }, "Method start");

  const { crosschainTx, bidSignature, encodedBid, encryptedCallData } = tx;
  const txData = { ...crosschainTx.invariant, ...crosschainTx.sending };

  if (receiverPreparing.get(txData.transactionId)) {
    logger.info({ methodId, method, requestContext, transactionId: txData.transactionId }, "Already preparing");
    return;
  }

  // Validate the prepare data
  const bid = decodeAuctionBid(encodedBid);
  logger.info({ method, methodId, requestContext, bid }, "Decoded bid from event");

  const recovered = recoverAuctionBid(bid, bidSignature);
  if (recovered !== wallet.address) {
    // cancellable error
    throw new AuctionSignerInvalid(wallet.address, recovered, { method, methodId, requestContext });
  }

  if (!BigNumber.from(bid.amount).eq(txData.amount) || bid.transactionId !== txData.transactionId) {
    // cancellable error
    throw new SenderChainDataInvalid({ method, methodId, requestContext });
  }

  const receiverAmount = getReceiverAmount(txData.amount);
  const routerBalance = await contractReader.getAssetBalance(
    crosschainTx.invariant.receivingAssetId,
    crosschainTx.invariant.receivingChainId,
  );
  if (routerBalance.lt(receiverAmount)) {
    throw new NotEnoughLiquidity(crosschainTx.invariant.receivingChainId, { method, methodId, requestContext });
  }

  const receiverExpiry = getReceiverExpiry(txData.expiry);
  if (!validExpiry(receiverExpiry)) {
    // cancellable error
    throw new ExpiryInvalid(receiverExpiry, { method, methodId, requestContext });
  }

  logger.info({ method, methodId, requestContext }, "Validated input");
  receiverPreparing.set(txData.transactionId, true);

  // Next, prepare the outbound data
  // Must have:
  // - Sending and receiving chainId
  // - Sending and receiving assetId
  // - Sender address
  // - Router address
  // - Unique transferId (TODO: do we need this? How should we create this?)
  // - Price and fee quote (TODO: either we can agree upon this upfront)
  // - Amount sent by user
  // - Recipient (callTo) and callData

  // amount and expiry need to be modified

  // Then prepare tx object
  // Note tx object must have:
  // - Prepare fn params
  // - Destination chainId
  // - Amount
  // - AssetId
  // encode the data for contract call
  // Send to txService
  logger.info({ method, methodId, requestContext, transactionId: txData.transactionId }, "Sending receiver prepare tx");
  try {
    const receipt = await contractWriter.prepare(
      txData.receivingChainId,
      {
        txData,
        amount: receiverAmount,
        expiry: receiverExpiry,
        bidSignature,
        encodedBid,
        encryptedCallData,
      },
      requestContext,
    );
    logger.info({ method, methodId, transactionId: txData.transactionId }, "Sent receiver prepare tx");
    return receipt;
  } finally {
    receiverPreparing.delete(txData.transactionId);
  }
};
