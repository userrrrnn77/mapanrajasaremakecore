import { Router, type Response, type NextFunction } from "express";
import { NotificationController } from "../controllers/notificationController.js";
import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = Router();

const injectUserId = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user?._id) {
    req.headers["x-user-id"] = req.user._id.toString();
  }
  next();
};

const notifLimiter = (() => {
  const store = new Map<string, { count: number; time: number }>();

  const WINDOW = 60 * 1000;
  const MAX = 30;

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
        message: "Terlalu banyak request notif",
      });
    }

    data.count++;
    next();
  };
})();

const validateIdParam = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  if (!id || id.length < 10) {
    return res.status(400).json({
      success: false,
      message: "ID tidak valid",
    });
  }

  next();
};

const validateSendNotif = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { userId, title, body } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({
      success: false,
      message: "Field wajib kurang",
    });
  }

  if (typeof title !== "string" || typeof body !== "string") {
    return res.status(400).json({
      success: false,
      message: "Format tidak valid",
    });
  }

  next();
};

router.get(
  "/me",
  authMiddleware,
  injectUserId,
  notifLimiter,
  NotificationController.getMyNotifications,
);

router.patch(
  "/me/read-all",
  authMiddleware,
  injectUserId,
  notifLimiter,
  NotificationController.markAllAsRead,
);

router.patch(
  "/:id/read",
  authMiddleware,
  validateIdParam,
  notifLimiter,
  NotificationController.markAsRead,
);

router.delete(
  "/:id",
  authMiddleware,
  validateIdParam,
  notifLimiter,
  NotificationController.deleteNotification,
);

router.post(
  "/send",
  authMiddleware,
  roleMiddleware(["admin", "super_admin"]),
  validateSendNotif,
  notifLimiter,
  NotificationController.sendNotification,
);

export default router;
