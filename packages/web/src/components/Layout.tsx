import { NavLink, Outlet } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◇' },
  { to: '/menu', label: 'Menu Performance', icon: '☷' },
  { to: '/coupons', label: 'Coupon Analysis', icon: '◐' },
  { to: '/weather', label: 'Weather Impact', icon: '☂' },
  { to: '/recommendations', label: 'Recommendations', icon: '⚡' },
  { to: '/dineout', label: 'Dine-in vs Delivery', icon: '◧' },
  { to: '/chat', label: 'Chat Copilot', icon: '✦' },
];

export function Layout() {
  const { data } = useApi(() => api.restaurant(), []);
  const restaurantName = data?.restaurant.name ?? 'Loading…';
  const mode = data?.mode ?? 'mock';

  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-teal-600 flex items-center justify-center text-slate-950 font-bold text-sm">SP</div>
            <div>
              <div className="font-semibold text-slate-100 text-sm">SwiggyPulse</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Growth Copilot</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 border-l-2 border-accent'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-l-2 border-transparent'
                }`
              }
            >
              <span className="w-4 text-center text-slate-500">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-5 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-swiggy">●</span>
            <span>Powered by Swiggy</span>
          </div>
          <div className="mt-1">v0.1.0</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-200">{restaurantName}</div>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-xs text-slate-400">Koramangala, Bangalore</span>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'mock' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                <span>🔧</span>
                Mock Mode
              </span>
            )}
            <span className="text-xs text-slate-500">Powered by</span>
            <span className="text-sm font-semibold text-swiggy">Swiggy</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
