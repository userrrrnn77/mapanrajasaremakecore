import { Router, type Response, type NextFunction } from "express";
import {
  createUser,
  getAllUsers,
  updateUserStatus,
  getUserById,
  getDashboardStats,
  getMyTimeline,
  updateUserAssignment,
  verifyUser,
  deleteUser,
} from "../controllers/userController.js";

import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";

import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = Router();

const adminLimiter = (() => {
  const store = new Map<string, { count: number; time: number }>();

  const WINDOW = 60 * 1000;
  const MAX = 20;

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
        message: "Terlalu banyak aksi admin",
      });
    }

    data.count++;
    next();
  };
})();

const validateObjectId = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = req.params.id || req.params.userId;

  if (!id || id.length < 10) {
    return res.status(400).json({
      success: false,
      message: "ID tidak valid",
    });
  }

  next();
};

const validateStatus = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status harus active / inactive",
    });
  }

  next();
};

const validateCreateUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { username, fullname, phone, password } = req.body;

  if (!username || !fullname || !phone || !password) {
    return res.status(400).json({
      success: false,
      message: "Field wajib belum lengkap",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 8 karakter",
    });
  }

  next();
};

router.get("/dashboard", authMiddleware, getDashboardStats);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminLimiter,
  validateCreateUser,
  createUser,
);

router.get("/my-timeline", authMiddleware, getMyTimeline);

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminLimiter,
  getAllUsers,
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateObjectId,
  getUserById,
);

router.patch(
  "/:userId/status",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminLimiter,
  validateObjectId,
  validateStatus,
  updateUserStatus,
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminLimiter,
  validateObjectId,
  deleteUser,
);

router.patch(
  "/verify/:userId",
  authMiddleware,
  roleMiddleware(["admin"]),
  verifyUser,
);

router.patch(
  "/:id/role",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateUserAssignment,
);

export default router;
