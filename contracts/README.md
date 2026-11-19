# PayRelay contracts

Solidity + Foundry. EVM target is Shanghai, Aevum Testnet has no Cancun opcodes (see `foundry.toml`).

## Contract: `src/PayRelay.sol`

One contract. For pay-now and scheduled batches there is no custody:
funds stay in the owner's wallet, the owner gives this contract an
allowance, and payments move with `transferFrom`. RelayDrops are the one
exception, a drop locks its total in the contract as escrow because
claims happen later.

- `batchPay(recipients, amounts)` pays a batch now, from the caller.
- `setAgent(agent, perBatchCap, totalCap, validUntil)` gives an agent a
  scoped permission. Caps are stored and enforced onchain.
- `revokeAgent()` removes the permission. Pending schedules stop being
  executable.
- `createBatchSchedule(recipients, amounts, dueTime)` stores a whole batch
  onchain. Caps are checked at creation, so an unpayable schedule is never
  created.
- `executeBatchSchedule(id)` is agent-only. It re-checks due time, expiry
  and caps, then pays. If the owner's balance or allowance is gone, the
  schedule is marked `Failed` with a reason instead of paying partially.
- `cancelSchedule(id)` is owner-only, for pending schedules.
- `createDrop(recipients, amounts, claimDeadline)` locks the batch total
  in the contract as escrow and stores one allocation per listed wallet.
  Duplicate recipients are rejected.
- `claim(id)` pays a listed wallet its amount, once, before the deadline.
- `reclaimUnclaimed(id)` is giver-only, after the deadline, and returns
  whatever was not claimed.
- Views for the app and the runner: `getSchedule`, `scheduleIdsOf`,
  `scheduleCount`, `agentInfo`, `dueScheduleIds`, `getDrop`, `dropIdsOf`,
  `dropCount`, `allocationOf`, `hasClaimed`.

Token: tUSD8 on Aevum Testnet, `0x456569838f1d43009A91ebA4263147Afd7233483`, 6 decimals.

## Test

The suite is dependency-free, it runs with a plain Foundry install:

```bash
cd contracts
forge test
```

27 tests cover batch payment totals and validation, cap rejections at
schedule creation, due-time and agent-only execution, spent tracking,
total-cap enforcement across schedules, cancel and revoke blocking
execution, the clean `Failed` path when the allowance is removed, and
RelayDrops: escrow locking, listed-only claims, no double claim,
duplicate rejection, deadline enforcement, and reclaim of only the
unclaimed remainder.
The token used in tests is `test/MockUSD8.sol`, a test-only stand-in that
is never deployed.

## Deploy (Aevum Testnet)

```bash
cd contracts
forge create src/PayRelay.sol:PayRelay \
  --rpc-url https://rpc-test.qday.info \
  --constructor-args 0x456569838f1d43009A91ebA4263147Afd7233483 \
  --private-key <deployer key>
```

Explorer source verification on explorer-test.qday.info is not working yet
(checked during the challenge). If it is still down at submission time,
this repo is the source of record and that fact is stated honestly in the
submission.
