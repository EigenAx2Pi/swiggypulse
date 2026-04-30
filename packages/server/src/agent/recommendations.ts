import type { RestaurantMetrics, ItemMetric, CrossSignalMetrics } from './analyzer.js';
import type { Coupon, DineoutRestaurant, InstamartProduct, WeatherDay } from '@swiggypulse/mcp-mock';

export type RecPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type RecType =
  | 'PROMOTION'
  | 'MENU'
  | 'CAPACITY'
  | 'COUPON'
  | 'CROSS_SELL'
  | 'DINE_IN'
  | 'OPS'
  | 'STRATEGY';

export interface Recommendation {
  id: string;
  type: RecType;
  priority: RecPriority;
  title: string;
  insight: string;
  action: string;
  estimatedImpact: string;
  estimatedRevenue: string;
  dataPoints: string[];
}

const fmtINR = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

export interface RecInputs {
  restaurant: RestaurantMetrics;
  items: ItemMetric[];
  cross: CrossSignalMetrics;
  coupons: Coupon[];
  dineout: DineoutRestaurant;
  instamart: InstamartProduct[];
  weather: WeatherDay[];
}

export function generateRecommendations(input: RecInputs): Recommendation[] {
  const recs: Recommendation[] = [];
  let n = 1;
  const id = () => `rec_${String(n++).padStart(3, '0')}`;

  // 1. Weather-triggered promotion
  const topRain = input.cross.weatherImpact.sensitiveItems[0];
  if (topRain && topRain.rainMultiplier > 1.5) {
    const monthlyMissed = Math.round((topRain.rainMultiplier - 1) * 8 * 4);
    const aov = input.restaurant.total.last30d.aov;
    const revImpact = monthlyMissed * aov * 0.85;
    recs.push({
      id: id(),
      type: 'PROMOTION',
      priority: 'HIGH',
      title: `Enable rain-day ${topRain.name.split(' ')[0]} promotion`,
      insight: `${topRain.name} orders increase ${topRain.rainMultiplier.toFixed(1)}x on rainy evenings. You currently have no weather-triggered promotions.`,
      action: `Create a 15% coupon on ${topRain.name} items, auto-activated when rain probability exceeds 60%.`,
      estimatedImpact: `+${monthlyMissed - 10}-${monthlyMissed + 10} orders/month`,
      estimatedRevenue: `+${fmtINR(revImpact * 0.8)}-${fmtINR(revImpact * 1.2)}/month`,
      dataPoints: ['90-day order history', 'weather correlation', 'coupon performance'],
    });
  }

  // 2. Underperforming items
  const declining = input.items
    .filter((i) => i.trendPct < -0.15 && i.unitsSold > 0)
    .sort((a, b) => a.trendPct - b.trendPct);
  if (declining.length > 0) {
    const it = declining[0]!;
    recs.push({
      id: id(),
      type: 'MENU',
      priority: 'MEDIUM',
      title: `${it.name} is trending down`,
      insight: `${it.name} sales dropped ${Math.round(Math.abs(it.trendPct) * 100)}% vs the prior 30-day window. Avg rating: ${it.avgRating.toFixed(1)}.`,
      action: 'Consider repricing, repositioning in menu order, or refreshing the description and photo.',
      estimatedImpact: 'Recover 30-40% of lost units',
      estimatedRevenue: `+${fmtINR(Math.abs(it.revenue * it.trendPct * 0.4))}/month`,
      dataPoints: ['30d vs prior 30d unit sales', 'item rating trend'],
    });
  }

  // 3. Peak-hour capacity
  const peakHour = input.restaurant.peakHours[0];
  const peakOrders = peakHour?.orders ?? 0;
  const avgHourly = input.cross.hourlyDistribution.reduce((s, h) => s + h.orders, 0) / 24;
  if (peakHour && peakOrders > avgHourly * 4) {
    recs.push({
      id: id(),
      type: 'CAPACITY',
      priority: 'MEDIUM',
      title: `Peak-hour kitchen strain at ${peakHour.hour}:00`,
      insight: `${peakHour.hour}:00 sees ${peakOrders} orders — ${(peakOrders / avgHourly).toFixed(1)}x your hourly average. Avg delivery time spikes here and cancellations increase.`,
      action: 'Stage 30% of bestseller prep 30 min before peak. Consider a smaller "Quick Picks" subset of the menu during 19:00-21:00.',
      estimatedImpact: 'Cut peak-hour cancellations by ~40%',
      estimatedRevenue: `+${fmtINR(peakOrders * 0.05 * input.restaurant.total.last30d.aov * 4)}/month`,
      dataPoints: ['hourly order distribution', 'peak-hour cancellation rate'],
    });
  }

  // 4. Coupon strategy — flag cannibalizing coupons
  const lowRoi = input.cross.couponPerformance.find((c) => c.roi < 0);
  if (lowRoi) {
    recs.push({
      id: id(),
      type: 'COUPON',
      priority: 'HIGH',
      title: `${lowRoi.code} is cannibalizing demand`,
      insight: `${lowRoi.code} has ${lowRoi.redemptions} redemptions but only ~${lowRoi.estimatedIncrementalOrders} are incremental — the rest are customers who would have ordered anyway. Net ROI: ${(lowRoi.roi * 100).toFixed(0)}%.`,
      action: `Tighten ${lowRoi.code}: raise minimum order value to ₹399, restrict to first-order customers, or sunset and replace with a weather-triggered promotion.`,
      estimatedImpact: `Save ${fmtINR(lowRoi.estimatedDiscountCost * 0.6)}/month in non-incremental discount`,
      estimatedRevenue: `+${fmtINR(lowRoi.estimatedDiscountCost * 0.6)}/month margin retained`,
      dataPoints: ['coupon redemption AOV', 'incremental vs cannibalized estimate'],
    });
  }

  // 5. Cross-sell from Instamart
  const inStockSidekicks = input.instamart.filter((p) => p.inStock).slice(0, 3);
  if (inStockSidekicks.length) {
    recs.push({
      id: id(),
      type: 'CROSS_SELL',
      priority: 'LOW',
      title: 'Cross-sell pairing opportunity with Instamart',
      insight: `Customers ordering Biryani frequently restock items like ${inStockSidekicks.map((p) => p.name).join(', ')} on Instamart within 2 days.`,
      action: 'Add a post-order banner suggesting an Instamart restock order with a small bundled discount.',
      estimatedImpact: '+15-20% Instamart attach rate from food customers',
      estimatedRevenue: `+${fmtINR(input.restaurant.total.last30d.orders * 0.12 * 250)}/month (Instamart GMV)`,
      dataPoints: ['food order patterns', 'Instamart go-to items'],
    });
  }

  // 6. Dine-in vs delivery — promote dine-in when delivery is light
  const dow = input.cross.dayOfWeek;
  const weekdayDeliveryAvg = (dow[1]!.orders + dow[2]!.orders + dow[3]!.orders) / 3;
  const weekdayDineIn = (input.dineout.weeklyCovers.mon + input.dineout.weeklyCovers.tue + input.dineout.weeklyCovers.wed) / 3;
  if (weekdayDineIn < weekdayDeliveryAvg * 0.4) {
    recs.push({
      id: id(),
      type: 'DINE_IN',
      priority: 'MEDIUM',
      title: 'Dine-in is underutilized on weekdays',
      insight: `Mon-Wed dine-in averages ${Math.round(weekdayDineIn)} covers/day vs ${Math.round(weekdayDeliveryAvg)} delivery orders. Your dine-in is well below delivery on the same days.`,
      action: 'Run a "Walk-in Wednesday" 15% off-bill via Dineout. Show it as a banner on the Swiggy Dineout listing.',
      estimatedImpact: '+25-40 covers/week',
      estimatedRevenue: `+${fmtINR(35 * 600 * 4)}/month (avg ₹600/cover)`,
      dataPoints: ['weekly cover counts', 'weekday delivery volumes'],
    });
  }

  // 7. Cancellation reduction
  const cancelRate = input.restaurant.total.last30d.cancellationRate;
  if (cancelRate > 0.04) {
    recs.push({
      id: id(),
      type: 'OPS',
      priority: cancelRate > 0.08 ? 'HIGH' : 'MEDIUM',
      title: `${(cancelRate * 100).toFixed(1)}% cancellation rate is above benchmark`,
      insight: `Last 30d cancellation rate is ${(cancelRate * 100).toFixed(1)}% (industry benchmark ~3%). Restaurant-cancelled orders cluster in peak hours, suggesting capacity-driven decisions.`,
      action: 'Audit the last 20 cancellations — group by reason, timestamp, and items. Most likely root cause: bestseller stockouts during 19:00-21:00.',
      estimatedImpact: 'Halving the rate recovers ~12 orders/month',
      estimatedRevenue: `+${fmtINR(input.restaurant.total.last30d.orders * 0.02 * input.restaurant.total.last30d.aov)}/month`,
      dataPoints: ['cancellation reasons', 'peak-hour cancel patterns'],
    });
  }

  // 8. Weekend strategy
  const weekendVsWeekday = ((dow[0]!.orders + dow[6]!.orders) / 2) /
    ((dow[1]!.orders + dow[2]!.orders + dow[3]!.orders + dow[4]!.orders + dow[5]!.orders) / 5);
  if (weekendVsWeekday > 1.3) {
    recs.push({
      id: id(),
      type: 'STRATEGY',
      priority: 'MEDIUM',
      title: 'Weekends drive disproportionate volume — protect them',
      insight: `Weekends average ${weekendVsWeekday.toFixed(1)}x weekday orders. A single weekend disruption (stockout, cancellation cluster) costs more than a weekday equivalent.`,
      action: 'Pre-stage weekend inventory by Friday 4pm. Add a "weekend menu" pinned to bestsellers + 1 limited-time addition to drive AOV.',
      estimatedImpact: '+8-12% weekend AOV from limited-time items',
      estimatedRevenue: `+${fmtINR(weekendVsWeekday * input.restaurant.total.last30d.revenue * 0.1)}/month`,
      dataPoints: ['day-of-week patterns', 'weekend vs weekday AOV'],
    });
  }

  // 9. Mutton biryani — high margin under-promotion
  const mutton = input.items.find((i) => i.name === 'Mutton Biryani');
  const chicken = input.items.find((i) => i.name === 'Chicken Biryani');
  if (mutton && chicken && mutton.unitsSold < chicken.unitsSold * 0.5 && mutton.marginPct > chicken.marginPct) {
    recs.push({
      id: id(),
      type: 'MENU',
      priority: 'MEDIUM',
      title: 'Mutton Biryani is your highest-margin item but under-pushed',
      insight: `Mutton Biryani margin is ${Math.round(mutton.marginPct * 100)}% vs Chicken's ${Math.round(chicken.marginPct * 100)}%, but it sells at ${Math.round((mutton.unitsSold / chicken.unitsSold) * 100)}% of Chicken's volume.`,
      action: 'Reposition Mutton higher in the Bestsellers row, refresh the photo, and trial a "Slow-cooked" tag in the description.',
      estimatedImpact: '+15-20% Mutton volume',
      estimatedRevenue: `+${fmtINR(mutton.revenue * 0.18)}/month margin`,
      dataPoints: ['per-item margin', 'unit sales ratio'],
    });
  }

  // 10. Online-payment-only coupon flag
  const codOnly = input.coupons.find((c) => c.requiresOnlinePayment && !c.isApplicable);
  if (codOnly) {
    recs.push({
      id: id(),
      type: 'COUPON',
      priority: 'LOW',
      title: `${codOnly.code} requires online payment — most of your customers pay COD`,
      insight: `${codOnly.code} (${codOnly.title}) requires online payment, but your COD share is dominant. The coupon is effectively invisible to most customers.`,
      action: 'Either drop the online-payment requirement, or pair with a small UPI cashback to nudge payment-method shift.',
      estimatedImpact: `${codOnly.code} becomes usable to ~55% more orders`,
      estimatedRevenue: 'Hard to estimate without test',
      dataPoints: ['coupon eligibility rules', 'payment-method mix'],
    });
  }

  // 11. Repeat customer rate insight
  if (input.restaurant.repeatCustomerRate > 0.4) {
    recs.push({
      id: id(),
      type: 'STRATEGY',
      priority: 'LOW',
      title: `Strong repeat-customer base (${Math.round(input.restaurant.repeatCustomerRate * 100)}%)`,
      insight: `${Math.round(input.restaurant.repeatCustomerRate * 100)}% of customers in the last 90 days have ordered more than once. This is well above the ~25% category benchmark.`,
      action: 'Launch a quiet loyalty mechanic: every 5th order on Chicken Biryani gets a free Gulab Jamun. Use Swiggy\'s coupon system to gate it.',
      estimatedImpact: 'Lift repeat order frequency by ~10%',
      estimatedRevenue: `+${fmtINR(input.restaurant.total.last30d.revenue * 0.05)}/month`,
      dataPoints: ['repeat customer count', 'co-occurring items'],
    });
  }

  // 12. Forecast — upcoming rainy days with no promo
  const forecast = input.weather.slice(-7);
  const upcomingRainy = forecast.filter((w) => w.isRainy).length;
  if (upcomingRainy > 0) {
    recs.push({
      id: id(),
      type: 'PROMOTION',
      priority: 'HIGH',
      title: `${upcomingRainy} rainy day${upcomingRainy === 1 ? '' : 's'} in the next week — no promo set`,
      insight: `Forecast shows ${upcomingRainy} rainy day(s) in the next 7 days. Your historical rain-day biryani lift is ${(input.cross.weatherImpact.rainyDayAvgOrders / Math.max(input.cross.weatherImpact.clearDayAvgOrders, 1)).toFixed(1)}x.`,
      action: 'Schedule a 15% Biryani coupon to auto-activate on the forecasted rainy days.',
      estimatedImpact: `~${upcomingRainy * 6}-${upcomingRainy * 10} incremental orders this week`,
      estimatedRevenue: `+${fmtINR(upcomingRainy * 8 * input.restaurant.total.last30d.aov * 0.85)} this week`,
      dataPoints: ['7-day weather forecast', 'historical rain-day uplift'],
    });
  }

  return recs.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.priority] - order[b.priority];
  });
}
