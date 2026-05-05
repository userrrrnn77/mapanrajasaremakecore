// src/config/db.ts

import mongoose, { Mongoose } from "mongoose";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI;

declare global {
  var mongoose:
    | { conn: Mongoose | null; promise: Promise<Mongoose> | null }
    | undefined;
}

if (!MONGO_URI) {
  throw new Error("MONGO_URI tidak ditemukan di environment variables");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      socketTimeoutMS: 30000,
    };

    cached.promise = mongoose.connect(MONGO_URI, options).then((conn) => {
      console.log("✅ MongoDB Connected, Bre!");
      console.log("✅ MongoDB Connected & Ready");

      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error("❌ DB Connection Error:", (error as Error).message);
    throw error;
  }
};

export default connectDB;
