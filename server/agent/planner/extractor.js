import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Entity Extraction
 * Uses an LLM to extract Company Name, Ticker, and Industry from the query deterministically.
 */
export async function extractEntities(query) {
  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      maxOutputTokens: 300,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `Extract the primary company name, its stock ticker symbol (if public), and its industry from the following user query.
Return ONLY a raw JSON object with no markdown formatting, no markdown code blocks, and no extra text.
If you cannot find a ticker, use "UNKNOWN".

Query: "${query}"

Format:
{
  "companyName": "...",
  "ticker": "...",
  "industry": "..."
}`;

    const res = await model.invoke(prompt);
    let content = res.content.trim();
    if (content.startsWith("\`\`\`json")) {
      content = content.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/\`\`\`/g, "").trim();
    }
    
    return JSON.parse(content);
  } catch (err) {
    console.error("LLM extraction failed:", err);
    // Fallback heuristic
    const name = query.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '');
    return {
      companyName: name || query,
      ticker: "UNKNOWN",
      industry: "General"
    };
  }
}
