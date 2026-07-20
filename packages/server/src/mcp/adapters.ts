import type {
  Restaurant,
  RestaurantMenu,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  Coupon,
  DineoutRestaurant,
  InstamartProduct,
} from '@swiggypulse/mcp-mock';

/**
 * Live-shape adapters.
 *
 * Swiggy's real MCP tool output is not guaranteed to match the mock TS shapes the
 * analyzer consumes (which include merchant-only fields like per-order financials,
 * menu margins and weekly covers that a consumer-commerce MCP may not expose).
 *
 * Each adapter tries to coerce a raw tool result into the expected shape. It returns
 * `null` when the live data lacks the analyzer-critical structure — that signals the
 * caller to fall back to mock data (logged) rather than crash or render garbage.
 *
 * Adapters are intentionally lenient on cosmetic fields (defaulted) and strict on the
 * fields the analytics actually depend on.
 */

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false): boolean => (typeof v === 'boolean' ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Find the first array under one of `keys`, unwrapping a `data`/`result` envelope. */
function findArray(raw: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (isRec(raw)) {
    for (const k of keys) if (Array.isArray(raw[k])) return raw[k] as unknown[];
    for (const env of ['data', 'result', 'response']) {
      if (raw[env] !== undefined) {
        const nested = findArray(raw[env], keys);
        if (nested) return nested;
      }
    }
  }
  return null;
}

/** Find the object carrying the payload, unwrapping a `data`/`result` envelope. */
function findObject(raw: unknown, keys: string[]): Rec | null {
  if (!isRec(raw)) return null;
  for (const k of keys) if (isRec(raw[k])) return raw[k] as Rec;
  for (const env of ['data', 'result', 'response']) {
    if (isRec(raw[env])) {
      const nested = findObject(raw[env], keys);
      if (nested) return nested;
    }
  }
  return raw;
}

export interface Adapted<T> {
  value: T;
  /** Analyzer-critical fields that had to be defaulted because live data omitted them. */
  degraded: string[];
}

export type ToolAdapter = (raw: unknown) => Adapted<unknown> | null;

// --- search_restaurants -> { restaurants: Restaurant[] } ---
function adaptRestaurants(raw: unknown): Adapted<{ restaurants: Restaurant[] }> | null {
  const list = findArray(raw, ['restaurants', 'results', 'cards']);
  if (!list) return null;
  const restaurants: Restaurant[] = [];
  for (const r of list) {
    if (!isRec(r)) continue;
    const id = str(r['id'] ?? r['restaurantId']);
    const name = str(r['name']);
    if (!id && !name) continue; // not a restaurant record
    restaurants.push({
      id: id || name,
      name,
      cuisines: arr(r['cuisines']).map((c) => str(c)),
      rating: num(r['rating'] ?? r['avgRating']),
      ratingCount: num(r['ratingCount']),
      deliveryTime: str(r['deliveryTime']),
      deliveryTimeSpoken: str(r['deliveryTimeSpoken']),
      costForTwo: num(r['costForTwo']),
      availabilityStatus: r['availabilityStatus'] === 'CLOSED' ? 'CLOSED' : 'OPEN',
      distance: num(r['distance']),
      locality: str(r['locality'] ?? r['areaName']),
      hasWidgets: bool(r['hasWidgets']),
    });
  }
  if (restaurants.length === 0) return null;
  return { value: { restaurants }, degraded: [] };
}

// --- get_restaurant_menu -> RestaurantMenu ---
function adaptMenu(raw: unknown): Adapted<RestaurantMenu> | null {
  const cats = findArray(raw, ['categories', 'menu', 'menuCategories']);
  if (!cats) return null;
  const degraded = new Set<string>();
  const categories: MenuCategory[] = [];
  for (const c of cats) {
    if (!isRec(c)) continue;
    const items: MenuItem[] = [];
    for (const it of arr(c['items'])) {
      if (!isRec(it)) continue;
      const id = str(it['id'] ?? it['itemId']);
      const name = str(it['name']);
      if (!id && !name) continue;
      if (it['marginPct'] === undefined) degraded.add('menuItem.marginPct');
      items.push({
        id: id || name,
        name,
        ...(typeof it['description'] === 'string' ? { description: it['description'] } : {}),
        price: num(it['price']),
        isVeg: bool(it['isVeg']),
        isBestseller: bool(it['isBestseller']),
        rating: num(it['rating']),
        ratingCount: num(it['ratingCount']),
        category: str(c['name']),
        marginPct: num(it['marginPct']),
      });
    }
    if (items.length > 0) categories.push({ name: str(c['name']), items });
  }
  if (categories.length === 0) return null;
  const obj = findObject(raw, ['menu']) ?? {};
  return { value: { restaurantId: str(obj['restaurantId']), categories }, degraded: [...degraded] };
}

// --- get_food_orders -> { orders: Order[] } ---
function adaptOrders(raw: unknown): Adapted<{ orders: Order[] }> | null {
  const list = findArray(raw, ['orders', 'orderHistory', 'history']);
  if (!list) return null;
  const orders: Order[] = [];
  for (const o of list) {
    if (!isRec(o)) continue;
    // Analyzer-critical: financials + timestamp + status. Reject records without them
    // (e.g. a consumer order-history shape that lacks per-order merchant totals).
    if (typeof o['total'] !== 'number' || typeof o['placedAt'] !== 'string') continue;
    const items: OrderItem[] = arr(o['items'])
      .filter(isRec)
      .map((it) => ({
        itemId: str(it['itemId'] ?? it['id']),
        name: str(it['name']),
        quantity: num(it['quantity'], 1),
        price: num(it['price']),
      }));
    const status = o['status'];
    orders.push({
      orderId: str(o['orderId'] ?? o['id']),
      restaurantId: str(o['restaurantId']),
      customerId: str(o['customerId']),
      items,
      subtotal: num(o['subtotal'], num(o['total'])),
      discount: num(o['discount']),
      total: num(o['total']),
      status:
        status === 'CANCELLED_BY_CUSTOMER' || status === 'CANCELLED_BY_RESTAURANT'
          ? status
          : 'DELIVERED',
      placedAt: str(o['placedAt']),
      deliveredAt: typeof o['deliveredAt'] === 'string' ? o['deliveredAt'] : null,
      deliveryTimeMinutes: typeof o['deliveryTimeMinutes'] === 'number' ? o['deliveryTimeMinutes'] : null,
      paymentMethod:
        o['paymentMethod'] === 'UPI' ||
        o['paymentMethod'] === 'CARD' ||
        o['paymentMethod'] === 'WALLET'
          ? o['paymentMethod']
          : 'COD',
      couponApplied: typeof o['couponApplied'] === 'string' ? o['couponApplied'] : null,
      rating: typeof o['rating'] === 'number' ? o['rating'] : null,
      cancellationReason: typeof o['cancellationReason'] === 'string' ? o['cancellationReason'] : null,
    });
  }
  if (orders.length === 0) return null; // array existed but nothing looked like a merchant order
  return { value: { orders }, degraded: [] };
}

// --- fetch_food_coupons -> { coupons: Coupon[] } ---
function adaptCoupons(raw: unknown): Adapted<{ coupons: Coupon[] }> | null {
  const list = findArray(raw, ['coupons', 'offers']);
  if (!list) return null;
  const coupons: Coupon[] = [];
  for (const c of list) {
    if (!isRec(c)) continue;
    const code = str(c['code']);
    const title = str(c['title']);
    if (!code && !title) continue;
    coupons.push({
      code: code || title,
      title,
      description: str(c['description']),
      discountType: c['discountType'] === 'FLAT' ? 'FLAT' : 'PERCENTAGE',
      discountValue: num(c['discountValue']),
      ...(c['maxDiscount'] !== undefined ? { maxDiscount: num(c['maxDiscount']) } : {}),
      minOrderValue: num(c['minOrderValue']),
      requiresOnlinePayment: bool(c['requiresOnlinePayment']),
      isApplicable: bool(c['isApplicable'], true),
      ...(typeof c['expiresAt'] === 'string' ? { expiresAt: c['expiresAt'] } : {}),
    });
  }
  if (coupons.length === 0) return null;
  return { value: { coupons }, degraded: [] };
}

// --- get_restaurant_details -> DineoutRestaurant ---
function adaptDineout(raw: unknown): Adapted<DineoutRestaurant> | null {
  const o = findObject(raw, ['dineout', 'restaurant']);
  if (!o) return null;
  // Merchant-critical: weekly covers drive the dineout analytics. Without them this
  // isn't the partner-side detail the app needs.
  const wc = o['weeklyCovers'];
  if (!isRec(wc)) return null;
  const slots = isRec(o['slots']) ? (o['slots'] as Rec) : {};
  return {
    value: {
      restaurantId: str(o['restaurantId']),
      name: str(o['name']),
      dineoutRating: num(o['dineoutRating']),
      costForTwo: num(o['costForTwo']),
      availability:
        o['availability'] === 'WAITLIST' || o['availability'] === 'CLOSED'
          ? o['availability']
          : 'AVAILABLE',
      highlights: arr(o['highlights']).map((h) => str(h)),
      offers: arr(o['offers'])
        .filter(isRec)
        .map((of) => ({ title: str(of['title']), type: str(of['type']) })),
      slots: { lunch: arr(slots['lunch']).map((s) => str(s)), dinner: arr(slots['dinner']).map((s) => str(s)) },
      weeklyCovers: {
        mon: num(wc['mon']),
        tue: num(wc['tue']),
        wed: num(wc['wed']),
        thu: num(wc['thu']),
        fri: num(wc['fri']),
        sat: num(wc['sat']),
        sun: num(wc['sun']),
      },
    },
    degraded: [],
  };
}

// --- your_go_to_items -> { products: InstamartProduct[] } ---
function adaptInstamart(raw: unknown): Adapted<{ products: InstamartProduct[] }> | null {
  const list = findArray(raw, ['products', 'items']);
  if (!list) return null;
  const products: InstamartProduct[] = [];
  for (const p of list) {
    if (!isRec(p)) continue;
    const id = str(p['id'] ?? p['productId']);
    const name = str(p['name']);
    if (!id && !name) continue;
    products.push({
      id: id || name,
      name,
      category: str(p['category']),
      price: num(p['price']),
      unit: str(p['unit']),
      inStock: bool(p['inStock'], true),
      ...(typeof p['imageUrl'] === 'string' ? { imageUrl: p['imageUrl'] } : {}),
    });
  }
  if (products.length === 0) return null;
  return { value: { products }, degraded: [] };
}

export const TOOL_ADAPTERS: Record<string, ToolAdapter> = {
  search_restaurants: adaptRestaurants,
  get_restaurant_menu: adaptMenu,
  get_food_orders: adaptOrders,
  fetch_food_coupons: adaptCoupons,
  get_restaurant_details: adaptDineout,
  your_go_to_items: adaptInstamart,
};

/** Short, safe summary of a raw payload for logging when an adapter rejects it. */
export function rawShapeSummary(raw: unknown): string {
  try {
    if (Array.isArray(raw)) return `array[${raw.length}]`;
    if (isRec(raw)) return `object{${Object.keys(raw).slice(0, 12).join(',')}}`;
    return typeof raw;
  } catch {
    return 'unserializable';
  }
}
