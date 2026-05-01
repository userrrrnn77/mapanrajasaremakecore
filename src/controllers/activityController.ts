import type { Response } from "express";
import Activity from "../models/ActivityModel.js";
import { logger } from "../utils/logger.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";

interface CreateActivityBody {
  title?: string;
  lat: string;
  lng: string;
  address?: string;

  documentation: {
    photo: {
      url: string;
      publicId: string;
    };
    caption: string;
  }[];
}

export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { title, lat, lng, address, documentation } =
      req.body as CreateActivityBody;

    /**
     * 🔥 VALIDASI DOCUMENTATION
     */
    if (!documentation || documentation.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Minimal 1 foto wajib ada",
      });
    }

    if (documentation.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maksimal 10 foto",
      });
    }

    /**
     * 🔥 VALIDASI KOORDINAT
     */
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: "Koordinat tidak valid",
      });
    }

    /**
     * 🔥 USER ID
     */
    const rawUserId = req.user?._id;

    const userId =
      typeof rawUserId === "object" ? rawUserId.toString() : rawUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    /**
     * 🔥 CREATE
     */
    const activity = await Activity.create({
      user: userId,
      title: title || "Kegiatan Tanpa Judul",
      documentation,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      address: address || "-",
    });

    return res.status(201).json({
      success: true,
      message: "Kegiatan berhasil disimpan",
      data: activity,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error({
      msg: "createActivity error",
      error: message,
    });

    return res.status(500).json({
      success: false,
      error: "Gagal simpan kegiatan",
    });
  }
};

export const getMyHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const activities = await Activity.find({ user: userId }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      data: activities,
    });
  } catch (error: unknown) {
    logger.error({
      msg: "getMyHistory error",
      error,
    });

    return res.status(500).json({
      success: false,
      error: "Gagal ambil riwayat",
    });
  }
};

/**
 * 🔥 GET ALL ACTIVITIES
 */
export const getAllActivities = async (_req: AuthRequest, res: Response) => {
  try {
    const activities = await Activity.find()
      .populate("user", "fullname phone")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: activities,
    });
  } catch (error: unknown) {
    logger.error({
      msg: "getAllActivities error",
      error,
    });

    return res.status(500).json({
      success: false,
      error: "Gagal ambil data",
    });
  }
};
