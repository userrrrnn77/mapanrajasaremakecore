import { Router } from "express";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

import {
  getAllWorkLocation,
  createWorkLocation,
  updateWorkLocation,
  deleteLocation,
} from "../controllers/workLocationController.js";

import {
  authMiddleware,
  roleMiddleware,
} from "../middlewares/authMiddleware.js";

import { logger } from "../utils/logger.js";

const router = Router();

/**
 * 🔥 VALIDATOR HELPERS
 */

const validateCreateLocation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { code, name, lat, lng, role } = req.body;

  if (!code || !name || lat === undefined || lng === undefined || !role) {
    logger.warn(
      { body: req.body },
      "CreateLocation validation gagal (missing field)",
    );

    return res.status(400).json({
      success: false,
      message: "Field wajib tidak lengkap",
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    logger.warn("CreateLocation validation gagal (invalid coordinate)");

    return res.status(400).json({
      success: false,
      message: "Koordinat tidak valid",
    });
  }

  next();
};

const validateUpdateLocation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { lat, lng } = req.body;

  if (
    (lat !== undefined && Number.isNaN(Number(lat))) ||
    (lng !== undefined && Number.isNaN(Number(lng)))
  ) {
    logger.warn("UpdateLocation validation gagal (invalid coordinate)");

    return res.status(400).json({
      success: false,
      message: "Koordinat tidak valid",
    });
  }

  next();
};

const validateObjectIdParam = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  if (!id || id.length < 10) {
    logger.warn({ id }, "Invalid ObjectId param");

    return res.status(400).json({
      success: false,
      message: "ID tidak valid",
    });
  }

  next();
};

/**
 * 🔥 ROUTES
 */

/**
 * 📌 GET ALL LOCATIONS
 * - Public (optional: bisa lu protect kalau mau)
 */
router.get("/", getAllWorkLocation);

/**
 * 📌 CREATE LOCATION
 * - Admin only
 * - Strict validation
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  validateCreateLocation,
  createWorkLocation,
);

/**
 * 📌 UPDATE LOCATION
 * - Admin only
 * - Partial update allowed
 */
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  validateObjectIdParam,
  validateUpdateLocation,
  updateWorkLocation,
);

/**
 * 📌 DELETE LOCATION
 * - Admin only
 * - Soft delete aware
 */
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "owner"]),
  validateObjectIdParam,
  deleteLocation,
);

export default router;
