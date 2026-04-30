import type { Order, RestaurantMenu, WeatherDay, MenuItem } from '@swiggypulse/mcp-mock';

export interface PeriodMetrics {
  orders: number;
  revenue: number;
  aov: number;
  cancellationRate: number;
  avgDeliveryTimeMinutes: number;
}

export interface RestaurantMetrics {
  total: PeriodMetrics & {
    last7d: PeriodMetrics;
    last30d: PeriodMetrics;
    last90d: PeriodMetrics;
  };
  peakHours: { hour: number; orders: number }[];
  hourlyHeatmap: { dow: number; hour: number; orders: number }[];
  dailySeries: { date: string; orders: number; revenue: number; isRainy: boolean }[];
  repeatCustomerRate: number;
  couponUtilizationRate: number;
}

export interface ItemMetric {
  itemId: string;
  name: string;
  category: string;
  isVeg: boolean;
  unitsSold: number;
  revenue: number;
  avgRating: number;
  trendPct: number;
  marginPct: number;
  estimatedMargin: number;
}

export interface CrossSignalMetrics {
  weatherImpact: {
    correlationCoeff: number;
    rainyDayAvgOrders: number;
    clearDayAvgOrders: number;
    sensitiveItems: { itemId: string; name: string; rainMultiplier: number }[];
  };
  hourlyDistribution: { hour: number; orders: number; pctOfTotal: number }[];
  dayOfWeek: { dow: number; label: string; orders: number; revenue: number }[];
  couponPerformance: {
    code: string;
    redemptions: number;
    avgOrderValueWithCoupon: number;
    avgOrderValueOverall: number;
    estimatedIncrementalOrders: number;
    estimatedDiscountCost: number;
    roi: number;
  }[];
  coOccurringItems: { pair: [string, string]; count: number }[];
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function periodMetrics(orders: Order[]): PeriodMetrics {
  const delivered = orders.filter((o) => o.status === 'DELIVERED');
  const revenue = delivered.reduce((s, o) => s + o.total, 0);
  const cancelled = orders.length - delivered.length;
  const deliveryTimes = delivered.map((o) => o.deliveryTimeMinutes).filter((m): m is number => m !== null);
  const avgDelivery = deliveryTimes.length ? deliveryTimes.reduce((s, m) => s + m, 0) / deliveryTimes.length : 0;
  return {
    orders: orders.length,
    revenue,
    aov: delivered.length ? revenue / delivered.length : 0,
    cancellationRate: orders.length ? cancelled / orders.length : 0,
    avgDeliveryTimeMinutes: avgDelivery,
  };
}

function inLastNDays(o: Order, days: number, now: number): boolean {
  return now - new Date(o.placedAt).getTime() <= days * 86_400_000;
}

export function analyzeRestaurant(orders: Order[], weather: WeatherDay[]): RestaurantMetrics {
  const now = Date.now();
  const all = periodMetrics(orders);
  const last7d = periodMetrics(orders.filter((o) => inLastNDays(o, 7, now)));
  const last30d = periodMetrics(orders.filter((o) => inLastNDays(o, 30, now)));
  const last90d = periodMetrics(orders.filter((o) => inLastNDays(o, 90, now)));

  const hourCounts = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.placedAt).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  const peakHours = Array.from(hourCounts, ([hour, ord]) => ({ hour, orders: ord })).sort(
    (a, b) => b.orders - a.orders,
  );

  // dow-by-hour heatmap (last 30d window so the heatmap reflects current pattern)
  const last30dOrders = orders.filter((o) => inLastNDays(o, 30, now));
  const heatMap = new Map<string, number>();
  for (const o of last30dOrders) {
    const d = new Date(o.placedAt);
    const key = `${d.getDay()}-${d.getHours()}`;
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const hourlyHeatmap: RestaurantMetrics['hourlyHeatmap'] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      hourlyHeatmap.push({ dow, hour, orders: heatMap.get(`${dow}-${hour}`) ?? 0 });
    }
  }

  // Daily series with weather overlay (last 90d)
  const weatherByDate = new Map(weather.map((w) => [w.date, w]));
  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const date = o.placedAt.slice(0, 10);
    const cur = dailyMap.get(date) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    if (o.status === 'DELIVERED') cur.revenue += o.total;
    dailyMap.set(date, cur);
  }
  const dailySeries = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, m]) => ({
      date,
      orders: m.orders,
      revenue: m.revenue,
      isRainy: weatherByDate.get(date)?.isRainy ?? false,
    }));

  const customerCounts = new Map<string, number>();
  for (const o of orders) customerCounts.set(o.customerId, (customerCounts.get(o.customerId) ?? 0) + 1);
  const repeatCustomers = Array.from(customerCounts.values()).filter((c) => c > 1).length;
  const repeatCustomerRate = customerCounts.size ? repeatCustomers / customerCounts.size : 0;

  const couponedOrders = orders.filter((o) => o.couponApplied !== null).length;
  const couponUtilizationRate = orders.length ? couponedOrders / orders.length : 0;

  return {
    total: { ...all, last7d, last30d, last90d },
    peakHours,
    hourlyHeatmap,
    dailySeries,
    repeatCustomerRate,
    couponUtilizationRate,
  };
}

export function analyzeItems(orders: Order[], menu: RestaurantMenu): ItemMetric[] {
  const allMenuItems = menu.categories.flatMap((c) => c.items);
  const itemMap = new Map<string, MenuItem>(allMenuItems.map((i) => [i.id, i]));
  const now = Date.now();

  const last30d = orders.filter((o) => inLastNDays(o, 30, now) && o.status === 'DELIVERED');
  const prev30d = orders.filter((o) => {
    const t = now - new Date(o.placedAt).getTime();
    return t > 30 * 86_400_000 && t <= 60 * 86_400_000 && o.status === 'DELIVERED';
  });

  const aggregate = (subset: Order[]) => {
    const map = new Map<string, { units: number; revenue: number; ratings: number[] }>();
    for (const o of subset) {
      for (const it of o.items) {
        const cur = map.get(it.itemId) ?? { units: 0, revenue: 0, ratings: [] };
        cur.units += it.quantity;
        cur.revenue += it.quantity * it.price;
        if (o.rating !== null) cur.ratings.push(o.rating);
        map.set(it.itemId, cur);
      }
    }
    return map;
  };

  const cur = aggregate(last30d);
  const prev = aggregate(prev30d);

  return allMenuItems.map<ItemMetric>((item) => {
    const c = cur.get(item.id) ?? { units: 0, revenue: 0, ratings: [] };
    const p = prev.get(item.id) ?? { units: 0, revenue: 0, ratings: [] };
    const trendPct = p.units > 0 ? (c.units - p.units) / p.units : 0;
    const avgRating = c.ratings.length ? c.ratings.reduce((s, r) => s + r, 0) / c.ratings.length : item.rating;
    return {
      itemId: item.id,
      name: item.name,
      category: item.category,
      isVeg: item.isVeg,
      unitsSold: c.units,
      revenue: c.revenue,
      avgRating,
      trendPct,
      marginPct: itemMap.get(item.id)?.marginPct ?? 0.3,
      estimatedMargin: c.revenue * (itemMap.get(item.id)?.marginPct ?? 0.3),
    };
  });
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (!n) return 0;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

export function analyzeCrossSignals(
  orders: Order[],
  weather: WeatherDay[],
  menu: RestaurantMenu,
): CrossSignalMetrics {
  const allItems = menu.categories.flatMap((c) => c.items);
  const itemNameById = new Map(allItems.map((i) => [i.id, i.name]));

  // ---- weather impact ----
  const weatherByDate = new Map(weather.map((w) => [w.date, w]));
  const ordersByDate = new Map<string, Order[]>();
  for (const o of orders) {
    const d = o.placedAt.slice(0, 10);
    if (!ordersByDate.has(d)) ordersByDate.set(d, []);
    ordersByDate.get(d)!.push(o);
  }
  const xs: number[] = [];
  const ys: number[] = [];
  let rainyTotal = 0, clearTotal = 0, rainyDays = 0, clearDays = 0;
  for (const [date, dayOrders] of ordersByDate) {
    const w = weatherByDate.get(date);
    if (!w) continue;
    xs.push(w.rainProbability);
    ys.push(dayOrders.length);
    if (w.isRainy) { rainyTotal += dayOrders.length; rainyDays++; }
    else { clearTotal += dayOrders.length; clearDays++; }
  }
  const correlationCoeff = pearson(xs, ys);

  // Per-item rain multiplier
  const itemRainCounts = new Map<string, { rainy: number; clear: number; rainyDays: number; clearDays: number }>();
  for (const item of allItems) itemRainCounts.set(item.id, { rainy: 0, clear: 0, rainyDays, clearDays });
  for (const [date, dayOrders] of ordersByDate) {
    const w = weatherByDate.get(date);
    if (!w) continue;
    for (const o of dayOrders) {
      for (const it of o.items) {
        const cur = itemRainCounts.get(it.itemId);
        if (!cur) continue;
        if (w.isRainy) cur.rainy += it.quantity;
        else cur.clear += it.quantity;
      }
    }
  }
  const sensitiveItems = Array.from(itemRainCounts.entries())
    .map(([itemId, c]) => {
      const rainyAvg = c.rainyDays ? c.rainy / c.rainyDays : 0;
      const clearAvg = c.clearDays ? c.clear / c.clearDays : 0;
      const mult = clearAvg > 0 ? rainyAvg / clearAvg : 0;
      return { itemId, name: itemNameById.get(itemId) ?? itemId, rainMultiplier: mult };
    })
    .filter((x) => x.rainMultiplier > 1.2)
    .sort((a, b) => b.rainMultiplier - a.rainMultiplier);

  // ---- hourly distribution ----
  const hourCounts = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.placedAt).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  const total = orders.length;
  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    const ord = hourCounts.get(hour) ?? 0;
    return { hour, orders: ord, pctOfTotal: total ? ord / total : 0 };
  });

  // ---- day of week ----
  const dowMap = new Map<number, { orders: number; revenue: number }>();
  for (const o of orders) {
    const d = new Date(o.placedAt).getDay();
    const cur = dowMap.get(d) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    if (o.status === 'DELIVERED') cur.revenue += o.total;
    dowMap.set(d, cur);
  }
  const dayOfWeek = Array.from({ length: 7 }, (_, dow) => ({
    dow,
    label: DOW_LABELS[dow]!,
    orders: dowMap.get(dow)?.orders ?? 0,
    revenue: dowMap.get(dow)?.revenue ?? 0,
  }));

  // ---- coupon performance ----
  const couponMap = new Map<string, { redemptions: number; totalAOV: number }>();
  let allDeliveredAOV = 0;
  let deliveredCount = 0;
  for (const o of orders) {
    if (o.status !== 'DELIVERED') continue;
    deliveredCount++;
    allDeliveredAOV += o.total;
    if (!o.couponApplied) continue;
    const cur = couponMap.get(o.couponApplied) ?? { redemptions: 0, totalAOV: 0 };
    cur.redemptions++;
    cur.totalAOV += o.total + o.discount; // pre-discount value
    couponMap.set(o.couponApplied, cur);
  }
  const overallAOV = deliveredCount ? allDeliveredAOV / deliveredCount : 0;
  const couponPerformance = Array.from(couponMap.entries()).map(([code, m]) => {
    const aovWithCoupon = m.totalAOV / m.redemptions;
    const lift = aovWithCoupon - overallAOV;
    // Crude estimate: 30% of redemptions are incremental, rest cannibalized
    const incremental = Math.round(m.redemptions * 0.3);
    const discountCost = orders
      .filter((o) => o.couponApplied === code)
      .reduce((s, o) => s + o.discount, 0);
    const incrementalRevenue = incremental * aovWithCoupon;
    const roi = discountCost ? (incrementalRevenue - discountCost) / discountCost : 0;
    return {
      code,
      redemptions: m.redemptions,
      avgOrderValueWithCoupon: aovWithCoupon,
      avgOrderValueOverall: overallAOV,
      estimatedIncrementalOrders: incremental,
      estimatedDiscountCost: discountCost,
      roi,
      lift,
    };
  }).map(({ lift: _lift, ...rest }) => rest);

  // ---- co-occurring items ----
  const pairCounts = new Map<string, number>();
  for (const o of orders) {
    if (o.items.length < 2) continue;
    const ids = o.items.map((i) => i.itemId).sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const coOccurringItems = Array.from(pairCounts.entries())
    .map(([key, count]) => {
      const [a, b] = key.split('|');
      return { pair: [a!, b!] as [string, string], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    weatherImpact: {
      correlationCoeff,
      rainyDayAvgOrders: rainyDays ? rainyTotal / rainyDays : 0,
      clearDayAvgOrders: clearDays ? clearTotal / clearDays : 0,
      sensitiveItems,
    },
    hourlyDistribution,
    dayOfWeek,
    couponPerformance,
    coOccurringItems,
  };
}
