import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  isInitialResearch: { type: Boolean, default: false },
  isDeepMode: { type: Boolean, default: false }
});

const chatSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  ticker: { type: String },
  timestamp: { type: Number, required: true },
  messages: [messageSchema],
  isDeepMode: { type: Boolean, default: false }
});

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
