// src/controllers/userController.ts

import type { Request, Response } from "express";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

import User, { IUser } from "../models/UserModel.js";
import WorkLocation, {
  WORK_ROLES,
  type WorkRole,
} from "../models/WorkLocationModel.js";

import Activity from "../models/ActivityModel.js";
import Attendance from "../models/AttendanceModel.js";
import Report from "../models/ReportModel.js";

import { getNowJakarta } from "../utils/timeHelper.js"; 
import type { AuthRequest } from "../middlewares/authMiddleware.js";

/**
 * 🔥 CREATE USER (ADMIN)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      username,
      fullname,
      phone,
      password,
      role,
      assignedWorkLocations,
    } = req.body;

    if (!username || !fullname || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Field wajib belum lengkap",
      });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const exists = await User.findOne({
      $or: [{ phone: cleanPhone }, { username: cleanUsername }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Username / phone sudah dipakai",
      });
    }

    let userRole: WorkRole = "cleaning_service";

    const adminRole = User.findOne({role: "admin"})

    if (role && WORK_ROLES.includes(role)) {
      userRole = role;
    }

    let locationIds: mongoose.Types.ObjectId[] = [];

    const isAdmin = adminRole

    if (!isAdmin && assignedWorkLocations) {
      const codes = (Array.isArray(assignedWorkLocations)
        ? assignedWorkLocations
        : [assignedWorkLocations]
      )
        .filter(Boolean)
        .map((c: string) =>
          c.trim().toUpperCase().replace(/\s+/g, "_"),
        );

      const locations = await WorkLocation.find({
        code: { $in: codes },
        role: userRole,
        isActive: true,
      });

      if (locations.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Lokasi tidak valid untuk role ${userRole}`,
        });
      }

      locationIds = locations.map((l) => l._id);
    }

    const user = new User({
      username: cleanUsername,
      fullname,
      phone: cleanPhone,
      password,
      role: userRole,
      assignedWorkLocations: locationIds,
      isVerified: true,
      status: "active",
    });

    await user.save();

    const safeUser = user.toObject();
    delete (safeUser as any).password;

    return res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: safeUser,
    });
  } catch (error) {
    logger.error(`CREATE USER ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal create user",
    });
  }
};

/**
 * 🔥 GET ALL USERS
 */
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate("assignedWorkLocations", "name code role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error(`GET USERS ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal ambil data user",
    });
  }
};

/**
 * 🔥 UPDATE USER STATUS
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body as { status: "active" | "inactive" };

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      message: `Status diubah ke ${status}`,
      data: user,
    });
  } catch (error) {
    logger.error(`UPDATE STATUS ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal update status",
    });
  }
};

/**
 * 🔥 GET USER BY ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("assignedWorkLocations", "name code role radiusMeter center")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error(`GET USER ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal ambil user",
    });
  }
};

/**
 * 🔥 DASHBOARD
 */
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { _id, role } = req.user!;

    const now = getNowJakarta();
    const todayKey = now.format("YYYY-MM-DD");

    if (role === "admin") {
      const [
        totalUsers,
        presentToday,
        lateToday,
        totalReports,
      ] = await Promise.all([
        User.countDocuments({ status: "active" }),
        Attendance.countDocuments({ attendanceDayKey: todayKey, type: "masuk" }),
        Attendance.countDocuments({ attendanceDayKey: todayKey, lateMinutes: { $gt: 0 } }),
        Report.countDocuments(),
      ]);

      return res.json({
        success: true,
        data: {
          totalUsers,
          presentToday,
          lateToday,
          absentToday: Math.max(totalUsers - presentToday, 0),
          totalReports,
        },
      });
    }

    // 🔥 EMPLOYEE
    const [activities, reports, attendance] = await Promise.all([
      Activity.countDocuments({ user: _id }),
      Report.countDocuments({ user: _id, status: "open" }),
      Attendance.find({ user: _id, attendanceDayKey: todayKey }).sort({
        createdAt: -1,
      }),
    ]);

    const last = attendance[0];

    return res.json({
      success: true,
      data: {
        totalAktivitas: activities,
        laporanAktif: reports,
        currentAttendance: last || null,
      },
    });
  } catch (error) {
    logger.error(`DASHBOARD ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal ambil dashboard",
    });
  }
};

/**
 * 🔥 DELETE USER (SOFT DELETE)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    user.status = "inactive";
    user.isVerified = false;

    await user.save();

    return res.json({
      success: true,
      message: "User dinonaktifkan",
    });
  } catch (error) {
    logger.error(`DELETE USER ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal delete user",
    });
  }
};