import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";
import { positiveInt } from "./loginRateLimit.ts";

export interface RegisterRateLimitOptions {
  max?: number;
  windowMs?: number;
}

export const DEFAULT_REGISTER_RATE_LIMIT_MAX = 10;
export const DEFAULT_REGISTER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Counts every request (successful sign-ups too): each one writes a row and costs a bcrypt hash.
export function createRegisterRateLimiter(
  options: RegisterRateLimitOptions = {},
): RequestHandler {
  return rateLimit({
    limit:
      options.max ??
      positiveInt(process.env.REGISTER_RATE_LIMIT_MAX, DEFAULT_REGISTER_RATE_LIMIT_MAX),
    windowMs:
      options.windowMs ??
      positiveInt(
        process.env.REGISTER_RATE_LIMIT_WINDOW_MS,
        DEFAULT_REGISTER_RATE_LIMIT_WINDOW_MS,
      ),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many registration attempts, please try again later",
      });
    },
  });
}
