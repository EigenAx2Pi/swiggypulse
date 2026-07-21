---
project: swiggypulse
mode: Frozen
stage: Done
tag: ARCHIVED
wip: false
spine: false
track: C-Showcase
next_action: 'Product is closed — no further work on this repo. Remaining follow-up
  lives elsewhere: extract the MCP OAuth 2.1 + PKCE + DCR client and the two-request
  server-side redirect pattern into a standalone repo. See DECISIONS.md 2026-07-20.'
last_touched: '2026-07-21'
---
# Status — SwiggyPulse

**Last updated:** 2026-07-20

## Focus
**CLOSED (2026-07-20).** Both premises are dead and the product is archived.

The merchant premise died on 2026-07-02 (the Builders Club MCP is consumer-only —
no partner analytics tools exist). The **consumer pivot died on 2026-07-20**, killed by
a premortem *before any code was written*: Swiggy ships the same idea as its own
advertised hello-world, at least five free products already do it, the underlying
`get_orders` tool has open upstream defects, and the app could never reach a second
user. Full autopsy in [DECISIONS.md](./DECISIONS.md).

[ROADMAP.md](./ROADMAP.md) describes the cancelled consumer plan and is **superseded** —
kept only as the record of what was considered.

**What this repo is now:** a working, live-verified reference implementation of MCP
OAuth 2.1 + PKCE + Dynamic Client Registration against a real issuer, wrapped in a
merchant dashboard that runs on synthetic data. The auth layer is the part worth
keeping; extracting it is tracked in DECISIONS.md, not here.

## Prior focus (consumer-pivot era — cancelled)
MVP was to be the "Food Spend Mirror" — read your own order history, reflect spending
back. Cancelled at the scoping gate. No code was written against it.

## Prior focus (merchant era — historical)
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
- **Visibility:** repo is PUBLIC by deliberate owner choice (confirmed 2026-07-06).
  Decision resolved 2026-07-19 → **pivot to consumer**. Note the raised stakes: a tool
  that reads personal order history means no real-order fixtures may ever be committed.
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
