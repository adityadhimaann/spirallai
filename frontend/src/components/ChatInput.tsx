import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

interface Props {
  onSubmit: (prompt: string, isDeepMode?: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: Props) {
  const [prompt, setPrompt] = useState("");
  const [isDeepMode, setIsDeepMode] = useState(false);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;
    onSubmit(prompt.trim(), isDeepMode);
    setPrompt("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-2">
      <form onSubmit={handle} className="relative flex items-center w-full group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled}
          placeholder="Ask a follow-up or research a new company..."
          className="relative w-full rounded-2xl border border-primary/40 bg-background/50 backdrop-blur-xl px-6 py-4 pr-[180px] text-sm text-foreground shadow-[0_0_20px_rgba(var(--primary),0.2)] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_30px_rgba(var(--primary),0.4)] disabled:opacity-50 transition-all"
        />

        <div className="absolute right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => setIsDeepMode(!isDeepMode)}
            disabled={disabled}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
              isDeepMode
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                : "bg-secondary/50 text-muted-foreground border border-transparent hover:bg-secondary/80"
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isDeepMode ? "animate-pulse" : ""}`} />
            Deep
          </button>

          <button
            type="submit"
            disabled={!prompt.trim() || disabled}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(var(--primary),0.5)] disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none cursor-pointer"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
