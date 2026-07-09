import axios from "axios";

/**
 * Fetches company fundamentals from Finnhub (profile2 and metric endpoints).
 * Falls back to a clearly-labeled mock so the pipeline still runs
 * end-to-end without a paid/rate-limited key during a demo.
 */
export async function fetchFinancials(companyName, ticker) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) {
    return mockFinancials(companyName, ticker);
  }
  try {
    let finalTicker = ticker;
    // If the planner's extractor didn't know the ticker, ask Finnhub
    if (finalTicker === "UNKNOWN") {
      const searchRes = await axios.get("https://finnhub.io/api/v1/search", {
        params: { q: companyName, token: FINNHUB_KEY },
        timeout: 5000,
      });
      const bestMatch = searchRes.data?.result?.[0];
      if (bestMatch && bestMatch.symbol) {
        finalTicker = bestMatch.symbol;
      }
    }

    const [profileRes, metricRes] = await Promise.all([
      axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol: finalTicker, token: FINNHUB_KEY },
        timeout: 8000,
      }),
      axios.get("https://finnhub.io/api/v1/stock/metric", {
        params: { symbol: finalTicker, metric: "all", token: FINNHUB_KEY },
        timeout: 8000,
      })
    ]);
    const profile = profileRes.data || {};
    const metricData = metricRes.data?.metric || {};
    
    if (!profile.ticker) return mockFinancials(companyName, ticker);
    
    return {
      source: "finnhub",
      isMock: false,
      symbol: profile.ticker,
      name: profile.name || companyName,
      sector: profile.finnhubIndustry,
      industry: profile.finnhubIndustry,
      description: "Financials retrieved from Finnhub.",
      // Core financials
      marketCap: profile.marketCapitalization ? (profile.marketCapitalization * 1000000) : "Not disclosed.",
      enterpriseValue: "Not disclosed.",
      revenueTTM: "Not disclosed.",
      grossProfitTTM: "Not disclosed.",
      ebitda: "Not disclosed.",
      peRatio: metricData.peExclExtraTTM || metricData.peExclExtraAnnual || "Not disclosed.",
      forwardPE: "Not disclosed.",
      pegRatio: "Not disclosed.",
      profitMargin: metricData.netProfitMarginTTM ? metricData.netProfitMarginTTM + "%" : "Not disclosed.",
      operatingMarginTTM: metricData.operatingMarginTTM ? metricData.operatingMarginTTM + "%" : "Not disclosed.",
      eps: metricData.epsTTM || "Not disclosed.",
      quarterlyEarningsGrowthYOY: metricData.epsGrowthTTMYoy ? metricData.epsGrowthTTMYoy + "%" : "Not disclosed.",
      quarterlyRevenueGrowthYOY: metricData.revenueGrowthTTMYoy ? metricData.revenueGrowthTTMYoy + "%" : "Not disclosed.",
      // Balance sheet
      bookValue: metricData.bookValuePerShareAnnual || "Not disclosed.",
      debtToEquity: metricData["totalDebt/totalEquityAnnual"] || "Not disclosed.",
      // Shares & ownership
      sharesOutstanding: profile.shareOutstanding ? (profile.shareOutstanding * 1000000) : "Not disclosed.",
      beta: metricData.beta || "Not disclosed.",
      dividendYield: metricData.dividendYieldIndicatedAnnual ? metricData.dividendYieldIndicatedAnnual + "%" : "Not disclosed.",
      // Targets
      analystTargetPrice: "Not disclosed.",
      analystRatingStrongBuy: "Not disclosed.",
      analystRatingBuy: "Not disclosed.",
      analystRatingHold: "Not disclosed.",
      analystRatingSell: "Not disclosed.",
      week52High: metricData["52WeekHigh"] || "Not disclosed.",
      week52Low: metricData["52WeekLow"] || "Not disclosed.",
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
    source: errNote ? `mock (finnhub error: ${errNote})` : "mock (no FINNHUB_API_KEY set)",
    isMock: true,
    symbol: ticker || companyName.toUpperCase().slice(0, 4),
    description: `⚠️ MOCK DATA — These are placeholder fundamentals for ${companyName}. DO NOT use these numbers for analysis, valuation, or any financial conclusions. Set FINNHUB_API_KEY for live data.`,
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
