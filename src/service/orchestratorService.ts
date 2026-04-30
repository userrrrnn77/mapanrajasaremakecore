import { MessageModel } from "../models/MessageModel.js";
import { ChatHistoryModel } from "../models/ChatHistory.js";
import { GroqService } from "./groqService.js";
import type { ChatRequest, ChatMessage } from "../types/aiTypes.js";

export class OrchestratorService {
  private static SYSTEM_PROMPT =
    "Lu adalah Cleaning Service senior Gedung, santai ala jaksel, edukatif, humoris, langsung ke inti.";

  // 🔥 ambil last message (short memory)
  private static async getRecentMessages(
    threadId: string,
  ): Promise<ChatMessage[]> {
    const messages = await MessageModel.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return messages.reverse().map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // 🔥 build context
  private static async buildContext(
    input: ChatRequest,
  ): Promise<ChatMessage[]> {
    const recent = await this.getRecentMessages(input.threadId);

    return [
      {
        role: "system",
        content: this.SYSTEM_PROMPT,
      },
      ...recent,
      {
        role: "user",
        content: input.message,
      },
    ];
  }

  // 🚀 MAIN
  static async startDiscussion(input: ChatRequest) {
    const start = Date.now();

    // 1. pastikan thread ada
    await ChatHistoryModel.updateOne(
      { threadId: input.threadId },
      {
        $setOnInsert: {
          userId: input.userId,
          threadId: input.threadId,
        },
      },
      { upsert: true },
    );

    // 2. build context
    const context = await this.buildContext(input);

    // 3. call AI
    const ai = await GroqService.chat(context);

    if (!ai.success) {
      throw new Error(ai.error || "AI error");
    }

    const latency = Date.now() - start;

    // 4. simpan USER message
    await MessageModel.create({
      threadId: input.threadId,
      userId: input.userId,
      role: "user",
      content: input.message,
    });

    // 5. simpan AI message
    await MessageModel.create({
      threadId: input.threadId,
      userId: input.userId,
      role: "assistant",
      content: ai.content,
      metadata: {
        model: ai.model,
        provider: ai.provider,
        latencyMs: latency,
      },
      usage: {
        totalTokens: ai.usage.totalTokens,
      },
    });

    // 6. update stats
    await ChatHistoryModel.updateOne(
      { threadId: input.threadId },
      {
        $inc: {
          "stats.totalMessages": 2,
          "stats.totalTokens": ai.usage.totalTokens,
        },
      },
    );

    return {
      reply: ai.content,
      latencyMs: latency,
      usage: ai.usage,
    };
  }
}
