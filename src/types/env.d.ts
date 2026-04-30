// src/types/env.d.ts

declare namespace NodeJS {
  interface ProcessEnv {
    CLOUDINARY_URL: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    GROQ_API_KEY: string;
    MONGO_URI: string;
    PORT: string;
    JWT_SECRET: string;
    NODE_ENV: "development" | "production";
    GROQ_MODEL: string;
    BEAMS_INSTANCE_ID: string;
    BEAMS_SECRET_KEY: string;
    GROQ_URL: string;
  }
}
