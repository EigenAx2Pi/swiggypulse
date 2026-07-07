---
project: swiggypulse
mode: Frozen
stage: Building
tag: PARKED
wip: false
spine: false
track: C-Showcase
next_action: DECIDE pivot-to-consumer-agent vs shelf — merchant-analytics premise
  is unfeedable by the consumer-only Swiggy MCP (verified live 2026-07-02). Integration
  code is reusable for a consumer-side agent.
last_touched: '2026-07-06'
---
# Status — SwiggyPulse

**Last updated:** 2026-07-01

## Focus
Real Swiggy MCP integration wired. Builders Club approved SwiggyPulse (2026-06-30),
and dynamic client registration is open — so live mode works on localhost WITHOUT
signing the partner agreement (agreement/PAN only gates production).

## Done this session
- Added `@modelcontextprotocol/sdk` (1.29.0) to the server package.
- Implemented `SwiggyOAuthProvider` (OAuth 2.1 + PKCE, DCR) against the *verified* live
  endpoints — issuer `https://mcp.swiggy.com/auth`, register/authorize/token. The old
  skeleton's guessed `/oauth/authorize` was wrong and is replaced.
- Implemented `RealMCPClient` over streamable HTTP: one connection per server
  (food `/food`, instamart `/im`, dineout `/dineout`), shared login, lazy connect,
  tool→server routing, result mapping to `MCPResponse`, and `listTools()` logging on
  connect (to surface real Swiggy tool names).
- Wired interactive login routes: `/auth/start` (returns Swiggy authorize URL),
  `/auth/callback` (code→token exchange + reconnect), `/auth/status`.
- Verified LIVE against Swiggy: DCR issues `client_id: swiggy-mcp`; `/auth/authorize`
  302s to the login page; booting with `USE_MOCK=false` + `GET /auth/start` returns a
  valid Swiggy authorization URL. Typecheck + full build clean.
- **Shape-adapter + graceful fallback (`mcp/adapters.ts`):** per-tool validators coerce
  live output into the analyzer's shapes, rejecting consumer-shaped data that lacks
  merchant-critical fields (per-order total/placedAt/status, dineout weeklyCovers). On
  live error OR unmappable shape, `RealMCPClient` logs the raw shape and falls back to
  mock per-tool so the dashboard degrades instead of crashing. `LIVE_STRICT=1` disables
  fallback to surface raw shapes during discovery. 15 adapter unit tests pass; verified
  end-to-end: live mode unauthenticated now returns HTTP 200 (full mock analytics) with
  6 clean fallback log lines, where it previously crashed on null.

## In-flight / Next-up
- **User step:** run live and log in — `USE_MOCK=false pnpm dev`, open `GET /auth/start`,
  authorize with your Swiggy account. Callback exchanges tokens; tool calls go live.
- **Then watch the `listTools` log:** confirms whether real Swiggy tool names match the
  6 the app calls (search_restaurants, get_restaurant_menu, get_food_orders,
  fetch_food_coupons, get_restaurant_details, your_go_to_items).
- Replace pre-canned chat with live Claude (`ANTHROPIC_API_KEY`); mock weather →
  OpenWeatherMap (`OPENWEATHER_API_KEY`).

## Known caveats (honest)
- **Visibility:** repo is PUBLIC by deliberate owner choice (confirmed 2026-07-06); pivot/shelve/archive decision still pending.
- **Shape mismatch risk:** the analyzer expects the mock's TS shapes (`Restaurant`,
  `Order`, …). Real Swiggy tool output likely differs; a mapping layer between
  `RealMCPClient` output and the analyzer types is probably needed after first live call.
- **Merchant-vs-consumer:** the public Builders Club MCP is consumer commerce (order
  food, book tables). SwiggyPulse is a *restaurant-partner* analytics copilot — some
  tools it wants (a restaurant's 90-day orders) may not exist on the consumer MCP.
  The `listTools` log will confirm what's actually available.
- **Multi-resource tokens:** all three servers share one login; if Swiggy issues
  resource-scoped tokens, im/dineout may need their own (currently non-interactive
  refresh; may surface a second redirect). Untested until live.

## Blockers
None for localhost dev. Production access still needs the signed integration agreement
(the PAN Google Form) — deliberately not signed yet.

## Graduation checklist
- [x] Purpose statement
- [x] README with run instructions
- [x] No hardcoded secrets (all via env)
- [x] Core happy path works end-to-end on mock data
