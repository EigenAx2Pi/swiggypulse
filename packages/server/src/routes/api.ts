import { Router, type Router as RouterType } from 'express';
import { getMCPClient } from '../mcp/client.js';
import { analyzeRestaurant, analyzeItems, analyzeCrossSignals } from '../agent/analyzer.js';
import { generateRecommendations } from '../agent/recommendations.js';
import { answerChat } from '../agent/chat.js';
import { getWeather } from '../enrichment/weather.js';
import type { Order, RestaurantMenu, Coupon, DineoutRestaurant, InstamartProduct, Restaurant } from '@swiggypulse/mcp-mock';

const router: RouterType = Router();
const mcp = getMCPClient();

// Cache analysis output across requests (mock data doesn't change between requests)
let _cache: {
  ts: number;
  restaurant: Restaurant;
  menu: RestaurantMenu;
  orders: Order[];
  coupons: Coupon[];
  dineout: DineoutRestaurant;
  instamart: InstamartProduct[];
  weather: Awaited<ReturnType<typeof getWeather>>;
} | null = null;

const CACHE_TTL_MS = 60_000;

async function loadAll() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache;
  const [restRes, menuRes, ordersRes, couponsRes, dineoutRes, imRes, weather] = await Promise.all([
    mcp.callTool<{ restaurants: Restaurant[] }>('search_restaurants'),
    mcp.callTool<RestaurantMenu>('get_restaurant_menu', { restaurantId: 'rest_bh_001' }),
    mcp.callTool<{ orders: Order[] }>('get_food_orders', { restaurantId: 'rest_bh_001', days: 90 }),
    mcp.callTool<{ coupons: Coupon[] }>('fetch_food_coupons'),
    mcp.callTool<DineoutRestaurant>('get_restaurant_details', { restaurantId: 'rest_bh_001_dineout' }),
    mcp.callTool<{ products: InstamartProduct[] }>('your_go_to_items'),
    getWeather(),
  ]);
  _cache = {
    ts: Date.now(),
    restaurant: restRes.data!.restaurants[0]!,
    menu: menuRes.data!,
    orders: ordersRes.data!.orders,
    coupons: couponsRes.data!.coupons,
    dineout: dineoutRes.data!,
    instamart: imRes.data!.products,
    weather,
  };
  return _cache;
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode: process.env['USE_MOCK'] !== 'false' ? 'mock' : 'live' });
});

router.get('/restaurant', async (_req, res) => {
  const data = await loadAll();
  res.json({ restaurant: data.restaurant, mode: process.env['USE_MOCK'] !== 'false' ? 'mock' : 'live' });
});

router.get('/dashboard', async (_req, res) => {
  const data = await loadAll();
  const restaurant = analyzeRestaurant(data.orders, data.weather);
  res.json({ restaurant });
});

router.get('/menu', async (_req, res) => {
  const data = await loadAll();
  const items = analyzeItems(data.orders, data.menu);
  res.json({ menu: data.menu, items });
});

router.get('/coupons', async (_req, res) => {
  const data = await loadAll();
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  res.json({ coupons: data.coupons, performance: cross.couponPerformance });
});

router.get('/weather', async (_req, res) => {
  const data = await loadAll();
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  res.json({ weather: data.weather, impact: cross.weatherImpact });
});

router.get('/dineout', async (_req, res) => {
  const data = await loadAll();
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  res.json({ dineout: data.dineout, dayOfWeek: cross.dayOfWeek });
});

router.get('/recommendations', async (_req, res) => {
  const data = await loadAll();
  const restaurant = analyzeRestaurant(data.orders, data.weather);
  const items = analyzeItems(data.orders, data.menu);
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  const recs = generateRecommendations({
    restaurant,
    items,
    cross,
    coupons: data.coupons,
    dineout: data.dineout,
    instamart: data.instamart,
    weather: data.weather,
  });
  res.json({ recommendations: recs });
});

router.get('/cross-signals', async (_req, res) => {
  const data = await loadAll();
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  res.json({ cross });
});

router.post('/chat', async (req, res) => {
  const { message, history } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message required' });
    return;
  }
  const data = await loadAll();
  const restaurant = analyzeRestaurant(data.orders, data.weather);
  const items = analyzeItems(data.orders, data.menu);
  const cross = analyzeCrossSignals(data.orders, data.weather, data.menu);
  const reply = await answerChat({ message, history }, { restaurant, items, cross });
  res.json(reply);
});

export default router;
