# Deploy PayRelay to Aevum Testnet

Contract: `src/PayRelay.sol` (single file, no imports).
Constructor argument, the tUSD8 token:
`0x456569838f1d43009A91ebA4263147Afd7233483`

Network: Aevum Testnet, chain ID 44005, RPC https://rpc-test.qday.info,
explorer https://explorer-test.qday.info, gas token tQDAY.
Compiler: Solidity 0.8.24, EVM version **shanghai** (Aevum has no Cancun
opcodes). Estimated deploy cost at 1 gwei: about 0.002 tQDAY.

The deployer wallet is the owner wallet
`0xa04C24A33Dd54cE8142319FEccDd9602C5D1AAaE`, funded from the Discord
faucet on 19 Nov 2026 (1 tQDAY + 5 tUSD8, verified onchain).

## Route A: Remix + MetaMask (no local tooling)

1. In MetaMask, add the Aevum Testnet network (chain ID 44005, RPC and
   explorer above, currency symbol tQDAY) and switch to it with the
   owner wallet.
2. Open https://remix.ethereum.org, create a file `PayRelay.sol` and
   paste the full source of `contracts/src/PayRelay.sol` from this repo.
3. In the Solidity Compiler tab: version 0.8.24, and under Advanced
   Configurations set EVM Version to **shanghai**. Compile.
4. In Deploy & Run: Environment "Injected Provider - MetaMask", contract
   `PayRelay`, and in the constructor field enter the tUSD8 address
   above. Click Deploy and confirm in MetaMask.
5. Send the deployed contract address back. It gets verified onchain
   (code present, `token()` returns the tUSD8 address), written into
   `network.json` and the README, and explorer source verification is
   attempted (the explorer's verification is known to be unreliable;
   if it fails, that is stated honestly in the submission and the
   verified source stays in this repo).

## Route B: Foundry (if installed on the deploy machine)

```bash
cd contracts
forge create src/PayRelay.sol:PayRelay \
  --rpc-url https://rpc-test.qday.info \
  --private-key <OWNER_PRIVATE_KEY> \
  --constructor-args 0x456569838f1d43009A91ebA4263147Afd7233483
```

The private key is only ever entered on the owner's own machine. It is
never shared in chat, never committed, and never put in any `.env` in
this repo.
