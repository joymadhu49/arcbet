// Hardhat 3 API: ethers is attached to a network connection, not `hre.ethers`.
// https://hardhat.org/hardhat3-alpha/plugins/nomicfoundation-hardhat-ethers
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying with:", deployer.address);
  // On Arc Testnet, "balance" is in USDC (native gas), not ETH — display as USDC
  console.log("USDC balance:", (Number(balance) / 1e6).toFixed(2), "USDC");

  // Arc Testnet native USDC — verified from official Arc docs
  // https://docs.arc.network/arc/references/contract-addresses
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

  // ── Deploy MarketFactory (also deploys Treasury internally) ──
  console.log("\nDeploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(USDC_ADDRESS, deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("✅ MarketFactory:", factoryAddr);

  const treasuryAddr = await factory.treasury();
  console.log("✅ Treasury:     ", treasuryAddr);

  // ── Create sample markets ──
  console.log("\nCreating sample markets...");

  const oneWeek  = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const oneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const markets = [
    {
      question:       "Will BTC surpass $200,000 by end of 2026?",
      description:    "Resolves YES if Bitcoin's price exceeds $200,000 USD on any major exchange before Dec 31, 2026.",
      category:       "Crypto",
      imageUrl:       "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400",
      resolutionTime: oneMonth,
    },
    {
      question:       "Will ETH flip BTC market cap in 2026?",
      description:    "Resolves YES if Ethereum's market cap exceeds Bitcoin's at any point in 2026.",
      category:       "Crypto",
      imageUrl:       "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400",
      resolutionTime: oneMonth,
    },
    {
      question:       "Will Arc Network launch mainnet before Q3 2026?",
      description:    "Resolves YES if Arc Network officially launches its mainnet by July 1, 2026.",
      category:       "Tech",
      imageUrl:       "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400",
      resolutionTime: oneWeek,
    },
  ];

  const failures: string[] = [];
  for (const m of markets) {
    try {
      const tx = await factory.createMarket(
        m.question, m.description, m.category, m.imageUrl, m.resolutionTime
      );
      await tx.wait();
      console.log("  ✔ Created:", m.question.slice(0, 50) + "…");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("  ✘ Failed:", m.question.slice(0, 50) + "…", "—", msg);
      failures.push(m.question);
    }
  }
  if (failures.length > 0) {
    console.warn(`\n⚠ ${failures.length}/${markets.length} sample markets failed. Factory is deployed — you can retry from /admin.`);
  }

  console.log("\n🚀 Deployment complete!");
  console.log("\nAdd these to your .env.local:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddr}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
