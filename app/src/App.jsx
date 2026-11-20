import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard, Users, Upload, Sparkles, CalendarDays, Gift,
  ArrowRight, ExternalLink, ShieldCheck, Wallet, LogOut, FileCode2,
} from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { CHAIN_ID, RELAYPAY_ADDRESS, addressUrl } from './config.js';
import { useChainStats } from './hooks.js';
import { useDraft, short } from './lib.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BulkPay from './pages/BulkPay.jsx';
import CsvUpload from './pages/CsvUpload.jsx';
import AiPage from './pages/AiPage.jsx';
import Scheduled from './pages/Scheduled.jsx';
import RelayDrops from './pages/RelayDrops.jsx';
import Review, { Success } from './pages/Review.jsx';
import Claim from './pages/Claim.jsx';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bulk', label: 'Bulk Pay', icon: Users },
  { key: 'csv', label: 'CSV Upload', icon: Upload },
  { key: 'ai', label: 'AI', icon: Sparkles },
  { key: 'scheduled', label: 'Scheduled Payments', icon: CalendarDays },
  { key: 'drops', label: 'RelayDrops', icon: Gift },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  bulk: 'Bulk Pay',
  csv: 'CSV Upload',
  ai: 'AI Draft',
  scheduled: 'Scheduled Payments',
  drops: 'RelayDrops',
};

function Brand({ dark = false }) {
  return (
    <span className={`brand${dark ? ' on-dark' : ''}`}>
      <img src="/relaypay-mark.png" alt="" width="30" height="30" />
      <b>RelayPay</b>
    </span>
  );
}

function WalletButton({ light = false }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button className={`btn ${light ? 'btn-dark' : 'btn-primary'}`} onClick={() => connect({ connector: injected() })}>
        <Wallet size={16} /> Connect wallet
      </button>
    );
  }
  if (chainId !== CHAIN_ID) {
    return (
      <button className="btn btn-danger" onClick={() => switchChain({ chainId: CHAIN_ID })}>
        Switch to Aevum Testnet
      </button>
    );
  }
  return (
    <span className="wallet-chip">
      <span className="mono">{short(address)}</span>
      <button className="icon-btn" title="Disconnect" onClick={() => disconnect()}><LogOut size={15} /></button>
    </span>
  );
}

function Landing({ enter }) {
  const { blockNumber } = useChainStats();
  return (
    <div className="landing">
      <header className="land-nav">
        <Brand />
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href={addressUrl(RELAYPAY_ADDRESS)} target="_blank" rel="noreferrer">Contract</a>
        </nav>
        <div className="land-nav-cta">
          <WalletButton light />
          <button className="btn btn-dark" onClick={enter}>Launch app <ArrowRight size={15} /></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="bracket">[ Aevum Builder Challenge #1 ]</span>
          <h1>Batch payments, prepared and reviewed by you. <em>Relayed on time by your agent.</em></h1>
          <p className="hero-sub">
            RelayPay is programmable stablecoin payments on Aevum Testnet. Build a batch by hand,
            by CSV, or in plain words. Review every line, sign once, and let schedules and drops
            do the rest.
          </p>
          <div className="hero-cta">
            <button className="btn btn-dark btn-lg" onClick={enter}>Launch app <ArrowRight size={16} /></button>
            <a className="btn btn-ghost btn-lg" href="https://github.com/honyg143/Relaypay" target="_blank" rel="noreferrer">
              <FileCode2 size={16} /> Source on GitHub
            </a>
          </div>
          <p className="hero-tag">Prepare. Review. Relay.</p>
        </div>

        <div className="hero-stage">
          <div className="coin-ring">
            <img src="/relaypay-mark.png" alt="RelayPay" className="coin-mark" />
          </div>
          <div className="glass-card proof-card">
            <div className="proof-head">
              <span className="bracket">[ Live onchain proof ]</span>
              <span className="live-dot">Live</span>
            </div>
            <div className="proof-row"><span>Network</span><b>Aevum Testnet · 44005</b></div>
            <div className="proof-row"><span>Contract</span><a className="mono" href={addressUrl(RELAYPAY_ADDRESS)} target="_blank" rel="noreferrer">{short(RELAYPAY_ADDRESS)} <ExternalLink size={12} /></a></div>
            <div className="proof-row"><span>Token</span><b>tUSD8 · 6 decimals</b></div>
            <div className="proof-row"><span>Latest block</span><b className="mono">{blockNumber ? blockNumber.toString() : '...'}</b></div>
            <div className="proof-row"><span>Contract tests</span><b>27 / 27 passing</b></div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <span className="bracket">[ What it does ]</span>
        {[
          ['01', 'Bulk Pay', 'Add up to 50 recipients by hand. One reviewed batch, one signature, one transaction.'],
          ['02', 'CSV Upload', 'Drop in a spreadsheet export. Bad rows are flagged with reasons before anything is signed.'],
          ['03', 'AI Draft', 'Describe the payments in plain words. The AI page drafts the batch, you review and sign. The AI never pays and never signs.'],
          ['04', 'Scheduled Payments', 'Put a whole batch on a schedule. Your agent pays it at the due time inside onchain caps you set. Cancel or revoke any time.'],
          ['05', 'RelayDrops', 'Lock tUSD8 in escrow and share one claim link. Each listed wallet claims its own share before the deadline.'],
        ].map(([n, title, desc]) => (
          <div className="feature-row" key={n}>
            <span className="feature-num">[ {n} ]</span>
            <b>{title}</b>
            <p>{desc}</p>
          </div>
        ))}
      </section>

      <section className="how" id="how">
        <span className="bracket">[ How it works ]</span>
        <div className="steps-grid">
          <div><b>Prepare</b><p>Build the batch by hand, by CSV, or in words.</p></div>
          <div><b>Review</b><p>Every recipient, amount, cap and deadline is shown before you sign. Nothing moves on a summary.</p></div>
          <div><b>Relay</b><p>Pay now, schedule it for the agent, or drop it as a claim link. The agent can never change its limits. Only the owner can.</p></div>
        </div>
      </section>

      <footer className="land-footer">
        <div className="giant-word">RELAYPAY</div>
        <div className="land-foot-row">
          <span>RelayPay · Programmable stablecoin payments</span>
          <span>Built for the Aevum Builder Challenge #1 by QDay</span>
          <a href={addressUrl(RELAYPAY_ADDRESS)} target="_blank" rel="noreferrer">Contract on the explorer <ExternalLink size={12} /></a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const claimMatch = useMemo(() => {
    const m = window.location.hash.match(/^#claim\/(\d+)/);
    return m ? m[1] : null;
  }, []);
  const [inApp, setInApp] = useState(false);
  const [view, setView] = useState('dashboard');
  const [flowState, setFlowState] = useState(null); // { flow, rows, from }
  const [result, setResult] = useState(null);
  const { rows: draftRows } = useDraft();

  if (claimMatch !== null) return <Claim dropId={claimMatch} />;
  if (!inApp) return <Landing enter={() => setInApp(true)} />;

  const go = (key) => { setView(key); setFlowState(null); setResult(null); };

  const startFlow = (flow, rowsOverride) => {
    const source = rowsOverride ?? draftRows;
    const snapshot = source.map((r) => ({ ...r }));
    setFlowState({ flow, rows: snapshot, from: view });
    setResult(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="side-brand" onClick={() => setInApp(false)} title="Back to home">
          <Brand dark />
        </button>
        <nav className="side-nav">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`side-item${view === key && !flowState && !result ? ' active' : ''}`}
              onClick={() => go(key)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span className="network-pill"><span className="live-dot small" /> Aevum Testnet</span>
          <a className="side-contract mono" href={addressUrl(RELAYPAY_ADDRESS)} target="_blank" rel="noreferrer">
            {short(RELAYPAY_ADDRESS)} <ExternalLink size={11} />
          </a>
          <span className="side-note"><ShieldCheck size={12} /> Caps enforced onchain</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="ws-topbar">
          <h2>{flowState ? 'Review and sign' : result ? 'Done' : PAGE_TITLES[view]}</h2>
          <WalletButton />
        </header>

        {flowState ? (
          <Review
            flow={flowState.flow}
            rows={flowState.rows}
            onBack={() => setFlowState(null)}
            onDone={(res) => { setResult(res); setFlowState(null); }}
          />
        ) : result ? (
          <Success result={result} go={go} />
        ) : (
          <>
            {view === 'dashboard' && <Dashboard go={go} />}
            {view === 'bulk' && <BulkPay startFlow={startFlow} />}
            {view === 'csv' && <CsvUpload startFlow={startFlow} />}
            {view === 'ai' && <AiPage startFlow={startFlow} />}
            {view === 'scheduled' && <Scheduled />}
            {view === 'drops' && <RelayDrops startFlow={startFlow} />}
          </>
        )}
      </main>
    </div>
  );
}
