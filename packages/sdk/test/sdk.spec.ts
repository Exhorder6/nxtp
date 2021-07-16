import { delay, mkAddress, UserNxtpNatsMessagingService } from "@connext/nxtp-utils";
import { expect } from "chai";
import { providers, Wallet } from "ethers";
import pino from "pino";
import { createStubInstance, SinonStubbedInstance } from "sinon";

import { CrossChainParams, NxtpSdk } from "../src/sdk";

const logger = pino({ level: process.env.LOG_LEVEL ?? "silent" });

describe("NxtpSdk", () => {
  let sdk: NxtpSdk;
  let messaging: SinonStubbedInstance<UserNxtpNatsMessagingService>;
  beforeEach(() => {
    const chainConfig = {
      1337: createStubInstance(providers.FallbackProvider),
      1338: createStubInstance(providers.FallbackProvider),
    };
    const signer = createStubInstance(Wallet);
    signer.getAddress.resolves(mkAddress("0xaaa"));
    messaging = createStubInstance(UserNxtpNatsMessagingService);
    sdk = new NxtpSdk(
      chainConfig,
      signer,
      logger,
      undefined,
      undefined,
      messaging as unknown as UserNxtpNatsMessagingService,
    );
  });

  describe("#getTransferQuote", () => {
    const crossChainParams: CrossChainParams = {
      sendingChainId: 1337,
      sendingAssetId: mkAddress("0xc"),
      amount: "100",
      receivingChainId: 1338,
      receivingAssetId: mkAddress("0xb"),
      receivingAddress: mkAddress("0xa"),
      expiry: Math.floor(Date.now() / 1000) + 24 * 3600 * 3,
    };

    it.only("happy: should get a transfer quote from a router without callTo and callData", async () => {
      const prom = sdk.getTransferQuote(crossChainParams);
      await delay(1000);
      messaging.subscribeToAuctionResponse.invokeCallback("_INBOX.abc", (data) => {
        console.log(data);
      });
    });
  });
});
