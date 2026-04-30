import mongoose, { Document, Model } from "mongoose";

/**
 * 🔥 ENUMS
 */
export const REPORT_STATUS = [
  "open",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type ReportStatus = (typeof REPORT_STATUS)[number];

/**
 * 🔥 INTERFACE
 */
export interface IReport extends Document {
  user: mongoose.Types.ObjectId;

  description: string;

  photos: string[];

  /**
   * 🔥 GEOJSON (biar bisa map + radius query)
   */
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  address?: string;

  reportTime: Date;

  status: ReportStatus;

  /**
   * 🔥 optional future fields
   */
  metadata?: {
    source?: "mobile" | "web" | "system";
    priority?: "low" | "medium" | "high";
  };

  resolvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 🔥 SCHEMA
 */
const ReportSchema = new mongoose.Schema<IReport>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },

    photos: {
      type: [String],
      default: [],
    },

    /**
     * 🔥 GEO LOCATION
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },

    address: {
      type: String,
      trim: true,
    },

    reportTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    status: {
      type: String,
      enum: REPORT_STATUS,
      default: "open",
      index: true,
    },

    metadata: {
      source: {
        type: String,
        enum: ["mobile", "web", "system"],
        default: "mobile",
      },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * 🔥 INDEXES
 */
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ user: 1, createdAt: -1 });

// 🔥 GEO INDEX (WAJIB kalau pakai map)
ReportSchema.index({ location: "2dsphere" });

/**
 * 🔥 STATIC METHODS (BIAR GAK NULIS QUERY TERUS)
 */
export interface ReportModel extends Model<IReport> {
  findNearby(lng: number, lat: number, radius: number): Promise<IReport[]>;

  findOpenReports(): Promise<IReport[]>;
}

ReportSchema.statics.findNearby = function (
  lng: number,
  lat: number,
  radius: number,
) {
  return this.find({
    location: {
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

ReportSchema.statics.findOpenReports = function () {
  return this.find({ status: "open" }).sort({ createdAt: -1 });
};

/**
 * 🔥 MIDDLEWARE (AUTO HANDLE RESOLVED)
 */
ReportSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "resolved") {
    this.resolvedAt = new Date();
  }
});

/**
 * 🔥 EXPORT
 */
const Report =
  (mongoose.models.Report as ReportModel) ||
  mongoose.model<IReport, ReportModel>("Report", ReportSchema);

export default Report;
