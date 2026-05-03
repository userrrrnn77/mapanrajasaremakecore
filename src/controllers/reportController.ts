import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import Report from "../models/ReportModel.js";
import { logger } from "../utils/logger.js";

/**
 * 🔥 CREATE REPORT (JSON ONLY - CLIENT SIDE UPLOAD)
 */
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    // Kita ambil data dari body (JSON)
    const {
      description,
      address,
      lat,
      lng,
      photos, // Array of strings (URL dari Cloudinary)
      source,
      priority,
    } = req.body;

    // 1. VALIDASI DASAR
    if (!description || description.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Deskripsi laporan minimal 5 karakter, Bre!",
      });
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal kasih 1 foto bukti lah, biar gak hoax!",
      });
    }

    // 2. PARSING KOORDINAT (GeoJSON: [lng, lat])
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // 3. RAKIT DATA
    const newReport = new Report({
      user: req.user?._id,
      description: description.trim(),
      photos: photos, // Langsung masukin array URL-nya
      location: {
        type: "Point",
        coordinates: [
          !isNaN(longitude) ? longitude : 0,
          !isNaN(latitude) ? latitude : 0,
        ],
      },
      address: address || "Lokasi tidak terbaca",
      status: "open",
      metadata: {
        source: source || "mobile",
        priority: priority || "medium",
      },
      reportTime: new Date(),
    });

    // 4. SIMPAN
    await newReport.save();

    // Pino Logger (Overkill tracking)
    logger.info(
      {
        action: "CREATE_REPORT",
        userId: req.user?._id,
        reportId: newReport._id,
      },
      "Laporan baru berhasil dibuat",
    );

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil dikirim! Tim bakal segera meluncur.",
      data: newReport,
    });
  } catch (error) {
    const err = error as Error;
    logger.error({ err, userId: req.user?._id }, "Gagal create report");

    return res.status(500).json({
      success: false,
      message: "Server Error: " + err.message,
    });
  }
};

/**
 * 🔥 GET ALL REPORTS (WITH PAGINATION & LEAN)
 */
export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Lean() bikin query lebih kenceng (balikkin POJO bukan Mongoose Document)
    const [reports, total] = await Promise.all([
      Report.find()
        .populate("user", "fullname phone role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(),
    ]);

    logger.info({ action: "GET_ALL_REPORTS", count: reports.length });

    return res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, "Gagal ambil semua laporan");

    return res.status(500).json({
      success: false,
      message: "Gagal ambil data laporan",
    });
  }
};
