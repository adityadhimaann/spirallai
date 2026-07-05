import { NODE_STEPS, type NodeKey } from "@/lib/research-types";
import { useState, useEffect } from "react";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface StepState {
  status: StepStatus;
  traces: string[];
  data?: any;
}

interface Props {
  steps: Record<NodeKey, StepState>;
}

const SUB_STATUSES: Record<NodeKey, string[]> = {
  financials: ["Fetching latest 10-K...", "Parsing balance sheet...", "Extracting revenue metrics...", "Verifying historical data..."],
  news: ["Searching global news...", "Analyzing sentiment...", "Filtering duplicate articles...", "Cross-checking dates..."],
  competitive: ["Identifying key competitors...", "Analyzing market share...", "Extracting peer multiples...", "Synthesizing landscape..."],
  bull: ["Drafting optimistic thesis...", "Highlighting growth catalysts...", "Formatting bull case...", "Finalizing bull perspective..."],
  bear: ["Drafting skeptical thesis...", "Highlighting key risks...", "Formatting bear case...", "Finalizing bear perspective..."],
  judge: ["Weighing bull vs bear...", "Scoring confidence...", "Synthesizing final verdict...", "Generating executive summary..."]
};

function ActiveSubStatus({ stepKey }: { stepKey: NodeKey }) {
  const [index, setIndex] = useState(0);
  const statuses = SUB_STATUSES[stepKey] || ["Processing..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
      <div className="h-1 w-1 rounded-full bg-primary/60 animate-pulse" />
      <span>{statuses[index]}</span>
    </div>
  );
}

function Icon({ status }: { status: StepStatus }) {
  if (status === "done")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground">
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 10.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  if (status === "active")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  if (status === "error")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-danger-foreground text-xs font-bold">
        !
      </div>
    );
  return <div className="h-6 w-6 rounded-full border-2 border-border" />;
}

export function Stepper({ steps }: Props) {
  return (
    <ol className="relative space-y-6">
      {NODE_STEPS.map((step, i) => {
        const s = steps[step.key];
        const isLast = i === NODE_STEPS.length - 1;

        // Extract domains for live loading feedback
        const domains = [];
        if (s.data?.articles) {
          domains.push(...s.data.articles.map((a: any) => {
            try { return new URL(a.url).hostname.replace(/^www\./, ""); } catch { return ""; }
          }).filter(Boolean));
        }
        if (s.data?.findings) {
          domains.push(...s.data.findings.map((a: any) => {
            try { return new URL(a.url).hostname.replace(/^www\./, ""); } catch { return ""; }
          }).filter(Boolean));
        }
        const uniqueDomains = Array.from(new Set(domains)).slice(0, 3); // show up to 3 domains

        return (
          <li key={step.key} className="relative pl-10">
            {!isLast && (
              <span
                className={`absolute left-3 top-6 h-full w-px ${
                  s.status === "done" ? "bg-success/40" : "bg-border"
                }`}
              />
            )}
            <span className="absolute left-0 top-0">
              <Icon status={s.status} />
            </span>
            <div
              className={`text-sm font-medium ${
                s.status === "pending" ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {step.label}
            </div>
            {s.status === "active" && <ActiveSubStatus stepKey={step.key as NodeKey} />}

            {/* Dynamic Loading References */}
            {uniqueDomains.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                {uniqueDomains.map((domain, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/30 px-2 py-1 shadow-sm">
                    <img 
                      src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=16`} 
                      className="h-3 w-3 rounded-sm"
                      alt=""
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">taking ref: {domain}</span>
                  </div>
                ))}
                {domains.length > 3 && (
                  <div className="flex items-center rounded-full border border-border bg-secondary/30 px-2 py-1">
                    <span className="text-[10px] font-medium text-muted-foreground">+{domains.length - 3} more</span>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
