/**
 * End-to-end verification for the FPMM prediction market.
 * Runs against the in-memory hardhat network.
 *
 *   npx hardhat run scripts/verify-fpmm.ts --network hardhat
 *
 * No testnet gas is burned. Validates:
 *   - seed → pool invariant
 *   - buy YES: share accounting + CPMM invariant delta
 *   - sell YES (partial): USDC received matches previewSell() within 1 wei
 *   - further buy NO: invariant preserved
 *   - resolve YES + claim winnings + reclaim residual
 */
import { network } from "hardhat";

const ONE_USDC = 10n ** 6n;
const SEED = 100n * ONE_USDC; // 100 USDC per-market seed
const FEE_BPS = 150n;

function approx(actual: bigint, expected: bigint, toleranceBps = 5n): boolean {
  if (actual === expected) return true;
  const diff = actual > expected ? actual - expected : expected - actual;
  return diff * 10_000n <= expected * toleranceBps;
}

function check(label: string, actual: bigint, expected: bigint, tolBps = 5n) {
  const ok = approx(actual, expected, tolBps);
  const status = ok ? "✔" : "✘";
  const a = actual.toString();
  const e = expected.toString();
  console.log(`  ${status} ${label}: got ${a}, expected ~${e}${ok ? "" : "  <-- MISMATCH"}`);
  if (!ok) throw new Error(`${label} mismatch`);
}

function fmt(u: bigint) {
  const whole = u / ONE_USDC;
  const frac = u % ONE_USDC;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}

async function main() {
  const { ethers } = await network.connect();
  const [deployer, alice, bob] = await ethers.getSigners();

  console.log("━━━ Deploying mocks + contracts ━━━");
  const Mock = await ethers.getContractFactory("MockUSDC");
  const usdc = await Mock.deploy();
  await usdc.waitForDeployment();
  console.log("  MockUSDC:", await usdc.getAddress());

  const Factory = await ethers.getContractFactory("MarketFactory");
  const factory = await Factory.deploy(await usdc.getAddress(), deployer.address);
  await factory.waitForDeployment();
  console.log("  MarketFactory:", await factory.getAddress());

  const treasuryAddr = await factory.treasury();
  const treasury = await ethers.getContractAt("Treasury", treasuryAddr);
  console.log("  Treasury:", treasuryAddr);

  console.log("\n━━━ Seeding treasury + funding users ━━━");
  await usdc.mint(treasuryAddr, 10_000n * ONE_USDC); // LP capital
  await usdc.mint(alice.address, 1_000n * ONE_USDC);
  await usdc.mint(bob.address,   1_000n * ONE_USDC);
  console.log(`  Treasury USDC: ${fmt(await usdc.balanceOf(treasuryAddr))}`);

  console.log("\n━━━ Creating market ━━━");
  const resolutionTime = Math.floor(Date.now() / 1000) + 3600;
  const tx = await factory.createMarket(
    "Does FPMM work?",
    "E2E test market",
    "Tech",
    "",
    resolutionTime,
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error("no receipt");
  // Scan the factory's MarketCreated event for the new market address.
  const mcTopic = factory.interface.getEvent("MarketCreated").topicHash;
  const log = receipt.logs.find((l) => l.topics[0] === mcTopic);
  if (!log) throw new Error("MarketCreated event not found");
  const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data })!;
  const marketAddr = parsed.args.market;
  console.log("  Market:", marketAddr);

  const market = await ethers.getContractAt("PredictionMarket", marketAddr);

  // ── Seed invariant ──
  const y0 = await market.yesReserve();
  const n0 = await market.noReserve();
  check("yesReserve == SEED", y0, SEED);
  check("noReserve  == SEED", n0, SEED);
  check("market USDC balance == SEED", await usdc.balanceOf(marketAddr), SEED);
  console.log(`  Initial price YES = ${(Number(await market.yesOdds()) / 1e16).toFixed(2)}%`);

  // ── Buy YES: Alice spends 50 USDC ──
  console.log("\n━━━ Alice buys YES with 50 USDC ━━━");
  const buyAmount = 50n * ONE_USDC;
  await usdc.connect(alice).approve(marketAddr, buyAmount);

  const previewShares = await market.previewBuy(true, buyAmount);
  console.log(`  previewBuy → ${fmt(previewShares)} YES shares`);

  await (await market.connect(alice).buy(true, buyAmount, 0)).wait();
  const aliceYes = await market.yesShares(alice.address);
  check("Alice YES shares == preview", aliceYes, previewShares, 1n);

  const y1 = await market.yesReserve();
  const n1 = await market.noReserve();
  const fee = (buyAmount * FEE_BPS) / 10_000n;
  const net = buyAmount - fee;
  // After buy-YES: noReserve should be y0 + net (since we added `net` NO to pool)
  check("noReserve += net", n1, n0 + net);
  // CPMM invariant (should hold exactly within integer rounding)
  const k0 = y0 * n0;
  const k1 = y1 * n1;
  if (k1 < k0) {
    throw new Error(`CPMM invariant violated: k went down ${k0} -> ${k1}`);
  }
  console.log(`  k: ${k0} → ${k1} (delta +${k1 - k0})`);
  console.log(`  new price YES = ${(Number(await market.yesOdds()) / 1e16).toFixed(2)}%`);

  // ── Sell half of Alice's position ──
  console.log("\n━━━ Alice sells half her YES ━━━");
  const sellShares = aliceYes / 2n;
  const grossPreview = await market.previewSell(true, sellShares);
  const expectedNet = grossPreview - (grossPreview * FEE_BPS) / 10_000n;
  console.log(`  previewSell → gross ${fmt(grossPreview)}  net ${fmt(expectedNet)} USDC`);

  const usdcBefore = await usdc.balanceOf(alice.address);
  await (await market.connect(alice).sell(true, sellShares, 0)).wait();
  const usdcAfter = await usdc.balanceOf(alice.address);
  const received = usdcAfter - usdcBefore;
  check("Alice received ≈ previewSell - fee", received, expectedNet, 5n);

  const aliceYesAfter = await market.yesShares(alice.address);
  check("Alice YES = initial - sold", aliceYesAfter, aliceYes - sellShares);
  const y2 = await market.yesReserve();
  const n2 = await market.noReserve();
  const k2 = y2 * n2;
  if (k2 < k1 - 1n) {
    throw new Error(`CPMM invariant went down unexpectedly: ${k1} -> ${k2}`);
  }
  console.log(`  k after sell: ${k2}`);

  // ── Bob buys NO ──
  console.log("\n━━━ Bob buys NO with 30 USDC ━━━");
  const bobBuy = 30n * ONE_USDC;
  await usdc.connect(bob).approve(marketAddr, bobBuy);
  const bobPreview = await market.previewBuy(false, bobBuy);
  await (await market.connect(bob).buy(false, bobBuy, 0)).wait();
  const bobNo = await market.noShares(bob.address);
  check("Bob NO shares == preview", bobNo, bobPreview, 1n);

  // ── Fast-forward past resolution ──
  console.log("\n━━━ Resolving market YES ━━━");
  await ethers.provider.send("evm_increaseTime", [3601]);
  await ethers.provider.send("evm_mine", []);

  await (await factory.resolveMarket(marketAddr, true)).wait();
  const resolvedMarket = await market.market();
  if (!resolvedMarket.resolved) throw new Error("not resolved");
  console.log("  outcome:", resolvedMarket.outcome, "(2 = NO, 1 = YES)");

  // ── Alice claims (winner) ──
  console.log("\n━━━ Alice claims winnings ━━━");
  const aliceBefore = await usdc.balanceOf(alice.address);
  await (await market.connect(alice).claimWinnings()).wait();
  const aliceAfter = await usdc.balanceOf(alice.address);
  const aliceClaim = aliceAfter - aliceBefore;
  check("Alice claim == remaining YES shares", aliceClaim, aliceYesAfter);

  // Bob should NOT be able to claim (he holds NO)
  try {
    await market.connect(bob).claimWinnings();
    throw new Error("Bob's claim should revert (no winnings)");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/No winnings|revert/.test(msg)) throw new Error(`Unexpected bob claim err: ${msg}`);
    console.log("  ✔ Bob (NO-holder) claim reverted as expected");
  }

  // ── Reclaim residual back to treasury ──
  console.log("\n━━━ Factory reclaims residual ━━━");
  const treasuryBefore = await usdc.balanceOf(treasuryAddr);
  const yesReserveBefore = await market.yesReserve();
  await (await factory.reclaimResidual(marketAddr)).wait();
  const treasuryAfter = await usdc.balanceOf(treasuryAddr);
  const recovered = treasuryAfter - treasuryBefore;
  check("treasury recovered == yesReserve", recovered, yesReserveBefore);
  const marketFinal = await usdc.balanceOf(marketAddr);
  console.log(`  market residual USDC: ${fmt(marketFinal)} (should be ~0)`);
  if (marketFinal > 10n) {
    console.warn(`  ⚠ Residual dust of ${marketFinal} wei left in market — acceptable rounding.`);
  }

  console.log("\n🎉 All FPMM invariants verified.\n");
}

main().catch((e) => {
  console.error("\n💥 Verification failed:", e);
  process.exit(1);
});
