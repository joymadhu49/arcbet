# Propex

Prediction market protocol and web application built on **Arc Testnet** (Circle's L1 with USDC as the native gas token). Markets are binary (YES/NO), settled in USDC, with a constant-product AMM and a 1.5% protocol fee routed to a treasury.

## Highlights

- Daily 24-hour crypto markets (BTC, ETH, SOL, XRP, BNB) auto-generated against CoinGecko spot.
- Operator dashboard with AI-assisted market creation (OpenRouter) and one-click resolution.
- AMM-priced YES/NO shares; positions claimable on resolution.
- USDC-as-gas friendly: a single token covers gas, liquidity, and payouts.

## Stack

| Layer       | Tech                                                 |
| ----------- | ---------------------------------------------------- |
| Frontend    | Next.js 16 (App Router), React 19, TypeScript        |
| Styling     | Tailwind CSS 4                                       |
| Wallet      | wagmi 2, viem 2, RainbowKit                          |
| Contracts   | Solidity 0.8.24, Hardhat 3, OpenZeppelin             |
| Network     | Arc Testnet (chain id `5042002`)                     |
| Settlement  | USDC (`0x3600000000000000000000000000000000000000`) |
| Price feed  | CoinGecko public API                                 |
| AI assist   | OpenRouter (`anthropic/claude-sonnet-4.5` default)   |

## Arc Testnet

| Property  | Value                                                 |
| --------- | ----------------------------------------------------- |
| Chain ID  | `5042002`                                             |
| RPC       | `https://rpc.testnet.arc.network`                     |
| Explorer  | https://testnet.arcscan.app                            |
| Gas token | USDC (not ETH)                                        |
| Faucet    | https://faucet.circle.com                              |

References: https://docs.arc.network · https://docs.arc.network/arc/references/connect-to-arc · https://docs.arc.network/arc/references/contract-addresses

## Prerequisites

- Node.js 20+
- A wallet funded with Arc Testnet USDC (for deployment gas and seed liquidity)
- WalletConnect Cloud project id — https://cloud.walletconnect.com
- OpenRouter API key (only required for the AI market creator) — https://openrouter.ai/keys

## Quick start

```bash
git clone https://github.com/joymadhu49/arcbet.git
cd arcbet
npm install
cp .env.example .env.local
# fill required values (see "Environment" below)

npx hardhat compile
npx hardhat run scripts/deploy.ts --network arcTestnet
# copy the printed factory + treasury addresses into .env.local

npm run dev
# http://localhost:3000
```

## Environment

All required variables are documented in `.env.example`. Summary:

| Variable                                | Scope   | Purpose                                                         |
| --------------------------------------- | ------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_FACTORY_ADDRESS`           | client  | Deployed `MarketFactory` address                                |
| `NEXT_PUBLIC_TREASURY_ADDRESS`          | client  | Deployed `Treasury` address                                     |
| `NEXT_PUBLIC_USDC_ADDRESS`              | client  | Arc Testnet USDC (preset)                                       |
| `NEXT_PUBLIC_ADMIN_ADDRESS`             | client  | Wallet allowed to see the `/admin` UI                           |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`  | client  | WalletConnect project id                                        |
| `NEXT_PUBLIC_ARC_RPC` / `…_ARC_RPCS`    | client  | Override RPC endpoints (optional)                               |
| `DEPLOYER_PRIVATE_KEY`                  | server  | Hardhat deploy key (never commit)                               |
| `OPENROUTER_API_KEY`                    | server  | AI market creator backend                                       |
| `OPENROUTER_MODEL`                      | server  | Model override (optional)                                       |

On-chain authority is always enforced by `MarketFactory.owner`; `NEXT_PUBLIC_ADMIN_ADDRESS` only gates the admin UI link.

## Scripts

| Command                                                | What it does                                  |
| ------------------------------------------------------ | --------------------------------------------- |
| `npm run dev`                                          | Start Next.js dev server                      |
| `npm run build`                                        | Production build                              |
| `npm run start`                                        | Run production build                          |
| `npm run lint`                                         | ESLint                                        |
| `npx hardhat compile`                                  | Compile Solidity                              |
| `npx hardhat run scripts/deploy.ts --network arcTestnet` | Deploy factory + treasury                   |
| `npx hardhat run scripts/bootstrap-markets.ts --network arcTestnet` | Seed initial markets             |
| `npx hardhat run scripts/check-treasury.ts --network arcTestnet`    | Inspect treasury balance         |
| `npx hardhat run scripts/topup-treasury.ts --network arcTestnet`    | Fund treasury for seeding        |

## Contracts

- `contracts/MarketFactory.sol` — creates markets, owns global parameters, routes fees.
- `contracts/PredictionMarket.sol` — per-market AMM (YES/NO reserves), bet/claim, resolution.
- `contracts/Treasury.sol` — collects protocol fees; `owner` may withdraw.

Resolution is operator-driven for daily crypto markets: the contract is given the final spot price recorded against the target encoded in the market description.

## Application surface

```
src/
├── app/
│   ├── page.tsx                        Markets list
│   ├── market/[address]/page.tsx       Detail + bet flow
│   ├── portfolio/page.tsx              Positions + claim-all
│   ├── leaderboard/page.tsx            Leaderboard
│   ├── admin/page.tsx                  Operator dashboard (gated)
│   ├── docs/                           In-app docs
│   └── api/ai-market/route.ts          OpenRouter proxy
├── components/                         UI + transaction primitives
├── hooks/                              useMarkets, useBet, useIsAdmin
└── lib/                                chains, wagmi config, ABIs, prompts, utils
```

## AI market creator

`POST /api/ai-market` proxies an admin instruction to OpenRouter and returns a typed proposal. The system prompt (in `src/lib/ai.ts`) enforces a JSON schema, injects a per-call style and opener form to keep generated questions varied, and feeds in the existing market list so the model does not paraphrase prior markets. The route retries once if the model violates the opener constraint.

## Fees

- 1.5% fee on every bet, accrued inside the market and forwarded to `Treasury`.
- `Treasury.owner` (the factory owner) can withdraw at any time.

## Security

The contracts have not been independently audited. Use on testnet only. Report sensitive issues privately rather than opening a public issue.

## License

MIT.
