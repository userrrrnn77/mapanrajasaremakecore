import mongoose, { Schema } from "mongoose";
import type { ChatHistory } from "../types/aiTypes.js";

const ChatHistorySchema = new Schema<ChatHistory>(
  {
    userId: { type: String, required: true, index: true },
    threadId: { type: String, required: true, index: true },

    title: { type: String },

    config: {
      model: String,
      temperature: Number,
      maxTokens: Number,
      systemPrompt: String,
    },

    memory: {
      summary: String,
      lastUpdated: Date,
    },

    stats: {
      totalMessages: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },

    // ⚠️ deprecated tapi masih ada
    messages: { type: Array, default: [] },
  },
  {
    timestamps: true,
  },
);

ChatHistorySchema.index({ userId: 1, threadId: 1 });

export const ChatHistoryModel = mongoose.model(
  "ChatHistory",
  ChatHistorySchema,
);
