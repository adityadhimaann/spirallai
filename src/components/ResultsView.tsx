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

function renderTextWithBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const ANIMATION_STYLES = `
  @keyframes drawLine {
    0% { transform: scaleY(0); opacity: 0; }
    10% { opacity: 1; }
    100% { transform: scaleY(1); opacity: 1; }
  }
  .animate-draw-line {
    animation: drawLine 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    transform-origin: top;
  }
  @keyframes popLeft {
    0% { opacity: 0; transform: translateX(-30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .animate-pop-left {
    opacity: 0;
    animation: popLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes popRight {
    0% { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .animate-pop-right {
    opacity: 0;
    animation: popRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes popScale {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  .animate-pop-scale {
    opacity: 0;
    animation: popScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes scaleInX {
    0% { transform: scaleX(0); opacity: 0; }
    100% { transform: scaleX(1); opacity: 1; }
  }
`;

function renderBullets(text: string, type: "bull" | "bear") {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  
  // Extract the first line as an intro if it's not a bolded bullet point
  let intro = "";
  if (lines.length > 0 && !/^[-*•]?\s*\*\*/.test(lines[0])) {
    intro = lines.shift() || "";
    intro = intro.replace(/^[-*•]\s*/, "");
  }

  const isBull = type === "bull";
  const bgClass = isBull ? "bg-success/5 border-success/10" : "bg-danger/5 border-danger/10";
  const dotClass = isBull ? "bg-success" : "bg-danger";
  const trackClass = isBull ? "bg-success/30" : "bg-danger/30";

  const isMirrored = isBull;
  const containerPadding = isMirrored ? "pr-[24px]" : "pl-[24px]";
  const trackOffset = "16px"; // Distance outside the column

  return (
    <div className={`flex h-full flex-col ${containerPadding}`}>
      <style>{ANIMATION_STYLES}</style>
      {/* Intro Subtitle */}
      {intro && (
        <div className={`mb-6 text-[14px] leading-relaxed text-muted-foreground ${isMirrored ? "text-right" : "text-left"}`}>
          {intro}
        </div>
      )}

      {/* Timeline Section */}
      <div className="relative flex flex-1 flex-col gap-6 pb-2">
        {/* The Stick of Track */}
        <div 
          className={`absolute bottom-6 top-6 w-0.5 rounded-full ${trackClass} animate-draw-line`} 
          style={{ [isMirrored ? "right" : "left"]: `-${trackOffset}` }}
        />

        {lines.map((line, i) => {
          const clean = line.replace(/^[-*•]\s*/, "");
          const isEven = i % 2 === 0;
          
          // Alternating zig-zag layout
          const alignClass = isEven ? (isMirrored ? "ml-auto" : "mr-auto") : (isMirrored ? "mr-auto" : "ml-auto");
          
          // Animations
          const popClass = alignClass === "mr-auto" ? "animate-pop-left" : "animate-pop-right";
          const delay = i * 0.1; // 100ms stagger per item
          
          // Calculate the connector line perfectly
          const emptySpace = "18%";
          const lineStyle: React.CSSProperties = {
            [isMirrored ? "right" : "left"]: `-${trackOffset}`,
            width: alignClass === (isMirrored ? "ml-auto" : "mr-auto") ? trackOffset : `calc(${emptySpace} + ${trackOffset})`,
            top: "24px",
            transformOrigin: isMirrored ? "right" : "left",
            opacity: 0,
            animation: `scaleInX 0.4s ease-out ${delay + 0.15}s forwards`
          };
          
          return (
            <div key={i} className="relative flex w-full flex-1">
              {/* The connector line */}
              <div className={`absolute h-[2px] ${trackClass}`} style={lineStyle} />

              {/* The dot positioned exactly on the track */}
              <div 
                className={`absolute top-5 z-10 h-2.5 w-2.5 rounded-full ring-4 ring-background ${dotClass} animate-pop-scale`} 
                style={{ 
                  [isMirrored ? "right" : "left"]: `calc(-${trackOffset} - 4px)`,
                  animationDelay: `${delay + 0.05}s`
                }}
              />
              
              {/* The Card */}
              <div
                className={`z-20 flex h-full w-[82%] flex-col justify-center rounded-lg border p-4 shadow-sm transition-colors hover:brightness-105 ${bgClass} ${alignClass} ${popClass}`}
                style={{ animationDelay: `${delay}s` }}
              >
                <span className={`text-[13px] leading-relaxed text-foreground/90 ${isMirrored ? "text-right" : "text-left"}`}>
                  {renderTextWithBold(clean)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompanyLogo({ name, ticker }: { name: string; ticker?: string }) {
  const [error, setError] = useState(false);
  // Attempt to guess the domain. E.g. "Nvidia" -> "nvidia.com"
  const domain = name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  
  if (error) {
    return (
      <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/30 text-4xl font-bold text-foreground/50 shadow-inner">
        {(ticker || name).charAt(0).toUpperCase()}
      </div>
    );
  }
  
  return (
    <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm">
      <img 
        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`} 
        alt={`${name} logo`}
        className="h-full w-full object-contain rounded-lg"
        onError={() => setError(true)}
      />
    </div>
  );
}

interface SourceItem {
  title: string;
  url: string;
  snippet: string;
}

function getDomainBadge(domain: string): { label: string; bg: string; text: string } | null {
  if (domain.includes("sec.gov") || domain.includes("investor.") || domain.includes("apple.com") || domain.includes("tesla.com")) return { label: "OFFICIAL", bg: "bg-success/20", text: "text-success" };
  if (domain.endsWith(".gov")) return { label: "GOV", bg: "bg-blue-500/20", text: "text-blue-500" };
  if (domain.endsWith(".edu")) return { label: "ACADEMIC", bg: "bg-purple-500/20", text: "text-purple-500" };
  if (domain.includes("bloomberg") || domain.includes("cnbc") || domain.includes("wsj") || domain.includes("reuters") || domain.includes("ft.com") || domain.includes("stocktitan")) return { label: "NEWS", bg: "bg-orange-500/20", text: "text-orange-500" };
  return null;
}

function SourceCard({ source }: { source: SourceItem }) {
  let domain = "";
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    domain = source.url;
  }

  // Fallback for mock URLs without protocol
  const isMock = !source.url.startsWith("http");
  if (isMock) domain = "mock-source.com";

  const badge = getDomainBadge(domain);

  return (
    <a 
      href={isMock ? "#" : source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary/50 p-0.5">
           <img 
             src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=32`} 
             alt=""
             className="h-full w-full rounded-sm object-cover"
           />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{domain}</div>
            {badge && (
              <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
          </div>
          <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {source.title}
          </div>
        </div>
      </div>
      
      {/* Expanding Snippet (visible on hover) */}
      <div className="grid grid-rows-[0fr] transition-all duration-300 group-hover:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-4">
            {source.snippet ? source.snippet.replace(/[|]/g, "").replace(/---/g, "").replace(/Date: \w{3} \d{1,2}, \d{4}/g, "").replace(/\s+/g, " ").trim() : ""}
          </p>
        </div>
      </div>
    </a>
  );
}

function SourcesSection({ news, competitive }: { news: any; competitive: any }) {
  const sources: SourceItem[] = [];
  
  if (news?.articles && Array.isArray(news.articles)) {
    sources.push(...news.articles.filter((a: any) => a.url || a.snippet));
  }
  if (competitive?.findings && Array.isArray(competitive.findings)) {
    sources.push(...competitive.findings.filter((a: any) => a.url || a.snippet));
  }
  
  // Remove duplicates by URL or title
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.url || s.title, s])).values());
  
  if (uniqueSources.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Sources
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {uniqueSources.map((source, i) => (
          <SourceCard key={i} source={source} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  result: ResearchResult;
  onReset: () => void;
  companyName: string;
  ticker?: string;
}

export function ResultsView({ result, onReset, companyName, ticker }: Props) {
  const v = VERDICT_STYLES[result.verdict] ?? VERDICT_STYLES.WATCH;


  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
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

      <SourcesSection news={result.news} competitive={result.competitive} />

      {/* Verdict card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          {/* Logo & Verdict Badge Stack */}
          <div className="flex shrink-0 flex-col items-center gap-3">
            <CompanyLogo name={companyName} ticker={ticker} />
            <div className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-bold tracking-widest ${v.bg} ${v.text} ring-1 ring-inset ${v.text.replace('text-', 'ring-')}/30 shadow-sm`}>
              {v.label}
            </div>
          </div>
          
          <div className="flex-1">
            <ConfidenceGauge value={result.confidence} />
          </div>
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
        <div className="mt-8">
          <div className="mb-3 flex justify-end">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Key risks
            </span>
          </div>
          <div className="flex flex-row-reverse items-stretch gap-3">
            {result.keyRisks.map((risk, i) => (
              <div
                key={i}
                className="flex flex-1 items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-5 py-3 text-xs font-medium leading-relaxed text-warning shadow-sm transition hover:bg-warning/20"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor">
                  <path d="M10 2L1 18h18L10 2zm0 6v4m0 2v.01" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bull / Bear */}
      <div className="mt-8 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-4 flex flex-row-reverse items-center justify-start gap-2 pr-6">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5m-7 7l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-success">Bull case</h3>
          </div>
          <div className="flex-1">
            {renderBullets(result.bullCase || "", "bull")}
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2 pl-6">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14m7-7l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-danger">Bear case</h3>
          </div>
          <div className="flex-1">
            {renderBullets(result.bearCase || "", "bear")}
          </div>
        </div>
      </div>

      {/* Knowledge Gaps */}
      {result.knowledgeGaps && result.knowledgeGaps.length > 0 && (
        <div className="mt-8 border-t border-border pt-8">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Follow-up Questions & Knowledge Gaps
          </div>
          <div className="flex flex-col gap-3">
            {result.knowledgeGaps.map((gap, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition hover:border-primary/50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </div>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
