import React, { useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import BatchEditor from '../components/BatchEditor.jsx';
import { useDraft, validateBatch } from '../lib.jsx';

export function BatchActions({ startFlow, scheduleLabel = 'Schedule this batch' }) {
  const { rows } = useDraft();
  const { valid } = validateBatch(rows);
  const [dueStr, setDueStr] = useState('');
  const dueTime = dueStr ? Math.floor(new Date(dueStr).getTime() / 1000) : 0;
  const dueValid = dueTime > Math.floor(Date.now() / 1000);

  return (
    <div className="batch-actions">
      <button className="btn btn-primary" disabled={!valid} onClick={() => startFlow({ mode: 'pay' })}>
        Pay now <ArrowRight size={16} />
      </button>
      <div className="schedule-inline">
        <label className="field-label inline">Due date and time
          <input type="datetime-local" value={dueStr} onChange={(e) => setDueStr(e.target.value)} />
        </label>
        <button className="btn btn-outline" disabled={!valid || !dueValid} onClick={() => startFlow({ mode: 'schedule', dueTime })}>
          <CalendarDays size={16} /> {scheduleLabel}
        </button>
      </div>
      {!valid && <p className="fine-print">Fix the batch first: every recipient needs a valid address and an amount above 0.</p>}
    </div>
  );
}

export default function BulkPay({ startFlow }) {
  const { rows, setRows, setSource } = useDraft();
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Recipient batch</h3>
          <p>One reviewed batch, one signature. Or put the whole batch on a schedule and the agent pays it at the due time.</p>
        </div>
      </div>
      <BatchEditor rows={rows} setRows={(r) => { setRows(r); setSource('manual'); }} />
      <BatchActions startFlow={startFlow} />
    </div>
  );
}
