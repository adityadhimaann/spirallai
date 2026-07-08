import { useEffect, useRef, useState } from "react";
import { Stepper, type StepState } from "./Stepper";
import { NODE_STEPS, type NodeKey, type ResearchResult } from "@/lib/research-types";
import { ResultsView } from "./ResultsView";

interface Props {
  backendUrl: string;
  companyName: string;
  ticker: string;
  onReset: () => void;
  onComplete?: (result?: ResearchResult) => void;
  isDeepMode?: boolean;
  onFollowUpClick?: (q: string) => void;
}

const emptySteps = (): Record<NodeKey, StepState> =>
  NODE_STEPS.reduce(
    (acc, s, i) => {
      acc[s.key] = { status: i === 0 ? "active" : "pending", traces: [] };
      return acc;
    },
    {} as Record<NodeKey, StepState>,
  );

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

export function ResearchView({
  backendUrl,
  companyName,
  ticker,
  onReset,
  onComplete,
  isDeepMode,
  onFollowUpClick,
}: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [partialData, setPartialData] = useState<any>({});
  const [result, setResult] = useState<ResearchResult | null>(null);

  // On mount, check if we already have a cached completed result from API
  useEffect(() => {
    const fetchCached = async () => {
      try {
        const cachedResponse = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://spiral-backend-3z14.onrender.com" : "http://localhost:8081")}/api/results/${encodeURIComponent(companyName)}`);
        if (cachedResponse.ok) {
          const cached = await cachedResponse.json();
          if (cached && cached.verdict) {
            setResult(cached as ResearchResult);
          }
        }
      } catch (err) {
        console.error("Failed to load cached result:", err);
      }
    };
    fetchCached();
  }, [companyName]);

  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // If we loaded a completed result, don't re-fetch
    if (result) return;

    setCurrentStepIndex(0);
    setPartialData({});
    setResult(null);
    setError(null);

    if (!backendUrl) {
      setError("No backend URL configured.");
      return;
    }

    let url = `${backendUrl.replace(/\/$/, "")}/api/research/stream?companyName=${encodeURIComponent(
      companyName,
    )}&ticker=${encodeURIComponent(ticker)}`;

    if (isDeepMode) {
      url += `&deepMode=true`;
    }

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
        if (data.partialData) {
          setPartialData((prev: any) => ({ ...prev, ...data.partialData }));
        }
      } catch (e) {
        // ignore parse error for intermediate updates
      }
      setCurrentStepIndex((prev) => Math.min(prev + 1, NODE_STEPS.length - 1));
    };

    const handleDone = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        setCurrentStepIndex(NODE_STEPS.length); // all done

        const v = data?.verdict;
        if (!v || typeof v.verdict !== "string") {
          setError("Backend returned malformed result JSON.");
        } else {
          const finalResult = {
            company: companyName,
            verdict: v.verdict,
            confidence: v.confidence,
            reasoning: v.reasoning,
            keyRisks: v.keyRisks,
            knowledgeGaps: v.knowledgeGaps,
            bullCase: data.bullCase,
            bearCase: data.bearCase,
            financials: data.financials,
            news: data.news,
            competitive: data.competitive,
          } as ResearchResult;

          setResult(finalResult);
          fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://spiral-backend-3z14.onrender.com" : "http://localhost:8081")}/api/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalResult),
          }).catch(console.error);
          onComplete?.(finalResult);
        }
      } catch (e) {
        setError(`Failed to parse final result: ${(e as Error).message}`);
        onComplete?.();
      } finally {
        es.close();
      }
    };

    es.addEventListener("node_update", handleNodeUpdate as EventListener);
    es.addEventListener("done", handleDone as EventListener);

    es.addEventListener("error", (evt: any) => {
      try {
        const data = JSON.parse(evt.data);
        setError(`Backend Error: ${data.message || "Unknown error"}`);
      } catch {
        setError("An error occurred on the backend.");
      }
      es.close();
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      setError("Connection to backend lost. Is it running?");
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [backendUrl, companyName, ticker]); // We intentionally omit `result` so it doesn't re-trigger loops, but it's checked initially

  const steps = NODE_STEPS.reduce(
    (acc, s, i) => {
      let status: "done" | "active" | "pending" | "error" = "pending";
      if (error) {
        status = i === currentStepIndex ? "error" : i < currentStepIndex ? "done" : "pending";
      } else {
        status = i < currentStepIndex ? "done" : i === currentStepIndex ? "active" : "pending";
      }
      // inject partialData for the specific node
      const dataForStep =
        s.key === "news"
          ? partialData.news
          : s.key === "competitive"
            ? partialData.competitive
            : s.key === "financials"
              ? partialData.financials
              : null;

      acc[s.key] = { status, traces: [], data: dataForStep };
      return acc;
    },
    {} as Record<NodeKey, StepState>,
  );

  if (result) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ResultsView
          result={result}
          companyName={companyName}
          ticker={ticker}
          onReset={onReset}
          onFollowUpClick={onFollowUpClick}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <Stepper steps={steps} />
      </div>
    </div>
  );
}
