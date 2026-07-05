import { useState } from "react";
import type { ResearchResult, Verdict } from "@/lib/research-types";

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string }> = {
  INVEST: { bg: "bg-success", text: "text-success-foreground", label: "INVEST" },
  PASS:   { bg: "bg-danger",  text: "text-danger-foreground",  label: "PASS" },
  WATCH:  { bg: "bg-warning", text: "text-warning-foreground", label: "WATCH" },
};

function ConfidenceGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confidence</span>
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{v}<span className="text-sm text-muted-foreground">/100</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function renderBullets(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => {
        const clean = line.replace(/^[-*•]\s*/, "");
        return (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            <span>{clean}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  result: ResearchResult;
  onReset: () => void;
  companyName: string;
  ticker?: string;
}

export function ResultsView({ result, onReset, companyName, ticker }: Props) {
  const [rawOpen, setRawOpen] = useState(false);
  const v = VERDICT_STYLES[result.verdict] ?? VERDICT_STYLES.WATCH;

  const rawData = {
    financials: result.financials,
    news: result.news,
    competitive: result.competitive,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Verdict
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {companyName}
            {ticker && (
              <span className="ml-2 font-mono text-base text-muted-foreground">{ticker}</span>
            )}
          </h1>
        </div>
        <button
          onClick={onReset}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          Research another company
        </button>
      </div>

      {/* Verdict card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className={`inline-flex items-center justify-center rounded-lg px-6 py-4 ${v.bg} ${v.text}`}>
            <span className="font-mono text-3xl font-bold tracking-widest">{v.label}</span>
          </div>
          <ConfidenceGauge value={result.confidence} />
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reasoning
          </div>
          <p className="text-base leading-relaxed text-foreground/90">{result.reasoning}</p>
        </div>
      </div>

      {/* Key risks */}
      {result.keyRisks?.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Key risks
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keyRisks.map((risk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"
              >
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                  <path d="M10 2L1 18h18L10 2zm0 6v4m0 2v.01" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                {risk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bull / Bear */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-success/30 bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-success">Bull case</h3>
          </div>
          {renderBullets(result.bullCase || "")}
        </div>
        <div className="rounded-xl border border-danger/30 bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-danger" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-danger">Bear case</h3>
          </div>
          {renderBullets(result.bearCase || "")}
        </div>
      </div>

      {/* Raw data */}
      <div className="mt-6 rounded-xl border border-border bg-card">
        <button
          onClick={() => setRawOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-sm font-medium text-foreground">Raw research data</span>
          <span className="font-mono text-xs text-muted-foreground">{rawOpen ? "− collapse" : "+ expand"}</span>
        </button>
        {rawOpen && (
          <pre className="max-h-[500px] overflow-auto border-t border-border bg-background/50 px-6 py-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
{JSON.stringify(rawData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
