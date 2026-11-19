# PayRelay runner (agent)

Small Node + viem script, no framework. Design:

- Polls the PayRelay contract's `dueScheduleIds()` view every 30 to 60
  seconds. It does not scan events, so the Aevum `eth_getLogs` limit of
  1,000 blocks per call does not apply to it.
- For each due schedule it re-reads the schedule onchain, then calls
  `executeBatchSchedule(id)` from the agent wallet (gas in tQDAY).
- The agent key lives only in the runner's `.env`, never in this repo and
  never in the frontend. The key is weak by design: the contract only lets
  it execute due schedules inside the owner's caps. It cannot move funds
  any other way, and the owner can revoke it at any time.
- Double payment is impossible: the contract refuses to execute a schedule
  that is not `Pending`, so a runner restart simply resumes from onchain
  state.
- Retries: 3 attempts with backoff on a failed transaction, then it logs
  the error and moves on. Every poll and execution is logged with time,
  schedule id, and transaction hash or error.

Status: implemented after the contract deploys to Aevum Testnet, together
with the first end-to-end scheduled payment test.
