import { useState, useEffect } from "react";
import { MessageSquare, Plus, Search, Menu, History, Sun, Moon } from "lucide-react";
import type { ChatSession } from "@/lib/research-types";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export function SidebarLeft({ sessions, activeSessionId, onSelectSession, onNewChat }: Props) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark"
      );
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <aside className="z-50 flex h-full shrink-0 flex-col border-r border-border/60 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out w-[68px] hover:w-64 group shadow-[4px_0_24px_rgba(0,0,0,0.1)]">
      {/* Header section */}
      <div className="flex h-16 items-center pl-[22px] pr-4 border-b border-border/60 overflow-hidden shrink-0">
        <div className="flex items-center gap-3 w-[200px]">
          <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 text-primary shadow-[0_0_12px_var(--primary)] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M50 50 m0 -40 a40 40 0 1 1 -40 40 a30 30 0 1 0 30 -30 a20 20 0 1 1 -20 20 a10 10 0 1 0 10 -10" />
            </svg>
          </div>
          <span className="font-light italic tracking-[0.15em] text-foreground lowercase opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
            SPIRALL
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-border/60 shrink-0">
        <button
          onClick={onNewChat}
          className="flex h-9 w-9 mx-auto group-hover:w-full items-center gap-3 overflow-hidden rounded-full group-hover:rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:bg-primary/90 shadow-sm cursor-pointer relative"
        >
          <div className="absolute left-[10px] flex items-center justify-center">
            <Plus className="h-4 w-4 shrink-0" />
          </div>
          <span className="ml-8 text-sm font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
            New Research
          </span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto py-2 overflow-x-hidden">
        <div className="flex h-10 items-center pl-[26px] pr-4 mb-2">
          <div className="flex items-center gap-3 w-full">
            <History className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
              Recent Searches
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-2">
          {sessions.length === 0 ? (
            <div className="px-4 py-4 text-xs text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
              No recent searches
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group/btn relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 transition-colors cursor-pointer ${
                  activeSessionId === session.id
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <div className="absolute left-[16px] flex items-center justify-center h-5 w-5 bg-secondary/50 rounded overflow-hidden">
                  <img
                    src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${session.company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"}&size=32`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                <div className="ml-8 flex flex-col items-start opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="truncate w-40 text-sm font-medium text-left">
                    {session.company}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-border/60 shrink-0">
        <button
          onClick={toggleTheme}
          className="group/btn relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 transition-colors text-muted-foreground hover:bg-secondary/50 hover:text-foreground cursor-pointer"
        >
          <div className="absolute left-[16px] flex items-center justify-center">
            {isDarkMode ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
          </div>
          <span className="ml-8 text-sm font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>
    </aside>
  );
}
