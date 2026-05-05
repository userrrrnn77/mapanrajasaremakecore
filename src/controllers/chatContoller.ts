import type { Request, Response } from "express";
import crypto from "crypto";

import { logger } from "../utils/logger.js";
import { OrchestratorService } from "../service/orchestratorService.js";
import type { ChatRequest } from "../types/aiTypes.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { ChatHistoryModel } from "../models/ChatHistoryModel.js";
import { MessageModel } from "../models/MessageModel.js";

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

  static async getHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id?.toString();

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Cari semua history milik user, urutkan dari yang terbaru[cite: 25]
      const history = await ChatHistoryModel.find({ userId })
        .sort({ updatedAt: -1 })
        .lean();

      const messages = await MessageModel.find({ userId })
        .sort({ updatedAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          history: history,
          messages: messages,
        },
      });
    } catch (error) {
      logger.error({ message: "ChatController.getHistory error", error });
      return res
        .status(500)
        .json({ success: false, error: "Gagal ambil history" });
    }
  }

  static async getThreadMessages(req: AuthRequest, res: Response) {
    try {
      const { threadId } = req.params;
      const userId = req.user?._id?.toString();

      if (!threadId) {
        return res
          .status(400)
          .json({ success: false, error: "Thread ID wajib ada" });
      }

      // Ambil pesan berdasarkan threadId, urutkan dari yang lama ke baru[cite: 27]
      const messages = await MessageModel.find({ threadId, userId })
        .sort({ createdAt: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error({
        message: "ChatController.getThreadMessages error",
        error,
      });
      return res
        .status(500)
        .json({ success: false, error: "Gagal ambil pesan thread" });
    }
  }
}
