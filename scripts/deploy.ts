// Deploys MarketFactory (+ Treasury via its constructor) to the configured network,
// seeds the treasury with USDC so markets can be created, then spins up sample markets.
//
//   npx hardhat run scripts/deploy.ts --network arcTestnet
//
// Arc Testnet note: native gas token is USDC (not ETH).
// Hardhat 3: ethers comes from `network.connect()`, not `hre.ethers`.
import { network } from "hardhat";

const ONE_USDC = 10n ** 6n;
// Each market pulls `DEFAULT_SEED` USDC from the treasury at creation.
// 10 USDC is a reasonable testnet default — deep enough to preview AMM mechanics,
// small enough to be fundable on a faucet-sourced deployer.
// Mainnet operators will want to raise this via factory.setDefaultSeedLiquidity().
const DEFAULT_SEED_PER_MARKET = 10n * ONE_USDC; // 10 USDC
const NUM_SAMPLE_MARKETS = 3;
// Top up exactly what the sample markets need + 2× buffer for the admin to spin up more later.
const TREASURY_INITIAL_TOP_UP =
  BigInt(NUM_SAMPLE_MARKETS) * DEFAULT_SEED_PER_MARKET * 2n;

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying with:", deployer.address);
  console.log("Native balance:", (Number(balance) / 1e6).toFixed(2), "USDC (Arc native gas)");

  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  console.log("USDC token:", USDC_ADDRESS);

  // ── Deploy MarketFactory (also deploys Treasury internally) ──
  console.log("\nDeploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(USDC_ADDRESS, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("✅ MarketFactory:", factoryAddr);

  const treasuryAddr = await factory.treasury();
  console.log("✅ Treasury:     ", treasuryAddr);

  // ── Tune the default per-market seed to the testnet-friendly value ──
  const currentDefault: bigint = await factory.defaultSeedLiquidity();
  if (currentDefault !== DEFAULT_SEED_PER_MARKET) {
    console.log(`\nSetting default seed: ${(Number(currentDefault) / 1e6).toFixed(2)} → ${(Number(DEFAULT_SEED_PER_MARKET) / 1e6).toFixed(2)} USDC`);
    const tx = await factory.setDefaultSeedLiquidity(DEFAULT_SEED_PER_MARKET);
    await tx.wait();
    console.log("  ✔ factory.setDefaultSeedLiquidity applied");
  }

  // ── Seed the treasury so new markets can be funded ──
  console.log("\nSeeding treasury with LP capital...");
  const usdc = await ethers.getContractAt(
    [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
    ],
    USDC_ADDRESS,
  );
  const currentTreasuryBal: bigint = await usdc.balanceOf(treasuryAddr);
  console.log(`  Current treasury balance: ${(Number(currentTreasuryBal) / 1e6).toFixed(2)} USDC`);

  if (currentTreasuryBal < TREASURY_INITIAL_TOP_UP) {
    const needed = TREASURY_INITIAL_TOP_UP - currentTreasuryBal;
    try {
      const tx = await usdc.transfer(treasuryAddr, needed);
      await tx.wait();
      const after: bigint = await usdc.balanceOf(treasuryAddr);
      console.log(`  ✔ Topped up → treasury now holds ${(Number(after) / 1e6).toFixed(2)} USDC`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ Treasury top-up failed (${msg}). You'll need to send ≥${(Number(needed) / 1e6).toFixed(2)} USDC to ${treasuryAddr} manually before creating markets.`);
    }
  } else {
    console.log("  ✔ Treasury already has enough USDC; skipping top-up.");
  }

  // ── Create sample markets ──
  console.log("\nCreating sample markets...");
  const oneWeek  = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const oneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const markets = [
    {
      question:       "Will BTC surpass $200,000 by end of 2026?",
      description:    "Resolves YES if Bitcoin's price exceeds $200,000 USD on any major exchange before Dec 31, 2026.",
      category:       "Crypto",
      imageUrl:       "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      resolutionTime: oneMonth,
    },
    {
      question:       "Will ETH flip BTC market cap in 2026?",
      description:    "Resolves YES if Ethereum's market cap exceeds Bitcoin's at any point in 2026.",
      category:       "Crypto",
      imageUrl:       "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      resolutionTime: oneMonth,
    },
    {
      question:       "Will Arc Network launch mainnet before Q3 2026?",
      description:    "Resolves YES if Arc Network officially launches its mainnet by July 1, 2026.",
      category:       "Tech",
      imageUrl:       "",
      resolutionTime: oneWeek,
    },
  ].slice(0, NUM_SAMPLE_MARKETS);

  const failures: string[] = [];
  for (const m of markets) {
    try {
      const tx = await factory.createMarket(
        m.question, m.description, m.category, m.imageUrl, m.resolutionTime,
      );
      await tx.wait();
      console.log("  ✔ Created:", m.question.slice(0, 50) + (m.question.length > 50 ? "…" : ""));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("  ✘ Failed:", m.question.slice(0, 50) + "…", "—", msg);
      failures.push(m.question);
    }
  }

  if (failures.length > 0) {
    console.warn(`\n⚠ ${failures.length}/${markets.length} sample markets failed.`);
    console.warn("  Factory is deployed — retry from /admin after topping up the treasury.");
  }

  console.log(`\nSeed per market: ${(Number(DEFAULT_SEED_PER_MARKET) / 1e6).toFixed(2)} USDC (tunable via factory.setDefaultSeedLiquidity)`);

  console.log("\n🚀 Deployment complete!");
  console.log("\nAdd these to your .env.local:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddr}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
