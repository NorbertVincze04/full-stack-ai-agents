import { Router } from "express";
import type { RequestHandler } from "express";
import type { createAuthController } from "../controllers/authController.ts";

export function createAuthRouter(
  controller: ReturnType<typeof createAuthController>,
  loginRateLimiter: RequestHandler,
  registerRateLimiter: RequestHandler,
): Router {
  const router = Router();
  router.post("/login", loginRateLimiter, controller.login);
  router.post("/register", registerRateLimiter, controller.register);
  return router;
}
