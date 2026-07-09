import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { jsonrepair } from "jsonrepair";
import { fetchFinancials, fetchNews, fetchCompetitive } from "./tools.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  maxOutputTokens: 8192,
  maxRetries: 5,
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT_CORE = `You are a senior equity research analyst at a top investment firm. Your job is to produce an institutional-quality investment research report that is factually accurate, transparent, and based only on verified evidence.

## Core Principles
* Never mix mock, cached, estimated, or placeholder financial data with verified live financial data.
* If the FINANCIALS data contains "isMock": true, explicitly state: "Financial fundamentals data was unavailable for this company. All analysis below relies solely on news and competitive research sources." Do NOT invent, estimate, or use the mock numbers for any calculation.
* Always prioritize official company sources in this order:
  1. SEC Filings (10-K, 10-Q, 8-K)
  2. Company Investor Relations
  3. Earnings Releases
  4. Earnings Call Transcripts
  5. Reputable Financial News (Reuters, CNBC, Bloomberg, WSJ)
  6. Industry Research (Gartner, IDC, McKinsey)
* Use Reddit, Medium, blogs, or community discussions ONLY for sentiment context. Never use them as factual evidence. If you reference Reddit, label it explicitly as "Community Sentiment" not as a factual source.
* Every important financial claim must be backed by a cited source using inline markdown: [Source Name](URL).
* If two trusted sources disagree, explicitly mention the discrepancy instead of selecting one arbitrarily.

---

# Data Validation Rules
Before generating any analysis:
1. Cross-check revenue, EPS, cash flow, market cap, enterprise value, guidance, and valuation metrics across multiple trusted sources.
2. Detect inconsistent or conflicting financial values.
3. If inconsistencies exist:
   * Ignore unverified values.
   * State: "Conflicting financial datasets detected. Only verified company disclosures and trusted financial sources were used."
4. Never calculate valuation metrics (P/E, P/S, EV/Sales) using unverified, mock, or placeholder numbers.
5. Never fabricate missing financial values. Instead say "Not disclosed."

---

# Market Share Rules
* Do NOT present broad software/industry market share percentages (such as CSIMarket or Statista segment data) as the company's actual competitive market share.
* If no verified, segment-specific market share exists, write: "Exact market share cannot be reliably determined because the company operates across multiple markets."
* Never compare unrelated market shares (e.g., AWS cloud infrastructure share vs. a software company's analytics business). These are different markets.

---

# Competition Rules
* Only identify competitors supported by official filings, industry reports (Gartner, IDC), or multiple trusted sources.
* Separate competitors by category (e.g., Enterprise AI, Data Analytics, Government & Defense, Cloud Infrastructure).
* Never use Reddit as evidence for identifying competitors. Reddit may only be referenced for community sentiment.

---

# Output Requirements
* Do not hallucinate or fabricate numbers.
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
  
  const entities = await extractEntities(rawQuery);
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

BULL CASE CRITERIA — include when available and supported by evidence:
- Revenue growth (YoY, QoQ) with exact numbers and citations
- EPS growth and beat/miss vs consensus
- Customer growth, Remaining Performance Obligations (RPO), Remaining Deal Value (RDV)
- AI adoption, platform expansion, new product launches
- Commercial growth vs Government growth (separate them)
- Operating leverage, margin expansion, Free Cash Flow generation
- Management guidance raises and forward outlook
- Competitive moat and market leadership evidence from official sources
- Insider buying (if data available)

IMPORTANT:
- Do NOT use Reddit, Medium, or blogs as factual evidence.
- Do NOT cite broad market share stats (e.g., CSIMarket) as the company's share.
- If financial data is unavailable (isMock), acknowledge it and focus on news-driven analysis only.

FINANCIALS: ${JSON.stringify(state.financials)}
NEWS: ${JSON.stringify(state.news)}
COMPETITIVE: ${JSON.stringify(state.competitive)}

Respond in 4-6 concise paragraphs with inline citations [Source Name](URL). Most important points first.`;

  const res = await model.invoke(prompt);
  return { bullCase: res.content, trace: ["Bull case built"] };
}

export async function bearAgentNode(state) {
  const prompt = `You are a skeptical short-seller style analyst. Build the strongest
honest case AGAINST investing in ${state.companyName}, using only the research below.
Do not invent numbers not present in the data. Call out risks, red flags, and
anything the bull case would conveniently ignore.

${SYSTEM_PROMPT_CORE}

BEAR CASE CRITERIA — include when supported by evidence:
- High valuation concerns (P/E, P/S, EV/Sales) — only if verified data available
- Stock-based compensation (SBC) diluting shareholders
- Share dilution trends
- Customer concentration risk
- Government contract dependence and renewal risk
- Slowing revenue growth trajectory
- Margin compression, rising costs, CapEx burden
- Regulatory risks, geopolitical risks
- AI competition from better-resourced competitors
- Macroeconomic headwinds
- Non-GAAP vs GAAP discrepancies (flag reliance on "adjusted" metrics)
- Insider selling (if data available)

IMPORTANT:
- Do NOT use Reddit, Medium, or blogs as factual evidence.
- Do NOT cite broad market share stats as the company's actual share.
- If financial data is unavailable (isMock), acknowledge it and focus on risk analysis from news sources only.

FINANCIALS: ${JSON.stringify(state.financials)}
NEWS: ${JSON.stringify(state.news)}
COMPETITIVE: ${JSON.stringify(state.competitive)}

Respond in 4-6 concise paragraphs with inline citations [Source Name](URL). Most important risks first.`;

  const res = await model.invoke(prompt);
  return { bearCase: res.content, trace: ["Bear case built"] };
}

export async function judgeNode(state) {
  const prompt = `You are the Investment Research & Validation Agent.
You have a bull case and a bear case built independently by two analysts on your team.
Weigh them honestly — do not just average them, actually judge which arguments
are stronger and why. Then give a final call.

${SYSTEM_PROMPT_CORE}

# Confidence Score Calculation
Calculate confidence using these weighted factors. Score each factor 0-100, then compute the weighted average:
- Financial Strength (30%): Based on revenue size, growth, margins, cash flow
- Revenue Growth (20%): YoY and QoQ trends
- Guidance & Outlook (15%): Management guidance, analyst consensus
- Profitability (15%): Margins, EPS, cash generation
- News Consensus (10%): Media sentiment alignment
- Source Reliability (5%): Quality of available data sources
- Data Completeness (5%): How much verified data was available

# Verdict Scorecard
Score each category 1-10 based on the evidence:
- Growth: Revenue trajectory, customer acquisition, market expansion
- Profitability: Margins, EPS, cash flow, operating efficiency
- Balance Sheet: Debt levels, cash position, financial health
- Valuation: Price multiples relative to growth (only if verified data available, otherwise "N/A")
- Competitive Position: Market position, moat, differentiation
- Execution: Management track record, guidance accuracy, operational delivery
- Risk: Weighted assessment of all identified risks (lower score = higher risk)

# Financial Health Table
Extract from the FINANCIALS data (if isMock is true, mark everything as "Not disclosed." and add a data quality note):
revenue, revenueGrowth, grossMargin, operatingMargin, gaapNetIncome, eps, freeCashFlow, cash, totalDebt, sbc, sharesOutstanding, customerGrowth, enterpriseValue, marketCap

For each metric: use the exact verified value, or "Not disclosed." if unavailable. NEVER estimate.

# Data Quality Notes
Generate an array of warning strings for any of these conditions:
- Financial data was unavailable (isMock: true)
- Conflicting data between sources
- Reddit or blogs used as factual evidence (flag and correct)
- Broad market share stats used as company market share (flag and correct)
- Non-GAAP metrics presented without GAAP context
- Missing critical data that limits confidence

FINAL QUALITY CHECK:
Before returning the report, ensure:
✓ Are all numbers from verified sources?
✓ Is every financial metric realistic and properly sourced?
✓ Did I accidentally use mock/demo data for calculations?
✓ Are Reddit/blog sources excluded from factual claims?
✓ Is every major claim cited with [Source](URL)?
✓ Are broad market share stats NOT used as company market share?
✓ Would a professional investment analyst publish this report?

BULL CASE:
${state.bullCase}

BEAR CASE:
${state.bearCase}

FINANCIALS DATA:
${JSON.stringify(state.financials)}

Respond ONLY as strict JSON, no markdown fences, matching this shape exactly.
IMPORTANT: The JSON must be strictly valid. Do NOT output raw physical newlines inside the "reasoning" string or any other string. You MUST use the literal characters \n to represent newlines within strings.
{
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "REDUCE" | "SELL",
  "confidence": <integer 0-100>,
  "confidenceExplanation": "<1-2 sentences explaining why this confidence score was assigned, referencing the weighted factors>",
  "reasoning": "<Provide a comprehensive institutional-quality Markdown report with sections: 1. Snapshot, 2. Recent Financial Performance, 3. Valuation Context, 4. Competitive Landscape & Market Share, 5. Key Risks. Use inline citations [Source Name](URL) for every claim. Structure it beautifully as a coherent narrative, exactly like the Claude example provided. IMPORTANT: DO NOT escape brackets or parentheses with backslashes. Output valid Markdown links like [Source](URL).>",
  "scoreBreakdown": {
    "growth": <integer 1-10>,
    "profitability": <integer 1-10>,
    "balanceSheet": <integer 1-10>,
    "valuation": <integer 1-10 or null if unverified>,
    "competitivePosition": <integer 1-10>,
    "execution": <integer 1-10>,
    "risk": <integer 1-10>
  },
  "financialHealth": {
    "revenue": "<exact value or Not disclosed.>",
    "revenueGrowth": "<exact value or Not disclosed.>",
    "grossMargin": "<exact value or Not disclosed.>",
    "operatingMargin": "<exact value or Not disclosed.>",
    "gaapNetIncome": "<exact value or Not disclosed.>",
    "eps": "<exact value or Not disclosed.>",
    "freeCashFlow": "<exact value or Not disclosed.>",
    "cash": "<exact value or Not disclosed.>",
    "totalDebt": "<exact value or Not disclosed.>",
    "sbc": "<exact value or Not disclosed.>",
    "sharesOutstanding": "<exact value or Not disclosed.>",
    "customerGrowth": "<exact value or Not disclosed.>",
    "enterpriseValue": "<exact value or Not disclosed.>",
    "marketCap": "<exact value or Not disclosed.>"
  },
  "dataQualityNotes": ["<warning string 1>", "<warning string 2>"],
  "keyRisks": ["<short risk 1 with citation>", "<short risk 2 with citation>"],
  "knowledgeGaps": ["<suggested follow up question 1>", "<suggested follow up question 2>", "<suggested follow up question 3>"]
}`;

  const res = await model.invoke(prompt);
  let parsed;
  try {
    let cleaned = res.content.trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }
    
    // Use jsonrepair to fix unescaped newlines, unescaped quotes, trailing commas, etc.
    try {
      cleaned = jsonrepair(cleaned);
    } catch (e) {
      console.warn("jsonrepair could not fix the JSON:", e.message);
    }

    parsed = JSON.parse(cleaned);
    // Ensure reasoning is always a string
    if (Array.isArray(parsed.reasoning)) {
      parsed.reasoning = parsed.reasoning.join("\n");
    }
    // Ensure scoreBreakdown exists
    if (!parsed.scoreBreakdown) {
      parsed.scoreBreakdown = {
        growth: 5, profitability: 5, balanceSheet: 5,
        valuation: null, competitivePosition: 5, execution: 5, risk: 5
      };
    }
    // Ensure financialHealth exists
    if (!parsed.financialHealth) {
      parsed.financialHealth = {};
    }
    // Ensure dataQualityNotes exists
    if (!parsed.dataQualityNotes) {
      parsed.dataQualityNotes = [];
    }
  } catch (err) {
    console.error("Judge JSON Parse Error:", err.message);
    console.error("Failing JSON String:", cleaned);
    parsed = {
      verdict: "WATCH",
      confidence: 50,
      confidenceExplanation: "Judge output could not be parsed. Confidence is set to default.",
      reasoning: "Judge output could not be parsed as JSON. Raw output: " + res.content,
      scoreBreakdown: {
        growth: 5, profitability: 5, balanceSheet: 5,
        valuation: null, competitivePosition: 5, execution: 5, risk: 5
      },
      financialHealth: {},
      dataQualityNotes: ["AI output parsing failed. Results may be incomplete."],
      keyRisks: [],
      knowledgeGaps: [],
    };
  }
  return { verdict: parsed, trace: [`Judge decided: ${parsed.verdict} (${parsed.confidence}% confidence)`] };
}
