import { readFileSync } from "fs";

import { providers } from "ethers";

export type ChainConfig = {
  [chainId: number]: {
    confirmations: number;
    providerUrls: string[];
    provider: providers.FallbackProvider;
    transactionManagerAddress?: string;
    subgraph?: string;
  };
};

type Asset = {
  chainId: number;
  assetId: string;
};

type SwapPool = {
  name: string;
  assets: Asset[];
};

type Config = {
  chainConfig: ChainConfig;
  mnemonic: string;
  swapPools: SwapPool[];
  logLevel?: string;
  natsUrl?: string;
  authUrl?: string;
};


// Copy/pasted from json file in the README - this should generally work for local chain load testing.
const DEFAULT_LOCAL_CONFIG = {
  "adminToken": "blahblah",
  "chainConfig": {
    "1337": {
      "providers": ["http://localhost:8545"],
      "confirmations": 1,
      "subgraph": "http://localhost:8010/subgraphs/name/connext/nxtp",
      "transactionManagerAddress": "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0",
    },
    "1338": {
      "providers": ["http://localhost:8546"],
      "confirmations": 1,
      "subgraph": "http://localhost:9010/subgraphs/name/connext/nxtp",
      "transactionManagerAddress": "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0",
    },
  },
  "logLevel": "info",
  "natsUrl": "nats://localhost:4222",
  "authUrl": "http://localhost:5040",
  "mnemonic": "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
  "swapPools": [
    {
      "name": "TEST",
      "assets": [
        { "chainId": 1337, "assetId": "0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da" },
        { "chainId": 1338, "assetId": "0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da" },
      ],
    },
  ],
};

/**
 * Gets and validates the router config from the environment.
 * @param useDefaultLocal - (optional) If true, use the default local config.
 * @returns The router config with sensible defaults
 */
export const getConfig = (useDefaultLocal = false): Config => {
  const path = process.env.NXTP_TEST_CONFIG_FILE ?? "./ops/config/load/config.json";
  const data = useDefaultLocal ? DEFAULT_LOCAL_CONFIG : JSON.parse(readFileSync(path, "utf8"));
  const chainConfig: ChainConfig = {};
  Object.entries(data.chainConfig).map(([chainId, config]) => {
    const { providers: providerUrls, confirmations, ...rest } = config as any;
    chainConfig[parseInt(chainId)] = {
      confirmations,
      providerUrls: providerUrls,
      provider: new providers.FallbackProvider(
        providerUrls.map((url: string) => new providers.JsonRpcProvider(url)),
        1,
      ),
      ...rest,
    };
  });
  return {
    ...data,
    chainConfig,
  };
};

export const config: Config = getConfig();
