import React, { useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDraft, newRow, validateBatch, isValidAddress, parseAmount, fmt } from '../lib.jsx';
import { TOKEN_SYMBOL } from '../config.js';
import { BatchActions } from './BulkPay.jsx';

const SAMPLE = `address,amount,label
0x1111111111111111111111111111111111111111,250,Design invoice
0x2222222222222222222222222222222222222222,175,Development
0x3333333333333333333333333333333333333333,100,Content work
`;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { rows: [], issues: ['The file is empty.'] };
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('address') || header.includes('amount');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = [];
  const issues = [];
  dataLines.forEach((line, i) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const [address = '', amount = '', label = ''] = cells;
    const lineNo = (hasHeader ? i + 2 : i + 1);
    if (!address && !amount) return;
    if (!isValidAddress(address)) {
      issues.push(`Line ${lineNo}: "${address || '(empty)'}" is not a valid address, row skipped.`);
      return;
    }
    const amt = parseAmount(amount);
    if (amt === null || amt <= 0n) {
      issues.push(`Line ${lineNo}: amount "${amount || '(empty)'}" is not a number above 0, row skipped.`);
      return;
    }
    rows.push(newRow(address, amount, label));
  });
  const seen = new Set();
  for (const r of rows) {
    const k = r.address.toLowerCase();
    if (seen.has(k)) issues.push(`Duplicate address ${r.address} appears more than once. It is kept, check before signing.`);
    seen.add(k);
  }
  return { rows, issues };
}

export default function CsvUpload({ startFlow }) {
  const { setRows, setSource } = useDraft();
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const validation = useMemo(() => (parsed ? validateBatch(parsed.rows) : null), [parsed]);

  const handleText = (name, text) => {
    setFileName(name);
    setParsed(parseCsv(text));
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleText(file.name, String(reader.result || ''));
    reader.readAsText(file);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relaypay-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const useParsed = () => {
    if (!parsed) return;
    setRows(parsed.rows);
    setSource('csv');
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Import recipients from CSV</h3>
          <p>Columns: <code>address,amount</code> required, <code>label</code> optional. Bad rows are flagged, never silently dropped.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={downloadSample}><Download size={15} /> Sample CSV</button>
      </div>

      <label
        className={`upload-zone ${dragOver ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
      >
        <Upload size={25} />
        <b>Drop a CSV file here or browse</b>
        <span>Your file is parsed in the browser, nothing is uploaded anywhere.</span>
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {fileName && <div className="file-chip"><FileSpreadsheet size={16} /> {fileName} <span>Parsed</span></div>}

      {parsed && (
        <>
          {parsed.issues.length > 0 && (
            <div className="issues-box">
              {parsed.issues.map((msg, i) => (
                <div className="row-error" key={i}><AlertCircle size={13} /> {msg}</div>
              ))}
            </div>
          )}
          {parsed.rows.length ? (
            <>
              <div className="panel-head">
                <div>
                  <h3>Preview</h3>
                  <p>{parsed.rows.length} valid recipients · {fmt(validation.total)} {TOKEN_SYMBOL} total</p>
                </div>
                <span className="status-pill"><CheckCircle2 size={14} /> Ready</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Address</th><th>Amount</th><th>Label</th></tr></thead>
                  <tbody>
                    {parsed.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.address}</td>
                        <td>{r.amount} {TOKEN_SYMBOL}</td>
                        <td>{r.label || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="batch-actions">
                <button className="btn btn-primary" onClick={() => { useParsed(); startFlow({ mode: 'pay' }, parsed.rows); }}>
                  Pay now
                </button>
                <span className="fine-print">Or load it into the shared batch draft and schedule it from Bulk Pay.</span>
                <button className="btn btn-outline" onClick={useParsed}>Load into batch draft</button>
              </div>
            </>
          ) : (
            <div className="alert warning"><AlertCircle size={16} /> No valid rows found in this file. Check the format against the sample CSV.</div>
          )}
        </>
      )}
    </div>
  );
}
