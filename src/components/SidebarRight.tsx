import { Newspaper, Users, ExternalLink } from "lucide-react";
import type { ResearchResult } from "@/lib/research-types";

interface Props {
  result: ResearchResult | null;
}

export function SidebarRight({ result }: Props) {
  if (!result) {
    return (
      <aside className="w-80 border-l border-border/60 bg-background/50 backdrop-blur flex flex-col h-full shrink-0 hidden lg:flex">
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 uppercase tracking-widest text-center p-6">
          Search a company to view live data
        </div>
      </aside>
    );
  }

  const newsData = result.news as any;
  const compData = result.competitive as any;

  const articles = newsData?.articles || [];
  const competitors = compData?.findings || [];

  return (
    <aside className="w-80 border-l border-border/60 bg-background/50 backdrop-blur flex flex-col h-full shrink-0 hidden lg:flex">
      <div className="p-4 border-b border-border/60">
        <h2 className="font-semibold tracking-tight text-foreground text-sm">
          Real-Time Context
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* News Section */}
        {articles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Newspaper className="h-3.5 w-3.5" />
              Latest News
            </div>
            <div className="flex flex-col gap-3">
              {articles.slice(0, 5).map((article: any, i: number) => {
                let domain = "";
                try {
                  domain = new URL(article.url).hostname.replace(/^www\./, "");
                } catch {}

                return (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      {domain && (
                        <img 
                          src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=16`} 
                          className="h-3 w-3 rounded-sm"
                          alt=""
                        />
                      )}
                      <span className="text-[10px] font-medium text-muted-foreground">{domain || "News Source"}</span>
                      <ExternalLink className="h-2.5 w-2.5 ml-auto text-muted-foreground/50 group-hover:text-primary" />
                    </div>
                    <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitive Section */}
        {competitors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Competitive Landscape
            </div>
            <div className="flex flex-col gap-3">
              {competitors.slice(0, 4).map((comp: any, i: number) => {
                let domain = "";
                try {
                  domain = new URL(comp.url).hostname.replace(/^www\./, "");
                } catch {}

                return (
                  <a
                    key={i}
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      {domain && (
                        <img 
                          src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=16`} 
                          className="h-3 w-3 rounded-sm"
                          alt=""
                        />
                      )}
                      <span className="text-[10px] font-medium text-muted-foreground">{domain || "Source"}</span>
                    </div>
                    <h3 className="text-xs text-muted-foreground line-clamp-3 leading-snug">
                      {comp.content || comp.title}
                    </h3>
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
