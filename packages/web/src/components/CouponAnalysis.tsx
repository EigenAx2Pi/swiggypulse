import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { SkeletonCard } from './common/Spinner';

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function CouponAnalysis() {
  const { data, loading } = useApi(() => api.coupons(), []);

  if (loading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">Coupon Analysis</h1>
        <SkeletonCard />
      </div>
    );
  }

  const perfMap = new Map(data.performance.map((p) => [p.code, p]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Coupon Analysis</h1>
        <p className="text-sm text-slate-400 mt-0.5">Active coupons, redemption patterns, and ROI estimates</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.coupons.map((c) => {
          const p = perfMap.get(c.code);
          const lift = p ? p.avgOrderValueWithCoupon - p.avgOrderValueOverall : 0;
          const liftPct = p && p.avgOrderValueOverall ? lift / p.avgOrderValueOverall : 0;
          return (
            <Card key={c.code}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-semibold text-slate-100">{c.code}</span>
                    {c.requiresOnlinePayment && <Badge variant="warn">Online payment only</Badge>}
                    {!c.isApplicable && <Badge variant="default">Inactive</Badge>}
                    {c.isApplicable && <Badge variant="success">Active</Badge>}
                  </div>
                  <div className="text-sm text-slate-200">{c.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{c.description}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Min order: {fmtINR(c.minOrderValue)}
                    {c.maxDiscount && ` · Max discount: ${fmtINR(c.maxDiscount)}`}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 min-w-[440px]">
                  <Stat label="Redemptions" value={String(p?.redemptions ?? 0)} />
                  <Stat
                    label="AOV w/ coupon"
                    value={p ? fmtINR(p.avgOrderValueWithCoupon) : '—'}
                    delta={p ? `${liftPct > 0 ? '+' : ''}${(liftPct * 100).toFixed(0)}% vs avg` : undefined}
                    deltaPositive={liftPct > 0}
                  />
                  <Stat
                    label="Discount cost"
                    value={p ? fmtINR(p.estimatedDiscountCost) : '—'}
                  />
                  <Stat
                    label="Est. ROI"
                    value={p ? `${(p.roi * 100).toFixed(0)}%` : '—'}
                    deltaPositive={p ? p.roi > 0 : true}
                    accent={p && p.roi < 0 ? 'danger' : 'success'}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="What this means">
        <p className="text-sm text-slate-300 leading-relaxed">
          Negative ROI doesn't mean a coupon is bad — it means the discount is mostly going to customers
          who would have ordered anyway (cannibalization). The fix is usually a tighter eligibility rule
          (higher minimum order, first-order-only, weather-triggered) rather than killing the coupon.
        </p>
      </Card>
    </div>
  );
}

function Stat({
  label, value, delta, deltaPositive = true, accent,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accent?: 'success' | 'danger';
}) {
  const valueColor = accent === 'danger' ? 'text-red-400' : accent === 'success' ? 'text-teal-400' : 'text-slate-100';
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${valueColor}`}>{value}</div>
      {delta && (
        <div className={`text-xs mt-0.5 ${deltaPositive ? 'text-teal-400' : 'text-red-400'}`}>{delta}</div>
      )}
    </div>
  );
}
