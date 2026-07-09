# AI Investment Research Agent

An agent that takes a company name, researches it across three dimensions in
parallel, runs an internal bull-vs-bear debate, and has a judge agent decide
INVEST / PASS / WATCH — with the reasoning shown, not just the verdict.

## Overview

Most "investment agent" submissions are a single linear chain: fetch some
news, ask an LLM once, print an answer. This one is built as an actual graph:

1. **Parallel research fan-out** — financials, news/sentiment, and
   competitive landscape are fetched concurrently (LangGraph.js, not
   sequential awaits).
2. **Bull vs bear debate** — two independent agents build the strongest
   honest case for and against investing, using only the fetched research
   (no shared context between them, so neither can anchor on the other).
3. **Judge synthesis** — a third agent reads both cases and makes the final
   call with a confidence score and named risks, explaining *why* one case
   won.
4. **Live streaming** — the backend streams each node's completion over SSE,
   so the frontend shows the agent's reasoning happening in real time
   ("Fetching financials...", "Bull case built...", "Judge deciding...")
   instead of a blank spinner for 15-20 seconds.

## How to run it

**Backend**
```bash
cd server
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY at minimum
npm start              # listens on :8080
```

Env vars:
| Key | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers the bull/bear/judge reasoning nodes |
| `FINNHUB_API_KEY` | No | Free tier at finnhub.io. Without it, financials fall back to a clearly-labeled mock so the pipeline still runs end-to-end |
| `TAVILY_API_KEY` | No | Free tier at tavily.com. Without it, news/competitive data fall back to mock headlines |

**Endpoints**
- `POST /api/research` — `{ "companyName": "Nvidia" }` → full JSON result, one response
- `GET /api/research/stream?companyName=Nvidia` — SSE stream of node-by-node progress, ending in a `done` event with the full state. **Use this one for the UI.**

**Frontend**
Built separately (see `LOVABLE_PROMPT.md` for the exact spec used) and points
at the backend's `/api/research/stream` endpoint. Deployed at: `<add your
Vercel link here>`.

## How it works (architecture)

```
START ─┬─→ financials ─┐
       ├─→ news ────────┼─→ bullCase ─┐
       └─→ competitive ─┘             ├─→ judge → END
                    └───→ bearCase ───┘
```

- **`agent/state.js`** — shared `ResearchState` with reducers, so the three
  parallel research branches can each write their slice without clobbering
  each other, and `trace` accumulates as an append-only log.
- **`agent/tools.js`** — data access layer (Alpha Vantage for fundamentals,
  Tavily for news + competitive search), each with a graceful mock fallback.
- **`agent/nodes.js`** — the actual node functions: three research fetchers,
  two debate agents, one judge. The judge is prompted to return strict JSON
  (`verdict`, `confidence`, `reasoning`, `keyRisks`) so the frontend can
  render it as structured UI rather than parsing prose.
- **`agent/graph.js`** — wires it all together with LangGraph.js
  `StateGraph`: fan-out edges from `START`, fan-in edges into `bullCase` /
  `bearCase` (each waits for all three research nodes), then both feed
  `judge`.
- **`index.js`** — Express server. The SSE endpoint uses
  `agent.stream(..., { streamMode: "updates" })` to push a message after
  every node completes.

## Key decisions & trade-offs

- **Bull/bear/judge over a single reasoning call** — costs 3x the LLM calls
  of a naive approach, but produces a materially more defensible decision
  (each side is forced to make its strongest case rather than the model
  hedging in one pass), and it's the thing that actually exercises
  LangGraph's graph model instead of using it as a fancy for-loop.
- **Competitive landscape reuses the news search tool with a different query**
  instead of a dedicated paid competitor-intelligence API. For an MVP this
  covers the signal (who's mentioned as a competitor, market position) at
  zero extra integration cost. Left out: a proper structured competitor
  matrix (market share %, feature comparison) — noted under "what I'd
  improve."
- **Mock fallbacks for financials/news** instead of hard-failing when a free
  API key isn't set. Chose this so the app is always demoable, even if
  Alpha Vantage's free tier rate-limits mid-demo — the source field always
  honestly labels mock vs. live data rather than silently faking it.
- **SSE over WebSockets** for streaming — one-directional server-to-client
  progress updates don't need full duplex, and SSE is simpler to deploy
  behind standard HTTP infra (works on Vercel/most PaaS without extra config).
- **Judge asked for strict JSON, not prose** — makes the verdict trivially
  renderable as a real UI component (confidence meter, risk chips) instead
  of an LLM essay the frontend has to re-parse with regex.
- **Left out**: company name → ticker resolution is currently a simple
  passthrough/best-effort (user can supply a ticker directly); a proper
  resolver would hit a symbol-lookup API first. Noted as ambiguous per the
  assignment's "make your own call" instruction.

## Example runs

Run these once your `.env` is set:
```bash
curl -X POST http://localhost:8080/api/research \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Nvidia", "ticker": "NVDA"}'
```
Try at least 3 companies of your choice (e.g. a stable large-cap, a volatile
growth name, and a company currently in the news for something negative) and
paste the JSON verdicts here before submitting, e.g.:

```json
{
  "verdict": "INVEST",
  "confidence": 72,
  "reasoning": "...",
  "keyRisks": ["...", "..."]
}
```

## What I'd improve with more time

- Real ticker resolution (company name → symbol) as its own graph node with
  a fallback to fuzzy search, instead of relying on the user to supply one.
- A fourth "risk agent" specializing only in regulatory/legal red flags,
  run in parallel with bull/bear, since that's a distinct skill from
  valuation arguments.
- Persist past research runs (Postgres/Supabase) so repeat queries are
  cached and a "recent research" history view is possible in the UI.
- Structured competitor comparison table instead of free-text search results.
- Retry/backoff and per-source timeouts tuned per API instead of a flat
  8-10s timeout.
- Unit tests around the judge's JSON parsing fallback path.
