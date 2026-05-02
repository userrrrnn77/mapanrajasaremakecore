import { Router } from "express";

import {
  register,
  login,
  logout,
  updateMe,
} from "../controllers/authController.js";

import {
  authMiddleware,
  loginLimiter,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);


router.post("/login", loginLimiter, login);


router.delete("/logout", authMiddleware, logout);

router.patch("/me", authMiddleware, updateMe);

/**
 * =========================================
 * 🔥 OPTIONAL: ROLE-BASED (OVERKILL MODE)
 * =========================================
 */

// contoh kalau nanti lu butuh admin endpoint
router.get(
  "/admin/ping",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  (_req, res) => {
    return res.json({
      success: true,
      message: "Admin access granted",
    });
  },
);

export default router;
