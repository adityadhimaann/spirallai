import { useEffect, useRef, useState } from "react";
import { Stepper, type StepState } from "./Stepper";
import { NODE_STEPS, type NodeKey, type ResearchResult } from "@/lib/research-types";
import { ResultsView } from "./ResultsView";

interface Props {
  backendUrl: string;
  companyName: string;
  ticker: string;
  onReset: () => void;
}

const emptySteps = (): Record<NodeKey, StepState> =>
  NODE_STEPS.reduce((acc, s, i) => {
    acc[s.key] = { status: i === 0 ? "active" : "pending", traces: [] };
    return acc;
  }, {} as Record<NodeKey, StepState>);

function normalizeNodeKey(node: string): NodeKey | null {
  const n = node.toLowerCase();
  if (n.includes("financ")) return "financials";
  if (n.includes("news") || n.includes("sentiment")) return "news";
  if (n.includes("compet")) return "competitive";
  if (n.includes("bull")) return "bull";
  if (n.includes("bear")) return "bear";
  if (n.includes("judge") || n.includes("verdict") || n.includes("decid")) return "judge";
  return null;
}

export function ResearchView({ backendUrl, companyName, ticker, onReset }: Props) {
  const [steps, setSteps] = useState<Record<NodeKey, StepState>>(emptySteps);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setSteps(emptySteps());
    setResult(null);
    setError(null);

    if (!backendUrl) {
      setError("No backend URL configured.");
      return;
    }

    const url = `${backendUrl.replace(/\/$/, "")}/api/research/stream?companyName=${encodeURIComponent(
      companyName
    )}&ticker=${encodeURIComponent(ticker)}`;

    let es: EventSource;
    try {
      es = new EventSource(url);
    } catch (e) {
      setError(`Failed to open stream: ${(e as Error).message}`);
      return;
    }
    esRef.current = es;

    const handleNodeUpdate = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        const key = normalizeNodeKey(String(data.node ?? ""));
        if (!key) return;
        setSteps((prev) => {
          const next = { ...prev };
          const trace = data.trace;
          const traces =
            trace == null
              ? next[key].traces
              : [...next[key].traces, typeof trace === "string" ? trace : JSON.stringify(trace)];
          next[key] = { ...next[key], status: "active", traces };
          // mark previous steps done
          const idx = NODE_STEPS.findIndex((s) => s.key === key);
          for (let i = 0; i < idx; i++) {
            const k = NODE_STEPS[i].key;
            if (next[k].status !== "done") next[k] = { ...next[k], status: "done" };
          }
          return next;
        });
      } catch (e) {
        console.error("node_update parse error", e);
      }
    };

    const handleDone = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        setSteps((prev) => {
          const next = { ...prev };
          for (const s of NODE_STEPS) next[s.key] = { ...next[s.key], status: "done" };
          return next;
        });
        if (!data || typeof data.verdict !== "string") {
          setError("Backend returned malformed result JSON.");
        } else {
          setResult(data as ResearchResult);
        }
      } catch (e) {
        setError(`Failed to parse final result: ${(e as Error).message}`);
      } finally {
        es.close();
      }
    };

    es.addEventListener("node_update", handleNodeUpdate as EventListener);
    es.addEventListener("done", handleDone as EventListener);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      setError("Connection to backend lost. Is it running?");
      setSteps((prev) => {
        const next = { ...prev };
        for (const s of NODE_STEPS) {
          if (next[s.key].status === "active") next[s.key] = { ...next[s.key], status: "error" };
        }
        return next;
      });
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [backendUrl, companyName, ticker]);

  if (result) {
    return <ResultsView result={result} onReset={onReset} companyName={companyName} ticker={ticker} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Researching
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {companyName}
            {ticker && <span className="ml-2 font-mono text-base text-muted-foreground">{ticker}</span>}
          </h1>
        </div>
        <button
          onClick={onReset}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/20">
        <Stepper steps={steps} />
      </div>
    </div>
  );
}
