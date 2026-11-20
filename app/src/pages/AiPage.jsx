import React, { useMemo, useState } from 'react';
import { Sparkles, LockKeyhole, AlertTriangle } from 'lucide-react';
import BatchEditor from '../components/BatchEditor.jsx';
import { newRow, isValidAddress } from '../lib.jsx';
import { BatchActions } from './BulkPay.jsx';
import { useDraft } from '../lib.jsx';

// Local draft parser: pulls full 0x addresses and the amounts near them out of
// free text. It never hides a problem: anything unclear becomes a warning the
// user sees before the draft can be used. The draft then goes through the
// same Review and signature as every other batch.
function parseTextToDraft(text) {
  const warnings = [];
  const rows = [];
  const addrMatches = [...text.matchAll(/0x[a-fA-F0-9]{40}/g)];
  if (!addrMatches.length) {
    warnings.push('No full wallet address found. Addresses must be complete 0x addresses with 40 hex characters.');
  }
  const segments = [];
  addrMatches.forEach((m, i) => {
    const start = i === 0 ? 0 : addrMatches[i - 1].index + 42;
    const end = i + 1 < addrMatches.length ? addrMatches[i + 1].index : text.length;
    segments.push({ address: m[0], before: text.slice(start, m.index), after: text.slice(m.index + 42, end) });
  });
  for (const seg of segments) {
    const near = `${seg.before} ${seg.after.split(/0x/)[0]}`;
    const numbers = [...near.matchAll(/(\d+(?:\.\d+)?)/g)].map((x) => x[1]);
    const amount = numbers.length ? numbers[numbers.length - 1] : '';
    if (!amount) warnings.push(`No amount found near ${seg.address.slice(0, 6)}...${seg.address.slice(-4)}, add it in the draft.`);
    const labelMatch = seg.after.match(/(?:for|label:?)\s+([a-zA-Z][a-zA-Z ]{1,30})/i);
    rows.push(newRow(seg.address, amount, labelMatch ? labelMatch[1].trim() : ''));
  }
  const mentioned = [...text.matchAll(/0x[a-fA-F0-9]{4,39}(?![a-fA-F0-9])/g)].filter((m) => m[0].length < 42);
  if (mentioned.length) {
    warnings.push(`${mentioned.length} shortened or incomplete address(es) were ignored. Paste full addresses.`);
  }
  if (rows.length && rows.some((r) => !isValidAddress(r.address))) {
    warnings.push('One or more addresses failed validation, fix them in the draft.');
  }
  return { rows, warnings };
}

export default function AiPage({ startFlow }) {
  const { setRows, setSource } = useDraft();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const draftNow = () => {
    const { rows, warnings: w } = parseTextToDraft(text);
    setDraft(rows);
    setWarnings(w);
    if (rows.length) {
      setRows(rows);
      setSource('ai');
    }
  };

  const example = useMemo(
    () => 'Pay 250 to 0x1111111111111111111111111111111111111111 for design, 175 to 0x2222222222222222222222222222222222222222 for development and 100 to 0x3333333333333333333333333333333333333333 for content.',
    [],
  );

  return (
    <div className="two-col ai-layout">
      <div className="panel">
        <div className="ai-heading">
          <span><Sparkles size={20} /></span>
          <div>
            <h3>Describe your payment batch</h3>
            <p>Write it in plain words. A draft is built for you to edit and review.</p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={example}
        />
        <button className="btn btn-primary full" onClick={draftNow} disabled={!text.trim()}>
          Draft batch
        </button>
        <div className="subtle-note"><LockKeyhole size={15} /> AI drafts, you review and sign. The AI never pays and never signs.</div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h3>Draft preview</h3><p>Editable. Nothing is final until Review.</p></div>
          {draft?.length ? <span className="draft-pill">Unapproved draft</span> : null}
        </div>
        {warnings.length > 0 && (
          <div className="issues-box">
            {warnings.map((w, i) => <div className="row-error" key={i}><AlertTriangle size={13} /> {w}</div>)}
          </div>
        )}
        {draft && draft.length ? (
          <>
            <BatchEditor rows={draft} setRows={(r) => { setDraft(r); setRows(r); setSource('ai'); }} />
            <BatchActions startFlow={startFlow} />
          </>
        ) : (
          <div className="empty-state">
            <Sparkles />
            <b>Your draft will appear here</b>
            <span>Describe the batch on the left, then select Draft batch.</span>
          </div>
        )}
      </div>
    </div>
  );
}
