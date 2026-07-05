import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SearchView } from "@/components/SearchView";
import { ResearchView } from "@/components/ResearchView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investment Research Agent" },
      {
        name: "description",
        content:
          "Autonomous multi-agent equity research: financials, news, and competitive analysis synthesized into an Invest / Pass / Watch verdict.",
      },
      { property: "og:title", content: "Investment Research Agent" },
      {
        property: "og:description",
        content: "Autonomous multi-agent equity research with a transparent Invest / Pass / Watch verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const backendUrl = "http://localhost:8081";
  const [query, setQuery] = useState<{ company: string; ticker: string } | null>(() => {
    try {
      const saved = localStorage.getItem("research_query");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetQuery = (company: string, ticker: string) => {
    const newQuery = { company, ticker };
    setQuery(newQuery);
    localStorage.setItem("research_query", JSON.stringify(newQuery));
    localStorage.removeItem("research_result");
  };

  const handleReset = () => {
    setQuery(null);
    localStorage.removeItem("research_query");
    localStorage.removeItem("research_result");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            <span className="font-semibold tracking-tight text-foreground">
              Investment Research Agent
            </span>
          </div>
          <div className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:block">
            v1.0 · multi-agent
          </div>
        </div>
      </header>

      <main>
        {query ? (
          <ResearchView
            backendUrl={backendUrl}
            companyName={query.company}
            ticker={query.ticker}
            onReset={handleReset}
          />
        ) : (
          <SearchView
            onSubmit={handleSetQuery}
          />
        )}
      </main>
    </div>
  );
}
