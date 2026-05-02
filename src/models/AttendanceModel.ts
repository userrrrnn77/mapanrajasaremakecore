import mongoose, { Document, Model } from "mongoose";

/**
 * 🔥 CONST
 */
export const ATTENDANCE_TYPE = ["masuk", "keluar", "sakit"] as const;
export const ATTENDANCE_STATUS = [
  "tepat_waktu",
  "terlambat",
  "lembur",
  "sakit",
  "izin",
] as const;

export const SHIFTS = ["pagi", "siang", "malam"] as const;

type AttendanceType = (typeof ATTENDANCE_TYPE)[number];
type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];
type ShiftType = (typeof SHIFTS)[number];

/**
 * 🔥 INTERFACE
 */
export interface IAttendance extends Document {
  user: mongoose.Types.ObjectId;

  attendanceDayKey: string;

  type: AttendanceType;
  status: AttendanceStatus;

  shift?: ShiftType;

  checkIn?: Date;
  checkOut?: Date;

  isIncomplete: boolean;

  workLocation?: mongoose.Types.ObjectId;

  locationSnapshot?: {
    name?: string;
    radiusMeter?: number;

    center?: {
      lat: number;
      lng: number;
    };

    shiftType?: ShiftType;
    shiftStartHour?: number;
    shiftStartMinute?: number;
  };

  photo: {
    url: string;
    publicId: string;
  };

  location: {
    type: "Point";
    coordinates: [number, number];
  };

  distanceFromCenter?: number;

  lateMinutes: number;
  penalty: number;

  note: string;

  isOvertime: boolean;

  kategori: string;

  /**
   * 🔥 BACKUP SYSTEM
   */
  isBackup: boolean;
  backupFor?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 🔥 SCHEMA
 */
const AttendanceSchema = new mongoose.Schema<IAttendance>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendanceDayKey: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ATTENDANCE_TYPE,
      required: true,
    },

    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      default: "tepat_waktu",
      index: true,
    },

    shift: {
      type: String,
      enum: SHIFTS,
      required: function (this: IAttendance) {
        return this.type !== "sakit";
      },
      index: true,
    },

    checkIn: Date,
    checkOut: Date,

    isIncomplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    workLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLocation",
      required: function (this: IAttendance) {
        return this.type !== "sakit";
      },
      index: true,
    },

    locationSnapshot: {
      name: String,
      radiusMeter: Number,
      center: {
        lat: Number,
        lng: Number,
      },
      shiftType: {
        type: String,
        enum: SHIFTS,
      },
      shiftStartHour: Number,
      shiftStartMinute: Number,
    },

    photo: {
      type: {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
          index: true,
        },
      },
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90,
          message: "Coordinates harus [lng, lat]",
        },
      },
      required: true,
    },

    distanceFromCenter: {
      type: Number,
      min: 0,
    },

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    penalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    isOvertime: {
      type: Boolean,
      default: false,
    },

    kategori: {
      type: String,
      default: "ABSENSI",
    },

    /**
     * 🔥 BACKUP
     */
    isBackup: {
      type: Boolean,
      default: false,
      index: true,
    },

    backupFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * 🔥 INDEX (UPDATED)
 */

// ✅ multi shift per hari
AttendanceSchema.index(
  { user: 1, attendanceDayKey: 1, type: 1, shift: 1 },
  { unique: true },
);

// ✅ 1 active session per shift
AttendanceSchema.index(
  { user: 1, shift: 1, isIncomplete: 1 },
  {
    unique: true,
    partialFilterExpression: { isIncomplete: true },
  },
);

// ✅ prevent double backup
AttendanceSchema.index(
  { backupFor: 1, attendanceDayKey: 1, shift: 1 },
  {
    unique: true,
    partialFilterExpression: { isBackup: true },
  },
);

AttendanceSchema.index({ location: "2dsphere" });
AttendanceSchema.index({ createdAt: -1 });

/**
 * 🔥 STATIC
 */
export interface AttendanceModel extends Model<IAttendance> {
  findToday(userId: string, dayKey: string): Promise<IAttendance[]>;
}

AttendanceSchema.statics.findToday = function (userId: string, dayKey: string) {
  return this.find({
    user: userId,
    attendanceDayKey: dayKey,
  });
};

/**
 * 🔥 PRE SAVE LOGIC
 */
AttendanceSchema.pre("save", function () {
  // 🔥 masuk
  if (this.type === "masuk") {
    this.isIncomplete = !this.checkOut;

    if (!this.checkIn) {
      throw new Error("CheckIn wajib untuk type masuk");
    }
  }

  // 🔥 keluar
  if (this.type === "keluar") {
    this.isIncomplete = false;

    if (!this.checkOut) {
      throw new Error("CheckOut wajib ada");
    }
  }

  // 🔥 validasi waktu
  if (this.checkIn && this.checkOut && this.checkOut < this.checkIn) {
    throw new Error("CheckOut tidak boleh sebelum CheckIn");
  }

  // 🔥 auto late
  if (this.checkIn && this.locationSnapshot?.shiftStartHour !== undefined) {
    const shiftStart = new Date(this.checkIn);
    shiftStart.setHours(
      this.locationSnapshot.shiftStartHour,
      this.locationSnapshot.shiftStartMinute || 0,
      0,
      0,
    );

    const diff = (this.checkIn.getTime() - shiftStart.getTime()) / 60000;

    if (diff > 0 && this.status === "tepat_waktu") {
      this.lateMinutes = Math.floor(diff);
      this.status = "terlambat";
    }
  }
});

/**
 * 🔥 MODEL EXPORT
 */
const Attendance =
  (mongoose.models.Attendance as AttendanceModel) ||
  mongoose.model<IAttendance, AttendanceModel>("Attendance", AttendanceSchema);

export default Attendance;
