import { useState } from "react";

interface Props {
  onSubmit: (companyName: string, ticker: string) => void;
  backendUrl: string;
  onBackendUrlChange: (url: string) => void;
}

export function SearchView({ onSubmit, backendUrl, onBackendUrlChange }: Props) {
  const [company, setCompany] = useState("");
  const [ticker, setTicker] = useState("");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    onSubmit(company.trim(), ticker.trim());
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-6">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Autonomous Equity Research
      </div>
      <h1 className="mb-3 text-center text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
        Research any public company.
      </h1>
      <p className="mb-10 max-w-xl text-center text-base text-muted-foreground">
        Multi-agent pipeline gathers financials, news, and competitive data, then
        renders a defensible <span className="text-foreground">Invest / Pass / Watch</span> verdict.
      </p>

      <form onSubmit={handle} className="w-full">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/20 md:flex-row">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Enter a company name (e.g. Nvidia, Tesla, Zomato)"
            className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker (opt)"
            className="w-full rounded-md bg-secondary px-3 py-3 font-mono text-sm uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none md:w-32"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            disabled={!company.trim()}
          >
            Research →
          </button>
        </div>
      </form>

      <div className="mt-10 w-full">
        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Backend URL
        </label>
        <input
          value={backendUrl}
          onChange={(e) => onBackendUrlChange(e.target.value)}
          placeholder="https://your-backend.example.com"
          className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Streams from <code className="font-mono">GET {"{backend}"}/api/research/stream</code>
          . Stored locally.
        </p>
      </div>
    </div>
  );
}
