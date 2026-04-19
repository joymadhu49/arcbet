# ArcBet — Daily Crypto Prediction Markets

> Polymarket-style daily (24h) crypto prediction markets, settled in USDC on **Arc Testnet** (Circle's L1 with USDC-as-gas).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | wagmi + viem (MetaMask / injected) |
| Contracts | Solidity 0.8.24, Hardhat 3 |
| Network | **Arc Testnet (Chain ID 5042002)** |
| Settlement | USDC (`0x3600000000000000000000000000000000000000`) |
| Price oracle | CoinGecko public API (no key) |

## ⚠️ Arc Network Specifics

- **Native gas token is USDC** (not ETH!) — your wallet needs USDC for both gas and bets
- **Chain ID:** `5042002`
- **RPC:** `https://rpc.testnet.arc.network`
- **Explorer:** [testnet.arcscan.app](https://testnet.arcscan.app)
- **Faucet:** [faucet.circle.com](https://faucet.circle.com/)

## Setup

### 1. Install
```bash
npm install
```

### 2. Get testnet USDC
Claim USDC on **Arc Testnet** at [faucet.circle.com](https://faucet.circle.com/) to your deployer wallet. ~10 USDC is enough for deploy + gas.

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in: DEPLOYER_PRIVATE_KEY, NEXT_PUBLIC_ADMIN_ADDRESS
```

### 4. Deploy contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network arcTestnet
```

Copy the printed `NEXT_PUBLIC_FACTORY_ADDRESS` and `NEXT_PUBLIC_TREASURY_ADDRESS` into `.env.local`.

### 5. Run the app
```bash
npm run dev
# → http://localhost:3000
```

## Project Structure

```
arcbet/
├── contracts/              # Solidity
│   ├── MarketFactory.sol
│   ├── PredictionMarket.sol
│   └── Treasury.sol
├── scripts/deploy.ts       # Deploys to Arc Testnet
├── src/
│   ├── app/                # Next.js 16 App Router pages
│   │   ├── page.tsx                    # Home / market list with live price ticker
│   │   ├── market/[address]/page.tsx   # Market detail + live price tracking
│   │   ├── portfolio/page.tsx          # User positions + claims
│   │   └── admin/page.tsx              # Gated: create + auto-resolve markets
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── MarketCard.tsx
│   │   ├── BetModal.tsx
│   │   └── Providers.tsx
│   ├── hooks/
│   │   ├── useMarkets.ts
│   │   ├── useBet.ts
│   │   └── useIsAdmin.ts
│   └── lib/
│       ├── chains.ts                   # Arc Testnet chain def
│       ├── wagmi-config.ts             # Arc-only wagmi config
│       ├── coingecko.ts                # Price fetching
│       ├── cryptoMarkets.ts            # Daily market builder + metadata
│       ├── constants.ts                # Verified Arc contract addresses
│       └── utils.ts
```

## Daily Crypto Market Flow

1. **Admin** opens `/admin` (only the wallet in `NEXT_PUBLIC_ADMIN_ADDRESS` sees the link)
2. Clicks **"Launch all 5"** — creates 24h markets for BTC, ETH, SOL, XRP, BNB with target = spot + 2%
3. Users bet YES/NO in USDC (approve + bet in two txs)
4. 24 hours later, admin returns to `/admin` — each market shows live CoinGecko price vs target
5. Admin clicks **"Auto-resolve"** — contract credits winners, 1.5% fee routed to Treasury

Market metadata (coin, startUsd, targetUsd, createdAt) is embedded as a JSON tag in the on-chain `description` field so no contract changes are needed.

## Revenue

- **1.5% fee** on every bet, captured by `PredictionMarket` and forwarded to `Treasury`

## Verified Sources

- Arc Network docs: https://docs.arc.network
- Connect to Arc:  https://docs.arc.network/arc/references/connect-to-arc
- Contract addresses: https://docs.arc.network/arc/references/contract-addresses
- CoinGecko API: https://www.coingecko.com/en/api
