import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const BACKEND_KEY = "ira.backendUrl";

function Index() {
  const [backendUrl, setBackendUrl] = useState("");
  const [query, setQuery] = useState<{ company: string; ticker: string } | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(BACKEND_KEY) : null;
    if (stored) setBackendUrl(stored);
  }, []);

  const handleBackendChange = (url: string) => {
    setBackendUrl(url);
    if (typeof window !== "undefined") window.localStorage.setItem(BACKEND_KEY, url);
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
            onReset={() => setQuery(null)}
          />
        ) : (
          <SearchView
            backendUrl={backendUrl}
            onBackendUrlChange={handleBackendChange}
            onSubmit={(company, ticker) => setQuery({ company, ticker })}
          />
        )}
      </main>
    </div>
  );
}
