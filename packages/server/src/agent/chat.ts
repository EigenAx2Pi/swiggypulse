import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../lib/logger.js';
import type { RestaurantMetrics, ItemMetric, CrossSignalMetrics } from './analyzer.js';

export interface ChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  answer: string;
  source: 'claude' | 'precanned';
}

const PRECANNED: { match: RegExp; answer: string }[] = [
  {
    match: /why.*orders?.*drop|orders?.*drop.*tuesday|drop.*last (tuesday|week)/i,
    answer: `Orders dropped 34% on Tuesday April 15. This correlates with the IPL final match (CSK vs MI), which historically reduces food delivery demand by 25-40% in Bangalore as consumers gather at venues or order in groups earlier. Your Dineout reservations were actually up 15% that evening — consider promoting dine-in specials on major sporting events.`,
  },
  {
    match: /which item.*promote|what.*promote|best item to push/i,
    answer: `Chicken Biryani has the highest revenue/order ratio and 2.3x rain-day sensitivity. With monsoon approaching, a targeted rain-day promotion could add 35-45 incremental orders/month. Mutton Biryani is your second priority — highest margin (41%) but only ~45% of Chicken's volume, so re-positioning it could be a quick win.`,
  },
  {
    match: /how.*coupons?.*perform|coupon.*performance|coupon roi/i,
    answer: `WELCOME20 drives genuine incremental demand — orders with this coupon have 28% higher AOV and most redemptions are first-time customers. BIRYANI50 is cannibalizing existing demand — 72% of redemptions come from customers who would have ordered anyway, so its effective ROI is negative once you net out the discount cost. SWIGGYIT is currently invisible to most of your COD-heavy base.`,
  },
  {
    match: /weather|rain/i,
    answer: `Rain is your strongest external signal. Pearson correlation between daily rain probability and order volume is around 0.6. Chicken Biryani is the most rain-sensitive item (2.3x lift on rainy days), followed by Mutton Biryani (~1.4x). The next 7-day forecast shows several rainy days — set up a weather-triggered Biryani coupon now to capture the upside.`,
  },
  {
    match: /peak|busy|busy hour/i,
    answer: `Your peak hour is 19:00-21:00 — about 3x your hourly average. Cancellations cluster here, which suggests capacity strain. Two suggestions: (1) pre-stage 30% of bestseller prep 30 min before peak, and (2) trial a smaller "Quick Picks" menu during peak to reduce kitchen variance.`,
  },
  {
    match: /dine.?in|dineout|covers/i,
    answer: `Your dine-in is underutilized Mon-Wed (avg 27 covers/day) compared to weekend (avg 60 covers/day). Delivery is steady through the week, so dine-in is the under-monetized lever. A "Walk-in Wednesday" 15% off-bill via Dineout could lift weekday covers 25-40 per week — and Dineout customers tend to spend more per head than delivery (₹600 vs your delivery AOV).`,
  },
];

function fallbackAnswer(message: string): string {
  for (const p of PRECANNED) {
    if (p.match.test(message)) return p.answer;
  }
  return `I can answer questions about your restaurant's performance, weather impact, coupon effectiveness, peak hours, and dine-in vs delivery patterns. Try: "Which item should I promote?" or "How are my coupons performing?" or "Why did orders drop last Tuesday?"`;
}

interface ChatContext {
  restaurant: RestaurantMetrics;
  items: ItemMetric[];
  cross: CrossSignalMetrics;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

function buildContextSummary(ctx: ChatContext): string {
  const r = ctx.restaurant.total.last30d;
  const top3 = [...ctx.items].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  const sensitive = ctx.cross.weatherImpact.sensitiveItems.slice(0, 3);
  return [
    `Restaurant performance (last 30d):`,
    `- Orders: ${r.orders}, Revenue: ₹${Math.round(r.revenue).toLocaleString('en-IN')}, AOV: ₹${Math.round(r.aov)}`,
    `- Cancellation rate: ${(r.cancellationRate * 100).toFixed(1)}%`,
    `- Avg delivery: ${r.avgDeliveryTimeMinutes.toFixed(0)} min`,
    `- Repeat customer rate: ${(ctx.restaurant.repeatCustomerRate * 100).toFixed(0)}%`,
    `Top items by revenue: ${top3.map((i) => `${i.name} (₹${Math.round(i.revenue)})`).join(', ')}`,
    `Weather-sensitive items: ${sensitive.map((s) => `${s.name} (${s.rainMultiplier.toFixed(1)}x on rain)`).join(', ')}`,
    `Coupon performance: ${ctx.cross.couponPerformance.map((c) => `${c.code}: ${c.redemptions} redemptions, ROI ${(c.roi * 100).toFixed(0)}%`).join('; ')}`,
  ].join('\n');
}

export async function answerChat(req: ChatRequest, ctx: ChatContext): Promise<ChatResponse> {
  const a = anthropic();
  if (!a) {
    return { answer: fallbackAnswer(req.message), source: 'precanned' };
  }
  try {
    const system = `You are SwiggyPulse, an AI growth copilot for a Swiggy restaurant partner. Answer questions concisely (2-4 sentences max) using the data context provided. Always be specific — cite numbers when relevant. Never make up data not present in the context. If the question is outside scope, redirect to performance/coupons/weather/peak-hour topics.\n\nContext:\n${buildContextSummary(ctx)}`;
    const res = await a.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system,
      messages: [
        ...(req.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: req.message },
      ],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return { answer: text || fallbackAnswer(req.message), source: 'claude' };
  } catch (err) {
    logger.warn('Claude API call failed, falling back to precanned', { err: String(err) });
    return { answer: fallbackAnswer(req.message), source: 'precanned' };
  }
}
