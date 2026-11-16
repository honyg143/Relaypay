# AevumPay — stablecoin payments for humans and AI agents

> Built for Aevum Builder Challenge #1 (QDay) on DoraHacks.
> Build window: 16 Nov – 11 Dec 2026. All code in this repo was written inside that window.

## Problem

Paying people and AI agents in stablecoins is still clunky: one-off transfers,
no scoped permissions for agents, no automation that pays on schedule without
asking the user to sign again at due time. AevumPay is a focused payment app
on Aevum Testnet that fixes exactly that.

## What it does

- **Pay** — single tUSD8 payment: add recipient, review, sign, done.
- **Bulk Pay** — one signature, many recipients (2–10).
- **CSV Upload** — upload a CSV, validate rows, preview, then pay.
- **Scheduled Payments** — agentic automation: set it once, the agent pays
  itself at due time inside caps you set. No sign-when-due.
- **Agent Pay** — give an AI agent a scoped allowance (per-payment cap +
  total cap), track spend, revoke anytime. Every agent payment is logged
  onchain.
- **Activity** — every payment with explorer links.
- **Review before sign** — totals, per-recipient amounts and sanity checks
  shown before every signature (Intent Firewall style safety step).

## Architecture

```
app (Next.js + wagmi/viem, light premium UI, sidebar navigation)
  Home | Pay | Bulk Pay | CSV Upload | Scheduled Payments | Agent Pay | Activity
contracts (Solidity + Foundry)
  pay / batchPay / setAgent / agentPay / revokeAgent
  createSchedule / executeSchedule / cancelSchedule
runner (small script)
  watches due schedules, calls executeSchedule when due
```

## Network (verified 16 Nov 2026)

| Item | Value |
| --- | --- |
| Chain | Aevum Testnet |
| Chain ID | 44005 (`0xabe5`) |
| RPC | https://rpc-test.qday.info |
| Explorer | https://explorer-test.qday.info (Blockscout) |
| Faucet (gas $QDAY) | https://faucet.qday.info |
| Token | tUSD8 |
| tUSD8 contract | `0x456569838f1d43009A91ebA4263147Afd7233483` |
| tUSD8 decimals | 6 |
| tUSD8 holders (16 Nov) | 193 |

## Tech used

Solidity, Foundry, React (Next.js), wagmi/viem, Tailwind CSS.

## Setup

```bash
# 1. Install dependencies (app)
npm install

# 2. Copy env and fill in the deployed contract address
cp .env.example .env.local

# 3. Run the app
npm run dev
```

Foundry contract setup lives in `contracts/` (from 17 Nov, contract phase).

## Real-world utility

- Merchant payment: pay a merchant in tUSD8 in three clicks.
- Team / freelancer payroll: bulk pay the whole team in one signature.
- Agent workflows: an AI agent pays its own tools and suppliers inside
  caps its owner set, with a full onchain audit trail.

## Submission

- Hackathon: https://dorahacks.io/hackathon/qday
- Prize pool: $1,500 USDT (1st $800 / 2nd $500 / 3rd $200)
- Deadline: 11 Dec 2026, 1:00 PM PKT

## Status

- Day 1 (16 Nov): network + token verified, repo + scaffold set up.
  Contract phase starts 17 Nov.
