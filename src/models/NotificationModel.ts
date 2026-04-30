import mongoose, { Document, Model } from "mongoose";

/**
 * 🔥 ENUM
 */
export const NOTIF_TYPE = [
  "attendance",
  "report",
  "activity",
  "system",
] as const;

export const NOTIF_STATUS = [
  "pending",
  "sent",
  "failed",
  "read",
] as const;

type NotifType = (typeof NOTIF_TYPE)[number];
type NotifStatus = (typeof NOTIF_STATUS)[number];

/**
 * 🔥 INTERFACE
 */
export interface INotification extends Document {
  user: mongoose.Types.ObjectId;

  title: string;
  body: string;

  type: NotifType;

  data?: Record<string, any>;

  status: NotifStatus;

  error?: string;

  sentAt?: Date;
  readAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 🔥 SCHEMA
 */
const NotificationSchema = new mongoose.Schema<INotification>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: NOTIF_TYPE,
      default: "system",
      index: true,
    },

    data: {
      type: Object,
      default: {},
    },

    status: {
      type: String,
      enum: NOTIF_STATUS,
      default: "pending",
      index: true,
    },

    error: String,

    sentAt: Date,
    readAt: Date,
  },
  {
    timestamps: true,
  },
);

/**
 * 🔥 INDEX
 */
NotificationSchema.index({ user: 1, createdAt: -1 });

/**
 * 🔥 STATIC METHOD
 */
export interface NotificationModel extends Model<INotification> {
  markAsRead(id: string): Promise<void>;
}

NotificationSchema.statics.markAsRead = async function (id: string) {
  await this.findByIdAndUpdate(id, {
    status: "read",
    readAt: new Date(),
  });
};

/**
 * 🔥 EXPORT
 */
const Notification =
  (mongoose.models.Notification as NotificationModel) ||
  mongoose.model<INotification, NotificationModel>(
    "Notification",
    NotificationSchema,
  );

export default Notification;