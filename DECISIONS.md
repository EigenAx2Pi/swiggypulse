# Decisions — SwiggyPulse

Newest first. Each entry: what was decided, why, and what would reverse it.

---

## 2026-07-20 — Kill the consumer pivot. Archive the product, extract the asset.

**Decided:** The "Food Spend Mirror" consumer MVP (scoped 2026-07-19) is **cancelled
before any code was written**. SwiggyPulse the product is done. The reusable asset —
the MCP OAuth 2.1 + PKCE + DCR client and the two-request server-side redirect pattern
— gets extracted and published separately. The dashboard is archived.

**Why.** A premortem with three independent skeptics (technical / frame / second-order)
killed it on the frame, not the execution. Four findings, any one of which is
sufficient:

1. **The platform ships this as its own hello-world.** Swiggy's Builders Club material
   describes the consumer MCP's use case as "AI assistants like Claude analyze your
   Swiggy order history and give personalised insights on food habits and spending."
   That is the Food Spend Mirror, delivered by connecting the MCP to Claude and typing
   one sentence. A 4,400-LOC app producing a worse, non-conversational version of that
   is a dissolved plan.
2. **The category is saturated and free.** Snackalytics, Swiggy Order Stats, fooddy.in,
   Spenddy, mr-karan/swiggy-analytics — all shipped, all free, all better distributed
   than a localhost app requiring an OAuth dance.
3. **The data source is known-broken upstream.** Swiggy's own manifest repo carries open,
   unanswered issues: #36 (`get_orders` returns stale data, frozen ~2 weeks back) and
   #15 (`get_orders` returns 0 orders). The merchant premise died of an untested data
   assumption; the pivot was committed to *before* Slice 0 could test the same class of
   assumption one layer down.
4. **It could never reach user #2.** Production access needs the unsigned PAN agreement;
   third-party redirect URIs need a whitelist request in a slow queue. Meanwhile the
   server is a process-wide singleton with an unkeyed 60s cache (`mcp/client.ts:274`,
   `routes/api.ts:13`) — the first person to log in owns the process. Terminal state:
   localhost, one account, forever, on a `track: C-Showcase` project.

**The honest part.** The selection criterion that carried the 2026-07-19 decision —
"reuses the most existing code" — was sunk-cost wearing a product hat. The OAuth layer
is reused *identically* by all three candidates considered (A/B/C); so are the transport,
logger, and UI primitives. Reuse never discriminated between the options. Builders Club
had already approved SwiggyPulse on 2026-06-30 — the showcase had already paid out. What
the pivot protected was not the outcome but the feeling of the repo being live.

**What would reverse this:** a reason to build a Swiggy consumer product that starts from
a user need rather than from this repo. If that appetite survives, candidate B (Deal
Maximiser) is the one with a moment of need and a falsifiable number (rupees saved) —
start it fresh, with a success bar and a kill date, not as a pivot of this codebase.

---

## 2026-07-20 — Defuse the live-data commit trap (done)

**Decided + shipped:** `packages/mcp-mock/data/*.json` untracked (`git rm --cached`) and
gitignored; `scripts/smoke.mjs` now hard-refuses to run when `USE_MOCK=false`.

**Why.** `docs/screenshots/*.png` (8 tracked files) and `orders.json` (2.2 MB, tracked)
are overwritten *in place* by `scripts/smoke.mjs` and `pnpm generate:mock`. `.gitignore`
covered neither path. Harmless while the data was synthetic restaurant fiction — but the
consumer premise would have rendered a real person's order history into files git already
follows, on a **public** repo. One habitual `git add -A` publishes it. This never needed
a mistake, only a habit: running the smoke test after a UI change, exactly as designed.

Kept deliberately: the 8 existing screenshots stay tracked. They are synthetic
merchant-era artifacts, they serve the README, and the mechanism that could have
poisoned them is now blocked at the source.

---

## 2026-07-20 — Do not sign the Builders Club production agreement

**Decided:** Standing decision. Do not sign, and do not treat "sign it" as the natural
unblock when a roadmap stalls.

**Why.** Signing attaches a **PAN — a permanent government tax identity** — to a
production integration for an app reading consumers' order history, under Swiggy's brand,
from a public repo, with a single-user architecture that cannot satisfy the data-handling
obligations such an agreement would import. The exposure is disproportionate to anything
this project was ever going to be. Recorded here so a tired future session doesn't
re-litigate it looking for a way to ship.

---

## 2026-07-02 — Merchant premise disproven (historical)

Live `listTools()` against the Swiggy MCP confirmed every server exposes only consumer
verbs (search → cart → place_order / checkout / book_table → track). No merchant or
partner analytics tools exist. `get_food_orders` returns the *signed-in user's* own
orders, not a restaurant's. The restaurant-partner growth-copilot premise is unfeedable
by this MCP, and no agreement or approval changes that.
