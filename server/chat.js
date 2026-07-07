import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import mongoose from "mongoose";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

const chatSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.2,
  apiKey: process.env.GEMINI_API_KEY,
});

const webSearchTool = tool(
  async ({ query }) => {
    const TAVILY_KEY = process.env.TAVILY_API_KEY;
    if (!TAVILY_KEY) {
      return "Mock search result: No Tavily API key provided.";
    }
    try {
      const { data } = await axios.post(
        "https://api.tavily.com/search",
        {
          api_key: TAVILY_KEY,
          query: query,
          search_depth: "basic",
          max_results: 3,
        },
        { timeout: 10000 }
      );
      return (data.results || [])
        .map((r) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
        .join("\n\n");
    } catch (err) {
      return `Failed to search: ${err.message}`;
    }
  },
  {
    name: "web_search",
    description: "Search the web for up-to-date information, news, or data not present in the current research context.",
    schema: z.object({
      query: z.string().describe("The specific search query to execute."),
    }),
  }
);

const agent = createReactAgent({
  llm: model,
  tools: [webSearchTool],
});

export async function handleFollowUpChat(req, res) {
  try {
    const { message, context, history = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemMessage = `You are an expert, world-class investment research assistant (comparable to Perplexity Pro).
You previously conducted deep research on a company. Use the provided RESEARCH CONTEXT to answer the user's follow-up questions.
If the context lacks the necessary information, you MUST use the \`web_search\` tool to gather up-to-date data.

CRITICAL RULES FOR TRUST, TRANSPARENCY, AND FORMATTING:
1. INLINE CITATIONS: Every factual claim, number, or quotation MUST be backed by an inline citation using markdown links. Format: [Source Name](URL) e.g., "Apple's revenue grew by 5% [Bloomberg](https://bloomberg.com/...)."
2. RICH MARKDOWN UI: Do NOT output raw walls of text. You MUST structure your response beautifully using rich Markdown.
   - Use **Headers (###)** to organize different sections.
   - Use **Bullet points** for lists of features, risks, or highlights.
   - Use **Tables** whenever you are comparing metrics, numbers, or competitors.
   - Use **Bold text** for emphasis on key numbers or takeaways.
3. SOURCE TRANSPARENCY: If you use the \`web_search\` tool, you MUST append a section at the very bottom of your response titled "### Sources Investigated" listing the newly found URLs as bullet points.
4. CONTRADICTIONS: If the sources disagree, explicitly state the disagreement.

RESEARCH CONTEXT:
${JSON.stringify(context, null, 2)}`;

    // Convert history format to LangChain messages format
    const messages = [
      ["system", systemMessage],
      ...history.map(msg => [msg.role === "user" ? "user" : "assistant", msg.content]),
      ["user", message]
    ];

    // Persist user message to DB
    await Chat.create({ role: "user", content: message });

    // Invoke the ReAct agent
    const response = await agent.invoke({ messages });
    
    // The final message in the array is the AI's final response
    const finalMsg = response.messages[response.messages.length - 1];
    
    // Persist assistant response to DB
    await Chat.create({ role: "assistant", content: finalMsg.content });
    
    res.json({
      role: "assistant",
      content: finalMsg.content
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
}
