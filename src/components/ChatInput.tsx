import { useState } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: Props) {
  const [prompt, setPrompt] = useState("");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;
    onSubmit(prompt.trim());
    setPrompt("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handle} className="relative flex items-center w-full">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled}
          placeholder="Ask a follow-up or research a new company..."
          className="w-full rounded-2xl border border-border bg-card px-6 py-4 pr-16 text-sm text-foreground shadow-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || disabled}
          className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
