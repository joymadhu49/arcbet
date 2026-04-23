// Top up the treasury with AMOUNT_USDC USDC from the deployer.
// npx hardhat run scripts/topup-treasury.ts --network arcTestnet
//
// Override amount: TOPUP_USDC=200 npx hardhat run scripts/topup-treasury.ts --network arcTestnet
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [signer] = await ethers.getSigners();

  const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const USDC     = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  if (!TREASURY) throw new Error("NEXT_PUBLIC_TREASURY_ADDRESS not in env");

  const amountUsdc = Number(process.env.TOPUP_USDC || "100");
  const amount = BigInt(Math.floor(amountUsdc * 1e6));

  const usdc = await ethers.getContractAt(
    [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address) view returns (uint256)",
    ],
    USDC,
  );

  const mine: bigint = await usdc.balanceOf(signer.address);
  if (mine < amount) {
    throw new Error(`Signer has ${(Number(mine)/1e6).toFixed(2)} USDC, need ${amountUsdc} to top up`);
  }

  const before: bigint = await usdc.balanceOf(TREASURY);
  console.log(`Treasury before: ${(Number(before)/1e6).toFixed(2)} USDC`);
  console.log(`Sending ${amountUsdc} USDC -> ${TREASURY}`);

  const tx = await usdc.transfer(TREASURY, amount);
  await tx.wait();

  const after: bigint = await usdc.balanceOf(TREASURY);
  console.log(`Treasury after : ${(Number(after)/1e6).toFixed(2)} USDC (+${(Number(after-before)/1e6).toFixed(2)})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
