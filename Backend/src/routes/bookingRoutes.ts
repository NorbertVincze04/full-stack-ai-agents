import { Router } from "express";
import type { RequestHandler } from "express";
import type { createBookingController } from "../controllers/bookingController.ts";

export function createBookingRouter(
  controller: ReturnType<typeof createBookingController>,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.post("/", controller.create);
  router.get("/mine", controller.mine);
  router.delete("/:date", controller.remove);
  return router;
}
