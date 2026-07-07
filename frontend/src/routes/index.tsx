import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ResearchView } from "@/components/ResearchView";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Download, Share, Check, TrendingUp, Menu, PanelLeftClose, PanelRightClose } from "lucide-react";
import { SidebarLeft } from "@/components/SidebarLeft";
import { SidebarRight } from "@/components/SidebarRight";
import { OnboardingModal, type UserProfile } from "@/components/OnboardingModal";
import type { Message, ChatSession, ResearchResult } from "@/lib/research-types";

const SpiralIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className={className}>
    <path d="M50 50 m0 -40 a40 40 0 1 1 -40 40 a30 30 0 1 0 30 -30 a20 20 0 1 1 -20 20 a10 10 0 1 0 10 -10"/>
  </svg>
);

function ChatActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-chat.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Investment Research Chat",
        text: content,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="mt-3 pt-3 flex items-center justify-end gap-2 border-t border-border/50 text-muted-foreground/70">
      <button onClick={handleCopy} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={handleDownload} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
        <Download className="h-3 w-3" /> Download
      </button>
      <button onClick={handleShare} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
        <Share className="h-3 w-3" /> Share
      </button>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPIRAL" },
      { name: "description", content: "Autonomous multi-agent equity research." },
    ],
  }),
  component: Index,
});

function Index() {
  const backendUrl = "http://localhost:8081";
  
  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Active chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [researchQuery, setResearchQuery] = useState<{ company: string; ticker: string; isDeepMode?: boolean } | null>(null);
  
  const [isResearching, setIsResearching] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [activeResult, setActiveResult] = useState<ResearchResult | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const dynamicPicks = useMemo(() => {
    if (!userProfile?.interests?.length) return ["Apple", "NVIDIA", "Tesla", "Microsoft"];
    
    // Map interests to companies
    const map: Record<string, string[]> = {
      "AI & Machine Learning": ["OpenAI", "Anthropic", "Palantir", "C3.ai"],
      "Healthcare & Biotech": ["UnitedHealth", "Pfizer", "Moderna", "Johnson & Johnson"],
      "Fintech": ["Stripe", "Block", "PayPal", "Nu Holdings"],
      "SaaS": ["Salesforce", "ServiceNow", "Snowflake", "Datadog"],
      "Crypto & Web3": ["Coinbase", "MicroStrategy", "Marathon Digital", "Riot Platforms"],
      "E-commerce": ["Amazon", "Shopify", "MercadoLibre", "Sea Limited"],
      "Consumer Tech": ["Apple", "Sony", "Samsung", "Garmin"],
      "Enterprise Software": ["Microsoft", "Oracle", "SAP", "Workday"]
    };
    
    // Pick 1 company from each of their interests, up to 4 total
    const picks = new Set<string>();
    for (const interest of userProfile.interests) {
      const companies = map[interest] || [];
      if (companies.length > 0) {
        picks.add(companies[Math.floor(Math.random() * companies.length)]);
      }
    }
    
    // Fallback if needed
    const fallbacks = ["Apple", "NVIDIA", "Tesla", "Microsoft"];
    let i = 0;
    while (picks.size < 4 && i < fallbacks.length) {
      picks.add(fallbacks[i]);
      i++;
    }
    
    return Array.from(picks).slice(0, 4);
  }, [userProfile]);

  const feedRef = useRef<HTMLDivElement>(null);

  // Load sessions from API on mount
  useEffect(() => {
    fetch("http://localhost:8081/api/sessions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(err => console.error("Failed to load sessions:", err));
  }, []);

  // Sync session state to activeSessionId
  useEffect(() => {
    if (activeSessionId) {
      const s = sessions.find((x) => x.id === activeSessionId);
      if (s) {
        setMessages(s.messages);
        setResearchQuery({ company: s.company, ticker: s.ticker || "", isDeepMode: s.isDeepMode });
        
        const fetchCached = async () => {
          const cachedResponse = await fetch(`http://localhost:8081/api/results/${s.company}`);
          if (cachedResponse.ok) {
            const cached = await cachedResponse.json();
            if (cached && cached.verdict) {
              setActiveResult(cached as ResearchResult);
            }
          }
        };
        fetchCached();
      }
    } else {
      setMessages([]);
      setResearchQuery(null);
      setActiveResult(null);
    }
  }, [activeSessionId, sessions]);

  const saveSession = (session: ChatSession) => {
    const newSessions = [...sessions];
    const idx = newSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      newSessions[idx] = session;
    } else {
      newSessions.unshift(session);
    }
    setSessions(newSessions);
    fetch("http://localhost:8081/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session)
    }).catch(console.error);
  };

  const updateActiveSessionMessages = (newMessages: Message[]) => {
    setMessages(newMessages);
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) saveSession({ ...session, messages: newMessages });
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isResearching]);

  const handleInitialSearch = (prompt: string, isDeepMode?: boolean) => {
    const id = Date.now().toString();
    const newMessages: Message[] = [
      { id: id + "_user", role: "user", content: prompt },
      { id: id + "_assistant", role: "assistant", content: "", isInitialResearch: true, isDeepMode }
    ];
    
    const newSession: ChatSession = {
      id,
      company: prompt,
      ticker: "",
      timestamp: Date.now(),
      messages: newMessages,
      isDeepMode
    };

    saveSession(newSession);
    setActiveSessionId(id);
    setIsResearching(true);
  };

  const handleFollowUp = async (prompt: string, isDeepMode?: boolean) => {
    const id = Date.now().toString();
    
    // Add user message
    const userMsg: Message = { id: id + "_user", role: "user", content: prompt };
    const tempMessages = [...messages, userMsg];
    updateActiveSessionMessages(tempMessages);
    setIsChatting(true);

    try {
      let context = {};
      try {
        const cachedResponse = await fetch(`http://localhost:8081/api/results/${researchQuery?.company || prompt}`);
        if (cachedResponse.ok) {
          const cached = await cachedResponse.json();
          if (cached && cached.verdict) {
            context = cached;
          }
        }
      } catch (err) {
        console.error("Failed to fetch cached result:", err);
      }

      const history = tempMessages
        .filter(m => !m.isInitialResearch) 
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, context, history, isDeepMode }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      
      updateActiveSessionMessages([
        ...tempMessages, 
        { id: id + "_assistant", role: "assistant", content: data.content }
      ]);
    } catch (err) {
      console.error(err);
      updateActiveSessionMessages([
        ...tempMessages, 
        { id: id + "_error", role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSubmit = (prompt: string, isDeepMode?: boolean) => {
    if (messages.length === 0) {
      handleInitialSearch(prompt, isDeepMode);
    } else {
      handleFollowUp(prompt, isDeepMode);
    }
  };

  const handleReset = () => {
    setActiveSessionId(null);
    setIsResearching(false);
  };

  // Poll for result from API to update right sidebar
  useEffect(() => {
    if (activeSessionId && isResearching) {
      const interval = setInterval(async () => {
        const s = sessions.find((x) => x.id === activeSessionId);
        if (s?.company) {
          try {
            const cachedResponse = await fetch(`http://localhost:8081/api/results/${s.company}`);
            if (cachedResponse.ok) {
              const cached = await cachedResponse.json();
              if (cached && cached.verdict) {
                setActiveResult(cached as ResearchResult);
                setIsResearching(false); // Stop polling when we have a result
              }
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSessionId, isResearching, sessions]);

  // Remove the static QUICK_PICKS since we use dynamicPicks now
  
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {messages.length === 0 && (
        <>
          {/* Top ethereal glow */}
          <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0 pointer-events-none"></div>
          
          {/* Subtle grid with fade-out mask */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
              backgroundSize: '2rem 2rem',
              maskImage: 'radial-gradient(ellipse at center, white, transparent 80%)'
            }}
          />

          {/* Animated Center glowing orb */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-[40%] blur-[100px] pointer-events-none z-0" 
          />

          {/* Floating accent orbs */}
          <motion.div 
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[15%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"
          />
          <motion.div 
            animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[110px] pointer-events-none z-0"
          />
          
          {/* Faint Data Streams */}
          <div className="absolute left-4 top-0 bottom-0 w-8 overflow-hidden opacity-[0.03] pointer-events-none flex flex-col justify-between font-mono text-[8px] leading-none text-primary whitespace-nowrap">
            {Array.from({length: 40}).map((_,i) => <span key={i}>{Math.random().toString(36).substring(2,8).toUpperCase()}</span>)}
          </div>
          <div className="absolute right-4 top-0 bottom-0 w-8 overflow-hidden opacity-[0.03] pointer-events-none flex flex-col justify-between font-mono text-[8px] leading-none text-primary whitespace-nowrap text-right">
            {Array.from({length: 40}).map((_,i) => <span key={i}>{Math.random().toString(36).substring(2,8).toUpperCase()}</span>)}
          </div>
          <OnboardingModal onComplete={(profile) => setUserProfile(profile)} />
        </>
      )}

      <SidebarLeft 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsResearching(false);
        }}
        onNewChat={handleReset}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10 pl-[68px]">
        <header className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur md:hidden">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <SpiralIcon className="h-5 w-5 text-primary" />
              <span className="font-light italic tracking-[0.15em] text-primary cursor-pointer lowercase" onClick={handleReset}>
                spiral
              </span>
            </div>
          </div>
        </header>

        {messages.length === 0 ? (
          // Empty State (Home)
          <main className="flex flex-1 flex-col items-center justify-center px-6 mt-10">
            <div className="mb-6 flex items-center gap-4">
              <SpiralIcon className="h-10 w-10 text-primary" />
              <span className="text-4xl font-light italic tracking-[0.25em] text-primary lowercase drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">spiral</span>
            </div>
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <TrendingUp className="h-3 w-3" />
              Autonomous Equity Research
            </div>
            {userProfile ? (
              <h1 className="mb-4 text-center text-5xl font-semibold tracking-tight text-foreground md:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {greeting}, {userProfile.name}.
                <br />
                <span className="text-3xl md:text-4xl text-muted-foreground mt-2 inline-block">What company do you research for?</span>
              </h1>
            ) : (
              <h1 className="mb-4 text-center text-5xl font-semibold tracking-tight text-foreground md:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                Research any public company.
              </h1>
            )}
            <p className="mb-10 mt-2 max-w-xl text-center text-lg text-muted-foreground leading-relaxed">
              Multi-agent pipeline gathers financials, news, and competitive data, then
              renders a defensible <span className="text-foreground font-medium">Invest / Pass / Watch</span> verdict.
            </p>
            <motion.div layoutId="prompt-box" className="w-full max-w-2xl relative z-20">
              <ChatInput onSubmit={handleSubmit} disabled={false} />
              
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {dynamicPicks.map((pick: string) => (
                  <button 
                    key={pick}
                    onClick={() => handleInitialSearch(pick)}
                    className="text-xs font-medium px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground cursor-pointer shadow-sm"
                  >
                    Research {pick}
                  </button>
                ))}
              </div>
            </motion.div>
          </main>
        ) : (
          // Chat Feed State
          <main className="flex flex-1 flex-col overflow-hidden relative">
            <div ref={feedRef} className="flex-1 overflow-y-auto pb-32">
              <div className="mx-auto max-w-4xl px-4 py-8 mt-6 flex flex-col gap-8">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    
                    {msg.isInitialResearch ? (
                      // Render the full research block
                      <div className="w-full">
                        <div className="mb-3 flex items-center gap-2 text-primary font-medium">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary ${isResearching ? 'shadow-[0_0_15px_rgba(var(--primary),0.5)]' : ''}`}>
                            <SpiralIcon className={`h-5 w-5 ${isResearching ? 'animate-spin' : ''}`} />
                          </div>
                          {isResearching 
                            ? (researchQuery?.isDeepMode ? <span className="text-primary font-bold">Initiating Deep State for {researchQuery?.company}...</span> : `Researching ${researchQuery?.company}...`)
                            : `Research on ${researchQuery?.company}`
                          }
                        </div>
                        {researchQuery && (
                          <>
                            <ResearchView
                              backendUrl={backendUrl}
                              companyName={researchQuery.company}
                              ticker={researchQuery.ticker}
                              onReset={handleReset}
                              onComplete={(result) => {
                                setIsResearching(false);
                                if (result) setActiveResult(result);
                              }}
                              isDeepMode={researchQuery.isDeepMode}
                              onFollowUpClick={(q) => handleFollowUp(q, researchQuery.isDeepMode)}
                            />
                            {!isResearching && (
                              <div className="mt-4 max-w-6xl mx-auto">
                                <ChatActions content={`Research Report on ${researchQuery?.company}`} />
                              </div>
                            )}
                          </>
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
                          <div className="flex flex-col">
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <ChatActions content={msg.content} />
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
              <motion.div layoutId="prompt-box" className="pointer-events-auto mx-auto px-4 max-w-4xl">
                <ChatInput onSubmit={handleSubmit} disabled={isChatting} />
              </motion.div>
            </div>
          </main>
        )}
      </div>

      {messages.length > 0 && (
        <AnimatePresence>
          {activeResult && !isResearching && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full shrink-0"
            >
              <SidebarRight result={activeResult} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
