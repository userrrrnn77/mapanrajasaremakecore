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
    const { username, fullname, phone, password, role, assignedWorkLocations } =
      req.body;

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

    const adminRole = User.findOne({ role: "admin" });

    if (role && WORK_ROLES.includes(role)) {
      userRole = role;
    }

    let locationIds: mongoose.Types.ObjectId[] = [];

    const isAdmin = adminRole;

    if (!isAdmin && assignedWorkLocations) {
      const codes = (
        Array.isArray(assignedWorkLocations)
          ? assignedWorkLocations
          : [assignedWorkLocations]
      )
        .filter(Boolean)
        .map((c: string) => c.trim().toUpperCase().replace(/\s+/g, "_"));

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
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const { _id, role } = req.user!;

    const now = getNowJakarta();
    const todayKey = now.format("YYYY-MM-DD");

    if (role === "admin") {
      const [totalUsers, presentToday, lateToday, totalReports] =
        await Promise.all([
          User.countDocuments({ status: "active" }),
          Attendance.countDocuments({
            attendanceDayKey: todayKey,
            type: "masuk",
          }),
          Attendance.countDocuments({
            attendanceDayKey: todayKey,
            lateMinutes: { $gt: 0 },
          }),
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

export const updateUserAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { role, assignedWorkLocations, password } = req.body as {
      role?: string;
      assignedWorkLocations?: string[] | string;
      password?: string;
    };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn({ id }, "Invalid userId");
      return res.status(400).json({
        success: false,
        message: "User ID tidak valid",
      });
    }

    const user = await User.findById(id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    /**
     * 🔥 BLOCK kalau masih kerja
     */
    const openSession = await Attendance.findOne({
      user: id,
      isIncomplete: true,
    });

    if (openSession && (role || assignedWorkLocations)) {
      logger.warn({ userId: id }, "Blocked: user masih ada sesi aktif");

      return res.status(400).json({
        success: false,
        message: "User masih ada sesi aktif, harus checkout dulu",
      });
    }

    /**
     * 🔥 UPDATE ROLE
     */
    if (role) {
      user.role = role as any;
    }

    /**
     * 🔐 UPDATE PASSWORD
     */
    if (password && password.trim() !== "") {
      user.password = password; // auto hash
    }

    /**
     * 🔥 UPDATE LOCATION
     */
    if (assignedWorkLocations) {
      const input = Array.isArray(assignedWorkLocations)
        ? assignedWorkLocations
        : [assignedWorkLocations];

      const cleanCodes = input
        .filter(Boolean)
        .map((c) => c.trim().toUpperCase().replace(/\s+/g, "_"));

      // 1. Kita buat query object-nya dulu
      // 2. Kita cast 'role' ke 'any' atau type yang sesuai supaya TS nggak protes soal "admin"
      const locationQuery: any = {
        code: { $in: cleanCodes },
        isActive: true,
      };

      // Admin biasanya bebas lokasi, tapi kalau role lain kita filter sesuai role-nya
      if (user.role !== "admin") {
        locationQuery.role = user.role;
      }

      const locations = await WorkLocation.find(locationQuery);

      if (user.role !== "admin" && locations.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Lokasi tidak ditemukan atau tidak cocok untuk role ${user.role}`,
        });
      }

      user.assignedWorkLocations = locations.map((l) => l._id) as any;
    }

    await user.save();

    const updatedUser = await User.findById(id)
      .populate("assignedWorkLocations", "name code role")
      .select("-password");

    logger.info(
      {
        actor: req.user?._id,
        target: id,
      },
      "User assignment updated",
    );

    return res.json({
      success: true,
      message: "User berhasil diupdate",
      data: updatedUser,
    });
  } catch (error) {
    const err = error as Error;

    logger.error({ err, message: err.message }, "updateUserAssignment error");

    return res.status(500).json({
      success: false,
      message: "Gagal update user",
    });
  }
};

/**
 * 🔥 GET MY TIMELINE (NO NEEDS)
 */
export const getMyTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /**
     * 🔥 PARALLEL FETCH
     */
    const [absensiRaw, laporanRaw, aktivitasRaw] = await Promise.all([
      Attendance.find({
        $or: [{ user: userId }, { backupUser: userId }],
      }).lean(),

      Report.find({ user: userId }).lean(),

      Activity.find({ user: userId }).lean(),
    ]);

    /**
     * 🔥 SAFE CAST (BIAR TS GAK NGEGONGGONG)
     */
    const absensi = absensiRaw as any[];
    const laporan = laporanRaw as any[];
    const aktivitas = aktivitasRaw as any[];

    /**
     * 🔥 NORMALIZE TIMELINE
     */
    const timeline = [
      ...absensi.map((item) => ({
        ...item,
        kategori: "ABSENSI",
        displayDesc:
          item.type === "masuk"
            ? `Absen Masuk: ${item.note || "Tanpa catatan"}`
            : "Absen Pulang",
        createdAt: item.createdAt ?? new Date(),
      })),

      ...laporan.map((item) => ({
        ...item,
        kategori: "LAPORAN",
        displayDesc:
          item.description || item.reason || item.note || "Laporan baru",
        createdAt: item.createdAt ?? new Date(),
      })),

      ...aktivitas.map((item) => ({
        ...item,
        kategori: "AKTIVITAS",
        displayDesc:
          item.description || item.title || item.note || "Aktivitas baru",
        photos: item.photos || (item.photo ? [item.photo] : []) || [],
        createdAt: item.createdAt ?? new Date(),
      })),
    ];

    /**
     * 🔥 SORT SAFE (ANTI CRASH)
     */
    timeline.sort((a, b) => {
      const timeA = new Date(a.createdAt ?? 0).getTime();
      const timeB = new Date(b.createdAt ?? 0).getTime();
      return timeB - timeA;
    });

    /**
     * 🔥 RESPONSE
     */
    return res.json({
      success: true,
      message: "Timeline berhasil diambil",
      total: timeline.length,
      data: timeline,
    });
  } catch (error) {
    const err = error as Error;

    logger.error(
      {
        err,
        message: err.message,
        userId: req.user?._id,
      },
      "getMyTimeline error",
    );

    return res.status(500).json({
      success: false,
      message: "Gagal ambil timeline",
    });
  }
};

/**
 * 🔥 VERIFY USER
 */
export const verifyUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    const { action } = req.body as {
      action: "approve" | "reject";
    };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "User ID tidak valid",
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action tidak valid",
      });
    }

    if (action === "approve") {
      const user = await User.findByIdAndUpdate(
        userId,
        { isVerified: true },
        { new: true },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      logger.info(
        {
          actor: req.user?._id,
          target: userId,
        },
        "User approved",
      );

      return res.json({
        success: true,
        message: `User ${user.fullname} diverifikasi`,
      });
    }

    /**
     * 🔥 REJECT → DELETE
     */
    await User.findByIdAndDelete(userId);

    logger.warn(
      {
        actor: req.user?._id,
        target: userId,
      },
      "User rejected & deleted",
    );

    return res.json({
      success: true,
      message: "User ditolak & dihapus",
    });
  } catch (error) {
    const err = error as Error;

    logger.error({ err, message: err.message }, "verifyUser error");

    return res.status(500).json({
      success: false,
      message: "Gagal verifikasi user",
    });
  }
};
