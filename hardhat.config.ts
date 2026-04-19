import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Arc Testnet — verified from https://docs.arc.network/arc/references/connect-to-arc
    // Chain ID: 5042002 · Native gas: USDC (not ETH)
    arcTestnet: {
      type: "http",
      url: process.env.ARC_TESTNET_RPC || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [PRIVATE_KEY],
    },
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
