import type { Request, Response } from "express";
import crypto from "crypto";

import { logger } from "../utils/logger.js";
import { OrchestratorService } from "../service/orchestratorService.js";
import type { ChatRequest } from "../types/aiTypes.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";

interface AskAIRequestBody {
  message: string;
}

export class ChatController {
  static async getStatus(_req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      message: "AI standby, siap nerima pertanyaan.",
      status: "online",
    });
  }

  static async askAI(req: AuthRequest, res: Response) {
    try {
      const { message } = req.body as AskAIRequestBody;

      if (!message?.trim()) {
        return res.status(400).json({
          success: false,
          error: "Message wajib diisi",
        });
      }

      /**
       * user dari auth middleware
       * fallback guest kalau endpoint public
       */
      const rawUserId = req.user?._id;
      const userId =
        typeof rawUserId === "object"
          ? rawUserId.toString()
          : rawUserId || "guest";

      /**
       * thread id:
       * - pake existing kalau ada
       * - generate baru kalau belum ada
       */
      const threadId =
        (req.headers["x-thread-id"] as string) || crypto.randomUUID();

      const payload: ChatRequest = {
        userId,
        threadId,
        message: message.trim(),
      };

      const result = await OrchestratorService.startDiscussion(payload);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error({
        message: "ChatController.askAI error",
        error: errorMessage,
      });

      return res.status(500).json({
        success: false,
        error: "AI lagi error, coba lagi nanti.",
      });
    }
  }
}
