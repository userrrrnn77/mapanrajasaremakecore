import { Router, type Response, type NextFunction } from "express";
import { getSignature } from "../controllers/cloudinarySigantureController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = Router();

const signatureLimiter = (() => {
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
        message: "Terlalu banyak request signature",
      });
    }

    data.count++;
    next();
  };
})();

const validateFolderQuery = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const folder = req.query.folder;

  if (folder && typeof folder !== "string") {
    return res.status(400).json({
      success: false,
      message: "Folder harus string",
    });
  }

  next();
};

const roleGuard = (allowed: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

router.get(
  "/signature",
  authMiddleware,
  signatureLimiter,
  validateFolderQuery,
  getSignature,
);

/**
 * 🔥 ALT: STRICT ADMIN ONLY (optional)
 * uncomment kalau mau dibatesin
 */
// router.get(
//   "/signature/admin",
//   authMiddleware,
//   roleGuard(["admin", "super_admin"]),
//   signatureLimiter,
//   validateFolderQuery,
//   getSignature,
// );

export default router;
