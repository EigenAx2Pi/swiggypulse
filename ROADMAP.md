# Roadmap — SwiggyPulse (consumer-agent pivot) — ⛔ SUPERSEDED

> **CANCELLED 2026-07-20, before any code was written.** A premortem killed this plan
> on the frame: Swiggy advertises this exact use case as its own MCP hello-world, five
> free products already ship it, `get_orders` has open upstream defects (#36 stale data,
> #15 returns zero orders), and the app could never reach a second user. The "reuses the
> most existing code" criterion that carried the decision was sunk-cost, not product
> reasoning — that reuse is identical across all three candidates considered.
>
> See [DECISIONS.md](./DECISIONS.md) for the full autopsy. This file is kept only as the
> record of what was considered. **Do not execute it.** Note in particular that the
> Slice 0 procedure below is unsafe as written (it instructs committing a live response
> to a public repo) and defective (it cannot emit the schemas it promises, and crashes
> under the flag it mandates).

**Pivot decided:** 2026-07-19. The merchant-analytics premise is dead — the Swiggy
Builders Club MCP is a consumer ordering agent with no partner/merchant tools
(verified live 2026-07-02, see README "Live findings"). Signing the production
agreement would not change this. The integration layer survives; the product does not.

---

## What survives the pivot

| Asset | Verdict | Why |
|---|---|---|
| `server/src/auth/oauth.ts` | **Keep as-is** | OAuth 2.1 + PKCE + DCR against the live Swiggy issuer. Verified working. This is the crown jewel — auth is account-scoped, not merchant-scoped, so it is exactly what a consumer agent needs. |
| `server/src/mcp/client.ts` | **Keep, retarget** | Streamable-HTTP transport, per-server lazy connect, shared login, `listTools` logging. Only `TOOL_SERVER` (l.40-47) needs new tool names. |
| `server/src/mcp/adapters.ts` | **Keep, rewrite validators** | The defensive shape-adapter + fallback pattern is right. But the current validators *reject consumer-shaped data* for lacking merchant fields — that rejection logic inverts. |
| `server/src/lib/logger.ts` | Keep | Generic. |
| `web/src/components/common/*`, `hooks/useApi.ts`, `lib/api.ts` | Keep | Generic UI + fetch primitives. |
| `server/src/agent/analyzer.ts` | **Salvage the math** | `periodMetrics`, daily series, hourly/day-of-week distribution, co-occurring items all transfer. `Order` already carries both `restaurantId` and `customerId` — the consumer view groups by the former instead of the latter. Same aggregations, different key. |
| `server/src/agent/chat.ts` | Keep the shell | Handler structure + Claude/pre-canned fallback reusable. New system prompt + context payload. |
| `server/src/enrichment/weather.ts` | Keep, demote | Still valid enrichment, but it stops being a headline feature. |

## Dead weight to strip

- **`agent/recommendations.ts`** — all 8-12 generated actions are merchant verbs
  ("run a weather-triggered promo", "reprice this item"). Delete; a consumer has no
  menu to optimise.
- **Merchant metrics in `analyzer.ts`** — `marginPct` / `estimatedMargin` (a diner
  doesn't know or care about restaurant margin), `repeatCustomerRate`,
  `couponPerformance.roi` / `estimatedDiscountCost` (merchant P&L).
- **`web/src/components/`**: `MenuPerformance.tsx`, `CouponAnalysis.tsx`,
  `DineoutInsights.tsx`, `Recommendations.tsx` — all four are merchant screens.
- **`mcp-mock` seed shape** — currently *one restaurant, many customers*. The consumer
  shape is *one customer, many restaurants*. Keep `generate.ts`'s deterministic-
  correlation approach; invert the seed axis.
- **README/CLAUDE.md merchant framing** — "growth copilot for restaurant partners",
  the ROI language, the "healthier restaurants → more supply" thesis.

---

## The consumer product — three candidates

### A. Food Spend Mirror *(← MVP)*
"Where does my food money actually go?" Reads **your own** order history and reflects
it back: monthly spend trend, cuisine/restaurant concentration, your true repeat
dishes, time-of-day and late-night patterns, coupon capture rate (how much you left
on the table), cancellation friction.

- **Tools needed:** `get_food_orders` (read-only) — the one tool live testing already
  confirmed works consumer-side, returning the signed-in user's orders.
- **Risk:** lowest. No writes, no money, no cart.
- **Reuse:** highest. It is order-shaped analytics — the existing aggregation math
  re-pointed from restaurant-level to user-level.

### B. Deal Maximiser
Before ordering: cross-references your go-to dishes against live coupons and nearby
restaurants serving them, and tells you the cheapest way to get tonight's craving.

- **Tools needed:** `fetch_food_coupons` + `search_restaurants` + `get_restaurant_menu`,
  and — critically — a *pricing* path. Whether cart-preview pricing is reachable
  without committing an order is **unverified**.
- **Risk:** medium. Read-heavy, but may require cart mutation to price anything.

### C. Craving Agent
Natural language → search → cart → `place_food_order`. "Order my usual."

- **Tools needed:** the full write path.
- **Risk:** highest — spends real money from a live personal account. Needs a
  confirmation gate, spend caps, and an idempotency story before a single line is written.

**Pick: A.** It is the only one whose data dependency is already proven, it is
read-only, and it reuses the most existing code. B and C stay on the roadmap behind it;
A's order-history layer is the input B and C both need anyway, so it is not throwaway.

---

## AIDLC phases

### Inception — *in progress*
- [x] Confirm the merchant premise is unfeedable (done 2026-07-02)
- [x] Decide pivot vs shelve → **pivot to consumer** (2026-07-19)
- [x] Inventory reusable vs dead code (this document)
- [x] Draft 3 consumer use-cases, pick MVP → **A. Food Spend Mirror**
- [ ] **Slice 0 — verify the tool surface** *(blocking, user-gated)*
- [ ] Confirm scope with owner before construction

### Construction — Slice 1: Food Spend Mirror (MVP)
Scoped only after Slice 0 returns real tool names + shapes. Provisional shape:
1. Retarget `TOOL_SERVER` + adapters to the verified consumer tools.
2. Invert `mcp-mock` seeds to one-customer-many-restaurants.
3. Strip merchant metrics from `analyzer.ts`; add spend-mirror aggregations.
4. Single page replacing the 7-page dashboard: spend trend, top restaurants, top
   dishes, time-of-day, coupon capture rate.
5. Delete the four merchant screens + `recommendations.ts`.

### Operation — later
Not scoped. Depends on whether this stays a local demo or gets a hosted account model.

---

## Slice 0 — verify the tool surface (do this first)

The whole plan rests on an assertion, not a record. `client.ts:175` already logs the
tool list on connect; nothing ever wrote it down.

```bash
USE_MOCK=false LIVE_STRICT=1 pnpm dev
# then GET /auth/start, authorize with a Swiggy account
```

Capture and commit to `docs/LIVE_TOOLS.md`:
- exact tool names per server (food / instamart / dineout)
- each tool's input schema
- one real `get_food_orders` response shape (**redacted** — addresses, phone, names)

`LIVE_STRICT=1` matters: it disables the mock fallback so raw live shapes surface
instead of being silently swallowed.

**This needs the owner's Swiggy login — it cannot be automated.** Until it is done,
Slice 1's field-level design is guesswork.

---

## Open questions

1. **Does `get_food_orders` paginate, and how far back does it reach?** The merchant
   app assumed 90 days. A consumer endpoint may return only recent orders — if it
   returns 10, "spend trend" is not a product.
2. **Repo is PUBLIC** (deliberate, confirmed 2026-07-06). A tool that reads personal
   order history changes the stakes of that choice — no fixtures containing real
   order data can ever be committed.
3. **Who is the user?** If it is only ever the owner, this is a personal tool and the
   dashboard is overkill — a CLI report would do. If it is meant for others, it needs
   an account model that does not exist yet.
