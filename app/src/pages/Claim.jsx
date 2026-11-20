import React, { useState } from 'react';
import {
  Gift, ShieldCheck, CheckCircle2, XCircle, Loader2, Wallet, Clock3, Users,
} from 'lucide-react';
import { useAccount, useChainId, useConnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { CHAIN_ID, TOKEN_SYMBOL } from '../config.js';
import { relaypay, useDrop } from '../hooks.js';
import { fmt, short, useNow, timeLeft, fmtDateTime } from '../lib.jsx';

// Public claim page for RelayDrops. It proves itself first: who created the
// drop, the total, the recipient count, your own allocation and the deadline,
// all read live from the contract. Only then does it offer the Claim button.
export default function Claim({ dropId }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { drop, isLoading } = useDrop(dropId);
  const now = useNow();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const allocQ = useReadContract({
    ...relaypay,
    functionName: 'allocationOf',
    args: address && drop ? [BigInt(dropId), address] : undefined,
    query: { enabled: !!address && !!drop, refetchInterval: 15000 },
  });
  const claimedQ = useReadContract({
    ...relaypay,
    functionName: 'hasClaimed',
    args: address && drop ? [BigInt(dropId), address] : undefined,
    query: { enabled: !!address && !!drop, refetchInterval: 15000 },
  });

  const allocation = allocQ.data ?? 0n;
  const alreadyClaimed = claimedQ.data ?? false;
  const expired = drop ? now > drop.claimDeadline : false;
  const eligible = isConnected && allocation > 0n && !alreadyClaimed && !expired && !drop?.closed;

  const claim = async () => {
    setError('');
    setBusy(true);
    try {
      const hash = await writeContractAsync({ ...relaypay, functionName: 'claim', args: [BigInt(dropId)] });
      await publicClient.waitForTransactionReceipt({ hash });
      setDone(true);
      claimedQ.refetch();
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Claim failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="claim-page">
      <header className="topbar">
        <div className="brand static">
          <img src="/relaypay-mark.png" alt="" />
          <span>RelayPay</span>
        </div>
        <span className="network-pill"><i /> Aevum Testnet</span>
      </header>

      <main className="claim-main">
        <div className="panel narrow">
          <div className="ai-heading">
            <span><Gift size={20} /></span>
            <div>
              <h3>RelayDrop #{dropId}</h3>
              <p>Funds for this drop are locked in the RelayPay contract escrow on Aevum Testnet.</p>
            </div>
          </div>

          {isLoading || !drop ? (
            <div className="empty-state compact"><Loader2 className="spin" /><b>Reading the drop from the chain</b><span>One moment.</span></div>
          ) : (
            <>
              <div className="network-detail">
                <span>Created by</span><b className="mono">{short(drop.giver)}</b>
                <span>Total in escrow</span><b>{fmt(drop.total)} {TOKEN_SYMBOL}</b>
                <span>Listed wallets</span><b>{drop.recipients.length}</b>
                <span>Claimed so far</span><b>{fmt(drop.claimedTotal)} {TOKEN_SYMBOL}</b>
                <span>Claim deadline</span><b>{fmtDateTime(drop.claimDeadline)}</b>
                <span>Status</span><b>{drop.closed ? 'Closed' : expired ? 'Deadline passed' : `Open, ${timeLeft(drop.claimDeadline, now)}`}</b>
              </div>

              <div className="subtle-note"><ShieldCheck size={15} /> Only wallets on the list can claim, each exactly once. Unclaimed funds return to the creator after the deadline.</div>

              {!isConnected ? (
                <button className="btn btn-primary full" onClick={() => connect({ connector: injected() })}>
                  <Wallet size={16} /> Connect wallet to check your share
                </button>
              ) : chainId !== CHAIN_ID ? (
                <button className="btn btn-primary full" onClick={() => switchChain({ chainId: CHAIN_ID })}>
                  Switch to Aevum Testnet
                </button>
              ) : done || alreadyClaimed ? (
                <div className="alert success"><CheckCircle2 size={16} /> {done ? 'Claimed. The tUSD8 is in your wallet.' : 'This wallet has already claimed its share.'}</div>
              ) : allocation > 0n ? (
                <>
                  <div className="claim-amount">
                    <span>Your share</span>
                    <strong>{fmt(allocation)} {TOKEN_SYMBOL}</strong>
                  </div>
                  {expired ? (
                    <div className="alert warning"><Clock3 size={16} /> The claim deadline has passed for this drop.</div>
                  ) : (
                    <button className="btn btn-primary full" onClick={claim} disabled={busy || !eligible}>
                      {busy ? <><Loader2 size={16} className="spin" /> Claiming</> : <>Claim {fmt(allocation)} {TOKEN_SYMBOL}</>}
                    </button>
                  )}
                </>
              ) : (
                <div className="alert warning"><Users size={16} /> Wallet {short(address)} is not on this drop's list. If you expected a share, ask the creator to check the address they used.</div>
              )}
              {error && <div className="alert error"><XCircle size={16} /> {error}</div>}
            </>
          )}
        </div>
        <p className="fine-print center">RelayPay on Aevum Testnet (chain {CHAIN_ID}). Testnet funds have no real value.</p>
      </main>
    </div>
  );
}
