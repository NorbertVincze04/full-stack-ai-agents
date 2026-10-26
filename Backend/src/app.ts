import cors from "cors";
import express from "express";
import type { Express } from "express";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:4200" }));
  app.use(express.json());

  return app;
}
