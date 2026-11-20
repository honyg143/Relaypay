import React from 'react';
import {
  Send, Users, CalendarDays, Upload, Sparkles, Wallet, ShieldCheck,
  ExternalLink, Clock3, Gift, AlertTriangle,
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { CHAIN_ID, TOKEN_SYMBOL, txUrl } from '../config.js';
import { useTokenBalance, useAgentInfo, useSchedules, useRecentActivity, STATUS_LABEL } from '../hooks.js';
import { fmt, short, useNow, timeLeft, fmtDateTime } from '../lib.jsx';

function Stat({ label, value, icon: Icon, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Action({ icon: Icon, title, desc, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <span><Icon size={18} /></span>
      <b>{title}</b>
      <small>{desc}</small>
    </button>
  );
}

export default function Dashboard({ go }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const now = useNow();
  const balanceQ = useTokenBalance(address);
  const agentQ = useAgentInfo(address);
  const { schedules } = useSchedules(address);
  const { events, loading: activityLoading } = useRecentActivity(address);

  const upcoming = schedules.filter((s) => s.status === 0).sort((a, b) => a.dueTime - b.dueTime);
  const agent = agentQ.info;
  const wrongChain = isConnected && chainId !== CHAIN_ID;

  return (
    <>
      {wrongChain && (
        <div className="alert warning"><AlertTriangle size={16} /> Your wallet is on chain {chainId}. RelayPay runs on Aevum Testnet ({CHAIN_ID}), switch networks to use the app.</div>
      )}
      <div className="stats">
        <Stat label={`${TOKEN_SYMBOL} balance`} value={isConnected ? `${fmt(balanceQ.data ?? 0n)} ${TOKEN_SYMBOL}` : 'Not connected'} icon={Wallet} sub={address ? short(address) : 'Connect your wallet'} />
        <Stat label="Upcoming schedules" value={upcoming.length} icon={CalendarDays} sub={upcoming[0] ? `Next due ${timeLeft(upcoming[0].dueTime, now)}` : 'Nothing scheduled'} />
        <Stat label="Agent permission" value={agent?.isSet ? 'Active' : 'Not set'} icon={ShieldCheck} sub={agent?.isSet ? `Cap ${fmt(agent.totalCap)} ${TOKEN_SYMBOL}, spent ${fmt(agent.spent)}` : 'Set it from a schedule review'} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><div><h3>Quick actions</h3><p>Three ways to build one batch.</p></div></div>
          <div className="action-grid">
            <Action icon={Users} title="Bulk Pay" desc="Add recipients by hand" onClick={() => go('bulk')} />
            <Action icon={Upload} title="CSV Upload" desc="Import a payment list" onClick={() => go('csv')} />
            <Action icon={Sparkles} title="AI draft" desc="Describe it in words" onClick={() => go('ai')} />
            <Action icon={Gift} title="RelayDrops" desc="Escrow, recipients claim" onClick={() => go('drops')} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><h3>Upcoming schedules</h3><p>Paid by the agent at the due time.</p></div></div>
          {upcoming.length ? upcoming.slice(0, 4).map((s) => (
            <div className="list-row" key={s.id}>
              <Clock3 size={16} />
              <div>
                <b>Schedule #{s.id}, {fmt(s.total)} {TOKEN_SYMBOL}</b>
                <span>{s.recipients.length} recipients · due {fmtDateTime(s.dueTime)} · {timeLeft(s.dueTime, now)}</span>
              </div>
              <span className="draft-pill">{STATUS_LABEL[s.status]}</span>
            </div>
          )) : (
            <div className="empty-state compact"><CalendarDays /><b>No upcoming schedules</b><span>Build a batch, then choose Schedule this batch.</span></div>
          )}
          <button className="text-btn" onClick={() => go('scheduled')}>Open Scheduled Payments</button>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-head"><div><h3>Recent activity</h3><p>Straight from contract events on Aevum Testnet.</p></div></div>
        {!isConnected ? (
          <div className="empty-state compact"><Send /><b>Connect your wallet</b><span>Your payments, schedules and drops will show here.</span></div>
        ) : activityLoading ? (
          <div className="empty-state compact"><Clock3 /><b>Reading the chain</b><span>Scanning recent blocks for your events.</span></div>
        ) : events.length ? events.map((e, i) => (
          <div className="list-row" key={`${e.txHash}-${i}`}>
            <Send size={16} />
            <div>
              <b>{e.kind}{e.id !== null ? ` #${e.id}` : ''}</b>
              <span>{e.total !== null ? `${fmt(e.total)} ${TOKEN_SYMBOL}` : ''}{e.count ? ` · ${e.count} recipients` : ''} · block {String(e.blockNumber)}</span>
            </div>
            <a className="icon-link" href={txUrl(e.txHash)} target="_blank" rel="noreferrer" title="View on explorer"><ExternalLink size={15} /></a>
          </div>
        )) : (
          <div className="empty-state compact"><Send /><b>No activity yet</b><span>Your first batch payment will appear here.</span></div>
        )}
      </div>
    </>
  );
}
