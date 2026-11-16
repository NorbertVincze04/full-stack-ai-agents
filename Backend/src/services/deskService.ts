import type { Desk, DeskAvailability, DeskRepository } from "../repositories/deskRepository.ts";
import { bookableDates } from "./bookingDates.ts";
import { InvalidBookingDateError } from "./bookingService.ts";

export interface DeskService {
  list(): Promise<Desk[]>;
  availability(date: string): Promise<DeskAvailability[]>;
}

export function createDeskService(
  repository: DeskRepository,
  now: () => Date = () => new Date(),
): DeskService {
  return {
    list: () => repository.list(),
    async availability(date) {
      if (!bookableDates(now()).includes(date)) {
        throw new InvalidBookingDateError();
      }
      return repository.availability(date);
    },
  };
}
