import { Router, type Response, type NextFunction } from "express";
import { ChatController } from "../controllers/chatContoller.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = Router();

const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      await authMiddleware(req, _res, () => {});
    }

    next();
  } catch {
    next();
  }
};

const aiRateLimiter = (() => {
  const store = new Map<string, { count: number; time: number }>();

  const WINDOW = 60 * 1000;
  const MAX = 10;

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.user?._id?.toString() || req.ip || "anonymous";

    const now = Date.now();
    const data = store.get(key);

    if (!data) {
      store.set(key, { count: 1, time: now });
      return next();
    }

    if (now - data.time > WINDOW) {
      store.set(key, { count: 1, time: now });
      return next();
    }

    if (data.count >= MAX) {
      return res.status(429).json({
        success: false,
        message: "Terlalu banyak request ke AI, santai dikit bre",
      });
    }

    data.count++;
    next();
  };
})();

const validateMessage = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      message: "Message wajib berupa string",
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message kepanjangan (max 5000 char)",
    });
  }

  next();
};

const validateThreadHeader = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const threadId = req.headers["x-thread-id"];

  if (threadId && typeof threadId !== "string") {
    delete req.headers["x-thread-id"];
  }

  next();
};

router.get("/status", ChatController.getStatus);

router.post(
  "/ask",
  optionalAuth,
  aiRateLimiter,
  validateThreadHeader,
  validateMessage,
  ChatController.askAI,
);

router.post(
  "/ask/private",
  authMiddleware,
  aiRateLimiter,
  validateThreadHeader,
  validateMessage,
  ChatController.askAI,
);

export default router;
