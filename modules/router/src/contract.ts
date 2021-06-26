import { TransactionManager as TTransactionManager } from "@connext/nxtp-contracts";
import { TransactionService } from "@connext/nxtp-txservice";
import TransactionManagerArtifact from "@connext/nxtp-contracts/artifacts/contracts/TransactionManager.sol/TransactionManager.json";
import { Interface } from "ethers/lib/utils";
import { providers } from "ethers";

export class TransactionManager {
  private readonly txManagerInterface: TTransactionManager["interface"];
  constructor(private readonly txService: TransactionService, private readonly signerAddress: string) {
    this.txManagerInterface = new Interface(TransactionManagerArtifact.abi) as TTransactionManager["interface"];
  }

  getLiquidity() {
    // read onchain
  }

  async addLiquidity(): Promise<providers.TransactionReceipt> {
    // encode and call tx service
    throw new Error("Not implemented");
  }

  async fulfill(): Promise<providers.TransactionReceipt> {
    // encode and call tx service
    throw new Error("Not implemented");
  }

  async cancel(): Promise<providers.TransactionReceipt> {
    // encode and call tx service
    throw new Error("Not implemented");
  }

  async removeLiquidity(): Promise<providers.TransactionReceipt> {
    // encode and call tx service
    throw new Error("Not implemented");
  }
}