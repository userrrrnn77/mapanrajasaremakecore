// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { rateLimit as rateLimitMbut } from "express-rate-limit";
import User, { IUser } from "../models/UserModel.js";
import { logger } from "../utils/logger.js";
import cloudinary from "../config/cloudinary.js";

const rateLimit: any = rateLimitMbut;

/**
 * 🔥 EXTEND EXPRESS REQUEST
 */

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface AuthRequest extends Request {
  user?: IUser;
  validatedLocation?: {
    lat: number;
    lng: number;
  };
}

/**
 * 🔥 JWT PAYLOAD TYPE
 */
interface TokenPayload extends JwtPayload {
  id: string;
}

/**
 * 🔐 AUTH MIDDLEWARE
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("Auth gagal: token tidak ada");
      return res.status(401).json({
        success: false,
        message: "Token otorisasi diperlukan",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as TokenPayload;

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      logger.warn({ userId: decoded.id }, "User tidak ditemukan");
      return res.status(401).json({
        success: false,
        message: "Akun tidak ditemukan",
      });
    }

    if (user.status !== "active") {
      logger.warn({ userId: user._id }, "User nonaktif");
      return res.status(403).json({
        success: false,
        message: "Akun dinonaktifkan",
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error(
      {
        err: error,
        message: error.message,
      },
      "Auth error",
    );

    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau kadaluarsa",
    });
  }
};

/**
 * 🔐 ROLE MIDDLEWARE (STRICT)
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn("Role check gagal: user tidak ada");
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const isAllowed = allowedRoles.includes(req.user.role);

    if (!isAllowed) {
      logger.warn(
        { role: req.user.role },
        "Akses ditolak karena role tidak sesuai",
      );

      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/**
 * 🔐 ADMIN MIDDLEWARE (OPTIONAL WRAPPER)
 */
export const adminMiddleware = (allowedRoles: string[]) =>
  roleMiddleware(allowedRoles);

/**
 * 🚫 RATE LIMIT - LOGIN
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req: AuthRequest, res: Response) => {
    logger.warn({ ip: req.ip }, "Terlalu banyak percobaan login");

    res.status(429).json({
      success: false,
      message: "Terlalu banyak percobaan login. Coba lagi nanti.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 🚫 RATE LIMIT - ATTENDANCE
 */
export const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  handler: (req: AuthRequest, res: Response) => {
    logger.warn({ ip: req.ip }, "Spam absensi terdeteksi");

    res.status(429).json({
      success: false,
      message: "Terlalu banyak request absensi",
    });
  },
});

/**
 * 📍 VALIDATOR KOORDINAT (CHECK-IN)
 */
// export const checkInValidator = (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction,
// ) => {
//   const { lat, lng } = req.body;

//   if (!lat || !lng) {
//     logger.warn("Lat/Lng tidak ada");
//     return res.status(400).json({
//       success: false,
//       message: "Koordinat wajib diisi",
//     });
//   }

//   const latitude = parseFloat(lat);
//   const longitude = parseFloat(lng);

//   if (isNaN(latitude) || isNaN(longitude)) {
//     logger.warn({ lat, lng }, "Koordinat bukan angka");
//     return res.status(400).json({
//       success: false,
//       message: "Koordinat harus angka",
//     });
//   }

//   if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
//     logger.warn({ latitude, longitude }, "Koordinat di luar range");
//     return res.status(400).json({
//       success: false,
//       message: "Koordinat tidak valid",
//     });
//   }

//   req.validatedLocation = {
//     lat: latitude,
//     lng: longitude,
//   };

//   next();
// };

export const deleteFromCloudinary = async (publicId: string) => {
  return await cloudinary.uploader.destroy(publicId);
};
