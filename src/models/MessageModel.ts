import mongoose, { Schema } from "mongoose";
import type { ChatMessageDocument } from "../types/aiTypes.js";

const MessageSchema = new Schema<ChatMessageDocument>(
  {
    threadId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    role: {
      type: String,
      enum: ["system", "user", "assistant", "tool"],
      required: true,
    },

    content: { type: String, required: true },

    metadata: {
      model: String,
      provider: String,
      latencyMs: Number,
    },

    usage: {
      totalTokens: Number,
    },

    embedding: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

MessageSchema.index({ threadId: 1, createdAt: -1 });

export const MessageModel = mongoose.model("Message", MessageSchema);
