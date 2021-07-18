/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { Counter, CounterInterface } from "../Counter";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "count",
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
    inputs: [],
    name: "increment",
    outputs: [],
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
    name: "incrementAndSend",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "value",
        type: "bool",
      },
    ],
    name: "setShouldRevert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "shouldRevert",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x6080604052600060015534801561001557600080fd5b5060008060006101000a81548160ff021916908315150217905550610b468061003f6000396000f3fe60806040526004361061004a5760003560e01c806306661abd1461004f5780636813d7871461007a578063d09de08a146100a3578063d2eee78a146100ba578063d3072d82146100d6575b600080fd5b34801561005b57600080fd5b50610064610101565b6040516100719190610931565b60405180910390f35b34801561008657600080fd5b506100a1600480360381019061009c919061076e565b610107565b005b3480156100af57600080fd5b506100b8610123565b005b6100d460048036038101906100cf919061071f565b61018c565b005b3480156100e257600080fd5b506100eb610249565b6040516100f891906108b6565b60405180910390f35b60015481565b806000806101000a81548160ff02191690831515021790555050565b60008054906101000a900460ff1615610171576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610168906108f1565b60405180910390fd5b6001806000828254610183919061095d565b92505081905550565b6101958361025a565b156101e1578034146101dc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101d3906108d1565b60405180910390fd5b610231565b60003414610224576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161021b90610911565b60405180910390fd5b61023083333084610317565b5b610239610123565b610244838383610431565b505050565b60008054906101000a900460ff1681565b60006102887fe74d3bf5d343e3316beb207a38168ee59d74663e3a3fb0929f61dd5e8f24d6e360001b6104e2565b6102b47fc6447d64bf0c80f184f71c923e77c9cc86f84c25ed2d208b05a862eda4eeea9560001b6104e2565b6102e07f4ee1d7f77d6ba549754071140c254f86be7e035f2c4624c2dcd681660496d9ae60001b6104e2565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16149050919050565b6103437f132fce82aeadbc15925559ecd22a94f1933b41e6502adbccfbf0e15c9801fcc560001b6104e2565b61036f7f54bf021059052ce44f7099d21f1dc8d94aec6404c98a9a1d221567074006482960001b6104e2565b61039b7fec01b70fdf92b01c2f3b73518e649c04855e7367b8c225d32cfb9e09f7abb04e60001b6104e2565b8373ffffffffffffffffffffffffffffffffffffffff166323b872dd8484846040518463ffffffff1660e01b81526004016103d893929190610856565b602060405180830381600087803b1580156103f257600080fd5b505af1158015610406573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061042a9190610797565b5050505050565b61045d7f9c1192522ed404332a2d7d1a80b7ad817f70c1f6a8af221f3c040d59ef4e127160001b6104e2565b6104897f0168ac6c7d2d25350f4bf14b865d18dacaa977c9d8ede32042cedd047edaf25360001b6104e2565b6104b57f895b9ebb1fd8a25e9cd0066a4dcafa3aebc62333246c2461e1a059f88cb54cf860001b6104e2565b6104be8361025a565b6104d2576104cd8383836104e5565b6104dd565b6104dc82826105fc565b5b505050565b50565b6105117fa204dd2175f9bd0af6ff6c41f54dbaad7a8fe0452b52f38c08bad1dad42d23ad60001b6104e2565b61053d7ff798f16718148904f23b4a2c7f042f8be367883d38374c87e0d8fd44a20d825c60001b6104e2565b6105697f1c4667e907fa81165cca71b1910cd3bb16fbb9acc22178d6c37b57ebcc305aa160001b6104e2565b8273ffffffffffffffffffffffffffffffffffffffff1663a9059cbb83836040518363ffffffff1660e01b81526004016105a492919061088d565b602060405180830381600087803b1580156105be57600080fd5b505af11580156105d2573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105f69190610797565b50505050565b6106287fd7351ce214b1feb59e7ef5eb05925a06330c27e57f3e1350dbc336bcc5bba12960001b6104e2565b6106547faeff790d8746aeae5c96cf16007aa1d3c0a3310cfdf0dbf222029f3750f58fbf60001b6104e2565b6106807f7cbbc28866cd9cc6e9fdd8ad3ac8348b4042ed2cd22991fad1352d8bfacbed2e60001b6104e2565b8173ffffffffffffffffffffffffffffffffffffffff166108fc829081150290604051600060405180830381858888f193505050501580156106c6573d6000803e3d6000fd5b505050565b6000813590506106da81610acb565b92915050565b6000813590506106ef81610ae2565b92915050565b60008151905061070481610ae2565b92915050565b60008135905061071981610af9565b92915050565b60008060006060848603121561073457600080fd5b6000610742868287016106cb565b9350506020610753868287016106cb565b92505060406107648682870161070a565b9150509250925092565b60006020828403121561078057600080fd5b600061078e848285016106e0565b91505092915050565b6000602082840312156107a957600080fd5b60006107b7848285016106f5565b91505092915050565b6107c9816109b3565b82525050565b6107d8816109c5565b82525050565b60006107eb60248361094c565b91506107f682610a2a565b604082019050919050565b600061080e601f8361094c565b915061081982610a79565b602082019050919050565b6000610831601e8361094c565b915061083c82610aa2565b602082019050919050565b610850816109f1565b82525050565b600060608201905061086b60008301866107c0565b61087860208301856107c0565b6108856040830184610847565b949350505050565b60006040820190506108a260008301856107c0565b6108af6020830184610847565b9392505050565b60006020820190506108cb60008301846107cf565b92915050565b600060208201905081810360008301526108ea816107de565b9050919050565b6000602082019050818103600083015261090a81610801565b9050919050565b6000602082019050818103600083015261092a81610824565b9050919050565b60006020820190506109466000830184610847565b92915050565b600082825260208201905092915050565b6000610968826109f1565b9150610973836109f1565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156109a8576109a76109fb565b5b828201905092915050565b60006109be826109d1565b9050919050565b60008115159050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b7f696e6372656d656e74416e6453656e643a20494e56414c49445f4554485f414d60008201527f4f554e5400000000000000000000000000000000000000000000000000000000602082015250565b7f696e6372656d656e743a2073686f756c64526576657274206973207472756500600082015250565b7f696e6372656d656e74416e6453656e643a204554485f574954485f4552430000600082015250565b610ad4816109b3565b8114610adf57600080fd5b50565b610aeb816109c5565b8114610af657600080fd5b50565b610b02816109f1565b8114610b0d57600080fd5b5056fea2646970667358221220f5b08aa69d9929be42e06aefd642deb34e90312c452e1eb1adcc8e27ae41b38d64736f6c63430008040033";

export class Counter__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(overrides?: Overrides & { from?: string | Promise<string> }): Promise<Counter> {
    return super.deploy(overrides || {}) as Promise<Counter>;
  }
  getDeployTransaction(overrides?: Overrides & { from?: string | Promise<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): Counter {
    return super.attach(address) as Counter;
  }
  connect(signer: Signer): Counter__factory {
    return super.connect(signer) as Counter__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): CounterInterface {
    return new utils.Interface(_abi) as CounterInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): Counter {
    return new Contract(address, _abi, signerOrProvider) as Counter;
  }
}
