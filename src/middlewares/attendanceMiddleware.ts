import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware.js";
import { logger } from "../utils/logger.js";

export const checkInValidator = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { lat, lng, shift, backupForUserId } = req.body;

  if (!lat || !lng) {
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

  // 🔥 OPTIONAL HARDENING
  if (backupForUserId && typeof backupForUserId !== "string") {
    return res.status(400).json({
      success: false,
      message: "backupForUserId tidak valid",
    });
  }

  next();
};

export const checkOutValidator = (
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
