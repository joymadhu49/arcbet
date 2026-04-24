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
    // Arc Testnet — Chain ID: 5042002 · Native gas: USDC (not ETH)
    // Primary endpoint resolution order (first non-empty wins):
    //   1. ARC_TESTNET_RPC / NEXT_PUBLIC_ARC_RPC  (explicit override)
    //   2. drpc public endpoint (higher score on chainlist)
    //   3. official Arc testnet RPC (fallback)
    // Hardhat only uses one URL per network — the frontend wagmi config does
    // proper multi-RPC fallback via viem's fallback() transport.
    arcTestnet: {
      type: "http",
      url:
        process.env.ARC_TESTNET_RPC ||
        process.env.NEXT_PUBLIC_ARC_RPC ||
        "https://arc-testnet.drpc.org",
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
