import React, { useState } from 'react';
import {
  Gift, ArrowRight, Copy, Check, RotateCcw, Loader2, XCircle, ExternalLink,
} from 'lucide-react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import BatchEditor from '../components/BatchEditor.jsx';
import { useDraft, validateBatch, fmt, useNow, timeLeft, fmtDateTime } from '../lib.jsx';
import { TOKEN_SYMBOL, RELAYPAY_ADDRESS, addressUrl } from '../config.js';
import { relaypay, useDrops } from '../hooks.js';

export const claimLinkFor = (id) => `${window.location.origin}${window.location.pathname}#claim/${id}`;

export default function RelayDrops({ startFlow }) {
  const { address, isConnected } = useAccount();
  const { rows, setRows, setSource } = useDraft();
  const { valid } = validateBatch(rows);
  const [deadlineStr, setDeadlineStr] = useState('');
  const deadline = deadlineStr ? Math.floor(new Date(deadlineStr).getTime() / 1000) : 0;
  const deadlineValid = deadline > Math.floor(Date.now() / 1000);

  const { drops, refetch } = useDrops(address);
  const now = useNow();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const reclaim = async (id) => {
    setError('');
    setBusyId(id);
    try {
      const hash = await writeContractAsync({ ...relaypay, functionName: 'reclaimUnclaimed', args: [BigInt(id)] });
      await publicClient.waitForTransactionReceipt({ hash });
      refetch();
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Reclaim failed.');
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (id) => {
    try {
      await navigator.clipboard.writeText(claimLinkFor(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Create a drop</h3>
            <p>
              The batch total is locked in escrow. Listed wallets claim their own share from
              the claim page, so funds never go to dead wallets. Whatever stays unclaimed
              after the deadline comes back to you.
            </p>
          </div>
          <span className="status-pill"><Gift size={14} /> Escrow</span>
        </div>
        <BatchEditor rows={rows} setRows={(r) => { setRows(r); setSource('manual'); }} />
        <div className="batch-actions">
          <label className="field-label inline">Claim deadline
            <input type="datetime-local" value={deadlineStr} onChange={(e) => setDeadlineStr(e.target.value)} />
          </label>
          <button
            className="btn btn-primary"
            disabled={!valid || !deadlineValid}
            onClick={() => startFlow({ mode: 'drop', claimDeadline: deadline })}
          >
            Create drop <ArrowRight size={16} />
          </button>
          {!deadlineValid && <p className="fine-print">Pick a claim deadline in the future.</p>}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-head"><div><h3>My drops</h3><p>Claimed and unclaimed, per drop.</p></div></div>
        {error && <div className="alert error"><XCircle size={16} /> {error}</div>}
        {!isConnected ? (
          <div className="empty-state compact"><Gift /><b>Connect your wallet</b><span>Drops you created will show here.</span></div>
        ) : drops.length ? drops.map((d) => {
          const unclaimed = d.total - d.claimedTotal;
          const expired = now > d.claimDeadline;
          return (
            <div className="drop-row" key={d.id}>
              <div className="drop-main">
                <b>Drop #{d.id}, {fmt(d.total)} {TOKEN_SYMBOL}</b>
                <span>
                  {d.recipients.length} listed wallets · claimed {fmt(d.claimedTotal)} · unclaimed {fmt(unclaimed)}
                  {' '}· {d.closed ? 'closed' : expired ? 'deadline passed' : `claims close in ${timeLeft(d.claimDeadline, now)}`}
                </span>
                <span className="fine-print">Deadline {fmtDateTime(d.claimDeadline)}</span>
              </div>
              <div className="drop-actions">
                <button className="btn btn-outline btn-sm" onClick={() => copyLink(d.id)}>
                  {copiedId === d.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Claim link</>}
                </button>
                {expired && !d.closed && unclaimed > 0n && (
                  <button className="btn btn-primary btn-sm" onClick={() => reclaim(d.id)} disabled={busyId === d.id}>
                    {busyId === d.id ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />} Reclaim {fmt(unclaimed)} {TOKEN_SYMBOL}
                  </button>
                )}
                <a className="icon-link" href={addressUrl(RELAYPAY_ADDRESS)} target="_blank" rel="noreferrer" title="Contract on explorer"><ExternalLink size={15} /></a>
              </div>
            </div>
          );
        }) : (
          <div className="empty-state compact"><Gift /><b>No drops yet</b><span>Create your first drop above.</span></div>
        )}
      </div>
    </>
  );
}
