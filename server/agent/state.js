import { Annotation } from "@langchain/langgraph";

// Central state object threaded through every node in the graph.
// Each key uses a reducer so parallel branches can write to state
// without clobbering each other (financials/news/competitive all
// run concurrently and merge back into one object).
export const ResearchState = Annotation.Root({
  companyName: Annotation({ reducer: (_prev, next) => next }),
  ticker: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  isDeepMode: Annotation({ reducer: (_prev, next) => next, default: () => false }),

  // Planner fields
  intent: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  entities: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  queries: Annotation({ reducer: (_prev, next) => next, default: () => [] }),

  financials: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  news: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  competitive: Annotation({ reducer: (_prev, next) => next, default: () => null }),

  bullCase: Annotation({ reducer: (_prev, next) => next, default: () => null }),
  bearCase: Annotation({ reducer: (_prev, next) => next, default: () => null }),

  verdict: Annotation({ reducer: (_prev, next) => next, default: () => null }),

  // Every node appends a short human-readable trace event here.
  // The SSE layer streams this array's deltas to the frontend so the
  // UI can show "Fetching financials...", "Bull case built...", etc.
  trace: Annotation({
    reducer: (prev, next) => (prev ?? []).concat(next ?? []),
    default: () => [],
  }),
});
