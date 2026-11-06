import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../middleware/authenticate.ts";
import { isValidDateString } from "../services/bookingDates.ts";
import {
  BookingAlreadyExistsError,
  BookingNotFoundError,
  InvalidBookingDateError,
  UnknownUserError,
} from "../services/bookingService.ts";
import type { BookingService } from "../services/bookingService.ts";

function validationFailed(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: [{ field: "date", message }],
  });
}

function unauthorized(res: Response): void {
  res.status(401).json({ success: false, message: "Authentication required" });
}

export function createBookingController(service: BookingService) {
  return {
    async create(req: Request, res: Response): Promise<void> {
      const user = res.locals.user as AuthenticatedUser;
      const date = (req.body as { date?: unknown } | undefined)?.date;
      if (typeof date !== "string" || !isValidDateString(date)) {
        validationFailed(res, "date is required and must be a valid date in YYYY-MM-DD format");
        return;
      }
      try {
        const booking = await service.book(user.id, date);
        res.status(201).json({ success: true, payload: { booking } });
      } catch (err) {
        if (err instanceof InvalidBookingDateError) {
          validationFailed(res, "date must be one of the 4 bookable weekdays starting today");
          return;
        }
        if (err instanceof BookingAlreadyExistsError) {
          res.status(409).json({ success: false, message: "Booking already exists" });
          return;
        }
        if (err instanceof UnknownUserError) {
          unauthorized(res);
          return;
        }
        throw err;
      }
    },

    async remove(req: Request, res: Response): Promise<void> {
      const user = res.locals.user as AuthenticatedUser;
      const date = req.params.date;
      if (typeof date !== "string" || !isValidDateString(date)) {
        validationFailed(res, "date must be a valid date in YYYY-MM-DD format");
        return;
      }
      try {
        await service.withdraw(user.id, date);
        res.status(200).json({ success: true });
      } catch (err) {
        if (err instanceof BookingNotFoundError) {
          res.status(404).json({ success: false, message: "Booking not found" });
          return;
        }
        throw err;
      }
    },

    async mine(_req: Request, res: Response): Promise<void> {
      const user = res.locals.user as AuthenticatedUser;
      const bookings = await service.listMine(user.id);
      res.status(200).json({ success: true, payload: { bookings } });
    },
  };
}
