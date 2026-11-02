import type { Request, Response } from "express";
import type { HealthService } from "../services/healthService.ts";

export function createHealthController(healthService: HealthService) {
  return {
    async check(_req: Request, res: Response): Promise<void> {
      if (await healthService.isDatabaseUp()) {
        res.status(200).json({ success: true, payload: { status: "ok" } });
        return;
      }
      // Fixed text on purpose: driver errors can contain host names or addresses.
      console.error("Health check failed: database unavailable");
      res.status(503).json({ success: false, message: "Database unavailable" });
    },
  };
}
