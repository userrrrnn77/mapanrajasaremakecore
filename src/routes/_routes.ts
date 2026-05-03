// src/routes/_routes.ts

import { Router } from "express";

import activityRoutes from "./activityRoutes.js";
import attendanceRoutes from "./attendanceRoutes.js";
import authRoutes from "./authRoutes.js";
import chatRoutes from "./chatRoutes.js";
import cloudinaryRoutes from "./clodinarySignatureRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";
import workLocationRoutes from './workLocationRoutes.js'
import reportRoutes from './reportRoutes.js'

import { getAppVersion } from "../controllers/appController.js";

const router = Router();

router.use("/activity", activityRoutes); // rute aktivitas
router.use("/attendance", attendanceRoutes); // rute absen
router.use("/auth", authRoutes); // rute autentikasi
router.use("/chat", chatRoutes); // rute chat dengan ai
router.use("/notification", notificationRoutes); // rute notifikasi?
router.use("/user", userRoutes); // rute user
router.use("/reports", reportRoutes); // rute laporan
router.use("/worklocation", workLocationRoutes); // rute lokasi kerja
router.use("/cloudinary", cloudinaryRoutes); // rute tandatangan cloudinary
router.use("/version", getAppVersion); // rute cek versi aplikasi

export default router;
