// Lightweight ops helper: show treasury USDC balance + deployer balance.
// npx hardhat run scripts/check-treasury.ts --network arcTestnet
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [signer] = await ethers.getSigners();

  const FACTORY   = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const TREASURY  = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const USDC      = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  if (!FACTORY || !TREASURY) throw new Error("factory/treasury not in env");

  const usdc = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    USDC,
  );
  const factory = await ethers.getContractAt("MarketFactory", FACTORY);

  const [tb, db, seed, count] = await Promise.all([
    usdc.balanceOf(TREASURY),
    usdc.balanceOf(signer.address),
    factory.defaultSeedLiquidity(),
    factory.getMarketCount(),
  ]);

  const fmt = (x: bigint) => (Number(x) / 1e6).toFixed(2);
  const canDo = seed > 0n ? Number(BigInt(tb) / BigInt(seed)) : 0;

  console.log("Signer   :", signer.address);
  console.log("Factory  :", FACTORY);
  console.log("Treasury :", TREASURY);
  console.log();
  console.log("Markets  :", count.toString(), "created");
  console.log("Seed/mkt :", fmt(seed), "USDC");
  console.log("Treasury :", fmt(tb), "USDC  ->  can seed", canDo, "more markets");
  console.log("Signer   :", fmt(db), "USDC");
}

main().catch((e) => { console.error(e); process.exit(1); });
