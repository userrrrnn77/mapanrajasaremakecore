import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * 🔥 ENUM (BIAR GAK NGACO)
 */
export const USER_ROLES = [
  "admin",
  "security",
  "cleaning_service",
  "customer_service",
  "gardener",
  "street",
] as const;

export const SHIFTS = ["pagi", "siang", "malam"] as const;

type Role = (typeof USER_ROLES)[number];
type Shift = (typeof SHIFTS)[number];

/**
 * 🔥 INTERFACE
 */
export interface IUser extends Document {
  username: string;
  password: string;
  fullname: string;
  phone: string;

  role: Role;
  shift: Shift;

  profilePhoto: {
    url: string;
    publicId: string;
  };

  assignedWorkLocations: mongoose.Types.ObjectId[];

  isVerified: boolean;
  status: "active" | "inactive";

  basicSalary: number;

  bpjsKesehatan: boolean;
  bpjsKetenagakerjaan: boolean;

  lastLogin?: Date;

  createdAt?: Date;
  updatedAt?: Date;

  comparePassword(password: string): Promise<boolean>;
}

/**
 * 🔥 SCHEMA
 */
const UserSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10,15}$/,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "cleaning_service",
      index: true,
    },

    shift: {
      type: String,
      enum: SHIFTS,
      default: "pagi",
    },

    profilePhoto: {
      type: {
        url: {
          type: String,
          default: "",
        },
        publicId: {
          type: String,
          default: "",
        },
      },
      default: {
        url: "",
        publicId: "",
      },
    },

    assignedWorkLocations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkLocation",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    basicSalary: {
      type: Number,
      default: 3701709,
      min: 0,
    },

    bpjsKesehatan: {
      type: Boolean,
      default: true,
    },

    bpjsKetenagakerjaan: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "users",

    toJSON: {
      transform: (_doc, ret: Partial<IUser>) => {
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  },
);

/**
 * 🔥 INDEXES (PENTING BANGET)
 */
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });

/**
 * 🔐 HASH PASSWORD
 */
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * 🔐 COMPARE PASSWORD
 */
UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

/**
 * ⚠️ FIX: UPDATE PASSWORD via findOneAndUpdate
 */
UserSchema.pre("findOneAndUpdate", async function () {
  const update: any = this.getUpdate();

  if (update?.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
});

/**
 * 🔥 EXPORT
 */
const User =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
