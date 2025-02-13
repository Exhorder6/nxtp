import {
  createLoggingContext,
  MetaTxFulfillPayload,
  MetaTxPayload,
  MetaTxTypes,
  NxtpErrorJson,
  RequestContext,
} from "@connext/nxtp-utils";
import { getAddress } from "ethers/lib/utils";

import { getOperations } from "../../lib/operations";
import { getContext } from "../../router";

export const metaTxRequestBinding = async (
  from: string,
  inbox: string,
  data?: MetaTxPayload<any>,
  err?: NxtpErrorJson,
  _requestContext?: RequestContext,
) => {
  const { messaging, logger, config } = getContext();
  const { fulfill } = getOperations();
  const { requestContext, methodContext } = createLoggingContext(
    metaTxRequestBinding.name,
    _requestContext,
    data?.data?.txData.transactionId,
  );
  if (err || !data) {
    logger.error("Error in metatx request", requestContext, methodContext, err, { data });
    return;
  }

  // On every metatx request (i.e. user wants router to fulfill for them)
  // route to metatx handler
  logger.info("Got metatx", requestContext, methodContext, { data });
  const { chainId } = data;

  const chainConfig = config.chainConfig[chainId];
  if (!chainConfig) {
    logger.warn("No config for chainId", requestContext, methodContext, { chainId });
    return;
  }

  if (data.type !== MetaTxTypes.Fulfill) {
    logger.warn("Unhandled metatx type", requestContext, methodContext, { chainConfig, type: data.type });
    return;
  }

  if (getAddress(data.to) !== getAddress(chainConfig.transactionManagerAddress)) {
    logger.warn(
      "Provided transactionManagerAddress does not map to our configured transactionManagerAddress",
      requestContext,
      methodContext,
      { to: data.to, transactionManagerAddress: chainConfig.transactionManagerAddress },
    );
    return;
  }

  const { txData, callData, relayerFee, signature }: MetaTxFulfillPayload = data.data;
  if (chainId !== txData.receivingChainId) {
    logger.warn("Request not sent for receiving chain", requestContext, methodContext, {
      chainId,
      receivingChainId: txData.receivingChainId,
    });
    return;
  }

  logger.info("Handling fulfill request", requestContext, methodContext);
  logger.info("Fulfilling tx", requestContext, methodContext);
  const tx = await fulfill(
    {
      receivingChainTxManagerAddress: txData.receivingChainTxManagerAddress,
      user: txData.user,
      router: txData.router,
      sendingChainId: txData.sendingChainId,
      sendingAssetId: txData.sendingAssetId,
      sendingChainFallback: txData.sendingChainFallback,
      receivingChainId: txData.receivingChainId,
      receivingAssetId: txData.receivingAssetId,
      receivingAddress: txData.receivingAddress,
      callDataHash: txData.callDataHash,
      callTo: txData.callTo,
      transactionId: txData.transactionId,
    },
    {
      amount: txData.amount,
      expiry: txData.expiry,
      preparedBlockNumber: txData.preparedBlockNumber,
      signature,
      relayerFee,
      callData,
      side: "receiver",
    },
    { ...requestContext, transactionId: txData.transactionId },
  );
  if (tx) {
    await messaging.publishMetaTxResponse(from, inbox, { chainId, transactionHash: tx.transactionHash });
  }
  logger.info("Handled fulfill request", requestContext, methodContext);
};
