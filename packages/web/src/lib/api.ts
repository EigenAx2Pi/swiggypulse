const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; mode: string }>('/health'),
  restaurant: () => request<{ restaurant: import('../types').Restaurant; mode: string }>('/restaurant'),
  dashboard: () => request<{ restaurant: import('../types').RestaurantMetrics }>('/dashboard'),
  menu: () =>
    request<{ menu: import('../types').RestaurantMenu; items: import('../types').ItemMetric[] }>('/menu'),
  coupons: () =>
    request<{ coupons: import('../types').Coupon[]; performance: import('../types').CouponPerformance[] }>(
      '/coupons',
    ),
  weather: () =>
    request<{ weather: import('../types').WeatherDay[]; impact: import('../types').WeatherImpact }>('/weather'),
  dineout: () =>
    request<{ dineout: import('../types').DineoutData; dayOfWeek: import('../types').DayOfWeekMetric[] }>(
      '/dineout',
    ),
  recommendations: () =>
    request<{ recommendations: import('../types').Recommendation[] }>('/recommendations'),
  chat: (message: string, history: import('../types').ChatTurn[]) =>
    request<{ answer: string; source: 'claude' | 'precanned' }>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history: history.map((h) => ({ role: h.role, content: h.content })),
      }),
    }),
};
