import mongoose, { Schema } from "mongoose";
import type { MemoryDocument } from "../types/aiTypes.js";

const MemorySchema = new Schema<MemoryDocument>(
  {
    userId: { type: String, required: true, index: true },

    content: { type: String, required: true },

    embedding: {
      type: [Number],
      required: true,
    },

    importance: { type: Number, default: 5 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const MemoryModel = mongoose.model("Memory", MemorySchema);
