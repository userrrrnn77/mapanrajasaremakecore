//  src/controllers/authController.ts

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/UserModel.js";
import {
  AuthRequest,
  deleteFromCloudinary,
} from "../middlewares/authMiddleware.js";
import { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import WorkLocation, {
  WORK_ROLES,
  type WorkRole,
} from "../models/WorkLocationModel.js";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET belum diset");
}

const generateToken = (userId: string, role: string) => {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);

  let remaining = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

  if (remaining < 3600) remaining = 3600;

  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: remaining,
  });
};

interface RegisterBody {
  username: string;
  password: string;
  fullname: string;
  phone: string;
  role?: string;
  locationCode: string;
}

export const register = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { username, password, fullname, phone, role, locationCode } =
      req.body as RegisterBody;

    /**
     * 🔍 BASIC VALIDATION
     */
    if (!username || !password || !fullname || !phone || !locationCode) {
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

    const cleanUsername = username.toLowerCase().trim();
    const cleanPhone = phone.trim();
    const cleanCode = locationCode.trim().toUpperCase().replace(/\s+/g, "_");
    let userRole: WorkRole = "cleaning_service";

    const isValidRole = (role: any): role is WorkRole => {
      return WORK_ROLES.includes(role);
    };

    if (role) {
      if (!isValidRole(role)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Role tidak valid",
        });
      }
      userRole = role; // ✅ sekarang aman (sudah WorkRole)
    }

    /**
     * 🔐 CHECK DUPLICATE (PARALLEL)
     */
    const [existingUser, workLocation] = await Promise.all([
      User.findOne({
        $or: [{ phone: cleanPhone }, { username: cleanUsername }],
      }).session(session),

      WorkLocation.findOne({
        code: cleanCode,
        role: userRole,
        isActive: true,
      }).session(session),
    ]);

    if (existingUser) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "User sudah terdaftar (username/phone)",
      });
    }

    if (!workLocation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: `Lokasi ${cleanCode} tidak valid untuk role ${userRole}`,
      });
    }

    /**
     * 👤 CREATE USER
     */
    const newUser = new User({
      username: cleanUsername,
      password,
      fullname,
      phone: cleanPhone,
      role: userRole,
      assignedWorkLocations: [workLocation._id],
      isVerified: false,
      status: "active",
    });

    await newUser.save({ session });

    /**
     * 🔑 TOKEN
     */
    const token = generateToken(newUser._id.toString(), newUser.role);

    await session.commitTransaction();

    /**
     * 🔥 RESPONSE (SAFE)
     */
    return res.status(201).json({
      success: true,
      message: "Register berhasil",
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          fullname: newUser.fullname,
          phone: newUser.phone,
          role: newUser.role,
          profilePhoto: newUser.profilePhoto,
        },
        token,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    const err = error as Error;
    logger.error(`REGISTER ERROR: ${err.message}`);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat register",
    });
  } finally {
    session.endSession();
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Nomor hp dan Password Wajib di isi!",
      });
    }

    const user = await User.findOne({ phone })
      .select("+password")
      .populate("assignedWorkLocations");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Pengguna tidak ditemukan!" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: "Password Salah coba inget inget lagi bre!",
      });

    if (!user.isVerified)
      return res.status(401).json({
        success: false,
        message:
          "Akun elu belum di verifikasi admin, coba hubungi admin dulu bre",
      });

    if (user.status !== "active")
      return res.status(403).json({
        success: false,
        message: "Akun elu udah di non-aktifkan oleh admin, lu dipecat bre",
      });

    const rawUserId = user?._id;
    const userId =
      typeof rawUserId === "object" ? rawUserId.toString() : rawUserId;

    const token = generateToken(userId, user.role);

    const userData = user.toObject();
    delete (userData as any).password;

    res.status(200).json({
      success: true,
      message: "Login Berhasil",
      data: {
        token,
        user: {
          id: userData._id,
          username: userData.username,
          fullname: userData.fullname,
          phone: userData.phone,
          role: userData.role,
          shift: userData.shift,
          profilePhoto: userData.profilePhoto,
          assignedWorkLocations: userData.assignedWorkLocations,
          isVerified: userData.isVerified,
          status: userData.status,
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`LOGIN ERROR: ${err.message}`);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat Login",
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal logout",
    });
  }
};

interface UpdateMeBody {
  username?: string;
  password?: string;
  profilePhoto?: {
    url: string;
    publicId: string;
  };
}

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const { username, password, profilePhoto } = req.body as UpdateMeBody;

    /**
     * 🔤 UPDATE FIELD BASIC
     */
    if (username) {
      user.username = username.toLowerCase().trim();
    }

    if (password) {
      user.password = password; // auto hash via pre-save
    }

    /**
     * 🖼️ UPDATE PROFILE PHOTO (Cloudinary)
     */
    if (profilePhoto?.url && profilePhoto?.publicId) {
      // 🔥 hapus foto lama kalau ada
      if (user.profilePhoto?.publicId) {
        try {
          await deleteFromCloudinary(user.profilePhoto.publicId);
        } catch (err) {
          logger.warn("Gagal hapus foto lama (non-blocking)");
        }
      }

      user.profilePhoto = {
        url: profilePhoto.url,
        publicId: profilePhoto.publicId,
      };
    }

    await user.save();

    /**
     * 🔥 CLEAN RESPONSE
     */
    const updatedUser = user.toObject();
    delete (updatedUser as any).password;

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: {
        id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        phone: updatedUser.phone,
        role: updatedUser.role,
        shift: updatedUser.shift,
        profilePhoto: updatedUser.profilePhoto,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`UPDATE_ME ERROR: ${err.message}`);

    return res.status(500).json({
      success: false,
      message: "Gagal update profil",
    });
  }
};
