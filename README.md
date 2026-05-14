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
