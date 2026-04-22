/**
 * Reconfigure an EXISTING MarketFactory + seed treasury + create sample markets.
 * Use this after the initial deploy if the treasury top-up failed or if you
 * want to change the default seed size.
 *
 *   npx hardhat run scripts/bootstrap-markets.ts --network arcTestnet
 *
 * Reads addresses from env (NEXT_PUBLIC_FACTORY_ADDRESS / NEXT_PUBLIC_TREASURY_ADDRESS /
 * NEXT_PUBLIC_USDC_ADDRESS). Safe to re-run — idempotent top-up, markets only
 * re-created if you edit the list below.
 */
import { network } from "hardhat";

const ONE_USDC = 10n ** 6n;
const DEFAULT_SEED_PER_MARKET = 10n * ONE_USDC; // 10 USDC — testnet default
const NUM_SAMPLE_MARKETS = 3;
const TREASURY_TARGET_FLOOR =
  BigInt(NUM_SAMPLE_MARKETS) * DEFAULT_SEED_PER_MARKET * 2n; // 60 USDC

async function main() {
  const { ethers } = await network.connect();
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const FACTORY   = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const TREASURY  = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const USDC      = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

  if (!FACTORY || !TREASURY) {
    throw new Error("Set NEXT_PUBLIC_FACTORY_ADDRESS and NEXT_PUBLIC_TREASURY_ADDRESS in .env.local first.");
  }
  console.log("Factory:", FACTORY);
  console.log("Treasury:", TREASURY);

  const factory = await ethers.getContractAt("MarketFactory", FACTORY);
  const usdc = await ethers.getContractAt(
    [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
    ],
    USDC,
  );

  // ── 1. Set default seed ──
  const currentDefault: bigint = await factory.defaultSeedLiquidity();
  if (currentDefault !== DEFAULT_SEED_PER_MARKET) {
    console.log(`\nTuning default seed: ${(Number(currentDefault) / 1e6).toFixed(2)} → ${(Number(DEFAULT_SEED_PER_MARKET) / 1e6).toFixed(2)} USDC`);
    const tx = await factory.setDefaultSeedLiquidity(DEFAULT_SEED_PER_MARKET);
    await tx.wait();
    console.log("  ✔ Seed default updated");
  } else {
    console.log(`\nDefault seed already ${(Number(currentDefault) / 1e6).toFixed(2)} USDC — no change`);
  }

  // ── 2. Top up treasury ──
  const current: bigint = await usdc.balanceOf(TREASURY);
  console.log(`\nTreasury USDC: ${(Number(current) / 1e6).toFixed(2)} (floor: ${(Number(TREASURY_TARGET_FLOOR) / 1e6).toFixed(2)})`);
  if (current < TREASURY_TARGET_FLOOR) {
    const needed = TREASURY_TARGET_FLOOR - current;
    const signerBal: bigint = await usdc.balanceOf(signer.address);
    console.log(`  Signer USDC: ${(Number(signerBal) / 1e6).toFixed(2)}`);
    if (signerBal < needed) {
      console.warn(`  ⚠ Signer has ${(Number(signerBal) / 1e6).toFixed(2)} USDC, need ${(Number(needed) / 1e6).toFixed(2)}. Claim more at faucet.circle.com, then re-run.`);
      return;
    }
    const tx = await usdc.transfer(TREASURY, needed);
    await tx.wait();
    const after: bigint = await usdc.balanceOf(TREASURY);
    console.log(`  ✔ Treasury now holds ${(Number(after) / 1e6).toFixed(2)} USDC`);
  } else {
    console.log("  ✔ Treasury already funded — skipping top-up");
  }

  // ── 3. Create sample markets (skip if factory already has ≥ NUM_SAMPLE_MARKETS) ──
  const existing: bigint = await factory.getMarketCount();
  console.log(`\nFactory has ${existing} existing markets.`);
  if (existing >= BigInt(NUM_SAMPLE_MARKETS)) {
    console.log("  ✔ Skipping sample-market creation (threshold reached).");
    console.log("\n🎉 Bootstrap complete.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const oneWeek  = now + 7 * 24 * 60 * 60;
  const oneMonth = now + 30 * 24 * 60 * 60;
  const markets = [
    {
      question:       "Will BTC surpass $200,000 by end of 2026?",
      description:    "Resolves YES if Bitcoin trades above $200,000 USD on CoinGecko at any point before Dec 31, 2026.",
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
  ].slice(0, NUM_SAMPLE_MARKETS - Number(existing));

  for (const m of markets) {
    try {
      const tx = await factory.createMarket(
        m.question, m.description, m.category, m.imageUrl, m.resolutionTime,
      );
      const rcpt = await tx.wait();
      console.log(`  ✔ Created: ${m.question.slice(0, 50)}${m.question.length > 50 ? "…" : ""}`);
      // MarketCreated event emits (market, question, category, resolutionTime, seedLiquidity)
      const evt = rcpt?.logs.find((l) =>
        l.topics?.[0] === factory.interface.getEvent("MarketCreated").topicHash
      );
      if (evt) {
        const parsed = factory.interface.parseLog({ topics: evt.topics as string[], data: evt.data });
        console.log(`     address: ${parsed?.args?.market}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✘ Failed "${m.question.slice(0, 40)}…": ${msg}`);
    }
  }

  console.log("\n🎉 Bootstrap complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
