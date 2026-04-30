// src/utils/logger.ts

import pino from "pino";

export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname", // Biar nggak nyampah di terminal
    },
  },
  // Level log: info, error, warn, debug
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
});
