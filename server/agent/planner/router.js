/**
 * Intent Router
 * Classifies the query into an intent deterministically using keywords.
 */

const INTENT_RULES = [
  {
    intent: "Financial Analysis",
    keywords: ["revenue", "profit", "margin", "earnings", "financials", "cash flow", "balance sheet", "eps"]
  },
  {
    intent: "Compare Companies",
    keywords: ["compare", "vs", "versus", "better than"]
  },
  {
    intent: "News Summary",
    keywords: ["news", "latest", "recent", "headlines", "update", "happening"]
  },
  {
    intent: "Risk Analysis",
    keywords: ["risk", "danger", "bear", "downside", "threats"]
  },
  {
    intent: "Competitive Analysis",
    keywords: ["competitor", "market share", "industry position", "rivals"]
  }
];

export function determineIntent(query) {
  const normalized = query.toLowerCase();
  
  for (const rule of INTENT_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return rule.intent;
      }
    }
  }

  // Default intent
  return "Company Research";
}
