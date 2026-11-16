import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BookingRepository } from "../src/repositories/bookingRepository.ts";
import {
  BookingAlreadyExistsError,
  BookingNotFoundError,
  DeskAlreadyBookedError,
  InvalidBookingDateError,
  UnknownDeskError,
  UnknownUserError,
  createBookingService,
} from "../src/services/bookingService.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date(2026, 10, 6, 12, 0); // Friday 2026-11-06

function fakeRepo(overrides: Partial<BookingRepository> = {}) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const repo: BookingRepository = {
    async create(userId, date, desk) {
      calls.push({ op: "create", args: [userId, date, desk] });
      return { date, desk };
    },
    async delete(userId, date) {
      calls.push({ op: "delete", args: [userId, date] });
      return true;
    },
    async listByUser(userId, from) {
      calls.push({ op: "list", args: [userId, from] });
      return [
        { date: "2026-11-06", desk: "D01" },
        { date: "2026-11-09", desk: null },
      ];
    },
    ...overrides,
  };
  return { repo, calls };
}

describe("bookingService.book", () => {
  it("stores a bookable date and desk for the user", async () => {
    const { repo, calls } = fakeRepo();
    const svc = createBookingService(repo, () => NOW);
    assert.deepEqual(await svc.book(USER, "2026-11-09", "D03"), { date: "2026-11-09", desk: "D03" });
    assert.deepEqual(calls, [{ op: "create", args: [USER, "2026-11-09", "D03"] }]);
  });

  it("accepts today and the last day of the window", async () => {
    const { repo } = fakeRepo();
    const svc = createBookingService(repo, () => NOW);
    await svc.book(USER, "2026-11-06", "D01");
    await svc.book(USER, "2026-11-11", "D01");
  });

  for (const [label, date] of [
    ["past date", "2026-11-05"],
    ["Saturday", "2026-11-07"],
    ["Sunday", "2026-11-08"],
    ["first day after the window", "2026-11-12"],
    ["far future", "2027-01-01"],
  ] as const) {
    it(`rejects ${label} without touching the repository`, async () => {
      const { repo, calls } = fakeRepo();
      const svc = createBookingService(repo, () => NOW);
      await assert.rejects(svc.book(USER, date, "D01"), InvalidBookingDateError);
      assert.equal(calls.length, 0);
    });
  }

  it("uses the injected clock (weekend start moves the window)", async () => {
    const { repo } = fakeRepo();
    const svc = createBookingService(repo, () => new Date(2026, 10, 7, 9, 0)); // Saturday
    await assert.rejects(svc.book(USER, "2026-11-06", "D01"), InvalidBookingDateError);
    await svc.book(USER, "2026-11-09", "D01");
    await svc.book(USER, "2026-11-12", "D01");
  });

  it("maps pg 23505 without a desk constraint to BookingAlreadyExistsError (FR12)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("dup"), { code: "23505" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D01"),
      BookingAlreadyExistsError,
    );
  });

  it("maps a pg 23505 on the user/date unique constraint to BookingAlreadyExistsError", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "bookings_booking_date_user_id_key" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D01"),
      BookingAlreadyExistsError,
    );
  });

  it("maps a pg 23505 on the desk/date unique index to DeskAlreadyBookedError (AC7)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "ux_bookings_date_desk" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D01"),
      DeskAlreadyBookedError,
    );
  });

  it("maps pg 23503 without a desk constraint to UnknownUserError (FR14)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("fk"), { code: "23503" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D01"),
      UnknownUserError,
    );
  });

  it("maps a pg 23503 on the desk foreign key to UnknownDeskError (AC7)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("fk"), { code: "23503", constraint: "bookings_booking_desk_fkey" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D99"),
      UnknownDeskError,
    );
  });

  it("rethrows other errors unchanged", async () => {
    const boom = Object.assign(new Error("boom"), { code: "42P01" });
    const { repo } = fakeRepo({
      async create() {
        throw boom;
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09", "D01"),
      (err) => err === boom,
    );
  });
});

describe("bookingService.withdraw", () => {
  it("deletes with the caller's id and date", async () => {
    const { repo, calls } = fakeRepo();
    await createBookingService(repo, () => NOW).withdraw(USER, "2026-11-09");
    assert.deepEqual(calls, [{ op: "delete", args: [USER, "2026-11-09"] }]);
  });

  it("throws BookingNotFoundError when nothing was deleted (FR11)", async () => {
    const { repo } = fakeRepo({ async delete() { return false; } });
    await assert.rejects(
      createBookingService(repo, () => NOW).withdraw(USER, "2026-11-09"),
      BookingNotFoundError,
    );
  });
});

describe("bookingService.listMine", () => {
  it("lists own bookings with desk (null for legacy) from the server date", async () => {
    const { repo, calls } = fakeRepo();
    const result = await createBookingService(repo, () => NOW).listMine(USER);
    assert.deepEqual(result, [
      { date: "2026-11-06", desk: "D01" },
      { date: "2026-11-09", desk: null },
    ]);
    assert.deepEqual(calls, [{ op: "list", args: [USER, "2026-11-06"] }]);
  });
});
