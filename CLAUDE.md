# SwiggyPulse — Agent Context

AI-powered growth copilot for Swiggy restaurant partners. Demo prototype for the Swiggy Builders Club application, running on **mock data** that mirrors Swiggy's documented MCP schemas.

## Architecture

pnpm monorepo with three packages:

- **`packages/mcp-mock/`** — Mock Food/Instamart/Dineout MCP clients + correlated seed data (90 days of orders, weather, etc.). Mock data is generated programmatically by `src/generate.ts` so patterns (rain → biryani spike, weekend lift, evening peak) stay consistent.
- **`packages/server/`** — Express + TypeScript. MCP client abstraction (factory: `USE_MOCK=true` → MockMCPClient, else RealMCPClient skeleton), OAuth 2.1 + PKCE skeleton, analyzer, recommendations, chat endpoint.
- **`packages/web/`** — Vite + React + Tailwind + Recharts. 7 pages: Dashboard, MenuPerformance, CouponAnalysis, WeatherImpact, Recommendations, ChatInterface, DineoutInsights.

## Conventions

- **Strict TypeScript everywhere.** No `any`. No `console.log` in production paths — use `lib/logger.ts`.
- **Mock mode is the default.** All env vars optional. `ANTHROPIC_API_KEY` missing → chat falls back to pre-canned responses; `OPENWEATHER_API_KEY` missing → uses mock weather.
- **Swiggy branding rules:** `#FF5200` only on the "Powered by Swiggy" footer. App uses its own slate + teal/red palette.
- **No PII at rest.** All state is in-memory / session-scoped — design choice that mirrors the compliance claim in the README.

## Run

```bash
pnpm install
pnpm dev         # runs server (:3001) + web (:3000) together via concurrently — one command
pnpm build       # build all packages
pnpm typecheck   # typecheck all packages
pnpm generate:mock   # regenerate the correlated mock seed data
```

There is no lint script (despite `pnpm lint` delegating with `-r`, no package
defines a `lint` target). Type safety is enforced via `pnpm typecheck`.

Chat endpoint: **`POST /api/chat`** (router mounted at `/api` in
`packages/server/src/index.ts`; handler in `packages/server/src/routes/api.ts`).
Body: `{ message: string, history? }`.

## Where the insight engine logic lives

- `packages/server/src/agent/analyzer.ts` — restaurant + item + cross-signal metrics
- `packages/server/src/agent/recommendations.ts` — 8-12 generated recommendations from analyzer output
- `packages/server/src/agent/chat.ts` — conversational handler (Claude or pre-canned)

## Real MCP mode

Live Swiggy MCP is wired (`USE_MOCK=false`). It uses OAuth 2.1 + PKCE with dynamic
client registration — no client secret and no signed agreement needed for localhost
dev (the agreement/PAN only gates production). Flow: `RealMCPClient` (in
`mcp/client.ts`) + `SwiggyOAuthProvider` (in `auth/oauth.ts`) → interactive login via
`/auth/start` → `/auth/callback`. See STATUS.md for verified endpoints + caveats.

## What NOT to add here

- A production-partner client secret / the signed agreement in git (prod access only)
- A database (intentionally session-scoped)
- Tests (skipped for time — structure is testable; this is a demo)
- Deployment config (local-only for now)
