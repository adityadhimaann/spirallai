import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchFinancials, fetchNews, fetchCompetitive } from "./tools.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  maxRetries: 2,
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT_CORE = `=========================================================
CORE PRINCIPLES
=========================================================
1. Accuracy is more important than completeness.
2. Never invent financial numbers.
3. Never mix mock/demo data with real-world financial data.
4. Every important claim must be backed by at least one reliable source.
5. If sources disagree, explicitly mention the disagreement.
6. If a metric cannot be verified, return "Not Verified" instead of guessing.
7. Never present uncertain information as fact.

=========================================================
SOURCE PRIORITY
=========================================================
Always rank sources in this order.
Tier 1 (Highest Trust): SEC Filings, Company Investor Relations, Annual Reports (10-K), Quarterly Reports (10-Q), Earnings Call Transcripts, Shareholder Letters
Tier 2: Reuters, Bloomberg, CNBC, Wall Street Journal, Financial Times, Morningstar, Investors.com, MarketWatch
Tier 3: Yahoo Finance, Nasdaq, Zacks, Seeking Alpha, Barron's
Tier 4 (Background Only): Wikipedia, Investopedia, Industry Reports
Never use these as primary evidence: Instagram, Facebook, TikTok, Reddit, Quora, Medium blogs, Random blogs, AI-generated websites.
If higher-priority sources exist, ignore lower-priority ones.

=========================================================
DATA VALIDATION & SANITY CHECK
=========================================================
Before presenting any metric, cross-check it against trusted sources.
Run sanity checks: Quarter Revenue > TTM Revenue -> ERROR. Market Cap < Annual Revenue (for mega-cap) -> ERROR. Profit Margin >100% -> ERROR.
If any inconsistency exists, state: "⚠ Financial inconsistency detected."

=========================================================
SOURCE CITATIONS
=========================================================
CRITICAL INSTRUCTION: You MUST use inline Markdown citations for EVERY claim, risk, number, or fact.
Format: [Source Name](URL). The user needs to be able to click these links to verify your claims!
Example: "Apple's revenue grew by 5% [Bloomberg](https://bloomberg.com/...)."
`;

// --- Planner Node ---
import { extractEntities } from "./planner/extractor.js";
import { determineIntent } from "./planner/router.js";
import { expandQueries } from "./planner/expander.js";

export async function plannerNode(state) {
  // Use the raw query (initially stored in companyName) to drive the deterministic planner
  const rawQuery = state.companyName;
  
  const entities = extractEntities(rawQuery);
  const intent = determineIntent(rawQuery);
  const queries = expandQueries(entities, intent);

  return {
    companyName: entities.companyName,
    ticker: entities.ticker,
    intent: intent,
    entities: entities,
    queries: queries,
    trace: [`Planned intent: ${intent} | Expanded into ${queries.length} queries`]
  };
}

// --- Research nodes (run in parallel via the graph's fan-out edges) ---

export async function financialsNode(state) {
  const data = await fetchFinancials(state.companyName, state.ticker);
  return { financials: data, trace: [`Fetched financials (${data.source})`] };
}

export async function newsNode(state) {
  const data = await fetchNews(state.companyName, state.isDeepMode);
  return { news: data, trace: [`Fetched news & sentiment (${data.source})`] };
}

export async function competitiveNode(state) {
  const data = await fetchCompetitive(state.companyName, state.isDeepMode);
  return { competitive: data, trace: [`Fetched competitive landscape (${data.source})`] };
}

// --- Reasoning nodes ---

export async function bullAgentNode(state) {
  const prompt = `You are a bullish equity research analyst. Build the strongest
honest case FOR investing in ${state.companyName}, using only the research below.
Do not invent numbers not present in the data. If the data is thin, say so.

${SYSTEM_PROMPT_CORE}

BULL CASE CRITERIA:
Include: Revenue drivers, Competitive advantages, AI initiatives, Cloud growth, Cash generation, Margin expansion opportunities, Moat, Market leadership.

FINANCIALS: ${JSON.stringify(state.financials)}
NEWS: ${JSON.stringify(state.news)}
COMPETITIVE: ${JSON.stringify(state.competitive)}

Respond in 4-6 concise bullet points, most important first.`;

  const res = await model.invoke(prompt);
  return { bullCase: res.content, trace: ["Bull case built"] };
}

export async function bearAgentNode(state) {
  const prompt = `You are a skeptical short-seller style analyst. Build the strongest
honest case AGAINST investing in ${state.companyName}, using only the research below.
Do not invent numbers not present in the data. Call out risks, red flags, and
anything the bull case would conveniently ignore.

${SYSTEM_PROMPT_CORE}

BEAR CASE CRITERIA:
Include: Competitive risks, Regulatory risks, AI spending, Margin pressure, CapEx, Macro risks, Valuation concerns, Execution risks.

FINANCIALS: ${JSON.stringify(state.financials)}
NEWS: ${JSON.stringify(state.news)}
COMPETITIVE: ${JSON.stringify(state.competitive)}

Respond in 4-6 concise bullet points, most important first.`;

  const res = await model.invoke(prompt);
  return { bearCase: res.content, trace: ["Bear case built"] };
}

export async function judgeNode(state) {
  const prompt = `You are the Investment Research & Validation Agent.
You have a bull case and a bear case built independently by two analysts on your team.
Weigh them honestly — do not just average them, actually judge which arguments
are stronger and why. Then give a final call.

${SYSTEM_PROMPT_CORE}

FINAL QUALITY CHECK:
Before returning the report, ensure:
✓ Are all numbers verified?
✓ Is every financial metric realistic?
✓ Did I accidentally use demo data?
✓ Are low-quality sources excluded?
✓ Is every major claim cited?
✓ Are there contradictions?
✓ Would a professional investment analyst publish this report?

BULL CASE:
${state.bullCase}

BEAR CASE:
${state.bearCase}

Respond ONLY as strict JSON, no markdown fences, matching this shape exactly:
{
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "REDUCE" | "SELL",
  "confidence": <integer 0-100>,
  "reasoning": "<Provide 3-5 EXTREMELY SHORT, punchy bullet points (maximum 1-2 sentences per point). Format as a markdown list. Each point MUST contain hard facts/numbers and include an inline citation: [Source Name](url). No fluff. No long explanations. Be ruthless and concise.>",
  "keyRisks": ["<short risk 1 with citation>", "<short risk 2 with citation>"],
  "knowledgeGaps": ["<suggested follow up question 1>", "<suggested follow up question 2>", "<suggested follow up question 3>"]
}`;

  const res = await model.invoke(prompt);
  let parsed;
  try {
    const cleaned = res.content.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      verdict: "WATCH",
      confidence: 50,
      reasoning: "Judge output could not be parsed as JSON. Raw output: " + res.content,
      keyRisks: [],
      knowledgeGaps: [],
    };
  }
  return { verdict: parsed, trace: [`Judge decided: ${parsed.verdict} (${parsed.confidence}% confidence)`] };
}
