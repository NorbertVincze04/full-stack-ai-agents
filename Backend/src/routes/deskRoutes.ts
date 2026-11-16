import { Router } from "express";
import type { RequestHandler } from "express";
import type { createDeskController } from "../controllers/deskController.ts";

export function createDeskRouter(
  controller: ReturnType<typeof createDeskController>,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/availability", authenticate, controller.availability);
  return router;
}
