# PayRelay, stablecoin payments for humans and AI agents

> Prepare. Review. Relay.
> Built for Aevum Builder Challenge #1 (QDay) on DoraHacks.
> Build window: 16 Nov to 11 Dec 2026. All code in this repo was written inside that window.

## Problem

Paying people in stablecoins is still one transfer at a time, and paying
through an AI agent today means either handing the agent your keys or
signing again at the exact moment the payment is due. PayRelay fixes both
on Aevum Testnet: build a batch once, then pay it now, or schedule the
whole batch and let an agent pay it at due time inside caps you set.

## What it does

Six pages, nothing else:

- **Dashboard** - tUSD8 balance, network status, upcoming scheduled
  batches, recent activity from contract events, agent permission summary.
- **Bulk Pay** - build a batch by hand (address + amount rows), review, sign once.
- **CSV Upload** - upload a CSV, invalid rows are flagged with reasons,
  clean rows become a batch.
- **AI** - describe a batch in plain words, the AI drafts it, you edit,
  review and sign. The AI never pays and never signs.
- **Scheduled Payments** - put a schedule on a whole batch. At due time
  the agent pays it automatically, no second signature, inside onchain
  caps (per-batch cap, total cap, expiry). Cancel a schedule or revoke
  the agent at any time.
- **RelayDrops** - the reverse of Bulk Pay. The giver locks a total into
  contract escrow for a list of wallets and shares a claim page. Each
  listed wallet claims its own amount, once. Anything unclaimed returns
  to the giver after the claim deadline, so funds are never wasted on
  dead wallets.

Every flow passes a Review screen before any signature: recipients,
amounts, total, and sanity checks (balance, duplicates, new payees, cap
headroom for schedules).

## How scheduling works

1. The owner sets an agent permission onchain: `setAgent` with a
   per-batch cap, a total cap and an expiry. Caps live in the contract,
   not in the runner, so the runner cannot exceed them.
2. The owner creates a batch in the app and schedules it:
   `createBatchSchedule` stores the whole batch onchain. Caps are checked
   at creation, so a schedule that could never execute is never created.
3. A small runner watches `dueScheduleIds()`. When a batch is due, it
   calls `executeBatchSchedule`. The contract re-checks everything, then
   pays from the owner's wallet via allowance. Funds are never in the
   contract's custody.
4. If the owner's balance or allowance is gone at due time, the schedule
   is marked `Failed` with a reason onchain instead of paying partially.

## Architecture

```
contracts/   Solidity + Foundry, EVM Shanghai
  src/PayRelay.sol    batchPay, setAgent, revokeAgent,
                      createBatchSchedule, executeBatchSchedule,
                      cancelSchedule, views for app and runner
  test/               19 Foundry tests, dependency-free (forge test)
runner/      Node + viem poller that executes due schedules (see its README)
app/         React + Vite frontend, wagmi + viem (design per brand kit v1.0)
```

## Network (verified 16 Nov 2026)

| Item | Value |
| --- | --- |
| Chain | Aevum Testnet |
| Chain ID | 44005 (`0xabe5`) |
| RPC | https://rpc-test.qday.info |
| Explorer | https://explorer-test.qday.info (Blockscout) |
| Token | tUSD8, `0x456569838f1d43009A91ebA4263147Afd7233483`, 6 decimals |
| Gas token | tQDAY (testnet) |

Contract address: added here after the testnet deploy.

## Real-world utility

- Freelancer and team payroll: one batch, one signature, or scheduled
  for payday with the agent paying inside caps.
- Merchant and supplier payments: a batch built from a CSV of invoices,
  scheduled for the due date.
- Agent workflows: an AI agent executes due batches inside limits its
  owner set, with a full onchain audit trail and revoke at any time.

## Setup

```bash
# Contracts and tests
cd contracts && forge test

# Frontend (once the app lands in app/)
cd app && npm install && npm run dev
```

## Submission

- Hackathon: https://dorahacks.io/hackathon/qday
- Prize pool: $1,500 USDT (1st $800 / 2nd $500 / 3rd $200)
- Deadline: 11 Dec 2026, 1:00 PM PKT. Our submit target: 9 Dec 2026.

## Status

- Day 1 (16 Nov): network and token verified, repo and scaffold set up.
- 19 Nov: renamed AevumPay to PayRelay, brand kit v1.0 locked, frontend
  design prototype received as the design reference.
- Contract phase: `PayRelay.sol` written, 19 Foundry tests passing.
  RelayDrops functions (escrow drops + claim page) were added to the plan
  on 19 Nov and go into the contract before the testnet deploy, so the
  deployed contract will not need to change. Deploy and runner are next.
