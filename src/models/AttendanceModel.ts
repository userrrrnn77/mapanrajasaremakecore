import mongoose, { Document, Model } from "mongoose";

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

export interface IAttendance extends Document {
  user: mongoose.Types.ObjectId;

  attendanceDayKey: string;

  type: AttendanceType;
  status: AttendanceStatus;

  checkIn?: Date;
  checkOut?: Date;

  isIncomplete: boolean;

  shift?: ShiftType;

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

  backupUser?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

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

    checkIn: Date,
    checkOut: Date,

    isIncomplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    shift: {
      type: String,
      enum: SHIFTS,
      required: function (this: IAttendance) {
        return this.type !== "sakit";
      },
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
            typeof v[0] === "number" &&
            typeof v[1] === "number" &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90,
          message: "Coordinates harus [lng(-180..180), lat(-90..90)]",
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

    backupUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

AttendanceSchema.index(
  { user: 1, attendanceDayKey: 1, type: 1 },
  { unique: true },
);

AttendanceSchema.index(
  { user: 1, isIncomplete: 1 },
  {
    unique: true,
    partialFilterExpression: { isIncomplete: true },
  },
);

AttendanceSchema.index({ createdAt: -1 });
AttendanceSchema.index({ user: 1, createdAt: -1 });

AttendanceSchema.index({ location: "2dsphere" });

export interface AttendanceModel extends Model<IAttendance> {
  findToday(userId: string, dayKey: string): Promise<IAttendance[]>;
}

AttendanceSchema.statics.findToday = function (userId: string, dayKey: string) {
  return this.find({
    user: userId,
    attendanceDayKey: dayKey,
  });
};

AttendanceSchema.pre("save", function () {
  if (this.type === "masuk") {
    this.isIncomplete = !this.checkOut;
  }

  if (this.type === "keluar") {
    this.isIncomplete = false;

    if (!this.checkOut) {
      throw new Error("CheckOut wajib ada untuk type keluar");
    }
  }

  if (this.type === "masuk" && !this.checkIn) {
    throw new Error("CheckIn wajib untuk type masuk");
  }

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

  if (this.checkIn && this.checkOut) {
    if (this.checkOut < this.checkIn) {
      throw new Error("CheckOut tidak boleh sebelum CheckIn");
    }
  }
});

const Attendance =
  (mongoose.models.Attendance as AttendanceModel) ||
  mongoose.model<IAttendance, AttendanceModel>("Attendance", AttendanceSchema);

export default Attendance;
