// src/service/groqService.ts

import { groqFetch } from "../utils/http.js";
import type {
  ChatMessage,
  AIResponse,
  UnifiedResponse,
} from "../types/aiTypes.js";
import { logger } from "../utils/logger.js";

export class GroqService {
  static async chat(messages: ChatMessage[]): Promise<UnifiedResponse> {
    try {
      const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

      console.log("DEBUG: Mengirim ke Groq dengan model:", `|${modelName}|`);

      const data = (await groqFetch("/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: modelName,
          messages,
        }),
      })) as AIResponse;

      const choice = data.choices?.[0]?.message?.content;
      const token = data.usage?.total_tokens || 0;

      if (!choice) {
        throw new Error("Respon AI kosong, Bre!");
      }

      return {
        success: true,
        provider: "Groq",
        model: modelName,
        content: choice,
        usage: {
          totalTokens: token,
        },
      };
    } catch (error: any) {
      logger.error(`AI Error: ${error.message}`);
      return {
        success: false,
        provider: "Groq",
        model: process.env.GROQ_MODEL || "unknown",
        content: "AI lagi pusing, Bre!",
        usage: { totalTokens: 0 },
        error: error.message,
      };
    }
  }
}

