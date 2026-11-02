import { Router } from "express";
import type { RequestHandler } from "express";
import type { createAuthController } from "../controllers/authController.ts";

export function createAuthRouter(
  controller: ReturnType<typeof createAuthController>,
  loginRateLimiter: RequestHandler,
): Router {
  const router = Router();
  router.post("/login", loginRateLimiter, controller.login);
  return router;
}
