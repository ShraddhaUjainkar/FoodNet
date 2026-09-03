import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import apiRouter from "./routes/api.routes.js";
import { logger } from "./config/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security and routing configurations
app.use(helmet());

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
).split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "6mb" })); // Match image size limits + metadata buffer

// Mount version 1 endpoints
app.use("/api/v1", apiRouter);

// Base health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "foodnet-backend",
  });
});

// Global Error Handler Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled request error caught");

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production" && statusCode === 500
          ? "An unexpected error occurred."
          : message,
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FoodNet Standalone Backend listening on port ${PORT}`);
});
