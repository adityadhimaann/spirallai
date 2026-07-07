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
      symbol: data.Symbol,
      peRatio: data.PERatio,
      marketCap: data.MarketCapitalization,
      revenueTTM: data.RevenueTTM,
      profitMargin: data.ProfitMargin,
      debtToEquity: data.DebtToEquity ?? "n/a",
      sector: data.Sector,
      description: data.Description,
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
    symbol: ticker || companyName.toUpperCase().slice(0, 4),
    peRatio: "24.3",
    marketCap: "58200000000",
    revenueTTM: "9800000000",
    profitMargin: "0.14",
    debtToEquity: "0.6",
    sector: "Technology",
    description: `Mock fundamentals for ${companyName}. Set ALPHAVANTAGE_API_KEY for live data.`,
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
