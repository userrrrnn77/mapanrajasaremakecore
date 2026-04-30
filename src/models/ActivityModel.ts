import mongoose, { Document, Model } from "mongoose";

/**
 * 🔥 SUBDOCUMENT TYPE
 */
interface ActivityDocumentation {
  photo: {
    url: string;
    publicId: string;
  };
  caption: string;
}

/**
 * 🔥 MAIN INTERFACE
 */
export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;

  title: string;

  documentation: ActivityDocumentation[];

  /**
   * 🔥 GEOJSON (biar konsisten sama Report & WorkLocation)
   */
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  address?: string;

  activityTime: Date;

  /**
   * 🔥 future-proof
   */
  metadata?: {
    source?: "mobile" | "web";
  };

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 🔥 SUB SCHEMA
 */
const DocumentationSchema = new mongoose.Schema<ActivityDocumentation>(
  {
    photo: {
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
    caption: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false },
);

/**
 * 🔥 MAIN SCHEMA
 */
const ActivitySchema = new mongoose.Schema<IActivity>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Judul kegiatan wajib diisi, Bre!"],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    documentation: {
      type: [DocumentationSchema],
      validate: {
        validator: (v: ActivityDocumentation[]) => v.length <= 10,
        message: "Maksimal 10 foto dokumentasi aja, Bre!",
      },
      default: [],
    },

    /**
     * 🔥 GEOJSON
     */
    location: {
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

    address: {
      type: String,
      trim: true,
    },

    activityTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    metadata: {
      source: {
        type: String,
        enum: ["mobile", "web"],
        default: "mobile",
      },
    },
  },
  {
    timestamps: true,
  },
);

/**
 * 🔥 INDEXES
 */
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ activityTime: -1 });

// 🔥 GEO INDEX
ActivitySchema.index({ location: "2dsphere" });

/**
 * 🔥 STATIC METHODS
 */
export interface ActivityModel extends Model<IActivity> {
  findNearby(lng: number, lat: number, radius: number): Promise<IActivity[]>;
}

ActivitySchema.statics.findNearby = function (
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

/**
 * 🔥 EXPORT
 */
const Activity =
  (mongoose.models.Activity as ActivityModel) ||
  mongoose.model<IActivity, ActivityModel>("Activity", ActivitySchema);

export default Activity;
