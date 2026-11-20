import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits, isAddress, getAddress } from 'viem';
import { TOKEN_DECIMALS, MAX_BATCH } from './config.js';

export const fmt = (value, decimals = TOKEN_DECIMALS) => {
  if (value === undefined || value === null) return '0';
  const s = formatUnits(BigInt(value), decimals);
  const [whole, frac = ''] = s.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
};

export const parseAmount = (str) => {
  try {
    if (str === '' || str === null || str === undefined) return null;
    return parseUnits(String(str).trim(), TOKEN_DECIMALS);
  } catch {
    return null;
  }
};

export const short = (addr = '') =>
  addr && addr.length > 13 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

export const isValidAddress = (a) => {
  try {
    return isAddress(a, { strict: false });
  } catch {
    return false;
  }
};

export const checksum = (a) => {
  try {
    return getAddress(a);
  } catch {
    return a;
  }
};

let rowSeq = 1;
export const newRow = (address = '', amount = '', label = '') => ({
  id: rowSeq++,
  address,
  amount: String(amount),
  label,
});

// Validate a batch draft. Returns { errors: Map<rowId, string>, warnings: string[], valid: boolean, total: bigint }
export function validateBatch(rows) {
  const errors = new Map();
  const warnings = [];
  let total = 0n;
  const seen = new Map();
  if (!rows.length) warnings.push('Batch is empty. Add at least one recipient.');
  if (rows.length > MAX_BATCH) {
    warnings.push(`Batch has ${rows.length} recipients, the contract allows at most ${MAX_BATCH}.`);
  }
  for (const r of rows) {
    const addr = (r.address || '').trim();
    if (!addr) {
      errors.set(r.id, 'Address is missing.');
      continue;
    }
    if (!isValidAddress(addr)) {
      errors.set(r.id, 'Not a valid address.');
      continue;
    }
    const key = addr.toLowerCase();
    if (seen.has(key)) warnings.push(`Duplicate address ${short(addr)} appears more than once.`);
    seen.set(key, true);
    const amt = parseAmount(r.amount);
    if (amt === null) errors.set(r.id, 'Amount is not a valid number.');
    else if (amt <= 0n) errors.set(r.id, 'Amount must be more than 0.');
    else total += amt;
  }
  return { errors, warnings, valid: errors.size === 0 && rows.length > 0 && rows.length <= MAX_BATCH, total };
}

// ---------------------------------------------------------------------------
// Shared batch draft: one draft shared by Bulk Pay, CSV Upload, AI and
// RelayDrops, exactly like the plan's BatchDraft model.
// ---------------------------------------------------------------------------
const DraftContext = createContext(null);

export function DraftProvider({ children }) {
  const [rows, setRows] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('relaypay-draft') || 'null');
      if (saved && Array.isArray(saved.rows)) {
        rowSeq = saved.rows.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
        return saved.rows;
      }
    } catch { /* ignore */ }
    return [newRow()];
  });
  const [source, setSource] = useState('manual');

  useEffect(() => {
    try {
      localStorage.setItem('relaypay-draft', JSON.stringify({ rows }));
    } catch { /* ignore */ }
  }, [rows]);

  const value = useMemo(
    () => ({ rows, setRows, source, setSource }),
    [rows, source],
  );
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export const useDraft = () => useContext(DraftContext);

// Ticking clock for countdowns (1s).
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function timeLeft(unixSeconds, now) {
  const diff = Number(unixSeconds) - now;
  if (diff <= 0) return 'due now';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

export const fmtDateTime = (unixSeconds) =>
  new Date(Number(unixSeconds) * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
