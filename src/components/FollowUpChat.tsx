import { useState, useRef, useEffect } from "react";
import type { ResearchResult } from "@/lib/research-types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FollowUpChat({ context }: { context: ResearchResult }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8081/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context,
          history: messages,
        }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-end pointer-events-none pb-8">
      
      {/* Chat History Overlay */}
      {messages.length > 0 && (
        <div className="pointer-events-auto mb-4 w-full max-w-3xl px-6">
          <div className="overflow-y-auto rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl transition-all max-h-[50vh] custom-scrollbar">
            <div className="flex flex-col gap-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-br-sm" 
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-5 py-4 shadow-sm">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="pointer-events-auto relative w-full max-w-3xl px-6">
        <div className="relative flex items-center overflow-hidden rounded-full border border-border bg-card shadow-xl transition-shadow focus-within:border-primary/50 focus-within:shadow-2xl focus-within:ring-1 focus-within:ring-primary/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            disabled={loading}
            className="w-full bg-transparent py-4 pl-6 pr-14 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5m-7 7l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
