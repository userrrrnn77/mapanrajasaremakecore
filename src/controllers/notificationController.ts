import type { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import Notification from "../models/NotificationModel.js"; 
import { NotificationService } from "../service/notificationService.js"; 

export class NotificationController {
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = req.headers["x-user-id"];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User gak valid, Bre!",
        });
      }

      const { page = 1, limit = 10 } = req.query;

      const notifications = await Notification.find({
        user: userId,
      })
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Notification.countDocuments({ user: userId });

      return res.json({
        success: true,
        data: notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      });
    } catch (error: any) {
      logger.error(`GetNotif Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Gagal ambil notif, Bre!",
      });
    }
  }

  static async sendNotification(req: Request, res: Response) {
    try {
      const { userId, title, body, data } = req.body;

      if (!userId || !title || !body) {
        return res.status(400).json({
          success: false,
          error: "Field wajib kurang, Bre!",
        });
      }

      const notif = await NotificationService.sendToUser(
        userId,
        title,
        body,
        data,
      );

      return res.json({
        success: true,
        data: notif,
      });
    } catch (error: any) {
      logger.error(`SendNotif Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Gagal kirim notif, Bre!",
      });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await Notification.findByIdAndUpdate(id, {
        status: "read",
        readAt: new Date(),
      });

      return res.json({
        success: true,
        message: "Notif udah dibaca, Bre!",
      });
    } catch (error: any) {
      logger.error(`ReadNotif Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Gagal update notif",
      });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.headers["x-user-id"];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User gak valid, Bre!",
        });
      }

      await Notification.updateMany(
        { user: userId, status: { $ne: "read" } },
        {
          status: "read",
          readAt: new Date(),
        },
      );

      return res.json({
        success: true,
        message: "Semua notif udah dibaca",
      });
    } catch (error: any) {
      logger.error(`ReadAllNotif Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Gagal update semua notif",
      });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await Notification.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: "Notif dihapus",
      });
    } catch (error: any) {
      logger.error(`DeleteNotif Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Gagal hapus notif",
      });
    }
  }
}