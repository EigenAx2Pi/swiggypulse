import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { SkeletonCard } from './common/Spinner';
import type { ItemMetric } from '../types';

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type SortKey = 'name' | 'unitsSold' | 'revenue' | 'avgRating' | 'trendPct';

export function MenuPerformance() {
  const { data, loading } = useApi(() => api.menu(), []);
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<ItemMetric | null>(null);

  const items = useMemo(() => {
    if (!data) return [];
    return [...data.items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (loading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">Menu Performance</h1>
        <SkeletonCard />
      </div>
    );
  }

  const Th = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th
      className={`px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k && <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-100">Menu Performance</h1>
      <p className="text-sm text-slate-400 mt-0.5 mb-6">Last 30 days · click an item for detail</p>

      <Card>
        <table className="w-full">
          <thead className="border-b border-slate-800">
            <tr>
              <Th k="name" label="Item" />
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-left">Category</th>
              <Th k="unitsSold" label="Units (30d)" align="right" />
              <Th k="revenue" label="Revenue" align="right" />
              <Th k="avgRating" label="Rating" align="right" />
              <Th k="trendPct" label="Trend" align="right" />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const trendNeg = it.trendPct < -0.15;
              const trendPos = it.trendPct > 0.15;
              return (
                <tr
                  key={it.itemId}
                  className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => setSelected(it)}
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${it.isVeg ? 'bg-teal-500' : 'bg-red-500'}`} />
                      <span className="text-slate-100 font-medium">{it.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{it.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-200 text-right">{it.unitsSold}</td>
                  <td className="px-4 py-3 text-sm text-slate-200 text-right">{fmtINR(it.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-slate-200 text-right">{it.avgRating.toFixed(1)} ★</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={trendNeg ? 'text-red-400' : trendPos ? 'text-teal-400' : 'text-slate-400'}>
                      {it.trendPct > 0 ? '+' : ''}{(it.trendPct * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-96 bg-slate-900 border-l border-slate-800 h-full p-6 overflow-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">{selected.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{selected.category}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-200"
              >✕</button>
            </div>
            <div className="space-y-3">
              <Stat label="Units sold (30d)" value={String(selected.unitsSold)} />
              <Stat label="Revenue (30d)" value={fmtINR(selected.revenue)} />
              <Stat label="Avg rating" value={`${selected.avgRating.toFixed(1)} ★`} />
              <Stat label="Trend vs prior 30d" value={`${selected.trendPct > 0 ? '+' : ''}${(selected.trendPct * 100).toFixed(0)}%`} />
              <Stat label="Margin" value={`${(selected.marginPct * 100).toFixed(0)}%`} />
              <Stat label="Estimated margin (₹)" value={fmtINR(selected.estimatedMargin)} />
              <div className="pt-2">
                <Badge variant={selected.isVeg ? 'success' : 'danger'}>{selected.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-medium">{value}</span>
    </div>
  );
}
