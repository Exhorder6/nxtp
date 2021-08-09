import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const TEST_ROUTERS = [
  "0x9ADA6aa06eF36977569Dc5b38237809c7DF5082a", // live testnet router
  "0x0EC26F03e3dBA9bb5162D28fD5a3378A25f168d1", // rahul test router
  "0xDc150c5Db2cD1d1d8e505F824aBd90aEF887caC6", // ci/shared router
  "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", // local router
];

const SKIP_SETUP = [1, 56, 250, 137];

/**
 * Hardhat task defining the contract deployments for nxtp
 *
 * @param hre Hardhat environment to deploy to
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment): Promise<void> => {
  const chainId = await hre.getChainId();

  let deployer;
  ({ deployer } = await hre.getNamedAccounts());
  if (!deployer) {
    [deployer] = await hre.getUnnamedAccounts();
  }
  console.log("deployer: ", deployer);

  await hre.deployments.deploy("TransactionManager", {
    from: deployer,
    args: [chainId],
    log: true,
  });

  if (!SKIP_SETUP.includes(parseInt(chainId))) {
    console.log("Deploying test token on non-mainnet chain");
    await hre.deployments.deploy("TestERC20", {
      from: deployer,
      log: true,
    });

    console.log("Setting up test routers on chain", chainId);

    for (const router of TEST_ROUTERS) {
      await hre.run("setup-test-router", { router });
    }
  } else {
    console.log("Skipping test setup on chainId: ", chainId);
  }
};
export default func;
