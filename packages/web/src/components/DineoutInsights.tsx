import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { SkeletonCard } from './common/Spinner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function DineoutInsights() {
  const { data, loading } = useApi(() => api.dineout(), []);

  if (loading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">Dine-in vs Delivery</h1>
        <SkeletonCard />
      </div>
    );
  }

  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayKeyMap: Record<number, keyof typeof data.dineout.weeklyCovers> = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
  };

  const series = dowOrder.map((dow) => {
    const dowData = data.dayOfWeek.find((d) => d.dow === dow);
    const deliveryAvg = (dowData?.orders ?? 0) / 13; // 13 weeks roughly in 90 days
    return {
      day: dowData?.label ?? '',
      delivery: Math.round(deliveryAvg),
      dineIn: data.dineout.weeklyCovers[dayKeyMap[dow]!],
    };
  });

  // Insight: days where dine-in is low but delivery is high (and vice versa)
  const totalDelivery = series.reduce((s, d) => s + d.delivery, 0);
  const totalDineIn = series.reduce((s, d) => s + d.dineIn, 0);
  const dineInGapDays = series.filter((d) => d.delivery > totalDelivery / 7 * 1.1 && d.dineIn < totalDineIn / 7 * 0.9);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Dine-in vs Delivery</h1>
        <p className="text-sm text-slate-400 mt-0.5">Weekly pattern from Swiggy Dineout vs delivery orders</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Dine-in rating</div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{data.dineout.dineoutRating.toFixed(1)} ★</div>
          <div className="text-xs text-slate-500 mt-1">on Swiggy Dineout</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Cost for two</div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">₹{data.dineout.costForTwo}</div>
          <div className="text-xs text-slate-500 mt-1">dine-in average</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Highlights</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.dineout.highlights.map((h) => (
              <Badge key={h} variant="default">{h}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Weekly comparison" subtitle="Delivery orders/day (avg) vs Dineout covers/day">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" />
              <XAxis dataKey="day" stroke="#5a6781" tick={{ fontSize: 11 }} />
              <YAxis stroke="#5a6781" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #2d3648', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="delivery" fill="#22d3a3" name="Delivery (orders)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dineIn" fill="#a855f7" name="Dine-in (covers)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {dineInGapDays.length > 0 && (
        <Card title="Opportunity">
          <p className="text-sm text-slate-300 leading-relaxed">
            On {dineInGapDays.map((d) => d.day).join(', ')}, your delivery is well above average but
            dine-in is below average. These are your prime days to push a Dineout offer to capture more
            walk-in revenue at a higher per-head spend (~₹600 vs delivery AOV).
          </p>
        </Card>
      )}
    </div>
  );
}
