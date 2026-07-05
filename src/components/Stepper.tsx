import { NODE_STEPS, type NodeKey } from "@/lib/research-types";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface StepState {
  status: StepStatus;
  traces: string[];
}

interface Props {
  steps: Record<NodeKey, StepState>;
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
            {s.traces.length > 0 && (
              <ul className="mt-2 space-y-1 border-l border-border/60 pl-3">
                {s.traces.slice(-6).map((t, idx) => (
                  <li key={idx} className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
