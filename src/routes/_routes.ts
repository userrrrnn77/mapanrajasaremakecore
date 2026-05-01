import { Router } from "express";

import activityRoutes from "./activityRoutes.js";
import attendanceRoutes from "./attendanceRoutes.js";
import authRoutes from "./authRoutes.js";
import chatRoutes from "./chatRoutes.js";
import cloudinaryRoutes from "./clodinarySignatureRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";

import { getAppVersion } from "../controllers/appController.js";

const router = Router();

router.use("/activity", activityRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/cloudinary", cloudinaryRoutes);
router.use("/notification", notificationRoutes);
router.use("/user", userRoutes);
router.use("/version", getAppVersion);

export default router;
