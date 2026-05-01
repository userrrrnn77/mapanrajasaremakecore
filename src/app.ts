import express, {
  type NextFunction,
  type Response,
  type Request,
} from "express";
import mainRoutes from "./routes/_routes.js";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { AuthRequest } from "./middlewares/authMiddleware.js";

const app = express();

app.set("trust proxy", 1);

app.use(morgan("dev"));

app.use(helmet());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

app.options("*", (req: Request, res: Response) => {
  res.status(204).end();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", mainRoutes);

app.use((req: AuthRequest, res: Response) => {
  return res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} Tidak Ditemukan, jangan ngasal bre!`,
  });
});

// ❌ Global Error Handler
app.use((err: unknown, req: AuthRequest, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    console.error("🚨 SERVER ERROR:", err.stack);
    return res.status(500).json({
      success: false,
      message: `Terjadi Kesalahan Pada Internal Server`,
      error: process.env.NODE_ENV === "development" ? err.message : null,
    });
  }

  console.error("🚨 GHOIB ERROR:", err);
  return res.status(500).json({
    success: false,
    message: "Anjir, ada error ghoib bre!",
    error: process.env.NODE_ENV === "development" ? err : null,
  });
});

export default app;
