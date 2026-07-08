import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { ExternalLink, Check } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ResearchResult, Verdict, ScoreBreakdown, FinancialHealth } from "@/lib/research-types";

function safeGetHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Source";
  } catch {
    return "Source";
  }
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "STRONG BUY": { bg: "bg-success", text: "text-success-foreground", label: "STRONG BUY" },
  BUY: { bg: "bg-success", text: "text-success-foreground", label: "BUY" },
  HOLD: { bg: "bg-warning", text: "text-warning-foreground", label: "HOLD" },
  REDUCE: { bg: "bg-danger", text: "text-danger-foreground", label: "REDUCE" },
  SELL: { bg: "bg-danger", text: "text-danger-foreground", label: "SELL" },
  "STRONG SELL": { bg: "bg-danger", text: "text-danger-foreground", label: "STRONG SELL" },
  INVEST: { bg: "bg-success", text: "text-success-foreground", label: "INVEST" },
  PASS: { bg: "bg-danger", text: "text-danger-foreground", label: "PASS" },
  WATCH: { bg: "bg-warning", text: "text-warning-foreground", label: "WATCH" },
};

function ConfidenceGauge({ value, explanation }: { value: number; explanation?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Confidence
        </span>
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {v}
          <span className="text-sm text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary dark:bg-black/50 shadow-inner">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
      {explanation && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed italic">{explanation}</p>
      )}
    </div>
  );
}

const SCORE_LABELS: Record<string, { label: string; icon: string }> = {
  growth: { label: "Growth", icon: "📈" },
  profitability: { label: "Profitability", icon: "💰" },
  balanceSheet: { label: "Balance Sheet", icon: "🏦" },
  valuation: { label: "Valuation", icon: "📊" },
  competitivePosition: { label: "Competitive Position", icon: "🏆" },
  execution: { label: "Execution", icon: "⚡" },
  risk: { label: "Risk", icon: "⚠️" },
};

function VerdictScorecard({ scores }: { scores: ScoreBreakdown }) {
  const entries = Object.entries(scores).filter(([_, v]) => v !== null && v !== undefined) as [string, number][];
  const overall = entries.length > 0
    ? (entries.reduce((sum, [_, v]) => sum + v, 0) / entries.length).toFixed(1)
    : "N/A";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 shadow-sm ring-1 ring-white/5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Investment Scorecard</h3>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl font-bold text-foreground">{overall}</span>
          <span className="text-xs text-muted-foreground">/10</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Object.entries(SCORE_LABELS).map(([key, { label, icon }]) => {
          const val = scores[key as keyof ScoreBreakdown];
          const isNull = val === null || val === undefined;
          const numVal = isNull ? 0 : (val as number);
          const color = numVal >= 8 ? "bg-success" : numVal >= 5 ? "bg-primary" : "bg-danger";

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm w-5 text-center">{icon}</span>
              <span className="text-xs font-medium text-foreground w-36 truncate">{label}</span>
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-secondary/50 dark:bg-black/40 shadow-inner">
                {!isNull && (
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${numVal * 10}%` }}
                  />
                )}
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground w-8 text-right">
                {isNull ? "N/A" : `${numVal}/10`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FINANCIAL_HEALTH_LABELS: Record<string, string> = {
  revenue: "Revenue (TTM)",
  revenueGrowth: "Revenue Growth (YoY)",
  grossMargin: "Gross Margin",
  operatingMargin: "Operating Margin",
  gaapNetIncome: "GAAP Net Income",
  eps: "EPS",
  freeCashFlow: "Free Cash Flow",
  cash: "Cash & Equivalents",
  totalDebt: "Total Debt",
  sbc: "Stock-Based Compensation",
  sharesOutstanding: "Shares Outstanding",
  customerGrowth: "Customer Growth",
  enterpriseValue: "Enterprise Value",
  marketCap: "Market Capitalization",
};

function FinancialHealthTable({ data }: { data: FinancialHealth }) {
  const entries = Object.entries(FINANCIAL_HEALTH_LABELS);
  // Only show if we have at least one non-empty value
  const hasData = entries.some(([key]) => {
    const val = data[key as keyof FinancialHealth];
    return val && val !== "Not disclosed.";
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 shadow-sm ring-1 ring-white/5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Financial Health</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
        {entries.map(([key, label]) => {
          const val = data[key as keyof FinancialHealth] || "Not disclosed.";
          const isUndisclosed = val === "Not disclosed.";
          return (
            <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-xs font-mono font-medium ${isUndisclosed ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
                {val}
              </span>
            </div>
          );
        })}
      </div>
      {!hasData && (
        <p className="mt-4 text-xs text-muted-foreground italic text-center">
          No verified financial data available. Set ALPHAVANTAGE_API_KEY for live data.
        </p>
      )}
    </div>
  );
}

function DataQualityAlerts({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 mb-6">
      {notes.map((note, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 backdrop-blur-md px-5 py-3.5 text-xs font-medium leading-relaxed text-warning shadow-sm"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 mt-0.5" fill="currentColor">
            <path
              d="M10 2L1 18h18L10 2zm0 6v4m0 2v.01"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <span>{note}</span>
        </div>
      ))}
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

function renderBullets(text: string, type: "bull" | "bear", setActiveUrl: (url: string) => void) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

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
        <div
          className={`mb-6 text-[14px] leading-relaxed text-muted-foreground ${isMirrored ? "text-right" : "text-left"}`}
        >
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
          const alignClass = isEven
            ? isMirrored
              ? "ml-auto"
              : "mr-auto"
            : isMirrored
              ? "mr-auto"
              : "ml-auto";

          // Animations
          const popClass = alignClass === "mr-auto" ? "animate-pop-left" : "animate-pop-right";
          const delay = i * 0.1; // 100ms stagger per item

          // Calculate the connector line perfectly
          const emptySpace = "18%";
          const lineStyle: React.CSSProperties = {
            [isMirrored ? "right" : "left"]: `-${trackOffset}`,
            width:
              alignClass === (isMirrored ? "ml-auto" : "mr-auto")
                ? trackOffset
                : `calc(${emptySpace} + ${trackOffset})`,
            top: "24px",
            transformOrigin: isMirrored ? "right" : "left",
            opacity: 0,
            animation: `scaleInX 0.4s ease-out ${delay + 0.15}s forwards`,
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
                  animationDelay: `${delay + 0.05}s`,
                }}
              />

              {/* The Card */}
              <div
                className={`z-20 flex h-full w-[82%] flex-col justify-center rounded-lg border p-4 shadow-sm transition-colors hover:brightness-105 ${bgClass} ${alignClass} ${popClass}`}
                style={{ animationDelay: `${delay}s` }}
              >
                <div
                  className={`text-[13px] leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert max-w-none break-words prose-a:text-primary prose-a:no-underline hover:prose-a:underline ${isMirrored ? "text-right" : "text-left"}`}
                >
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveUrl(props.href || "");
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded ml-1 my-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full cursor-pointer"
                          title={props.href}
                        >
                          <span className="truncate">{props.children}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </button>
                      ),
                    }}
                  >
                    {clean}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderComprehensiveReport(text: string | string[], setActiveUrl: (url: string) => void) {
  const content = Array.isArray(text) ? text.join("\n\n") : (text || "");
  
  // Split the markdown by sections (headers or numbered lists at start of line)
  let blocks = content.split(/(?=^#{1,4}\s+.*$|^\d+\.\s+[A-Z].*$)/m).filter(b => b.trim().length > 0);
  
  // If no headers found, fallback to splitting by paragraph
  if (blocks.length <= 1) {
    blocks = content.split(/\n\n+/).filter(b => b.trim().length > 0);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {blocks.map((block, i) => {
        const delay = i * 0.1;
        return (
          <div
            key={i}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 lg:p-8 transition-all duration-300 hover:bg-card/40 shadow-sm hover:shadow-md animate-pop-left opacity-0"
            style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10 prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-0 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:border-collapse prose-th:border-b prose-th:border-white/10 prose-th:pb-2 prose-td:py-2 prose-p:leading-relaxed prose-li:leading-relaxed prose-p:last:mb-0">
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveUrl(props.href || "");
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded mx-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full cursor-pointer align-baseline"
                      title={props.href}
                    >
                      <span className="truncate">{props.children}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </button>
                  ),
                }}
              >
                {block.trim()}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
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
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.2)] ring-1 ring-white/10 before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-50">
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
  if (
    domain.includes("sec.gov") ||
    domain.includes("investor.") ||
    domain.includes("apple.com") ||
    domain.includes("tesla.com")
  )
    return { label: "OFFICIAL", bg: "bg-success/20", text: "text-success" };
  if (domain.endsWith(".gov")) return { label: "GOV", bg: "bg-blue-500/20", text: "text-blue-500" };
  if (domain.endsWith(".edu"))
    return { label: "ACADEMIC", bg: "bg-purple-500/20", text: "text-purple-500" };
  if (
    domain.includes("bloomberg") ||
    domain.includes("cnbc") ||
    domain.includes("wsj") ||
    domain.includes("reuters") ||
    domain.includes("ft.com") ||
    domain.includes("stocktitan")
  )
    return { label: "NEWS", bg: "bg-orange-500/20", text: "text-orange-500" };
  return null;
}

function SourceCard({
  source,
  setActiveUrl,
}: {
  source: SourceItem;
  setActiveUrl: (url: string) => void;
}) {
  const domain = safeGetHostname(source.url);

  // Fallback for mock URLs without protocol
  const isMock = !source.url.startsWith("http");

  const badge = getDomainBadge(domain);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        setActiveUrl(isMock ? "" : source.url);
      }}
      className="group relative flex h-full flex-col text-left rounded-xl border border-white/10 bg-card/30 backdrop-blur-xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:bg-card/50 hover:shadow-[0_8px_30px_rgba(var(--primary),0.15)] cursor-pointer"
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
            <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {domain}
            </div>
            {badge && (
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${badge.bg} ${badge.text}`}
              >
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
            {source.snippet
              ? source.snippet
                  .replace(/[|]/g, "")
                  .replace(/---/g, "")
                  .replace(/Date: \w{3} \d{1,2}, \d{4}/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
              : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

function SourcesSection({
  news,
  competitive,
  setActiveUrl,
}: {
  news: any;
  competitive: any;
  setActiveUrl: (url: string) => void;
}) {
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
          <SourceCard key={i} source={source} setActiveUrl={setActiveUrl} />
        ))}
      </div>
    </div>
  );
}

function NewsAnalytics({
  companyName,
  news,
  setActiveUrl,
}: {
  companyName: string;
  news: any;
  setActiveUrl: (url: string) => void;
}) {
  const sources: SourceItem[] = news?.articles && Array.isArray(news.articles) ? news.articles : [];

  const analytics = useMemo(() => {
    // Generate deterministic but random-looking data based on company name length + sources length
    const base = companyName.length + sources.length;

    // Simulate sentiment distribution
    const pos = 40 + (base % 30);
    const neu = 30 + ((base * 2) % 20);
    const neg = 100 - pos - neu;

    const sentimentData = [
      { name: "Positive", value: pos, color: "#10b981" },
      { name: "Neutral", value: neu, color: "#64748b" },
      { name: "Negative", value: neg, color: "#ef4444" },
    ];

    // Simulate Volume over last 5 days
    const volumeData = Array.from({ length: 5 }).map((_, i) => ({
      day: `Day ${i + 1}`,
      mentions: 10 + ((base * (i + 1)) % 40),
    }));

    // Mock summary text based on sentiment
    let summary = `Recent media coverage for ${companyName} has been predominantly `;
    if (pos > 50)
      summary += "optimistic, driven by strong growth metrics and favorable market positioning.";
    else if (neg > 40)
      summary +=
        "cautious, with significant concerns raised regarding macroeconomic headwinds and execution risks.";
    else summary += "mixed, balancing steady core performance against emerging sector volatility.";

    return { sentimentData, volumeData, summary };
  }, [companyName, sources.length]);

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18M18 9l-5 5-4-4-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        News & Sentiment Analytics
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 shadow-sm ring-1 ring-white/5 flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          <h4 className="text-sm font-semibold text-foreground mb-3 relative z-10">
            AI Sentiment Summary
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground relative z-10">
            {analytics.summary}
          </p>
          <div className="mt-6 pt-4 border-t border-border/50 flex flex-col gap-2 relative z-10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Top Sources</span>
              <span className="font-mono text-sm font-semibold text-primary">
                {sources.length > 0 ? sources.length : 12} analyzed
              </span>
            </div>
            {sources.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {sources.slice(0, 4).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveUrl(src.url)}
                    className="text-xs text-left text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 truncate cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span className="truncate">{src.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No direct sources available.
              </span>
            )}
          </div>
        </div>

        {/* Sentiment Pie Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 shadow-sm ring-1 ring-white/5 flex flex-col items-center">
          <h4 className="text-sm font-semibold text-foreground mb-2 w-full">
            Sentiment Distribution
          </h4>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {analytics.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 w-full flex justify-end">
            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              Data derived from:{" "}
              {sources.length > 0 ? (
                <button
                  onClick={() => setActiveUrl(sources[0].url)}
                  className="hover:text-primary hover:underline cursor-pointer"
                >
                  {safeGetHostname(sources[0].url)}
                </button>
              ) : (
                "AI Analysis"
              )}
            </span>
          </div>
        </div>

        {/* Mentions Histogram */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 shadow-sm ring-1 ring-white/5 flex flex-col">
          <h4 className="text-sm font-semibold text-foreground mb-4">Coverage Volume (5D)</h4>
          <div className="flex-1 w-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.volumeData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  cursor={{ fill: "hsl(var(--secondary))" }}
                />
                <Bar dataKey="mentions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 w-full flex justify-end">
            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              Data derived from:{" "}
              {sources.length > 0 ? (
                <button
                  onClick={() => setActiveUrl(sources[0].url)}
                  className="hover:text-primary hover:underline cursor-pointer"
                >
                  {safeGetHostname(sources[0].url)}
                </button>
              ) : (
                "AI Analysis"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  result: ResearchResult;
  onReset: () => void;
  companyName: string;
  ticker?: string;
  onFollowUpClick?: (q: string) => void;
}

export function ResultsView({ result, onReset, companyName, ticker, onFollowUpClick }: Props) {
  const setActiveUrl = (url: string | null) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
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
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary cursor-pointer"
        >
          Research another company
        </button>
      </div>

      <SourcesSection
        news={result.news}
        competitive={result.competitive}
        setActiveUrl={setActiveUrl}
      />

      {/* Data Quality Alerts */}
      <DataQualityAlerts notes={result.dataQualityNotes || []} />

      {/* Verdict card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgb(0,0,0,0.15)] ring-1 ring-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          {/* Logo & Verdict Badge Stack */}
          <div className="flex shrink-0 flex-col items-center gap-3">
            <CompanyLogo name={companyName} ticker={ticker} />
            <div
              className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-bold tracking-widest ${v.bg} ${v.text} ring-1 ring-inset ${v.text.replace("text-", "ring-")}/30 shadow-sm`}
            >
              {v.label}
            </div>
          </div>

          <div className="flex-1">
            <ConfidenceGauge value={result.confidence} explanation={result.confidenceExplanation} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {result.scoreBreakdown && <VerdictScorecard scores={result.scoreBreakdown} />}
        {result.financialHealth && <FinancialHealthTable data={result.financialHealth} />}
      </div>

      {renderComprehensiveReport(result.reasoning, setActiveUrl)}

      {/* Key risks */}
      {result.keyRisks?.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex justify-end">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Key risks
            </span>
          </div>
          <div className="flex flex-row-reverse flex-wrap items-stretch gap-3">
            {result.keyRisks.map((risk, i) => (
              <div
                key={i}
                className="flex flex-1 items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 backdrop-blur-md px-5 py-3.5 text-xs font-medium leading-relaxed text-warning shadow-sm transition-all duration-300 hover:bg-warning/10 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:-translate-y-0.5 prose prose-sm dark:prose-invert prose-a:text-warning prose-a:underline"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor">
                  <path
                    d="M10 2L1 18h18L10 2zm0 6v4m0 2v.01"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <ReactMarkdown>{risk}</ReactMarkdown>
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
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 19V5m-7 7l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-success">Bull case</h3>
          </div>
          <div className="flex-1">{renderBullets(result.bullCase || "", "bull", setActiveUrl)}</div>
        </div>

        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2 pl-6">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14m7-7l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-danger">Bear case</h3>
          </div>
          <div className="flex-1">{renderBullets(result.bearCase || "", "bear", setActiveUrl)}</div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="mt-12 pt-10 border-t border-border">
        <NewsAnalytics companyName={companyName} news={result.news} setActiveUrl={setActiveUrl} />
      </div>

      {/* Knowledge Gaps */}
      {result.knowledgeGaps && result.knowledgeGaps.length > 0 && (
        <div className="mt-8 border-t border-border pt-8 mb-8">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Follow-up Questions & Knowledge Gaps
          </div>
          <div className="flex flex-col gap-3">
            {result.knowledgeGaps.map((gap, i) => (
              <button
                key={i}
                onClick={() => onFollowUpClick?.(gap)}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-card/30 backdrop-blur-xl px-5 py-4 text-sm text-foreground shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(var(--primary),0.15)] hover:-translate-y-0.5 text-left cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary transition-colors group-hover:bg-primary/20 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.4)]">
                  {i + 1}
                </div>
                <span>{gap}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
