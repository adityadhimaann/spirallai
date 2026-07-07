import mongoose from "mongoose";

const researchResultSchema = new mongoose.Schema({
  company: { type: String, required: true, unique: true }, // The key to look up
  verdict: { type: String },
  confidence: { type: Number },
  reasoning: { type: mongoose.Schema.Types.Mixed },
  keyRisks: [{ type: String }],
  knowledgeGaps: [{ type: String }],
  bullCase: { type: String },
  bearCase: { type: String },
  financials: { type: mongoose.Schema.Types.Mixed },
  news: { type: mongoose.Schema.Types.Mixed },
  competitive: { type: mongoose.Schema.Types.Mixed },
  trace: [{ type: String }]
}, { strict: false }); // Allow unknown keys just in case

export const ResearchResult = mongoose.model("ResearchResult", researchResultSchema);
