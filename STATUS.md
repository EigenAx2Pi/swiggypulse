# Status — SwiggyPulse

**Last updated:** 2026-04-30

## Focus
Initial build complete. Demo prototype for Swiggy Builders Club application.

## In-flight
- Awaiting Swiggy MCP staging credentials to flip `USE_MOCK=false`.

## Next-up
- Swap `MockMCPClient` for `RealMCPClient` once credentials arrive.
- Replace pre-canned chat responses with live Claude calls (set `ANTHROPIC_API_KEY`).
- Replace mock weather with OpenWeatherMap (set `OPENWEATHER_API_KEY`).

## Blockers
None.

## Graduation checklist
- [x] Purpose statement
- [x] README with run instructions
- [x] No hardcoded secrets (all via env)
- [x] Core happy path works end-to-end on mock data
