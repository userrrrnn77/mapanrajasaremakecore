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
  roleMiddleware,
} from "../middlewares/authMiddleware.js";
import {
  checkInValidator,
  checkOutValidator,
} from "../middlewares/attendanceMiddleware.js";

const router = Router();

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

router.post(
  "/check-in/backup",
  authMiddleware,
  attendanceLimiter,
  checkInValidator,
  checkIn, // reuse controller
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
