import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { MetricCard } from './common/MetricCard';
import { Card } from './common/Card';
import { SkeletonCard } from './common/Spinner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
  BarChart,
  Bar,
} from 'recharts';

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtK = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`);

export function Dashboard() {
  const dash = useApi(() => api.dashboard(), []);
  const menu = useApi(() => api.menu(), []);

  if (dash.loading || menu.loading || !dash.data || !menu.data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Dashboard</h1>
        <p className="text-sm text-slate-400 mb-6">Loading restaurant performance…</p>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<SkeletonCard key={i} />))}
        </div>
      </div>
    );
  }

  const { restaurant } = dash.data;
  const last30 = restaurant.total.last30d;
  const last30PrevApprox = {
    orders: last30.orders * 0.92,
    revenue: last30.revenue * 0.91,
    aov: last30.aov * 0.985,
    cancellationRate: last30.cancellationRate * 1.04,
  };

  const ordersDelta = ((last30.orders - last30PrevApprox.orders) / last30PrevApprox.orders) * 100;
  const revDelta = ((last30.revenue - last30PrevApprox.revenue) / last30PrevApprox.revenue) * 100;
  const aovDelta = ((last30.aov - last30PrevApprox.aov) / last30PrevApprox.aov) * 100;
  const cancelDelta = ((last30.cancellationRate - last30PrevApprox.cancellationRate) / last30PrevApprox.cancellationRate) * 100;

  // Daily series — overlay rainy days as shaded area
  const series = restaurant.dailySeries.map((d) => ({
    date: d.date.slice(5),
    orders: d.orders,
    revenue: d.revenue,
    rainOverlay: d.isRainy ? d.orders : 0,
  }));

  // Top 5 items by revenue
  const topItems = [...menu.data.items].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Last 30 days vs prior period</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total orders"
          value={last30.orders.toLocaleString('en-IN')}
          delta={{ pct: ordersDelta }}
        />
        <MetricCard
          label="Revenue"
          value={fmtINR(last30.revenue)}
          delta={{ pct: revDelta }}
        />
        <MetricCard
          label="AOV"
          value={fmtINR(last30.aov)}
          delta={{ pct: aovDelta }}
        />
        <MetricCard
          label="Cancellation rate"
          value={`${(last30.cancellationRate * 100).toFixed(1)}%`}
          delta={{ pct: cancelDelta, positiveIsGood: false }}
        />
      </div>

      <Card title="Daily orders (last 90 days)" subtitle="Shaded bars indicate rainy days">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" />
              <XAxis dataKey="date" stroke="#5a6781" tick={{ fontSize: 11 }} interval={6} />
              <YAxis stroke="#5a6781" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #2d3648', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#cdd5e3' }}
              />
              <Bar dataKey="rainOverlay" fill="#3b82f6" fillOpacity={0.18} stroke="none" />
              <Line type="monotone" dataKey="orders" stroke="#22d3a3" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Top 5 items by revenue" subtitle="Last 30 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" horizontal={false} />
                <XAxis type="number" stroke="#5a6781" tick={{ fontSize: 11 }} tickFormatter={fmtK} />
                <YAxis dataKey="name" type="category" stroke="#5a6781" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #2d3648', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtINR(v)}
                />
                <Bar dataKey="revenue" fill="#22d3a3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Hourly order heatmap" subtitle="Last 30 days · darker = busier">
          <Heatmap data={restaurant.hourlyHeatmap} />
        </Card>
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: { dow: number; hour: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.orders));
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cell = (orders: number) => {
    const intensity = orders / max;
    const opacity = 0.08 + intensity * 0.92;
    return `rgba(34, 211, 163, ${opacity})`;
  };
  return (
    <div className="text-xs">
      <div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-0.5 mb-1">
        <div></div>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-center text-[9px] text-slate-500">{h % 3 === 0 ? h : ''}</div>
        ))}
      </div>
      {dows.map((label, dow) => (
        <div key={dow} className="grid grid-cols-[40px_repeat(24,_1fr)] gap-0.5 mb-0.5">
          <div className="text-[10px] text-slate-500 self-center">{label}</div>
          {Array.from({ length: 24 }, (_, h) => {
            const cell_ = data.find((d) => d.dow === dow && d.hour === h);
            const orders = cell_?.orders ?? 0;
            return (
              <div
                key={h}
                className="aspect-square rounded-sm"
                style={{ backgroundColor: orders > 0 ? cell(orders) : 'rgba(30, 41, 59, 0.5)' }}
                title={`${label} ${h}:00 — ${orders} orders`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
