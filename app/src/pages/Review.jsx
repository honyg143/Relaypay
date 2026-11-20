import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  ExternalLink, Loader2, Copy, Check,
} from 'lucide-react';
import { useAccount, useChainId, usePublicClient, useWriteContract, useSwitchChain } from 'wagmi';
import { decodeEventLog } from 'viem';
import { CHAIN_ID, RELAYPAY_ADDRESS, TOKEN_SYMBOL, txUrl } from '../config.js';
import { RELAYPAY_ABI } from '../abi.js';
import { relaypay, tusd8, useTokenBalance, useAllowance, useAgentInfo } from '../hooks.js';
import { fmt, parseAmount, short, validateBatch, isValidAddress, checksum, fmtDateTime } from '../lib.jsx';

function CheckRow({ ok, warn, label, detail }) {
  return (
    <div className="check-row">
      {ok ? <CheckCircle2 size={17} className="ok" /> : warn ? <AlertTriangle size={17} className="warn" /> : <XCircle size={17} className="bad" />}
      <div><b>{label}</b>{detail && <span>{detail}</span>}</div>
    </div>
  );
}

export default function Review({ flow, rows, onBack, onDone }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const mode = flow.mode; // 'pay' | 'schedule' | 'drop'
  const { errors, warnings, valid, total } = useMemo(() => validateBatch(rows), [rows]);
  const recipients = useMemo(
    () => rows.filter((r) => !errors.has(r.id)).map((r) => checksum((r.address || '').trim())),
    [rows, errors],
  );
  const amounts = useMemo(
    () => rows.filter((r) => !errors.has(r.id)).map((r) => parseAmount(r.amount) ?? 0n),
    [rows, errors],
  );

  const balanceQ = useTokenBalance(address);
  const allowanceQ = useAllowance(address);
  const agentQ = useAgentInfo(address);
  const balance = balanceQ.data ?? 0n;
  const allowance = allowanceQ.data ?? 0n;
  const agent = agentQ.info;

  const now = Math.floor(Date.now() / 1000);
  const dueTime = flow.dueTime || 0;
  const claimDeadline = flow.claimDeadline || 0;

  // Agent permission inputs (schedule mode)
  const [agentAddr, setAgentAddr] = useState(() => {
    try { return localStorage.getItem('relaypay-agent-address') || ''; } catch { return ''; }
  });
  const [perBatchCap, setPerBatchCap] = useState('');
  const [totalCap, setTotalCap] = useState('');
  const [validUntilStr, setValidUntilStr] = useState('');

  const effAgent = agentAddr || agent?.agent || '';
  const effPerBatch = perBatchCap ? parseAmount(perBatchCap) : total;
  const effTotalCap = totalCap ? parseAmount(totalCap) : total;
  const effValidUntil = validUntilStr
    ? Math.floor(new Date(validUntilStr).getTime() / 1000)
    : dueTime + 30 * 86400;

  const permissionCovers = !!(
    agent?.isSet &&
    total <= agent.perBatchCap &&
    agent.spent + total <= agent.totalCap &&
    Number(agent.validUntil) > dueTime
  );
  const needsAgentStep = mode === 'schedule' && !permissionCovers;
  const agentInputsValid =
    isValidAddress(effAgent) &&
    effPerBatch !== null && effPerBatch >= total && total > 0n &&
    effTotalCap !== null && effTotalCap >= (agent?.spent ?? 0n) + total &&
    effValidUntil > dueTime;

  const approveAmount = mode === 'schedule' && needsAgentStep && effTotalCap ? effTotalCap : total;
  const needsApprove = allowance < approveAmount;

  const checks = [];
  checks.push({ ok: valid, label: 'Batch is valid', detail: valid ? `${rows.length} recipients, every address and amount checked.` : 'Fix the highlighted rows first.' });
  checks.push({ ok: total <= balance, label: 'Balance covers the total', detail: `Balance ${fmt(balance)} ${TOKEN_SYMBOL}, batch total ${fmt(total)} ${TOKEN_SYMBOL}.` });
  const dupWarning = warnings.find((w) => w.startsWith('Duplicate'));
  checks.push({ ok: !dupWarning, warn: !!dupWarning, label: 'No duplicate addresses', detail: dupWarning || 'Every recipient appears once.' });
  if (mode === 'schedule') {
    checks.push({ ok: dueTime > now, label: 'Due time is in the future', detail: fmtDateTime(dueTime) });
    checks.push({
      ok: permissionCovers || agentInputsValid,
      label: 'Agent permission covers this batch',
      detail: permissionCovers
        ? `Per-batch cap ${fmt(agent.perBatchCap)}, total cap ${fmt(agent.totalCap)}, valid until ${fmtDateTime(Number(agent.validUntil))}.`
        : 'A setAgent signature will set the permission first, with the limits below.',
    });
  }
  if (mode === 'drop') {
    checks.push({ ok: claimDeadline > now, label: 'Claim deadline is in the future', detail: fmtDateTime(claimDeadline) });
  }
  const blocking = checks.some((c) => !c.ok && !c.warn);
  const wrongChain = chainId !== CHAIN_ID;

  const [stepState, setStepState] = useState({}); // key -> 'signing'|'confirming'|'done'|'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [running, setRunning] = useState(false);

  async function runStep(key, fn) {
    setStepState((s) => ({ ...s, [key]: 'signing' }));
    const hash = await fn();
    setStepState((s) => ({ ...s, [key]: 'confirming' }));
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Transaction failed onchain.');
    setStepState((s) => ({ ...s, [key]: 'done' }));
    return receipt;
  }

  async function execute() {
    setErrorMsg('');
    setRunning(true);
    try {
      if (needsApprove) {
        await runStep('approve', () =>
          writeContractAsync({ ...tusd8, functionName: 'approve', args: [RELAYPAY_ADDRESS, approveAmount] }));
        await allowanceQ.refetch();
      }
      if (needsAgentStep) {
        try { localStorage.setItem('relaypay-agent-address', effAgent); } catch { /* ignore */ }
        await runStep('agent', () =>
          writeContractAsync({
            ...relaypay,
            functionName: 'setAgent',
            args: [checksum(effAgent), effPerBatch, effTotalCap, BigInt(effValidUntil)],
          }));
      }
      let createdId = null;
      const receipt = await runStep('final', () =>
        writeContractAsync({
          ...relaypay,
          functionName: mode === 'pay' ? 'batchPay' : mode === 'schedule' ? 'createBatchSchedule' : 'createDrop',
          args: mode === 'pay'
            ? [recipients, amounts]
            : mode === 'schedule'
              ? [recipients, amounts, BigInt(dueTime)]
              : [recipients, amounts, BigInt(claimDeadline)],
        }));
      if (mode !== 'pay') {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({ abi: RELAYPAY_ABI, data: log.data, topics: log.topics });
            if (decoded.eventName === 'BatchScheduled' || decoded.eventName === 'DropCreated') {
              createdId = Number(decoded.args.id);
            }
          } catch { /* not our event */ }
        }
      }
      onDone({
        mode,
        txHash: receipt.transactionHash,
        total,
        count: recipients.length,
        scheduleId: mode === 'schedule' ? createdId : null,
        dropId: mode === 'drop' ? createdId : null,
        dueTime,
        claimDeadline,
      });
    } catch (e) {
      setErrorMsg(e?.shortMessage || e?.message || 'Something went wrong.');
      setStepState((s) => {
        const next = { ...s };
        for (const k of Object.keys(next)) if (next[k] === 'signing' || next[k] === 'confirming') next[k] = 'error';
        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  const stepLabel = (key, label) => {
    const st = stepState[key];
    return (
      <div className="step-row">
        {st === 'done' ? <CheckCircle2 size={17} className="ok" />
          : st === 'error' ? <XCircle size={17} className="bad" />
          : st ? <Loader2 size={17} className="spin" />
          : <span className="step-dot" />}
        <span>{label}</span>
        {st === 'signing' && <small>Confirm in your wallet</small>}
        {st === 'confirming' && <small>Waiting for confirmation</small>}
      </div>
    );
  };

  const title = mode === 'pay' ? 'Review batch payment' : mode === 'schedule' ? 'Review schedule' : 'Review drop';

  return (
    <div className="panel narrow">
      <button className="text-btn back-btn" onClick={onBack}><ArrowLeft size={15} /> Back</button>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>Every detail is checked before you sign. Nothing moves without your signature.</p>
        </div>
        <span className="status-pill"><ShieldCheck size={14} /> Review first</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Recipient</th><th>Amount</th><th>Label</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{short((r.address || '').trim())}</td>
                <td>{r.amount} {TOKEN_SYMBOL}</td>
                <td>{r.label || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="review-total">
        <span>Total</span><strong>{fmt(total)} {TOKEN_SYMBOL}</strong>
        <span>{recipients.length} recipients</span>
        {mode === 'schedule' && <span>Due {fmtDateTime(dueTime)}</span>}
        {mode === 'drop' && <span>Claim by {fmtDateTime(claimDeadline)}</span>}
      </div>

      <h4 className="checks-title">Sanity checks</h4>
      <div className="checks">
        {checks.map((c, i) => <CheckRow key={i} {...c} />)}
      </div>

      {mode === 'schedule' && needsAgentStep && (
        <div className="permission-box">
          <h4>Agent permission</h4>
          <p className="fine-print">
            The agent can only execute due batches inside these limits. It can never change
            them, move funds anywhere else, or exceed the caps. You can revoke it any time.
          </p>
          <label className="field-label">Agent wallet address
            <input value={agentAddr} onChange={(e) => setAgentAddr(e.target.value)} placeholder="0x... (the runner wallet)" className="mono" spellCheck={false} />
          </label>
          <div className="field-grid">
            <label className="field-label">Per-batch cap ({TOKEN_SYMBOL})
              <input type="number" min="0" step="any" value={perBatchCap} onChange={(e) => setPerBatchCap(e.target.value)} placeholder={fmt(total)} />
            </label>
            <label className="field-label">Total cap ({TOKEN_SYMBOL})
              <input type="number" min="0" step="any" value={totalCap} onChange={(e) => setTotalCap(e.target.value)} placeholder={fmt(total)} />
            </label>
            <label className="field-label">Permission expires
              <input type="datetime-local" value={validUntilStr} onChange={(e) => setValidUntilStr(e.target.value)} />
            </label>
          </div>
          <p className="fine-print">Blank cap fields default to this batch total. Default expiry is 30 days after the due time.</p>
        </div>
      )}

      <h4 className="checks-title">Signatures needed</h4>
      <div className="steps-list">
        {needsApprove && stepLabel('approve', `Approve ${fmt(approveAmount)} ${TOKEN_SYMBOL} for the RelayPay contract`)}
        {needsAgentStep && stepLabel('agent', 'Set agent permission (setAgent)')}
        {stepLabel('final', mode === 'pay' ? 'Pay the batch (batchPay)' : mode === 'schedule' ? 'Create the schedule (createBatchSchedule)' : 'Create the drop and lock the escrow (createDrop)')}
      </div>

      {errorMsg && <div className="alert error"><XCircle size={16} /> {errorMsg}</div>}
      {wrongChain ? (
        <button className="btn btn-primary full" onClick={() => switchChain({ chainId: CHAIN_ID })}>
          Switch to Aevum Testnet to continue
        </button>
      ) : (
        <button className="btn btn-primary full" onClick={execute} disabled={blocking || running || !address}>
          {running ? <><Loader2 size={16} className="spin" /> Working</> : <>Sign and {mode === 'pay' ? 'pay' : mode === 'schedule' ? 'schedule' : 'create drop'} <ArrowRight size={16} /></>}
        </button>
      )}
      {!address && <p className="fine-print">Connect your wallet first.</p>}
    </div>
  );
}

export function Success({ result, go }) {
  const [copied, setCopied] = useState(false);
  const claimLink = result.dropId !== null && result.dropId !== undefined
    ? `${window.location.origin}${window.location.pathname}#claim/${result.dropId}`
    : null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(claimLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="panel narrow success-panel">
      <CheckCircle2 size={44} className="ok" />
      <h3>
        {result.mode === 'pay' ? 'Batch paid' : result.mode === 'schedule' ? 'Batch scheduled' : 'Drop created'}
      </h3>
      <p>
        {result.mode === 'pay' && `${fmt(result.total)} ${TOKEN_SYMBOL} sent to ${result.count} recipients in one signature.`}
        {result.mode === 'schedule' && `Schedule #${result.scheduleId ?? ''} is onchain for ${fmtDateTime(result.dueTime)}. The agent will pay ${fmt(result.total)} ${TOKEN_SYMBOL} to ${result.count} recipients automatically at the due time, inside your caps. No second signature needed.`}
        {result.mode === 'drop' && `${fmt(result.total)} ${TOKEN_SYMBOL} is locked in escrow. Share the claim link, each listed wallet claims its own share.`}
      </p>
      <a className="btn btn-outline" href={txUrl(result.txHash)} target="_blank" rel="noreferrer">
        View transaction on the explorer <ExternalLink size={15} />
      </a>
      {claimLink && (
        <div className="claim-link-box">
          <span>Claim link</span>
          <code>{claimLink}</code>
          <button className="btn btn-outline btn-sm" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
        </div>
      )}
      <div className="success-actions">
        <button className="btn btn-primary" onClick={() => go('dashboard')}>Go to Dashboard</button>
        <button className="btn btn-outline" onClick={() => go(result.mode === 'drop' ? 'drops' : result.mode === 'schedule' ? 'scheduled' : 'bulk')}>
          {result.mode === 'drop' ? 'Back to RelayDrops' : result.mode === 'schedule' ? 'Back to Scheduled' : 'New batch'}
        </button>
      </div>
    </div>
  );
}
