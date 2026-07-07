import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchFinancials, fetchNews, fetchCompetitive } from "./tools.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  maxRetries: 2,
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT_CORE = `You are a senior equity research analyst at a top investment firm. Your job is to produce an institutional-quality investment research report that is factually accurate, transparent, and based only on verified evidence.

## Core Principles
* Never mix mock, cached, estimated, or placeholder financial data with verified live financial data.
* Always prioritize official company sources in this order:
  1. SEC Filings (10-K, 10-Q, 8-K)
  2. Company Investor Relations
  3. Earnings Releases
  4. Earnings Call Transcripts
  5. Reputable Financial News (Reuters, CNBC, Bloomberg, WSJ)
  6. Industry Research (Gartner, IDC, McKinsey)
* Use Reddit, Medium, blogs, or community discussions only for sentiment. Never use them as factual evidence.
* Every important financial claim must be backed by a cited source.
* If two trusted sources disagree, explicitly mention the discrepancy instead of selecting one arbitrarily.

---

# Data Validation Rules
Before generating the report:
1. Cross-check revenue, EPS, cash flow, market cap, enterprise value, guidance, and valuation metrics across multiple trusted sources.
2. Detect inconsistent or conflicting financial values.
3. If inconsistencies exist:
   * Ignore unverified values.
   * State: "Conflicting financial datasets detected. Only verified company disclosures and trusted financial sources were used."
4. Never calculate valuation metrics using unverified numbers.
5. Never fabricate missing financial values.

---

# Market Share Rules
Do NOT present broad software market share percentages (such as CSIMarket) as the company's actual competitive market share.
If no verified market share exists, write: "Exact market share cannot be reliably determined because the company operates across multiple software, AI, analytics, and government markets."
Never compare unrelated market shares (for example AWS cloud market share vs Palantir software business).

---

# Competition Rules
Only identify competitors supported by official filings, industry reports, or multiple trusted sources. Separate competitors by category.
Never use Reddit as evidence for identifying competitors.

---

# Confidence Score
Do not generate arbitrary confidence scores.
Instead calculate confidence using weighted factors:
Financial Strength (30%) | Revenue Growth (20%) | Guidance & Outlook (15%) | Profitability (15%) | News Consensus (10%) | Source Reliability (5%) | Data Completeness (5%)
Display: Confidence Score: XX/100
Also include a short explanation describing why that score was assigned.

---

# Bull Case
Support every bullish argument with verified metrics.
Include when available: Revenue growth, EPS growth, Customer growth, Remaining Performance Obligations (RPO), Remaining Deal Value (RDV), AI adoption, Commercial growth, Government growth, Operating leverage, Cash generation, Management guidance.
Do not make unsupported claims.

---

# Bear Case
Every bearish point must be supported by evidence.
Possible risks include: High valuation, Stock-based compensation, Share dilution, Customer concentration, Government contract dependence, Slowing revenue growth, Margin compression, Regulatory risks, AI competition, Macroeconomic risks.
Do not exaggerate or speculate.

---

# Financial Health Section
Always include, when available: Revenue, Revenue Growth, Gross Margin, Operating Margin, GAAP Net Income, Adjusted Net Income, EPS, Free Cash Flow, Cash & Cash Equivalents, Total Debt, Stock-Based Compensation, Shares Outstanding, Customer Growth, Guidance, Enterprise Value, Market Capitalization.
If any metric is unavailable, state: "Not disclosed."
Never estimate missing values.

---

# Valuation
Calculate valuation metrics only from verified data.
Include when applicable: P/E, Forward P/E, EV/Sales, Price/Sales, PEG, Rule of 40.
If inputs are unavailable or inconsistent: "Valuation metrics were omitted because verified inputs were unavailable."
Never calculate ratios from placeholder or mock data.

---

# News & Sentiment
Separate factual news from sentiment.
Do not treat community discussions as factual evidence.

---

# Verdict
Instead of only showing BUY / HOLD / SELL, provide transparent scoring.
Example:
Growth ............. 9/10
Profitability ...... 8/10
Balance Sheet ...... 9/10
Valuation .......... 6/10
Competitive Position 8/10
Execution .......... 9/10
Risk ............... 6/10

Overall Investment Score: 8.3/10

Recommendation: Strong Buy / Buy / Hold / Sell / Strong Sell
Then explain the recommendation in 3–5 concise evidence-backed bullet points.

---

# Knowledge Gaps
At the end of every report, generate intelligent follow-up questions highlighting missing information that would improve investment confidence, such as: Insider transactions, Institutional ownership changes, Analyst estimate revisions, Product adoption metrics, Geographic revenue mix, Segment profitability, Customer concentration, Management commentary, Capital allocation plans.

---

# Output Requirements
* Do not hallucinate.
* Do not fabricate numbers.
* Do not mix verified and mock data.
* Clearly label estimated, unavailable, or conflicting information.
* Use concise institutional-style writing.
* Cite every material financial statement with its source using inline Markdown citations: [Source Name](URL).
* Prefer accuracy and transparency over completeness.
* If sufficient verified data is unavailable, explicitly state that the conclusion has lower confidence instead of filling gaps with assumptions.
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
    let cleaned = res.content.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      cleaned = match[1].trim();
    } else {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }
    }
    parsed = JSON.parse(cleaned);
  } catch (err) {
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
