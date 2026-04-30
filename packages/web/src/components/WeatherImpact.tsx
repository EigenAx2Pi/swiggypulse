import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { SkeletonCard } from './common/Spinner';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip } from 'recharts';

export function WeatherImpact() {
  const dash = useApi(() => api.dashboard(), []);
  const wx = useApi(() => api.weather(), []);

  if (dash.loading || wx.loading || !dash.data || !wx.data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">Weather Impact</h1>
        <SkeletonCard />
      </div>
    );
  }

  const weatherByDate = new Map(wx.data.weather.map((w) => [w.date, w]));
  const scatter = dash.data.restaurant.dailySeries.map((d) => {
    const w = weatherByDate.get(d.date);
    return {
      rainProb: w?.rainProbability ?? 0,
      orders: d.orders,
      isRainy: w?.isRainy ?? false,
    };
  });

  const upcomingRainy = wx.data.weather.slice(-7).filter((w) => w.isRainy);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Weather Impact</h1>
        <p className="text-sm text-slate-400 mt-0.5">How weather drives — or dampens — your demand</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Correlation (rain vs orders)</div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{wx.data.impact.correlationCoeff.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">Pearson · 90-day window</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Rainy day avg orders</div>
          <div className="text-2xl font-semibold text-teal-400 mt-2">{wx.data.impact.rainyDayAvgOrders.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-1">vs {wx.data.impact.clearDayAvgOrders.toFixed(0)} on clear days</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Rainy days in next 7</div>
          <div className="text-2xl font-semibold text-amber-400 mt-2">{upcomingRainy.length}</div>
          <div className="text-xs text-slate-500 mt-1">Opportunity calendar (next page)</div>
        </Card>
      </div>

      <Card title="Daily orders vs rain probability" subtitle="Each dot is one day · blue = it rained">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" />
              <XAxis
                dataKey="rainProb"
                name="Rain probability"
                stroke="#5a6781"
                tick={{ fontSize: 11 }}
                unit="%"
                domain={[0, 100]}
              />
              <YAxis
                dataKey="orders"
                name="Orders"
                stroke="#5a6781"
                tick={{ fontSize: 11 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #2d3648', borderRadius: 8, fontSize: 12 }}
              />
              <Scatter data={scatter.filter((s) => !s.isRainy)} fill="#22d3a3" />
              <Scatter data={scatter.filter((s) => s.isRainy)} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Weather-sensitive items">
          <div className="space-y-3">
            {wx.data.impact.sensitiveItems.length === 0 && (
              <p className="text-sm text-slate-400">No items show meaningful weather sensitivity.</p>
            )}
            {wx.data.impact.sensitiveItems.map((s) => (
              <div key={s.itemId} className="flex items-center justify-between">
                <span className="text-sm text-slate-200">{s.name}</span>
                <Badge variant={s.rainMultiplier > 1.8 ? 'info' : 'default'}>
                  {s.rainMultiplier.toFixed(1)}x on rain
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Opportunity calendar — next 7 days">
          <div className="space-y-2">
            {wx.data.weather.slice(-7).map((w) => (
              <div key={w.date} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">{w.date}</span>
                  <span className="text-slate-200">{w.condition}</span>
                  <span className="text-slate-500 text-xs">{w.temp}°C</span>
                </div>
                {w.isRainy ? (
                  <Badge variant="info">Set rain promo</Badge>
                ) : (
                  <span className="text-xs text-slate-500">{w.rainProbability}% rain</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
