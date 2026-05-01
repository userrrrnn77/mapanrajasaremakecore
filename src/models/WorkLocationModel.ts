import mongoose, { Document, Model } from "mongoose";

/**
 * 🔥 TYPE DEFINITIONS
 */
export const WORK_ROLES = [
  "security",
  "cleaning_service",
  "customer_service",
  "gardener",
  "street",
] as const;

export type WorkRole = (typeof WORK_ROLES)[number];

interface ShiftTime {
  hour: number;
  minute: number;
  endHour: number;
  endMinute: number;
}

interface ShiftGroup {
  pagi: ShiftTime;
  siang: ShiftTime;
  malam: ShiftTime;
}

export interface IWorkLocation extends Document {
  code: string;
  role: WorkRole;

  name: string;

  center: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  radiusMeter: number;
  isActive: boolean;

  shiftConfigs: {
    weekday: ShiftGroup;
    weekend: ShiftGroup;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 🔥 HELPER (biar gak duplikat)
 */
const createShift = (
  startH: number,
  startM: number,
  endH: number,
  endM: number,
): ShiftTime => ({
  hour: startH,
  minute: startM,
  endHour: endH,
  endMinute: endM,
});

/**
 * 🔥 SCHEMA
 */
const WorkLocationSchema = new mongoose.Schema<IWorkLocation>(
  {
    code: {
      type: String,
      required: [true, "Kode lokasi wajib diisi"],
      trim: true,
      uppercase: true,
    },

    role: {
      type: String,
      required: true,
      enum: WORK_ROLES,
    },

    name: {
      type: String,
      required: [true, "Nama lokasi wajib diisi"],
      trim: true,
    },

    /**
     * 🔥 GEOJSON (WAJIB kalau mau radius query proper)
     */
    center: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    radiusMeter: {
      type: Number,
      required: true,
      default: 100,
      min: 10,
      max: 10000,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    shiftConfigs: {
      weekday: {
        pagi: {
          type: Object,
          default: () => createShift(6, 0, 14, 0),
        },
        siang: {
          type: Object,
          default: () => createShift(11, 0, 19, 0),
        },
        malam: {
          type: Object,
          default: () => createShift(22, 0, 6, 0),
        },
      },
      weekend: {
        pagi: {
          type: Object,
          default: () => createShift(7, 0, 12, 0),
        },
        siang: {
          type: Object,
          default: () => createShift(12, 0, 17, 0),
        },
        malam: {
          type: Object,
          default: () => createShift(22, 0, 6, 0),
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

/**
 * 🔥 INDEXES (PENTING)
 */
WorkLocationSchema.index({ code: 1, role: 1 }, { unique: true });

// 🔥 GEO INDEX (WAJIB buat radius check)
WorkLocationSchema.index({ center: "2dsphere" });

/**
 * 🔥 STATIC METHOD (BIAR GAK NULIS LOGIC DI SERVICE TERUS)
 */
WorkLocationSchema.statics.findNearby = function (
  lng: number,
  lat: number,
  radius: number,
) {
  return this.find({
    isActive: true,
    center: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radius,
      },
    },
  });
};

export interface WorkLocationModel extends Model<IWorkLocation> {
  findNearby(
    lng: number,
    lat: number,
    radius: number,
  ): Promise<IWorkLocation[]>;
}

/**
 * 🔥 EXPORT
 */
const WorkLocation =
  (mongoose.models.WorkLocation as WorkLocationModel) ||
  mongoose.model<IWorkLocation, WorkLocationModel>(
    "WorkLocation",
    WorkLocationSchema,
  );

export default WorkLocation;
