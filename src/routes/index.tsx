import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ResearchView } from "@/components/ResearchView";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investment Research Agent" },
      { name: "description", content: "Autonomous multi-agent equity research." },
    ],
  }),
  component: Index,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isInitialResearch?: boolean; // flag to render ResearchView
};

function Index() {
  const backendUrl = "http://localhost:8081";
  
  // Entire chat history
  const [messages, setMessages] = useState<Message[]>([]);
  // Store the initial query for the ResearchView
  const [researchQuery, setResearchQuery] = useState<{ company: string; ticker: string } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isResearching]);

  const handleInitialSearch = (prompt: string) => {
    const id = Date.now().toString();
    setMessages([
      { id: id + "_user", role: "user", content: prompt },
      { id: id + "_assistant", role: "assistant", content: "", isInitialResearch: true }
    ]);
    
    // For now, if they type "Apple", we just use it as company and empty ticker. 
    // You can enhance this with NLP later.
    setResearchQuery({ company: prompt, ticker: "" });
    setIsResearching(true);
  };

  const handleFollowUp = async (prompt: string) => {
    const id = Date.now().toString();
    
    // Add user message
    const userMsg: Message = { id: id + "_user", role: "user", content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatting(true);

    try {
      // Re-hydrate the context from localStorage or state for the backend
      const savedContext = localStorage.getItem("research_result");
      const context = savedContext ? JSON.parse(savedContext) : {};

      // Filter to just standard chat messages for history
      const history = messages
        .filter(m => !m.isInitialResearch) 
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, context, history }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      
      // Add assistant message
      setMessages((prev) => [
        ...prev, 
        { id: id + "_assistant", role: "assistant", content: data.content }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev, 
        { id: id + "_error", role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSubmit = (prompt: string) => {
    if (messages.length === 0) {
      handleInitialSearch(prompt);
    } else {
      handleFollowUp(prompt);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setResearchQuery(null);
    setIsResearching(false);
    localStorage.removeItem("research_result");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            <span className="font-semibold tracking-tight text-foreground cursor-pointer" onClick={handleReset}>
              Investment Research Agent
            </span>
          </div>
          <div className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:block">
            v1.0 · multi-agent
          </div>
        </div>
      </header>

      {messages.length === 0 ? (
        // Empty State (Home)
        <main className="flex flex-1 flex-col items-center justify-center px-6">
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
          <motion.div layoutId="prompt-box" className="w-full max-w-2xl">
            <ChatInput onSubmit={handleSubmit} disabled={false} />
          </motion.div>
        </main>
      ) : (
        // Chat Feed State
        <main className="flex flex-1 flex-col overflow-hidden relative">
          <div ref={feedRef} className="flex-1 overflow-y-auto pb-32">
            <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-8">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  
                  {msg.isInitialResearch ? (
                    // Render the full research block
                    <div className="w-full">
                      <div className="mb-3 flex items-center gap-2 text-primary font-medium">
                        <div className={`flex h-6 w-6 items-center justify-center rounded bg-primary/20 ${isResearching ? 'animate-pulse' : ''}`}>
                          <span className={isResearching ? 'animate-spin' : ''}>✦</span>
                        </div>
                        {isResearching ? `Researching ${researchQuery?.company}...` : `Research on ${researchQuery?.company}`}
                      </div>
                      {researchQuery && (
                        <ResearchView
                          backendUrl={backendUrl}
                          companyName={researchQuery.company}
                          ticker={researchQuery.ticker}
                          onReset={handleReset}
                          onComplete={() => setIsResearching(false)}
                        />
                      )}
                    </div>
                  ) : (
                    // Render standard chat bubble
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  )}

                </div>
              ))}
              
              {isChatting && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] bg-card border border-border text-foreground rounded-tl-sm flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Input Area */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 pointer-events-none">
            <motion.div layoutId="prompt-box" className="pointer-events-auto">
              <ChatInput onSubmit={handleSubmit} disabled={isChatting} />
            </motion.div>
          </div>
        </main>
      )}
    </div>
  );
}
