import type { Request, Response } from "express";
import mongoose from "mongoose";

import User from "../models/UserModel.js";
import WorkLocation, {
  type IWorkLocation,
  WORK_ROLES,
  type WorkRole,
} from "../models/WorkLocationModel.js";

import Attendance from "../models/AttendanceModel.js";
import { logger } from "../utils/logger.js";

/**
 * 🔥 REQUEST CONTEXT HELPER
 */
const getCtx = (req: Request) => ({
  requestId: req.headers["x-request-id"] || "unknown",
  method: req.method,
  path: req.originalUrl,
});

/**
 * 🔥 RESPONSE WRAPPER (LOGGER-DRIVEN)
 */
const ok = (
  req: Request,
  res: Response,
  message: string,
  data?: unknown,
  status = 200,
) => {
  logger.info({
    ...getCtx(req),
    message,
    status,
    success: true,
  });

  return res.status(status).json({
    success: true,
    message,
    data: data ?? null,
  });
};

const fail = (
  req: Request,
  res: Response,
  message: string,
  status = 500,
  error?: unknown,
) => {
  logger.error({
    ...getCtx(req),
    message,
    status,
    success: false,
    error: error instanceof Error ? error.message : error,
  });

  return res.status(status).json({
    success: false,
    message,
  });
};

/**
 * 🔥 VALIDATOR HELPERS
 */
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const parseNumber = (val: unknown) => {
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
};

/**
 * 🔥 GET ALL
 */
export const getAllWorkLocation = async (req: Request, res: Response) => {
  try {
    const data = await WorkLocation.find().lean();

    return ok(req, res, "Daftar lokasi berhasil diambil", data);
  } catch (error) {
    return fail(req, res, "Gagal ambil lokasi", 500, error);
  }
};

/**
 * 🔥 CREATE
 */
interface CreateLocationBody {
  code: string;
  name: string;
  lat: number | string;
  lng: number | string;
  radiusMeter?: number | string;
  shiftConfigs?: IWorkLocation["shiftConfigs"];
  role: WorkRole;
}

export const createWorkLocation = async (
  req: Request<{}, {}, CreateLocationBody>,
  res: Response,
) => {
  try {
    const { code, name, lat, lng, radiusMeter, shiftConfigs, role } = req.body;

    /**
     * 🔥 BASIC VALIDATION
     */
    if (!code || !name || lat === undefined || lng === undefined || !role) {
      logger.warn({ ...getCtx(req), message: "Missing required fields" });

      return res.status(400).json({
        success: false,
        message: "Field wajib belum lengkap",
      });
    }

    if (!WORK_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role tidak valid",
      });
    }

    const latitude = parseNumber(lat);
    const longitude = parseNumber(lng);

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        success: false,
        message: "Koordinat tidak valid",
      });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "_");

    /**
     * 🔥 DUPLICATE CHECK
     */
    const exists = await WorkLocation.exists({
      code: cleanCode,
      role,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Lokasi dengan role ini sudah ada",
      });
    }

    /**
     * 🔥 CREATE
     */
    const doc = await WorkLocation.create({
      code: cleanCode,
      role,
      name,
      center: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      radiusMeter: parseNumber(radiusMeter) || 100,
      shiftConfigs: shiftConfigs || undefined,
    });

    return ok(req, res, "Lokasi berhasil dibuat", doc, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      return fail(req, res, "Duplicate key", 409, error);
    }

    return fail(req, res, "Gagal membuat lokasi", 500, error);
  }
};

/**
 * 🔥 UPDATE
 */
interface UpdateLocationBody {
  role?: WorkRole;
  lat?: number | string;
  lng?: number | string;
  shiftConfigs?: IWorkLocation["shiftConfigs"];
  name?: string;
  radiusMeter?: number;
  isActive?: boolean;
}

export const updateWorkLocation = async (
  req: Request<{ id: string }, {}, UpdateLocationBody>,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID tidak valid",
      });
    }

    const { role, lat, lng, shiftConfigs, ...rest } = req.body;

    const updateData: any = { ...rest };

    /**
     * 🔥 ROLE GUARD
     */
    if (role) {
      if (!WORK_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role tidak valid",
        });
      }

      const isUsed = await User.exists({
        assignedWorkLocations: id,
      });

      if (isUsed) {
        logger.warn({ ...getCtx(req), message: "Role change blocked" });

        return res.status(400).json({
          success: false,
          message: "Role tidak bisa diubah",
        });
      }

      updateData.role = role;
    }

    /**
     * 🔥 GEO UPDATE
     */
    if (lat !== undefined && lng !== undefined) {
      const latitude = parseNumber(lat);
      const longitude = parseNumber(lng);

      if (latitude === null || longitude === null) {
        return res.status(400).json({
          success: false,
          message: "Koordinat tidak valid",
        });
      }

      updateData.center = {
        type: "Point",
        coordinates: [longitude, latitude],
      };
    }

    if (shiftConfigs) {
      updateData.shiftConfigs = shiftConfigs;
    }

    const updated = await WorkLocation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Lokasi tidak ditemukan",
      });
    }

    return ok(req, res, "Lokasi berhasil diupdate", updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return fail(req, res, "Duplicate key saat update", 409, error);
    }

    return fail(req, res, "Gagal update lokasi", 500, error);
  }
};

/**
 * 🔥 DELETE (SMART DELETE)
 */
export const deleteLocation = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID tidak valid",
      });
    }

    const hasHistory = await Attendance.exists({
      workLocation: id,
    });

    /**
     * 🔥 SOFT DELETE
     */
    if (hasHistory) {
      await WorkLocation.findByIdAndUpdate(id, { isActive: false });

      logger.info({ ...getCtx(req), message: "Soft delete executed" });

      return ok(req, res, "Lokasi dinonaktifkan (punya riwayat absensi)");
    }

    /**
     * 🔥 HARD DELETE
     */
    const deleted = await WorkLocation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Lokasi tidak ditemukan",
      });
    }

    await User.updateMany(
      { assignedWorkLocations: id },
      { $pull: { assignedWorkLocations: id } },
    );

    logger.info({ ...getCtx(req), message: "Hard delete executed" });

    return ok(req, res, "Lokasi berhasil dihapus permanen");
  } catch (error) {
    return fail(req, res, "Gagal hapus lokasi", 500, error);
  }
};
