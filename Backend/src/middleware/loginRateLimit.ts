import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

export interface LoginRateLimitOptions {
  max?: number;
  windowMs?: number;
}

export const DEFAULT_LOGIN_RATE_LIMIT_MAX = 10;
export const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createLoginRateLimiter(options: LoginRateLimitOptions = {}): RequestHandler {
  return rateLimit({
    limit:
      options.max ??
      positiveInt(process.env.LOGIN_RATE_LIMIT_MAX, DEFAULT_LOGIN_RATE_LIMIT_MAX),
    windowMs:
      options.windowMs ??
      positiveInt(
        process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
        DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS,
      ),
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many login attempts, please try again later",
      });
    },
  });
}
