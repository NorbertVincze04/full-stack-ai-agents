import cors from "cors";
import express from "express";
import type { Express } from "express";
import { createAuthController } from "./controllers/authController.ts";
import { createHealthController } from "./controllers/healthController.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { createLoginRateLimiter } from "./middleware/loginRateLimit.ts";
import type { LoginRateLimitOptions } from "./middleware/loginRateLimit.ts";
import {
  createHealthRepository,
  unconfiguredHealthRepository,
} from "./repositories/healthRepository.ts";
import { unconfiguredUserRepository } from "./repositories/userRepository.ts";
import type { Queryable, UserRepository } from "./repositories/userRepository.ts";
import { createAuthRouter } from "./routes/authRoutes.ts";
import { createHealthRouter } from "./routes/healthRoutes.ts";
import { createAuthService } from "./services/authService.ts";
import { createHealthService } from "./services/healthService.ts";

export interface AppOptions {
  userRepository?: UserRepository;
  loginRateLimit?: LoginRateLimitOptions;
  dbProbe?: Queryable;
  healthTimeoutMs?: number;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:4200";
  if (corsOrigin === "*" && process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGIN=* is not allowed when NODE_ENV=production");
  }
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  const authService = createAuthService(
    options.userRepository ?? unconfiguredUserRepository,
  );
  app.use(
    "/api/auth",
    createAuthRouter(
      createAuthController(authService),
      createLoginRateLimiter(options.loginRateLimit),
    ),
  );

  const healthService = createHealthService(
    options.dbProbe
      ? createHealthRepository(options.dbProbe)
      : unconfiguredHealthRepository,
    options.healthTimeoutMs,
  );
  app.use("/api/health", createHealthRouter(createHealthController(healthService)));

  app.use(errorHandler);

  return app;
}
