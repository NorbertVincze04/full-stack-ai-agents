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

export interface BookingService {
  book(userId: string, date: string): Promise<{ date: string }>;
  withdraw(userId: string, date: string): Promise<void>;
  listMine(userId: string): Promise<Array<{ date: string }>>;
}

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

export function createBookingService(
  repository: BookingRepository,
  now: () => Date = () => new Date(),
): BookingService {
  return {
    async book(userId, date) {
      if (!bookableDates(now()).includes(date)) {
        throw new InvalidBookingDateError();
      }
      try {
        return await repository.create(userId, date);
      } catch (err) {
        const code = (err as { code?: unknown } | null)?.code;
        if (code === PG_UNIQUE_VIOLATION) {
          throw new BookingAlreadyExistsError();
        }
        if (code === PG_FOREIGN_KEY_VIOLATION) {
          throw new UnknownUserError();
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
      const dates = await repository.listByUser(userId, toDateString(now()));
      return dates.map((date) => ({ date }));
    },
  };
}
