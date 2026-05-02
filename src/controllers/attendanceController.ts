// src/controllers/attendanceController.ts

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

import dayjs from "dayjs";

import Attendance, { IAttendance } from "../models/AttendanceModel.js";
import User from "../models/UserModel.js";
import WorkLocation, {
  type IWorkLocation,
} from "../models/WorkLocationModel.js";

import { logger } from "../utils/logger.js";
import { getDistanceInMeters } from "../utils/geoHelper.js";
import { calculateAttendancePenalty } from "../utils/penaltyHelper.js";
import {
  getNowJakarta,
  getShiftBasedDayKey,
  toUTCFile,
} from "../utils/timeHelper.js";

/**
 * 🔥 CHECK IN
 */
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, shift, note, isOvertime, photo, backupForUserId } =
      req.body;

    const nowJakarta = getNowJakarta();

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Koordinat tidak valid",
      });
    }

    const user = await User.findById(req.user!._id).populate<{
      assignedWorkLocations: IWorkLocation[];
    }>("assignedWorkLocations");

    if (!user || !user.assignedWorkLocations?.length) {
      return res.status(403).json({
        success: false,
        message: "User tidak punya lokasi kerja",
      });
    }

    /**
     * 🔥 HANDLE BACKUP TARGET
     */
    let targetUserId = user._id;

    if (backupForUserId) {
      const targetUser = await User.findById(backupForUserId);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User yang mau di-backup tidak ditemukan",
        });
      }

      // ❗ hanya boleh backup user dengan role sama
      if (targetUser.role !== user.role) {
        return res.status(403).json({
          success: false,
          message: "Tidak bisa backup beda role",
        });
      }

      targetUserId = targetUser._id;
    }

    /**
     * 🔥 CEK DUPLIKASI (IMPORTANT)
     */
    const todayKey = nowJakarta.format("YYYY-MM-DD");

    const existing = await Attendance.findOne({
      attendanceDayKey: todayKey,
      shift,
      $or: [{ user: targetUserId }, { backupUser: targetUserId }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Absensi untuk shift ini sudah ada",
      });
    }

    /**
     * 🔥 LOCATION SCAN
     */
    let selectedLoc: any = null;
    let minDistance = Infinity;

    const validLocations = user.assignedWorkLocations.filter(
      (loc: any) => loc.role === user.role,
    );

    for (const loc of validLocations) {
      const [lngCenter, latCenter] = loc.center.coordinates;

      const distance = getDistanceInMeters(
        latitude,
        longitude,
        latCenter,
        lngCenter,
      );

      if (distance <= loc.radiusMeter) {
        selectedLoc = loc;
        minDistance = distance;
        break;
      }
    }

    if (!selectedLoc) {
      return res.status(403).json({
        success: false,
        message: "Di luar radius lokasi",
      });
    }

    /**
     * 🔥 SHIFT CONFIG
     */
    const isWeekend = nowJakarta.day() === 0 || nowJakarta.day() === 6;

    const dayConfigs = isWeekend
      ? selectedLoc.shiftConfigs.weekend
      : selectedLoc.shiftConfigs.weekday;

    const currentShift = shift || user.shift;

    const shiftConfig = dayConfigs[currentShift];

    const attendanceDayKey = shiftConfig
      ? getShiftBasedDayKey(shiftConfig.hour, shiftConfig.minute)
      : nowJakarta.format("YYYY-MM-DD");

    const { lateMinutes, penalty } = calculateAttendancePenalty(
      nowJakarta,
      currentShift,
      dayConfigs,
    );

    /**
     * 🔥 CREATE
     */
    const attendance = await Attendance.create({
      user: user._id, // yang ngejalanin
      backupUser: backupForUserId ? targetUserId : null,

      attendanceDayKey,
      type: "masuk",
      status: lateMinutes > 0 ? "terlambat" : "tepat_waktu",
      checkIn: toUTCFile(nowJakarta),
      isIncomplete: true,
      shift: currentShift,
      workLocation: selectedLoc._id,

      locationSnapshot: {
        name: selectedLoc.name,
        radiusMeter: selectedLoc.radiusMeter,
        center: selectedLoc.center,
      },

      photo,

      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },

      distanceFromCenter: minDistance,
      lateMinutes,
      penalty,
      isOvertime: isOvertime === true || isOvertime === "true",
      note,
    } as Partial<IAttendance>);

    return res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    logger.error(`CHECKIN ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal check-in",
    });
  }
};

/**
 * 🔥 CHECK OUT
 */
export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, note } = req.body;

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Koordinat tidak valid",
      });
    }

    const record = await Attendance.findOne({
      isIncomplete: true,
      $or: [{ user: req.user!._id }, { backupUser: req.user!._id }],
    }).populate<{
      workLocation: IWorkLocation;
    }>("workLocation");

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada sesi aktif",
      });
    }

    const nowJakarta = getNowJakarta();

    /**
     * 🔥 RADIUS CHECK
     */
    const center =
      record.locationSnapshot?.center || (record.workLocation as any)?.center;

    if (!center) {
      return res.status(500).json({
        success: false,
        message: "Data lokasi hilang",
      });
    }

    const [lngCenter, latCenter] = center.coordinates;

    const distance = getDistanceInMeters(
      latitude,
      longitude,
      latCenter,
      lngCenter,
    );

    const radius =
      record.locationSnapshot?.radiusMeter ??
      (record.workLocation as IWorkLocation)?.radiusMeter;

    if (!radius) {
      return res.status(500).json({
        success: false,
        message: "Radius tidak tersedia",
      });
    }

    if (distance > radius) {
      return res.status(403).json({
        success: false,
        message: "Harus di lokasi untuk checkout",
      });
    }

    /**
     * 🔥 DURATION
     */
    const diffMs = nowJakarta.diff(dayjs(record.checkIn));

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const updated = await Attendance.findOneAndUpdate(
      { _id: record._id, isIncomplete: true },
      {
        type: "keluar",
        checkOut: toUTCFile(nowJakarta),
        isIncomplete: false,
        note: note || `Durasi ${hours}j ${minutes}m`,
      },
      { new: true },
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "Double checkout detected",
      });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error(`CHECKOUT ERROR: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Gagal checkout",
    });
  }
};

interface AttendanceQuery {
  attendanceDayKey?: string | { $gte: string; $lte: string };
  user?: string;
  backupUser?: string;
  $or?: AttendanceQuery[];
}

interface SickBody {
  lat?: string;
  lng?: string;
  note?: string;
  photo: {
    url: string;
    publicId: string;
  };
}

/**
 * 🔥 SICK ATTENDANCE
 */
export const sickAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, note, photo } = req.body as SickBody;

    // ✅ VALIDASI BENAR
    if (!photo || !photo.url || !photo.publicId) {
      return res.status(400).json({
        success: false,
        message: "Bukti foto wajib",
      });
    }

    const now = getNowJakarta();
    const attendanceDayKey = now.format("YYYY-MM-DD");

    const existing = await Attendance.findOne({
      user: req.user!._id,
      attendanceDayKey,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Hari ini sudah ada data absensi",
      });
    }

    const latitude = Number(lat) || 0;
    const longitude = Number(lng) || 0;

    const attendance = await Attendance.create({
      user: req.user!._id,
      attendanceDayKey,
      type: "sakit",
      status: "sakit",
      photo: {
        url: photo.url,
        publicId: photo.publicId,
      },
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      kategori: "IZIN",
      note: note || "Izin Sakit / Darurat",
      isIncomplete: false,
    });

    return res.status(201).json({
      success: true,
      message: "Absensi sakit berhasil dicatat",
      data: attendance,
    });
  } catch (error) {
    logger.error(`SICK ATTENDANCE ERROR: ${(error as Error).message}`);

    return res.status(500).json({
      success: false,
      message: "Gagal mencatat izin sakit",
    });
  }
};
/**
 * 🔥 GET ALL ATTENDANCE (ADMIN)
 */
export const getAllAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, phone } = req.query as {
      startDate?: string;
      endDate?: string;
      phone?: string;
    };

    const query: AttendanceQuery = {};

    /**
     * 🔥 FILTER DATE
     */
    if (startDate) {
      query.attendanceDayKey = endDate
        ? { $gte: startDate, $lte: endDate }
        : startDate;
    }

    /**
     * 🔥 FILTER BY PHONE
     */
    if (phone) {
      const user = await User.findOne({ phone });

      if (!user) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      query.user = user._id.toString();
    }

    const allAttendance = await Attendance.find(query)
      .populate("user", "fullname username phone role")
      .populate("workLocation", "name")
      .sort({ attendanceDayKey: -1 });

    return res.status(200).json({
      success: true,
      data: allAttendance,
    });
  } catch (error) {
    logger.error(`GET ALL ATTENDANCE ERROR: ${(error as Error).message}`);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data absensi",
    });
  }
};

/**
 * 🔥 GET MY ATTENDANCE
 */
export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    const query: AttendanceQuery = {
      $or: [
        { user: req.user!._id.toString() },
        { backupUser: req.user!._id.toString() },
      ],
    };

    if (startDate && endDate) {
      query.attendanceDayKey = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const myAbsensi = await Attendance.find(query).sort({
      attendanceDayKey: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Riwayat absen berhasil diambil",
      data: myAbsensi,
    });
  } catch (error) {
    logger.error(`GET MY ATTENDANCE ERROR: ${(error as Error).message}`);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat absen",
    });
  }
};
