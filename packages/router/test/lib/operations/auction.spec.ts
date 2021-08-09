import { AuctionPayload, createRequestContext, mkAddress, mkBytes32 } from "@connext/nxtp-utils";
import { sigMock } from "@connext/nxtp-utils/src/mock";
import { SinonStub, stub } from "sinon";
import { expect } from "@connext/nxtp-utils/src/expect";

import { newAuction } from "../../../src/lib/operations";
import * as PrepareHelperFns from "../../../src/lib/helpers/prepare";
import * as AuctionHelperFns from "../../../src/lib/helpers/auction";
import { BID_EXPIRY, configMock, MUTATED_AMOUNT, MUTATED_EXPIRY, routerAddrMock } from "../../utils";
import { txServiceMock } from "../../globalTestHook";
import { constants } from "ethers/lib/ethers";

const requestContext = createRequestContext("TEST");

const auctionPayload: AuctionPayload = {
  user: mkAddress("0xa"),
  sendingChainId: 1337,
  sendingAssetId: mkAddress("0xc"),
  amount: "10000",
  receivingChainId: 1338,
  receivingAssetId: mkAddress("0xf"),
  receivingAddress: mkAddress("0xd"),
  expiry: Math.floor(Date.now() / 1000) + 24 * 3600 * 3,
  transactionId: mkBytes32("0xa"),
  encryptedCallData: "0x",
  callDataHash: mkBytes32("0xb"),
  callTo: mkAddress("0xe"),
  dryRun: false,
};

let getReceiverAmountStub: SinonStub;

describe("Auction Operation", () => {
  describe("#newAuction", () => {
    beforeEach(() => {
      getReceiverAmountStub = stub(PrepareHelperFns, "getReceiverAmount").returns(MUTATED_AMOUNT);
      stub(PrepareHelperFns, "getReceiverExpiry").returns(MUTATED_EXPIRY);

      stub(AuctionHelperFns, "getBidExpiry").returns(BID_EXPIRY);
    });

    it("should error if not enough available liquidity for auction", async () => {
      getReceiverAmountStub.returns("10002");
      await expect(newAuction(auctionPayload, requestContext)).to.be.rejectedWith("Not enough liquidity");
    });

    it("should error if no providers for sending chain", async () => {
      await expect(newAuction({ ...auctionPayload, sendingChainId: 1234 }, requestContext)).to.be.rejectedWith(
        "Providers not available",
      );
    });

    it("should error if no providers for receiving chain", async () => {
      await expect(newAuction({ ...auctionPayload, receivingChainId: 1234 }, requestContext)).to.be.rejectedWith(
        "Providers not available",
      );
    });

    it("should error if allowed swap not found", async () => {
      await expect(
        newAuction({ ...auctionPayload, receivingAssetId: mkAddress("0xabccc") }, requestContext),
      ).to.be.rejectedWith("swap not allowed");
    });

    it("should error if sender balance < minGas", async () => {
      txServiceMock.getBalance.resolves(constants.One);
      await expect(newAuction(auctionPayload, requestContext)).to.be.rejectedWith(
        "Not enough gas on sending or receiving chains",
      );
    });

    it("happy: should return auction bid for a valid swap", async () => {
      const bid = await newAuction(auctionPayload, requestContext);
      expect(bid.bid).to.deep.eq({
        user: auctionPayload.user,
        router: routerAddrMock,
        sendingChainId: auctionPayload.sendingChainId,
        sendingAssetId: auctionPayload.sendingAssetId,
        amount: auctionPayload.amount,
        receivingChainId: auctionPayload.receivingChainId,
        receivingAssetId: auctionPayload.receivingAssetId,
        amountReceived: MUTATED_AMOUNT,
        bidExpiry: BID_EXPIRY,
        receivingAddress: auctionPayload.receivingAddress,
        transactionId: auctionPayload.transactionId,
        expiry: auctionPayload.expiry,
        callDataHash: auctionPayload.callDataHash,
        callTo: auctionPayload.callTo,
        encryptedCallData: auctionPayload.encryptedCallData,
        sendingChainTxManagerAddress: configMock.chainConfig[auctionPayload.sendingChainId].transactionManagerAddress,
        receivingChainTxManagerAddress:
          configMock.chainConfig[auctionPayload.receivingChainId].transactionManagerAddress,
      });

      expect(bid.bidSignature).to.eq(sigMock);
    });
  });
});
