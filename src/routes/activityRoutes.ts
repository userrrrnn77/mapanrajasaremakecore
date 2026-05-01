import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";
import {
  createActivity,
  getMyHistory,
  getAllActivities,
} from "../controllers/activityController.js";
import {
  authMiddleware,
  roleMiddleware,
  checkInValidator, 
} from "../middlewares/authMiddleware.js";

const router = Router();

// Rate limiter khusus activity
const activityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, "Spam activity terdeteksi");
    res.status(429).json({ success: false, message: "Terlalu banyak request" });
  },
});

// Validator documentation punya lu (udah GG)
const validateActivityPayload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { documentation } = req.body;
  if (!Array.isArray(documentation) || documentation.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Documentation minimal 1 foto" });
  }
  for (const item of documentation) {
    if (
      !item.photo?.url ||
      !item.photo?.publicId ||
      typeof item.caption !== "string"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Struktur dokumentasi cacat, Bre!" });
    }
  }
  next();
};

/**
 * 🔥 ROUTES
 */

// Post activity - Proteksi lapis baja
router.post(
  "/",
  authMiddleware,
  activityLimiter,
  checkInValidator, // <--- Lu gak perlu pusing parseFloat(lat/lng) di controller lagi
  validateActivityPayload,
  createActivity,
);

router.get("/me", authMiddleware, getMyHistory);

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  getAllActivities,
);

export default router;
