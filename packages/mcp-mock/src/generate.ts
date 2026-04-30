/**
 * Generates 90 days of correlated mock data:
 *  - weather.json: 90 days of Bangalore weather (April pre-monsoon pattern)
 *  - orders.json: ~90 days of orders with patterns baked in
 *
 * Patterns enforced (these power the insight engine):
 *  - Chicken Biryani orders ~2.3x on rainy days
 *  - Weekend orders ~40% higher than weekday baseline
 *  - Evening peak (7-10 PM) ~3x of afternoon (2-5 PM)
 *  - Coupon-applied orders ~25% higher AOV
 *  - ~5% cancellation rate, higher during peak hours
 *  - 3-4 restaurant-cancelled orders signaling ops issues
 *  - Mutton biryani: high margin, lower volume
 *  - Veg items: lower volume, loyal repeat customers
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU, COUPONS } from './seeds.js';
import type { Order, OrderItem, OrderStatus, PaymentMethod, WeatherDay } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

// ---- deterministic PRNG so the generated data is stable across runs ----
let seed = 42;
const rand = (): number => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const choice = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number): number => min + rand() * (max - min);
const intBetween = (min: number, max: number): number => Math.floor(between(min, max + 1));

// ---- date helpers ----
const START = new Date('2026-02-01T00:00:00+05:30');
const DAYS = 90;

const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);
const isoWithIST = (d: Date): string => {
  // Format as 2026-04-30T19:23:00+05:30 in IST
  const ist = new Date(d.getTime() + (5.5 * 60 - d.getTimezoneOffset()) * 60_000);
  return ist.toISOString().slice(0, 19) + '+05:30';
};

// ---- weather generation ----
function generateWeather(): WeatherDay[] {
  const days: WeatherDay[] = [];
  // Bangalore April: 30-35°C, 15-20 rainy days, occasional thunderstorms
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(START.getTime() + i * 86_400_000);
    const dayOfYear = Math.floor((d.getTime() - new Date('2026-01-01').getTime()) / 86_400_000);
    // Higher rain probability for the second half of the window (pre-monsoon ramp)
    const baseRainProb = 0.15 + (i / DAYS) * 0.35;
    const rainRoll = rand();
    const isRainy = rainRoll < baseRainProb;
    let condition: WeatherDay['condition'] = 'Clear';
    let rainProbability = Math.round(baseRainProb * 60);
    if (isRainy) {
      condition = rand() < 0.25 ? 'Thunderstorm' : 'Rain';
      rainProbability = intBetween(70, 95);
    } else if (rand() < 0.3) {
      condition = 'Clouds';
      rainProbability = intBetween(15, 45);
    }
    days.push({
      date: fmtDate(d),
      temp: Math.round(between(28, 36)),
      humidity: intBetween(55, 85),
      condition,
      rainProbability,
      isRainy,
    });
  }
  return days;
}

// ---- order generation ----
const ALL_ITEMS = MENU.categories.flatMap((c) => c.items);
const ITEM_BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));

const BASE_DAILY_ORDERS = 28;

// per-item base weight (relative likelihood of appearing in an order)
const ITEM_BASE_WEIGHT: Record<string, number> = {
  item_001: 1.0,   // Chicken Biryani — top seller
  item_002: 0.45,  // Mutton Biryani — premium, lower volume
  item_005: 0.55,  // Butter Chicken
  item_003: 0.25,  // Veg Biryani
  item_004: 0.30,  // Paneer Tikka
  item_006: 0.40,  // Gulab Jamun (often added on)
};

// loyal-customer veg buyer pool — same customers reorder veg items
const VEG_LOYAL_CUSTOMERS = ['cust_loyal_001', 'cust_loyal_002', 'cust_loyal_003', 'cust_loyal_004'];
// Pareto-ish customer base: 200 "regulars" who repeat often, ~1800 long-tail customers
// who mostly order once or twice. Selection biases to regulars 35% of the time.
const REGULAR_CUSTOMERS = Array.from({ length: 200 }, (_, i) => `cust_reg_${String(i + 1).padStart(3, '0')}`);
const LONG_TAIL_CUSTOMERS = Array.from({ length: 1800 }, (_, i) => `cust_${String(i + 1).padStart(4, '0')}`);
function pickCustomer(): string {
  return rand() < 0.35 ? choice(REGULAR_CUSTOMERS) : choice(LONG_TAIL_CUSTOMERS);
}

function pickHourWithEveningPeak(): number {
  // Distribution: lunch 11-14 (moderate), afternoon 14-17 (low), evening 19-22 (3x), night 22-23 (moderate)
  const r = rand();
  if (r < 0.18) return intBetween(11, 13);   // lunch
  if (r < 0.25) return intBetween(14, 16);   // afternoon (low — 7%)
  if (r < 0.30) return intBetween(17, 18);   // pre-evening
  if (r < 0.78) return intBetween(19, 21);   // peak (48%)
  if (r < 0.92) return intBetween(22, 22);   // late evening
  return intBetween(8, 10);                  // breakfast / brunch (rare)
}

function pickItemsForOrder(weather: WeatherDay, hour: number): OrderItem[] {
  const items: OrderItem[] = [];
  // Adjust biryani weight on rainy days
  const rainBiryaniBoost = weather.isRainy ? 2.3 : 1.0;
  const weights: Record<string, number> = {};
  for (const id of Object.keys(ITEM_BASE_WEIGHT)) {
    let w = ITEM_BASE_WEIGHT[id]!;
    if (id === 'item_001') w *= rainBiryaniBoost;
    if (id === 'item_002') w *= weather.isRainy ? 1.4 : 1.0;
    weights[id] = w;
  }
  // 1-3 distinct items per order; bias to 1-2
  const itemCount = rand() < 0.55 ? 1 : rand() < 0.85 ? 2 : 3;
  const picked = new Set<string>();
  for (let i = 0; i < itemCount; i++) {
    const totalW = Object.values(weights).reduce((s, w) => s + w, 0);
    let r = rand() * totalW;
    let chosenId: string | null = null;
    for (const [id, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) {
        chosenId = id;
        break;
      }
    }
    if (!chosenId || picked.has(chosenId)) continue;
    picked.add(chosenId);
    const item = ITEM_BY_ID.get(chosenId)!;
    items.push({
      itemId: item.id,
      name: item.name,
      quantity: rand() < 0.78 ? 1 : 2,
      price: item.price,
    });
  }
  // dessert add-on: 25% of orders include gulab jamun if not already
  if (!picked.has('item_006') && rand() < 0.25) {
    const item = ITEM_BY_ID.get('item_006')!;
    items.push({
      itemId: item.id,
      name: item.name,
      quantity: 1,
      price: item.price,
    });
  }
  return items.length ? items : [{
    itemId: 'item_001',
    name: 'Chicken Biryani',
    quantity: 1,
    price: 349,
  }];
}

function applyCoupon(subtotal: number, hasOnlinePayment: boolean): { code: string | null; discount: number } {
  // 32% of orders use a coupon (but only if eligible)
  if (rand() > 0.32) return { code: null, discount: 0 };
  const eligible = COUPONS.filter(
    (c) => subtotal >= c.minOrderValue && (!c.requiresOnlinePayment || hasOnlinePayment),
  );
  if (!eligible.length) return { code: null, discount: 0 };
  const c = choice(eligible);
  let discount = 0;
  if (c.discountType === 'PERCENTAGE') {
    discount = Math.min(Math.round((subtotal * c.discountValue) / 100), c.maxDiscount ?? Infinity);
  } else {
    discount = c.discountValue;
  }
  return { code: c.code, discount };
}

function generateOrders(weather: WeatherDay[]): Order[] {
  const orders: Order[] = [];
  let restaurantCancellations = 0;
  const RESTAURANT_CANCELLATION_TARGET = 4;

  for (let dayIdx = 0; dayIdx < DAYS; dayIdx++) {
    const day = weather[dayIdx]!;
    const date = new Date(day.date + 'T00:00:00+05:30');
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const weekendMultiplier = isWeekend ? 1.4 : 1.0;
    // Rain drives a real volume lift — people don't want to leave the house
    const rainVolumeMultiplier = day.isRainy ? 1.55 : 1.0;
    // Slight upward trend over the 90 days — restaurant is growing
    const growthMultiplier = 1.0 + (dayIdx / DAYS) * 0.15;
    const dailyOrders = Math.round(
      BASE_DAILY_ORDERS * weekendMultiplier * rainVolumeMultiplier * growthMultiplier * between(0.85, 1.15),
    );

    for (let i = 0; i < dailyOrders; i++) {
      const hour = pickHourWithEveningPeak();
      const minute = intBetween(0, 59);
      const placedAt = new Date(date);
      placedAt.setHours(hour, minute, intBetween(0, 59), 0);

      const isPeak = hour >= 19 && hour <= 21;
      // Veg-loyal customer boost for veg items
      const isVegLoyal = rand() < 0.08;
      let customerId: string;
      let items: OrderItem[];

      if (isVegLoyal) {
        customerId = choice(VEG_LOYAL_CUSTOMERS);
        const vegItem = ITEM_BY_ID.get(rand() < 0.6 ? 'item_003' : 'item_004')!;
        items = [{
          itemId: vegItem.id,
          name: vegItem.name,
          quantity: rand() < 0.7 ? 1 : 2,
          price: vegItem.price,
        }];
        if (rand() < 0.35) {
          const dessert = ITEM_BY_ID.get('item_006')!;
          items.push({ itemId: dessert.id, name: dessert.name, quantity: 1, price: dessert.price });
        }
      } else {
        customerId = pickCustomer();
        items = pickItemsForOrder(day, hour);
      }

      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const paymentMethod: PaymentMethod = (() => {
        const r = rand();
        if (r < 0.55) return 'COD';
        if (r < 0.80) return 'UPI';
        if (r < 0.95) return 'CARD';
        return 'WALLET';
      })();
      const isOnline = paymentMethod !== 'COD';

      const { code: couponApplied, discount } = applyCoupon(subtotal, isOnline);
      const total = Math.max(0, subtotal - discount);

      // Cancellation logic
      let status: OrderStatus = 'DELIVERED';
      let cancellationReason: string | null = null;
      const baseCancelProb = 0.05;
      const cancelProb = isPeak ? baseCancelProb * 1.5 : baseCancelProb;
      if (rand() < cancelProb) {
        if (restaurantCancellations < RESTAURANT_CANCELLATION_TARGET && rand() < 0.18) {
          status = 'CANCELLED_BY_RESTAURANT';
          cancellationReason = choice([
            'Item out of stock',
            'Kitchen overloaded',
            'Restaurant temporarily unavailable',
          ]);
          restaurantCancellations++;
        } else {
          status = 'CANCELLED_BY_CUSTOMER';
          cancellationReason = choice([
            'Changed mind',
            'Wrong address',
            'Long wait time',
          ]);
        }
      }

      const deliveryTimeMinutes = status === 'DELIVERED'
        ? Math.round(between(22, isPeak ? 48 : 38))
        : null;
      const deliveredAt = deliveryTimeMinutes !== null
        ? new Date(placedAt.getTime() + deliveryTimeMinutes * 60_000)
        : null;

      const rating: number | null = status === 'DELIVERED'
        ? (rand() < 0.55 ? null : intBetween(3, 5))
        : null;

      orders.push({
        orderId: `ord_${day.date.replace(/-/g, '')}_${String(i + 1).padStart(3, '0')}`,
        restaurantId: 'rest_bh_001',
        customerId,
        items,
        subtotal,
        discount,
        total,
        status,
        placedAt: isoWithIST(placedAt),
        deliveredAt: deliveredAt ? isoWithIST(deliveredAt) : null,
        deliveryTimeMinutes,
        paymentMethod,
        couponApplied,
        rating,
        cancellationReason,
      });
    }
  }
  return orders;
}

const weather = generateWeather();
const orders = generateOrders(weather);

writeFileSync(join(DATA_DIR, 'weather.json'), JSON.stringify(weather, null, 2));
writeFileSync(join(DATA_DIR, 'orders.json'), JSON.stringify(orders, null, 2));

const totalRevenue = orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0);
const cancellations = orders.filter((o) => o.status !== 'DELIVERED').length;
const restoCancellations = orders.filter((o) => o.status === 'CANCELLED_BY_RESTAURANT').length;
const rainyDays = weather.filter((w) => w.isRainy).length;

console.log(`Generated ${weather.length} weather days (${rainyDays} rainy)`);
console.log(`Generated ${orders.length} orders`);
console.log(`  Delivered: ${orders.length - cancellations} (revenue ₹${totalRevenue.toLocaleString('en-IN')})`);
console.log(`  Cancelled (customer): ${cancellations - restoCancellations}`);
console.log(`  Cancelled (restaurant): ${restoCancellations}`);
