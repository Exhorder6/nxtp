import { TransactionService } from "@connext/nxtp-txservice";
import { RouterNxtpNatsMessagingService } from "@connext/nxtp-utils";
import { txReceiptMock, sigMock } from "@connext/nxtp-utils/src/mock";
import { Wallet, BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import pino from "pino";
import { createStubInstance, reset, restore, SinonStubbedInstance, stub } from "sinon";
import { routerAddrMock, activeTransactionMock, singleChainTransactionMock, configMock } from "./utils";
import { Context } from "../src/router";
import { ContractReader } from "../src/adapters/subgraph";
import { ContractWriter } from "../src/adapters/contract";
import * as RouterFns from "../src/router";

export let txServiceMock: SinonStubbedInstance<TransactionService>;
export let messagingMock: SinonStubbedInstance<RouterNxtpNatsMessagingService>;
export let contractReaderMock: ContractReader;
export let contractWriterMock: ContractWriter;
export let ctxMock: Context;

export const mochaHooks = {
  beforeEach() {
    const walletMock = createStubInstance(Wallet);
    (walletMock as any).address = routerAddrMock; // need to do this differently bc the function doesnt exist on the interface
    walletMock.signMessage.resolves(sigMock);

    txServiceMock = createStubInstance(TransactionService);
    txServiceMock.getBalance.resolves(parseEther("1"));
    txServiceMock.sendTx.resolves(txReceiptMock);

    messagingMock = createStubInstance(RouterNxtpNatsMessagingService);

    contractReaderMock = {
      getActiveTransactions: stub().resolves([activeTransactionMock]),
      getAssetBalance: stub().resolves(BigNumber.from("10001")),
      getTransactionForChain: stub().resolves(singleChainTransactionMock),
    };

    contractWriterMock = {
      cancel: stub().resolves(txReceiptMock),
      fulfill: stub().resolves(txReceiptMock),
      prepare: stub().resolves(txReceiptMock),
      removeLiquidity: stub().resolves(txReceiptMock),
    };

    ctxMock = {
      config: configMock,
      contractReader: contractReaderMock,
      contractWriter: contractWriterMock,
      logger: pino({ name: "ctxMock", level: process.env.LOG_LEVEL || "silent" }),
      messaging: messagingMock as unknown as RouterNxtpNatsMessagingService,
      txService: txServiceMock as unknown as TransactionService,
      wallet: walletMock,
    };

    stub(RouterFns, "getContext").returns(ctxMock);
  },

  afterEach() {
    restore();
    reset();
  },
};
