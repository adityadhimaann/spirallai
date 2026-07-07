/**
 * Entity Extraction
 * Extracts Company Name, Ticker, and Industry from the query deterministically.
 * Uses a small in-memory lookup table to avoid LLM calls for popular companies.
 */

const TICKER_DB = {
  "apple": { ticker: "AAPL", industry: "Consumer Electronics" },
  "nvidia": { ticker: "NVDA", industry: "Semiconductors" },
  "tesla": { ticker: "TSLA", industry: "Automotive" },
  "microsoft": { ticker: "MSFT", industry: "Software" },
  "amazon": { ticker: "AMZN", industry: "E-commerce" },
  "google": { ticker: "GOOGL", industry: "Internet Services" },
  "alphabet": { ticker: "GOOGL", industry: "Internet Services" },
  "meta": { ticker: "META", industry: "Social Media" },
};

export function extractEntities(query) {
  const normalized = query.toLowerCase().trim();
  
  // Try to find a known company in the query
  for (const [company, data] of Object.entries(TICKER_DB)) {
    if (normalized.includes(company)) {
      return {
        companyName: company.charAt(0).toUpperCase() + company.slice(1),
        ticker: data.ticker,
        industry: data.industry
      };
    }
  }

  // Fallback heuristic: assume the first 1-2 capitalized words might be the company
  // Or just use the whole query if it's short.
  // In a real prod app, you'd use a local Trie or sqlite DB of 10k tickers.
  const name = query.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '');
  return {
    companyName: name || query,
    ticker: "UNKNOWN",
    industry: "General"
  };
}
