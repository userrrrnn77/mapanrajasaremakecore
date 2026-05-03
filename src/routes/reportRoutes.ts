import express from "express";
import {
  createReport,
  getAllReports,
} from "../controllers/reportController.js";
import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";
import { rateLimit as rateLimitMbut } from "express-rate-limit";
import { logger } from "../utils/logger.js";

const router = express.Router();
const rateLimit: any = rateLimitMbut;

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req: any, res: any) => {
    logger.warn(
      { userId: req.user?._id, ip: req.ip },
      "Spam laporan terdeteksi",
    );
    res.status(429).json({
      success: false,
      message: "Sabar Bre, laporan lu lagi diproses. Jangan spam!",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", authMiddleware, reportLimiter, createReport);

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAllReports,
);

export default router;
