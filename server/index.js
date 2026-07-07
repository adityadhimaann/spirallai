import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { buildInvestmentAgent } from "./agent/graph.js";
import { handleFollowUpChat } from "./chat.js";

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/investment_agent")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

const agent = buildInvestmentAgent();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", handleFollowUpChat);

/**
 * Plain JSON endpoint — one request, full result. Simple, but the
 * frontend just sees a loading spinner for ~15-20s.
 */
app.post("/api/research", async (req, res) => {
  const { companyName, ticker } = req.body;
  if (!companyName) return res.status(400).json({ error: "companyName is required" });

  try {
    const result = await agent.invoke({ companyName, ticker });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Streaming endpoint (Server-Sent Events) — this is the one the
 * frontend should actually use. Emits one event per graph node as it
 * completes, so the UI can show live "Fetching financials...",
 * "Bull case built...", etc. instead of a blank loading state.
 */
app.get("/api/research/stream", async (req, res) => {
  const { companyName, ticker, deepMode } = req.query;
  if (!companyName) return res.status(400).json({ error: "companyName is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send("status", { message: `Starting research on ${companyName}` });

    // streamMode "updates" yields { nodeName: partialStateDelta } after
    // each node finishes — this is what drives the live trace in the UI.
    const isDeepMode = deepMode === "true";
    const stream = await agent.stream(
      { companyName, ticker, isDeepMode },
      { streamMode: "updates" }
    );

    let finalState = {};
    for await (const update of stream) {
      const [nodeName, delta] = Object.entries(update)[0];
      finalState = { ...finalState, ...delta };
      send("node_update", { node: nodeName, trace: delta.trace ?? [], partialData: delta });
    }

    send("done", finalState);
  } catch (err) {
    console.error(err);
    send("error", { message: err.message });
  } finally {
    res.end();
  }
});

import { ChatSession } from "./models/ChatSession.js";
import { ResearchResult } from "./models/ResearchResult.js";

// GET /api/sessions
app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find().sort({ timestamp: -1 }).limit(50);
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions (Upsert session)
app.post("/api/sessions", async (req, res) => {
  try {
    const sessions = req.body; // Can be array to batch save, or we can just send the array of all sessions
    // To keep it simple, we receive an array of all sessions and bulk write or upsert them.
    if (Array.isArray(sessions)) {
      for (const session of sessions) {
        await ChatSession.findOneAndUpdate(
          { id: session.id },
          session,
          { upsert: true, returnDocument: 'after' }
        );
      }
    } else {
      await ChatSession.findOneAndUpdate(
        { id: sessions.id },
        sessions,
        { upsert: true, returnDocument: 'after' }
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:company
app.get("/api/results/:company", async (req, res) => {
  try {
    const company = req.params.company.toLowerCase();
    const result = await ResearchResult.findOne({ company });
    res.json(result || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results
app.post("/api/results", async (req, res) => {
  try {
    const { company, ...data } = req.body;
    const result = await ResearchResult.findOneAndUpdate(
      { company: company.toLowerCase() },
      { company: company.toLowerCase(), ...data },
      { upsert: true, returnDocument: 'after' }
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Investment Research Agent API listening on :${PORT}`));
