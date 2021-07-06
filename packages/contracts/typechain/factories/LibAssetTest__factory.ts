/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { LibAssetTest, LibAssetTestInterface } from "../LibAssetTest";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "assetId",
        type: "address",
      },
    ],
    name: "getOwnBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "assetId",
        type: "address",
      },
    ],
    name: "isEther",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "assetId",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAsset",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "assetId",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferERC20",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferEther",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610501806100206000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806305b1137b1461005c578063439e2e45146100845780634b93c875146100975780639db5dbe4146100aa578063a7d2fdf6146100bd575b600080fd5b61006f61006a3660046103c3565b6100de565b60405190151581526020015b60405180910390f35b61006f6100923660046103ee565b6100f1565b61006f6100a53660046103a7565b610106565b61006f6100b836600461042e565b61011a565b6100d06100cb3660046103a7565b610127565b60405190815260200161007b565b60006100ea8383610132565b9392505050565b60006100fe8484846101a1565b949350505050565b60006001600160a01b038216155b92915050565b60006100fe8484846101cc565b6000610114826101d9565b6000806000846001600160a01b03168460405160006040518083038185875af1925050503d8060008114610182576040519150601f19603f3d011682016040523d82523d6000602084013e610187565b606091505b5091509150610196828261026d565b506001949350505050565b60006001600160a01b038416156101c2576101bd8484846101cc565b6100fe565b6100fe8383610132565b60006100fe84848461027e565b60006001600160a01b03821615610266576040516370a0823160e01b81523060048201526001600160a01b038316906370a082319060240160206040518083038186803b15801561022957600080fd5b505afa15801561023d573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102619190610462565b610114565b4792915050565b8161027a57805160208201fd5b5050565b6040516001600160a01b0383166024820152604481018290526000906100fe90859060640160408051601f198184030181529190526020810180516001600160e01b031663a9059cbb60e01b1790526000823b6103155760405162461bcd60e51b81526020600482015260116024820152704c696245524332303a204e4f5f434f444560781b604482015260640160405180910390fd5b600080846001600160a01b031684604051610330919061047a565b6000604051808303816000865af19150503d806000811461036d576040519150601f19603f3d011682016040523d82523d6000602084013e610372565b606091505b5091509150610381828261026d565b8051158061039e57508080602001905181019061039e9190610442565b95945050505050565b6000602082840312156103b8578081fd5b81356100ea816104b3565b600080604083850312156103d5578081fd5b82356103e0816104b3565b946020939093013593505050565b600080600060608486031215610402578081fd5b833561040d816104b3565b9250602084013561041d816104b3565b929592945050506040919091013590565b600080600060608486031215610402578283fd5b600060208284031215610453578081fd5b815180151581146100ea578182fd5b600060208284031215610473578081fd5b5051919050565b60008251815b8181101561049a5760208186018101518583015201610480565b818111156104a85782828501525b509190910192915050565b6001600160a01b03811681146104c857600080fd5b5056fea26469706673582212205f1bbe0bd93678f4a9363965ce9ff7e227f8d7866bb0a8cb1e9f3cc65ed8bb9c64736f6c63430008040033";

export class LibAssetTest__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<LibAssetTest> {
    return super.deploy(overrides || {}) as Promise<LibAssetTest>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): LibAssetTest {
    return super.attach(address) as LibAssetTest;
  }
  connect(signer: Signer): LibAssetTest__factory {
    return super.connect(signer) as LibAssetTest__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): LibAssetTestInterface {
    return new utils.Interface(_abi) as LibAssetTestInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): LibAssetTest {
    return new Contract(address, _abi, signerOrProvider) as LibAssetTest;
  }
}