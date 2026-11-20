import React, { useState } from 'react';
import {
  CalendarDays, ShieldCheck, ShieldOff, XCircle, CheckCircle2, AlertTriangle,
  ExternalLink, Loader2,
} from 'lucide-react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { TOKEN_SYMBOL } from '../config.js';
import { relaypay, useAgentInfo, useSchedules, STATUS_LABEL } from '../hooks.js';
import { fmt, short, useNow, timeLeft, fmtDateTime } from '../lib.jsx';

export default function Scheduled() {
  const { address, isConnected } = useAccount();
  const { schedules, refetch } = useSchedules(address);
  const agentQ = useAgentInfo(address);
  const agent = agentQ.info;
  const now = useNow();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const upcoming = schedules.filter((s) => s.status === 0);
  const done = schedules.filter((s) => s.status !== 0);

  async function act(key, fn) {
    setError('');
    setBusy(key);
    try {
      const hash = await fn();
      await publicClient.waitForTransactionReceipt({ hash });
      refetch();
      agentQ.refetch();
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Transaction failed.');
    } finally {
      setBusy('');
    }
  }

  const cancel = (id) => act(`cancel-${id}`, () =>
    writeContractAsync({ ...relaypay, functionName: 'cancelSchedule', args: [BigInt(id)] }));
  const revoke = () => act('revoke', () =>
    writeContractAsync({ ...relaypay, functionName: 'revokeAgent', args: [] }));

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Agent permission</h3>
            <p>The agent can only execute due batches inside limits you set onchain. It can never change them.</p>
          </div>
          {agent?.isSet
            ? <span className="status-pill"><ShieldCheck size={14} /> Active</span>
            : <span className="draft-pill">Not set</span>}
        </div>
        {!isConnected ? (
          <div className="empty-state compact"><ShieldCheck /><b>Connect your wallet</b><span>Your agent permission will show here.</span></div>
        ) : agent?.isSet ? (
          <>
            <div className="network-detail">
              <span>Agent</span><b className="mono">{short(agent.agent)}</b>
              <span>Per-batch cap</span><b>{fmt(agent.perBatchCap)} {TOKEN_SYMBOL}</b>
              <span>Total cap</span><b>{fmt(agent.totalCap)} {TOKEN_SYMBOL}</b>
              <span>Spent so far</span><b>{fmt(agent.spent)} {TOKEN_SYMBOL}</b>
              <span>Remaining</span><b>{fmt(agent.totalCap - agent.spent)} {TOKEN_SYMBOL}</b>
              <span>Valid until</span><b>{fmtDateTime(Number(agent.validUntil))}</b>
            </div>
            <div className="alert warning">
              <AlertTriangle size={16} />
              Revoking stops every pending schedule from executing. The schedules stay onchain, they just can no longer be paid by the agent.
            </div>
            <button className="btn btn-danger" onClick={revoke} disabled={busy === 'revoke'}>
              {busy === 'revoke' ? <Loader2 size={15} className="spin" /> : <ShieldOff size={15} />} Revoke agent permission
            </button>
          </>
        ) : (
          <p className="fine-print">
            No agent permission yet. Build a batch on Bulk Pay, CSV Upload or AI, choose
            "Schedule this batch", and the Review screen will walk you through setting
            the permission with its caps and expiry, in the same flow.
          </p>
        )}
        {error && <div className="alert error"><XCircle size={16} /> {error}</div>}
      </div>

      <div className="panel table-panel">
        <div className="panel-head"><div><h3>Upcoming schedules</h3><p>The agent pays these automatically at the due time.</p></div></div>
        {upcoming.length ? upcoming.map((s) => (
          <div className="schedule-row" key={s.id}>
            <div>
              <b>Schedule #{s.id}, {fmt(s.total)} {TOKEN_SYMBOL} to {s.recipients.length} recipients</b>
              <span>Due {fmtDateTime(s.dueTime)} · {timeLeft(s.dueTime, now)}</span>
            </div>
            <span className="draft-pill">{STATUS_LABEL[s.status]}</span>
            <button className="btn btn-danger btn-sm" onClick={() => cancel(s.id)} disabled={busy === `cancel-${s.id}`}>
              {busy === `cancel-${s.id}` ? <Loader2 size={14} className="spin" /> : 'Cancel'}
            </button>
          </div>
        )) : (
          <div className="empty-state compact"><CalendarDays /><b>No upcoming schedules</b><span>Schedule a batch from Bulk Pay, CSV Upload or AI.</span></div>
        )}
      </div>

      <div className="panel table-panel">
        <div className="panel-head"><div><h3>History</h3><p>Executed, cancelled and failed schedules.</p></div></div>
        {done.length ? done.map((s) => (
          <div className="schedule-row" key={s.id}>
            <div>
              <b>Schedule #{s.id}, {fmt(s.total)} {TOKEN_SYMBOL} to {s.recipients.length} recipients</b>
              <span>Was due {fmtDateTime(s.dueTime)}</span>
            </div>
            {s.status === 1
              ? <span className="status-pill"><CheckCircle2 size={13} /> Executed</span>
              : s.status === 2
                ? <span className="draft-pill">Cancelled</span>
                : <span className="revoked-pill">Failed</span>}
          </div>
        )) : (
          <div className="empty-state compact"><CalendarDays /><b>Nothing here yet</b><span>Finished schedules will appear in this list.</span></div>
        )}
      </div>
    </>
  );
}
