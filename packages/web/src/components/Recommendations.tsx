import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from './common/Card';
import { Badge } from './common/Badge';
import { SkeletonCard } from './common/Spinner';

export function Recommendations() {
  const { data, loading } = useApi(() => api.recommendations(), []);

  if (loading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">Recommendations</h1>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Recommendations</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {data.recommendations.length} AI-generated growth actions, sorted by priority
        </p>
      </div>

      <div className="space-y-4">
        {data.recommendations.map((r) => {
          const variant = r.priority === 'HIGH' ? 'danger' : r.priority === 'MEDIUM' ? 'warn' : 'info';
          return (
            <Card key={r.id}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <Badge variant={variant}>{r.priority}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-100">{r.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{r.type}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{r.insight}</p>
                  <div className="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Suggested action</div>
                    <p className="text-sm text-slate-200">{r.action}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs flex-wrap">
                    <span className="text-slate-400">
                      Impact: <span className="text-slate-200">{r.estimatedImpact}</span>
                    </span>
                    <span className="text-slate-400">
                      Revenue: <span className="text-teal-400 font-medium">{r.estimatedRevenue}</span>
                    </span>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>•</span>
                      <span>{r.dataPoints.join(' · ')}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20">
                    Apply
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
