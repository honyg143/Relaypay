// RelayPay ABI, generated from contracts/out/RelayPay.sol/RelayPay.json (Foundry artifact).
export const RELAYPAY_ABI = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "token_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "MAX_BATCH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "agentInfo",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "agent",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "perBatchCap",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "totalCap",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "spent",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validUntil",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "allocationOf",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "wallet",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "batchPay",
  "inputs": [
   {
    "name": "recipients",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "amounts",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "outputs": [
   {
    "name": "total",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "cancelSchedule",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claim",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "createBatchSchedule",
  "inputs": [
   {
    "name": "recipients",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "amounts",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "dueTime",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "createDrop",
  "inputs": [
   {
    "name": "recipients",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "amounts",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "claimDeadline",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "dropCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "dropIdsOf",
  "inputs": [
   {
    "name": "giver",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "dueScheduleIds",
  "inputs": [],
  "outputs": [
   {
    "name": "due",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "executeBatchSchedule",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getDrop",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "giver",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "claimedTotal",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "claimDeadline",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "closed",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "recipients",
    "type": "address[]",
    "internalType": "address[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getSchedule",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "dueTime",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "status",
    "type": "uint8",
    "internalType": "enum RelayPay.Status"
   },
   {
    "name": "recipients",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "amounts",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "hasClaimed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "wallet",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "reclaimUnclaimed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "remaining",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "revokeAgent",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "scheduleCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "scheduleIdsOf",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "setAgent",
  "inputs": [
   {
    "name": "agent",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "perBatchCap",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "totalCap",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validUntil",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "token",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IERC20"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "AgentRevoked",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "AgentSet",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "agent",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "perBatchCap",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "totalCap",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "validUntil",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BatchPaid",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "count",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BatchScheduleCancelled",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BatchScheduleExecuted",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "count",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BatchScheduleFailed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "reason",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BatchScheduled",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "owner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "count",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "dueTime",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DropClaimed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "claimer",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DropCreated",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "giver",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "count",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "claimDeadline",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DropReclaimed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "giver",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 }
];

export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
];
