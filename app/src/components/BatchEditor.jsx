import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { newRow, validateBatch, fmt } from '../lib.jsx';
import { TOKEN_SYMBOL, MAX_BATCH } from '../config.js';

export default function BatchEditor({ rows, setRows, showLabel = true }) {
  const { errors, total } = validateBatch(rows);

  const update = (id, key, value) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  const remove = (id) => setRows(rows.filter((r) => r.id !== id));
  const add = () => setRows([...rows, newRow()]);

  return (
    <div>
      <div className="editor-head">
        <span>Recipient address</span>
        <span>Amount ({TOKEN_SYMBOL})</span>
        {showLabel && <span>Label (optional)</span>}
        <span />
      </div>
      {rows.map((r) => (
        <div key={r.id}>
          <div className="editor-row">
            <input
              value={r.address}
              onChange={(e) => update(r.id, 'address', e.target.value)}
              placeholder="0x..."
              className={`mono ${errors.has(r.id) ? 'input-error' : ''}`}
              spellCheck={false}
            />
            <input
              type="number"
              min="0"
              step="any"
              value={r.amount}
              onChange={(e) => update(r.id, 'amount', e.target.value)}
              placeholder="0.00"
            />
            {showLabel && (
              <input
                value={r.label}
                onChange={(e) => update(r.id, 'label', e.target.value)}
                placeholder="e.g. Design invoice"
              />
            )}
            <button className="icon-btn" onClick={() => remove(r.id)} title="Remove recipient" disabled={rows.length <= 1}>
              <Trash2 size={16} />
            </button>
          </div>
          {errors.has(r.id) && (
            <div className="row-error"><AlertCircle size={13} /> {errors.get(r.id)}</div>
          )}
        </div>
      ))}
      <div className="editor-actions">
        <button className="btn btn-outline btn-sm" onClick={add} disabled={rows.length >= MAX_BATCH}>
          <Plus size={15} /> Add recipient
        </button>
        <span className="editor-total">
          Total <strong>{fmt(total)} {TOKEN_SYMBOL}</strong> · {rows.length} recipient{rows.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
