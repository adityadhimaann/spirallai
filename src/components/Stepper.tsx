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
    <div className="mt-2 flex items-center gap-3 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1">
      <div className="relative flex h-2 w-2 items-center justify-center">
        <div className="absolute h-full w-full rounded-full bg-primary animate-ping opacity-75" />
        <div className="relative h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <span className="tracking-wide uppercase text-[10px]">{statuses[index]}</span>
    </div>
  );
}

function Icon({ status }: { status: StepStatus }) {
  if (status === "done")
    return (
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] backdrop-blur-sm border border-primary/30 transition-all duration-500">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 10.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  if (status === "active")
    return (
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.5)] bg-background">
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),1)]" />
      </div>
    );
  if (status === "error")
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/20 text-danger border border-danger/30 shadow-[0_0_15px_rgba(var(--danger),0.3)] text-sm font-bold">
        !
      </div>
    );
  return <div className="h-8 w-8 rounded-full border-2 border-white/10 bg-white/5" />;
}

export function Stepper({ steps }: Props) {
  return (
    <ol className="relative space-y-8">
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
          <li key={step.key} className="relative pl-12 group">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-full w-[2px] transition-all duration-700 ${
                  s.status === "done" 
                    ? "bg-gradient-to-b from-primary to-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                    : s.status === "active"
                    ? "bg-gradient-to-b from-primary/50 to-transparent"
                    : "bg-white/5"
                }`}
              />
            )}
            <span className="absolute left-0 top-0">
              <Icon status={s.status} />
            </span>
            <div
              className={`text-base font-semibold tracking-tight transition-colors duration-300 ${
                s.status === "pending" ? "text-muted-foreground/50" : s.status === "active" ? "text-primary text-shadow-sm" : "text-foreground"
              }`}
            >
              {step.label}
            </div>
            {s.status === "active" && <ActiveSubStatus stepKey={step.key as NodeKey} />}

            {/* Real-time Loading Placeholder */}
            {s.status === "active" && (step.key === "news" || step.key === "competitive") && (
              <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 shadow-[0_0_10px_rgba(var(--primary),0.1)] opacity-80">
                  <div className="h-3 w-3 rounded-sm bg-primary/40 animate-spin" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">scanning live sources...</span>
                </div>
              </div>
            )}

            {/* Dynamic Loading References */}
            {uniqueDomains.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                {uniqueDomains.map((domain, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 backdrop-blur-md px-3 py-1.5 shadow-sm hover:border-primary/40 transition-colors">
                    <img 
                      src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=16`} 
                      className="h-3.5 w-3.5 rounded-sm"
                      alt=""
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{domain.toLowerCase()}</span>
                  </div>
                ))}
                {domains.length > 3 && (
                  <div className="flex items-center rounded-full border border-white/5 bg-black/10 px-3 py-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">+{domains.length - 3} MORE</span>
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
