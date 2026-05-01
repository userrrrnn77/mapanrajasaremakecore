import { Router } from "express";

import {
  checkIn,
  checkOut,
  getAllAttendance,
  getMyAttendance,
  sickAttendance,
} from "../controllers/attendanceController.js";

import {
  authMiddleware,
  attendanceLimiter,
  checkInValidator,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";

import type { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";

import { logger } from "../utils/logger.js";

const router = Router();

/**
 * 🔥 EXTRA VALIDATOR (OPSIONAL HARDENING)
 */
const checkOutValidator = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    logger.warn("Checkout gagal: lat/lng kosong");
    return res.status(400).json({
      success: false,
      message: "Koordinat wajib diisi",
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      message: "Koordinat tidak valid",
    });
  }

  next();
};

/**
 * 🔥 ROUTES
 */

/**
 * 🔥 (OPSIONAL) ADMIN ACCESS – GET ALL ATTENDANCE
 * lu bisa tambahin nanti kalau butuh dashboard
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  getAllAttendance,
);

router.get("/my-attendance", authMiddleware, getMyAttendance);

/**
 * 📌 CHECK-IN
 * - Auth required
 * - Rate limited (anti spam)
 * - Coordinate validated
 */
router.post(
  "/check-in",
  authMiddleware,
  attendanceLimiter,
  checkInValidator,
  checkIn,
);

/**
 * 📌 CHECK-OUT
 * - Auth required
 * - Rate limited
 */
router.post(
  "/check-out",
  authMiddleware,
  attendanceLimiter,
  checkOutValidator,
  checkOut,
);

router.post("/sick", authMiddleware, attendanceLimiter, sickAttendance);

export default router;
