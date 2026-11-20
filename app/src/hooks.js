import { useEffect, useMemo, useState } from 'react';
import { useReadContract, useReadContracts, usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem } from 'viem';
import { RELAYPAY_ADDRESS, TUSD8_ADDRESS } from './config.js';
import { RELAYPAY_ABI, ERC20_ABI } from './abi.js';

export const relaypay = { address: RELAYPAY_ADDRESS, abi: RELAYPAY_ABI };
export const tusd8 = { address: TUSD8_ADDRESS, abi: ERC20_ABI };

export function useTokenBalance(address) {
  return useReadContract({
    ...tusd8,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });
}

export function useAllowance(address) {
  return useReadContract({
    ...tusd8,
    functionName: 'allowance',
    args: address ? [address, RELAYPAY_ADDRESS] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });
}

export function useAgentInfo(address) {
  const q = useReadContract({
    ...relaypay,
    functionName: 'agentInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });
  const info = useMemo(() => {
    if (!q.data) return null;
    const [agent, perBatchCap, totalCap, spent, validUntil] = q.data;
    return { agent, perBatchCap, totalCap, spent, validUntil, isSet: agent !== '0x0000000000000000000000000000000000000000' };
  }, [q.data]);
  return { ...q, info };
}

const scheduleCall = (id) => ({
  ...relaypay,
  functionName: 'getSchedule',
  args: [BigInt(id)],
});

export function useSchedules(address) {
  const idsQ = useReadContract({
    ...relaypay,
    functionName: 'scheduleIdsOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 20000 },
  });
  const ids = useMemo(() => (idsQ.data ? [...idsQ.data].map(Number) : []), [idsQ.data]);
  const detailsQ = useReadContracts({
    contracts: ids.map(scheduleCall),
    query: { enabled: ids.length > 0, refetchInterval: 20000 },
  });
  const schedules = useMemo(() => {
    if (!detailsQ.data) return [];
    return ids.map((id, i) => {
      const r = detailsQ.data[i];
      if (!r || r.status !== 'success') return null;
      const [owner, total, dueTime, status, recipients, amounts] = r.result;
      return { id, owner, total, dueTime: Number(dueTime), status: Number(status), recipients, amounts };
    }).filter(Boolean).sort((a, b) => b.id - a.id);
  }, [detailsQ.data, ids]);
  return { schedules, isLoading: idsQ.isLoading || detailsQ.isLoading, refetch: () => { idsQ.refetch(); detailsQ.refetch(); } };
}

const dropCall = (id) => ({
  ...relaypay,
  functionName: 'getDrop',
  args: [BigInt(id)],
});

export function useDrops(address) {
  const idsQ = useReadContract({
    ...relaypay,
    functionName: 'dropIdsOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 20000 },
  });
  const ids = useMemo(() => (idsQ.data ? [...idsQ.data].map(Number) : []), [idsQ.data]);
  const detailsQ = useReadContracts({
    contracts: ids.map(dropCall),
    query: { enabled: ids.length > 0, refetchInterval: 20000 },
  });
  const drops = useMemo(() => {
    if (!detailsQ.data) return [];
    return ids.map((id, i) => {
      const r = detailsQ.data[i];
      if (!r || r.status !== 'success') return null;
      const [giver, total, claimedTotal, claimDeadline, closed, recipients] = r.result;
      return { id, giver, total, claimedTotal, claimDeadline: Number(claimDeadline), closed, recipients };
    }).filter(Boolean).sort((a, b) => b.id - a.id);
  }, [detailsQ.data, ids]);
  return { drops, isLoading: idsQ.isLoading || detailsQ.isLoading, refetch: () => { idsQ.refetch(); detailsQ.refetch(); } };
}

export function useDrop(id) {
  const q = useReadContract({
    ...relaypay,
    functionName: 'getDrop',
    args: id !== null && id !== undefined ? [BigInt(id)] : undefined,
    query: { enabled: id !== null && id !== undefined, refetchInterval: 15000 },
  });
  const drop = useMemo(() => {
    if (!q.data) return null;
    const [giver, total, claimedTotal, claimDeadline, closed, recipients] = q.data;
    return { id: Number(id), giver, total, claimedTotal, claimDeadline: Number(claimDeadline), closed, recipients };
  }, [q.data, id]);
  return { ...q, drop };
}

// Recent activity for an address, from contract events. eth_getLogs on Aevum
// is limited to 1,000 blocks per call, so we scan backwards in chunks.
const ACTIVITY_EVENTS = [
  { sig: 'event BatchPaid(address indexed owner, uint256 total, uint256 count)', kind: 'Batch paid', topic: 'owner' },
  { sig: 'event BatchScheduled(uint256 indexed id, address indexed owner, uint256 total, uint256 count, uint256 dueTime)', kind: 'Batch scheduled', topic: 'owner' },
  { sig: 'event DropCreated(uint256 indexed id, address indexed giver, uint256 total, uint256 count, uint256 claimDeadline)', kind: 'Drop created', topic: 'giver' },
  { sig: 'event DropClaimed(uint256 indexed id, address indexed claimer, uint256 amount)', kind: 'Drop claimed', topic: 'claimer' },
  { sig: 'event DropReclaimed(uint256 indexed id, address indexed giver, uint256 amount)', kind: 'Drop reclaimed', topic: 'giver' },
  { sig: 'event AgentSet(address indexed owner, address indexed agent, uint256 perBatchCap, uint256 totalCap, uint256 validUntil)', kind: 'Agent permission set', topic: 'owner' },
  { sig: 'event AgentRevoked(address indexed owner)', kind: 'Agent revoked', topic: 'owner' },
];

export function useRecentActivity(address) {
  const client = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: false });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!client || !address || !blockNumber) return;
      setLoading(true);
      try {
        const latest = blockNumber;
        const CHUNK = 1000n;
        const MAX_CHUNKS = 12; // last ~12,000 blocks
        const found = [];
        for (let i = 0n; i < BigInt(MAX_CHUNKS) && found.length < 15; i++) {
          const to = latest - i * CHUNK;
          if (to < 0n) break;
          const from = to - CHUNK + 1n < 0n ? 0n : to - CHUNK + 1n;
          const results = await Promise.all(
            ACTIVITY_EVENTS.map(async (ev) => {
              const parsed = parseAbiItem(ev.sig);
              const args = {};
              args[ev.topic] = address;
              try {
                const logs = await client.getLogs({
                  address: RELAYPAY_ADDRESS,
                  event: parsed,
                  args,
                  fromBlock: from,
                  toBlock: to,
                });
                return logs.map((l) => ({
                  kind: ev.kind,
                  txHash: l.transactionHash,
                  blockNumber: l.blockNumber,
                  total: l.args.total ?? l.args.amount ?? null,
                  count: l.args.count ?? null,
                  id: l.args.id !== undefined ? Number(l.args.id) : null,
                }));
              } catch {
                return [];
              }
            }),
          );
          for (const r of results) found.push(...r);
        }
        found.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setEvents(found.slice(0, 15));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [client, address, blockNumber]);

  return { events, loading };
}

export function useChainStats() {
  const { data: blockNumber } = useBlockNumber({ watch: true, pollingInterval: 5000 });
  return { blockNumber };
}

export const STATUS_LABEL = ['Pending', 'Executed', 'Cancelled', 'Failed'];
