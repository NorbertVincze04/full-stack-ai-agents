import type { BookingRepository } from "../repositories/bookingRepository.ts";
import { bookableDates, toDateString } from "./bookingDates.ts";

export class InvalidBookingDateError extends Error {
  constructor() {
    super("Date is not bookable");
    this.name = "InvalidBookingDateError";
  }
}

export class BookingAlreadyExistsError extends Error {
  constructor() {
    super("Booking already exists");
    this.name = "BookingAlreadyExistsError";
  }
}

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

// The token's user no longer exists (FK violation).
export class UnknownUserError extends Error {
  constructor() {
    super("Unknown user");
    this.name = "UnknownUserError";
  }
}

export class UnknownDeskError extends Error {
  constructor() {
    super("Unknown desk");
    this.name = "UnknownDeskError";
  }
}

export class DeskAlreadyBookedError extends Error {
  constructor() {
    super("Desk already booked");
    this.name = "DeskAlreadyBookedError";
  }
}

export interface BookingService {
  book(userId: string, date: string, desk: string): Promise<{ date: string; desk: string }>;
  withdraw(userId: string, date: string): Promise<void>;
  listMine(userId: string): Promise<Array<{ date: string; desk: string | null }>>;
}

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
// Constraint names from the desks migrations.
const DESK_UNIQUE_INDEX = "ux_bookings_date_desk";
const DESK_FOREIGN_KEY = "bookings_booking_desk_fkey";

export function createBookingService(
  repository: BookingRepository,
  now: () => Date = () => new Date(),
): BookingService {
  return {
    async book(userId, date, desk) {
      if (!bookableDates(now()).includes(date)) {
        throw new InvalidBookingDateError();
      }
      try {
        return await repository.create(userId, date, desk);
      } catch (err) {
        const { code, constraint } = (err ?? {}) as { code?: unknown; constraint?: unknown };
        if (code === PG_UNIQUE_VIOLATION) {
          throw constraint === DESK_UNIQUE_INDEX
            ? new DeskAlreadyBookedError()
            : new BookingAlreadyExistsError();
        }
        if (code === PG_FOREIGN_KEY_VIOLATION) {
          throw constraint === DESK_FOREIGN_KEY ? new UnknownDeskError() : new UnknownUserError();
        }
        throw err;
      }
    },
    async withdraw(userId, date) {
      if (!(await repository.delete(userId, date))) {
        throw new BookingNotFoundError();
      }
    },
    async listMine(userId) {
      return repository.listByUser(userId, toDateString(now()));
    },
  };
}
