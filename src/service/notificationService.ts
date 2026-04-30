import Notification from "../models/NotificationModel.js";
import { beamsClient } from "../config/pusher.js";

export class NotificationService {
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ) {
    // 1. simpan dulu ke DB
    const notif = await Notification.create({
      user: userId,
      title,
      body,
      data,
    });

    try {
      // 2. kirim ke pusher
      await beamsClient.publishToUsers([userId], {
        web: {
          notification: {
            title,
            body,
          },
        },
      });

      // 3. update status
      notif.status = "sent";
      notif.sentAt = new Date();
      await notif.save();
    } catch (error: any) {
      notif.status = "failed";
      notif.error = error.message;
      await notif.save();
    }

    return notif;
  }
}
