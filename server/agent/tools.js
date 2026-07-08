import axios from "axios";

/**
 * Fetches company fundamentals from Alpha Vantage (OVERVIEW endpoint).
 * Falls back to a clearly-labeled mock so the pipeline still runs
 * end-to-end without a paid/rate-limited key during a demo.
 */
export async function fetchFinancials(companyName, ticker) {
  const AV_KEY = process.env.ALPHAVANTAGE_API_KEY;
  if (!AV_KEY) {
    return mockFinancials(companyName, ticker);
  }
  try {
    const { data } = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "OVERVIEW", symbol: ticker, apikey: AV_KEY },
      timeout: 8000,
    });
    if (!data || !data.Symbol) return mockFinancials(companyName, ticker);
    return {
      source: "alphavantage",
      isMock: false,
      symbol: data.Symbol,
      name: data.Name || companyName,
      sector: data.Sector,
      industry: data.Industry,
      description: data.Description,
      // Core financials
      marketCap: data.MarketCapitalization || "Not disclosed.",
      enterpriseValue: data.EVToRevenue ? "Derived" : "Not disclosed.",
      revenueTTM: data.RevenueTTM || "Not disclosed.",
      grossProfitTTM: data.GrossProfitTTM || "Not disclosed.",
      ebitda: data.EBITDA || "Not disclosed.",
      peRatio: data.PERatio || "Not disclosed.",
      forwardPE: data.ForwardPE || "Not disclosed.",
      pegRatio: data.PEGRatio || "Not disclosed.",
      profitMargin: data.ProfitMargin || "Not disclosed.",
      operatingMarginTTM: data.OperatingMarginTTM || "Not disclosed.",
      eps: data.EPS || "Not disclosed.",
      quarterlyEarningsGrowthYOY: data.QuarterlyEarningsGrowthYOY || "Not disclosed.",
      quarterlyRevenueGrowthYOY: data.QuarterlyRevenueGrowthYOY || "Not disclosed.",
      // Balance sheet
      bookValue: data.BookValue || "Not disclosed.",
      debtToEquity: data.DebtToEquity ?? "Not disclosed.",
      // Shares & ownership
      sharesOutstanding: data.SharesOutstanding || "Not disclosed.",
      beta: data.Beta || "Not disclosed.",
      dividendYield: data.DividendYield || "Not disclosed.",
      // Targets
      analystTargetPrice: data.AnalystTargetPrice || "Not disclosed.",
      analystRatingStrongBuy: data.AnalystRatingStrongBuy || "Not disclosed.",
      analystRatingBuy: data.AnalystRatingBuy || "Not disclosed.",
      analystRatingHold: data.AnalystRatingHold || "Not disclosed.",
      analystRatingSell: data.AnalystRatingSell || "Not disclosed.",
      week52High: data["52WeekHigh"] || "Not disclosed.",
      week52Low: data["52WeekLow"] || "Not disclosed.",
    };
  } catch (err) {
    return mockFinancials(companyName, ticker, err.message);
  }
}

/**
 * Fetches recent news/sentiment via Tavily's search API (LLM-oriented
 * search, returns clean summarized snippets rather than raw HTML).
 * Falls back to mock headlines if no key is configured.
 */
export async function fetchNews(companyName, isDeepMode) {
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_KEY) {
    return mockNews(companyName);
  }
  try {
    const { data } = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: TAVILY_KEY,
        query: `${companyName} latest news financial performance 2026`,
        search_depth: "advanced",
        max_results: isDeepMode ? 12 : 6,
      },
      { timeout: 15000 }
    );
    return {
      source: "tavily",
      articles: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 300),
      })),
    };
  } catch (err) {
    return mockNews(companyName, err.message);
  }
}

/**
 * Competitive landscape — reuses the news/search tool with a targeted
 * query rather than a separate paid API, since Tavily's general search
 * covers this well enough for an MVP. Documented as a trade-off in the README.
 */
export async function fetchCompetitive(companyName, isDeepMode) {
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_KEY) {
    return mockCompetitive(companyName);
  }
  try {
    const { data } = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: TAVILY_KEY,
        query: `${companyName} main competitors market share industry position`,
        search_depth: isDeepMode ? "advanced" : "basic",
        max_results: isDeepMode ? 10 : 5,
      },
      { timeout: 15000 }
    );
    return {
      source: "tavily",
      findings: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 300),
      })),
    };
  } catch (err) {
    return mockCompetitive(companyName, err.message);
  }
}

function mockFinancials(companyName, ticker, errNote) {
  return {
    source: errNote ? `mock (alphavantage error: ${errNote})` : "mock (no ALPHAVANTAGE_API_KEY set)",
    isMock: true,
    symbol: ticker || companyName.toUpperCase().slice(0, 4),
    description: `⚠️ MOCK DATA — These are placeholder fundamentals for ${companyName}. DO NOT use these numbers for analysis, valuation, or any financial conclusions. Set ALPHAVANTAGE_API_KEY for live data.`,
    peRatio: "Not disclosed.",
    marketCap: "Not disclosed.",
    revenueTTM: "Not disclosed.",
    profitMargin: "Not disclosed.",
    debtToEquity: "Not disclosed.",
    sector: "Unknown",
  };
}

function mockNews(companyName, errNote) {
  return {
    source: errNote ? `mock (tavily error: ${errNote})` : "mock (no TAVILY_API_KEY set)",
    articles: [
      { title: `${companyName} reports steady quarterly growth`, url: "", snippet: "Mock headline — set TAVILY_API_KEY for live results." },
      { title: `${companyName} faces margin pressure from input costs`, url: "", snippet: "Mock headline — set TAVILY_API_KEY for live results." },
      { title: `Analysts split on ${companyName} outlook for next fiscal year`, url: "", snippet: "Mock headline — set TAVILY_API_KEY for live results." },
    ],
  };
}

function mockCompetitive(companyName, errNote) {
  return {
    source: errNote ? `mock (tavily error: ${errNote})` : "mock (no TAVILY_API_KEY set)",
    findings: [
      { title: `${companyName} competitive positioning overview`, url: "", snippet: "Mock finding — set TAVILY_API_KEY for live results." },
    ],
  };
}
