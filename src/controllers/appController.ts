import { AuthRequest } from "../middlewares/authMiddleware.js";
import { Response } from "express";

export const getAppVersion = (req: AuthRequest, res: Response) => {
  if (!req.query.platform) {
    return res.status(400).json({ message: "Platform wajib diisi" });
  }
  res.status(200).json({
    success: true,
    latestVersion: "1.0.0",
    downloadUrl: "",
    forceUpdate: true,
    notes: "",
  });
};
