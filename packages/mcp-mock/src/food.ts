import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESTAURANT, MENU, COUPONS, ADDRESSES } from './seeds.js';
import type { Order, MCPResponse } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

let _orders: Order[] | null = null;
function loadOrders(): Order[] {
  if (_orders) return _orders;
  const raw = readFileSync(join(DATA_DIR, 'orders.json'), 'utf-8');
  _orders = JSON.parse(raw) as Order[];
  return _orders;
}

export const foodTools = {
  get_addresses: async (): Promise<MCPResponse> => ({
    success: true,
    data: { addresses: ADDRESSES },
  }),

  search_restaurants: async (args?: { query?: string }): Promise<MCPResponse> => {
    const query = args?.query?.toLowerCase();
    const matches = !query || RESTAURANT.name.toLowerCase().includes(query) ||
      RESTAURANT.cuisines.some((c) => c.toLowerCase().includes(query));
    return {
      success: true,
      data: { restaurants: matches ? [RESTAURANT] : [] },
    };
  },

  get_restaurant_menu: async (args?: { restaurantId?: string }): Promise<MCPResponse> => {
    if (args?.restaurantId && args.restaurantId !== RESTAURANT.id) {
      return { success: false, data: null, message: 'Restaurant not found' };
    }
    return { success: true, data: MENU };
  },

  get_food_orders: async (args?: { restaurantId?: string; days?: number }): Promise<MCPResponse> => {
    const orders = loadOrders();
    const days = args?.days ?? 90;
    const cutoff = Date.now() - days * 86_400_000;
    const filtered = orders.filter((o) => new Date(o.placedAt).getTime() >= cutoff);
    return { success: true, data: { orders: filtered } };
  },

  fetch_food_coupons: async (): Promise<MCPResponse> => ({
    success: true,
    data: { coupons: COUPONS },
  }),
};
