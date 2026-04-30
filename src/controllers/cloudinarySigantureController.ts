import crypto from "crypto";
import type { Request, Response } from "express";

const ALLOWED_FOLDERS = ["avatars", "activities", "attendance", "reports"];

export const getSignature = (req: Request, res: Response) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);

    const folder = String(req.query.folder || "general");

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({
        success: false,
        message: "Folder tidak valid",
      });
    }

    const stringToSign = `folder=${folder}&timestamp=${timestamp}`;

    const signature = crypto
      .createHash("sha1")
      .update(stringToSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    return res.json({
      success: true,
      data: {
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal generate signature",
    });
  }
};
