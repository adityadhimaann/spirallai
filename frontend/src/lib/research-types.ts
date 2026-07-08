export type Verdict =
  "STRONG BUY" | "BUY" | "HOLD" | "REDUCE" | "SELL" | "INVEST" | "PASS" | "WATCH" | string;

export interface ScoreBreakdown {
  growth: number;
  profitability: number;
  balanceSheet: number;
  valuation: number | null;
  competitivePosition: number;
  execution: number;
  risk: number;
}

export interface FinancialHealth {
  revenue?: string;
  revenueGrowth?: string;
  grossMargin?: string;
  operatingMargin?: string;
  gaapNetIncome?: string;
  eps?: string;
  freeCashFlow?: string;
  cash?: string;
  totalDebt?: string;
  sbc?: string;
  sharesOutstanding?: string;
  customerGrowth?: string;
  enterpriseValue?: string;
  marketCap?: string;
}

export interface ResearchResult {
  verdict: Verdict;
  confidence: number; // 0-100
  confidenceExplanation?: string;
  reasoning: string | string[];
  scoreBreakdown?: ScoreBreakdown;
  financialHealth?: FinancialHealth;
  dataQualityNotes?: string[];
  keyRisks: string[];
  knowledgeGaps?: string[];
  bullCase: string;
  bearCase: string;
  financials?: unknown;
  news?: unknown;
  competitive?: unknown;
  [k: string]: unknown;
}

export type NodeKey = "financials" | "news" | "competitive" | "bull" | "bear" | "judge";

export const NODE_STEPS: { key: NodeKey; label: string }[] = [
  { key: "financials", label: "Fetching financials" },
  { key: "news", label: "Fetching news & sentiment" },
  { key: "competitive", label: "Fetching competitive landscape" },
  { key: "bull", label: "Building bull case" },
  { key: "bear", label: "Building bear case" },
  { key: "judge", label: "Judge deciding" },
];

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isInitialResearch?: boolean; // flag to render ResearchView
  isDeepMode?: boolean;
};

export type ChatSession = {
  id: string;
  company: string;
  ticker?: string;
  timestamp: number;
  messages: Message[];
  isDeepMode?: boolean;
};
