import type { Request, Response } from "express";
import { isValidDateString } from "../services/bookingDates.ts";
import { InvalidBookingDateError } from "../services/bookingService.ts";
import type { DeskService } from "../services/deskService.ts";

function validationFailed(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: [{ field: "date", message }],
  });
}

export function createDeskController(service: DeskService) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      const desks = await service.list();
      res.status(200).json({ success: true, payload: { desks } });
    },

    async availability(req: Request, res: Response): Promise<void> {
      const date = req.query.date;
      if (typeof date !== "string" || !isValidDateString(date)) {
        validationFailed(res, "date is required and must be a valid date in YYYY-MM-DD format");
        return;
      }
      try {
        const desks = await service.availability(date);
        res.status(200).json({ success: true, payload: { desks } });
      } catch (err) {
        if (err instanceof InvalidBookingDateError) {
          validationFailed(res, "date must be one of the 4 bookable weekdays starting today");
          return;
        }
        throw err;
      }
    },
  };
}
