// RelayPay runner (agent).
//
// Polls the RelayPay contract for batch schedules that are due, and
// executes them from the agent wallet. The contract enforces the caps,
// the expiry and the due time onchain, so this runner is never trusted:
// the worst it can do is pay a due schedule early by a few seconds of
// poll drift, and even that is blocked by the onchain due-time check.
//
// Config comes from runner.env (see runner.env.example). The agent key
// lives only there, never in this repo and never in the frontend.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const here = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(here, "runner.log");

// ---------------------------------------------------------------------------
// Tiny .env loader (KEY=VALUE lines), so the runner has no extra dependency.
// ---------------------------------------------------------------------------
function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = { ...loadEnv(join(here, "runner.env")), ...process.env };

const RPC_URL = env.RPC_URL || "https://rpc-test.qday.info";
const CONTRACT_ADDRESS = env.CONTRACT_ADDRESS || "";
const AGENT_PRIVATE_KEY = env.AGENT_PRIVATE_KEY || "";
const POLL_MS = Number(env.POLL_MS || 45000);

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // Logging must never crash the runner.
  }
}

function failConfig(problem) {
  log(`CONFIG ERROR: ${problem}`);
  log("Fill in runner/runner.env (see runner.env.example) and start again.");
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS) || /^0x0+$/.test(CONTRACT_ADDRESS)) {
  failConfig("CONTRACT_ADDRESS is missing or still the zero address. It is set after the testnet deploy.");
}
if (!/^0x[0-9a-fA-F]{64}$/.test(AGENT_PRIVATE_KEY)) {
  failConfig("AGENT_PRIVATE_KEY is missing or not a 32-byte hex key.");
}

// ---------------------------------------------------------------------------
// Chain + clients
// ---------------------------------------------------------------------------
const aevumTestnet = defineChain({
  id: 44005,
  name: "Aevum Testnet",
  nativeCurrency: { name: "tQDAY", symbol: "tQDAY", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Aevum Explorer", url: "https://explorer-test.qday.info" },
  },
});

const account = privateKeyToAccount(AGENT_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: aevumTestnet, transport: http(RPC_URL) });
const walletClient = createWalletClient({
  account,
  chain: aevumTestnet,
  transport: http(RPC_URL),
});

// Minimal ABI: only what the runner calls.
const ABI = [
  {
    type: "function",
    name: "dueScheduleIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getSchedule",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "total", type: "uint256" },
      { name: "dueTime", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "executeBatchSchedule",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
];

const STATUS = ["Pending", "Executed", "Cancelled", "Failed"];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Execute one due schedule, with retries. The contract re-checks everything,
// and a schedule that is no longer Pending simply reverts, which we treat as
// "already handled" rather than an error worth retrying forever.
// ---------------------------------------------------------------------------
async function executeSchedule(id) {
  const schedule = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getSchedule",
    args: [id],
  });
  const status = STATUS[Number(schedule[3])] ?? String(schedule[3]);
  if (status !== "Pending") {
    log(`schedule ${id}: status is ${status}, skipping`);
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "executeBatchSchedule",
        args: [id],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(
        `schedule ${id}: executed, tx ${hash}, block ${receipt.blockNumber}, status ${receipt.status}`,
      );
      return;
    } catch (error) {
      lastError = error;
      log(`schedule ${id}: attempt ${attempt} failed: ${error.shortMessage || error.message}`);
      if (attempt < 3) await sleep(attempt * 5000);
    }
  }
  log(`schedule ${id}: gave up after 3 attempts: ${lastError?.message}`);
}

async function pollOnce() {
  const due = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "dueScheduleIds",
  });
  if (due.length === 0) {
    log("poll: no due schedules");
    return;
  }
  log(`poll: ${due.length} due schedule(s): ${due.join(", ")}`);
  for (const id of due) {
    await executeSchedule(id);
  }
}

async function main() {
  log(
    `runner started: contract ${CONTRACT_ADDRESS}, agent ${account.address}, poll every ${POLL_MS}ms`,
  );
  const balance = await publicClient.getBalance({ address: account.address });
  log(`agent gas balance: ${balance} wei tQDAY`);
  if (balance === 0n) {
    log("WARNING: agent wallet has no tQDAY, executions will fail until it is funded from the faucet.");
  }
  // Poll forever; a failed poll is logged and the loop carries on.
  for (;;) {
    try {
      await pollOnce();
    } catch (error) {
      log(`poll failed: ${error.shortMessage || error.message}`);
    }
    await sleep(POLL_MS);
  }
}

main().catch((error) => {
  log(`fatal: ${error.message}`);
  process.exit(1);
});
