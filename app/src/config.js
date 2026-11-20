import { defineChain } from 'viem';

// Aevum Testnet (QDay), chain ID 44005. Source of truth: ../network.json
export const aevumTestnet = defineChain({
  id: 44005,
  name: 'Aevum Testnet',
  nativeCurrency: { name: 'tQDAY', symbol: 'tQDAY', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-test.qday.info'] },
  },
  blockExplorers: {
    default: { name: 'Aevum Explorer', url: 'https://explorer-test.qday.info' },
  },
  testnet: true,
});

export const CHAIN_ID = 44005;
export const EXPLORER = 'https://explorer-test.qday.info';

// RelayPay contract, deployed 20 Nov 2026 (deploy tx in ../network.json).
export const RELAYPAY_ADDRESS = '0x2E98ceB86D7601FD417D2937D1DcB543C12B7196';

// tUSD8, 6 decimals, EIP-2612 permit + EIP-3009 capable.
export const TUSD8_ADDRESS = '0x456569838f1d43009A91ebA4263147Afd7233483';
export const TOKEN_SYMBOL = 'tUSD8';
export const TOKEN_DECIMALS = 6;

export const MAX_BATCH = 50;

export const txUrl = (hash) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (addr) => `${EXPLORER}/address/${addr}`;
