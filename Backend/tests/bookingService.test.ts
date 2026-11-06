import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BookingRepository } from "../src/repositories/bookingRepository.ts";
import {
  BookingAlreadyExistsError,
  BookingNotFoundError,
  InvalidBookingDateError,
  UnknownUserError,
  createBookingService,
} from "../src/services/bookingService.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date(2026, 10, 6, 12, 0); // Friday 2026-11-06

function fakeRepo(overrides: Partial<BookingRepository> = {}) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const repo: BookingRepository = {
    async create(userId, date) {
      calls.push({ op: "create", args: [userId, date] });
      return { date };
    },
    async delete(userId, date) {
      calls.push({ op: "delete", args: [userId, date] });
      return true;
    },
    async listByUser(userId, from) {
      calls.push({ op: "list", args: [userId, from] });
      return ["2026-11-06", "2026-11-09"];
    },
    ...overrides,
  };
  return { repo, calls };
}

describe("bookingService.book", () => {
  it("stores a bookable date for the user", async () => {
    const { repo, calls } = fakeRepo();
    const svc = createBookingService(repo, () => NOW);
    assert.deepEqual(await svc.book(USER, "2026-11-09"), { date: "2026-11-09" });
    assert.deepEqual(calls, [{ op: "create", args: [USER, "2026-11-09"] }]);
  });

  it("accepts today and the last day of the window", async () => {
    const { repo } = fakeRepo();
    const svc = createBookingService(repo, () => NOW);
    await svc.book(USER, "2026-11-06");
    await svc.book(USER, "2026-11-11");
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
      await assert.rejects(svc.book(USER, date), InvalidBookingDateError);
      assert.equal(calls.length, 0);
    });
  }

  it("uses the injected clock (weekend start moves the window)", async () => {
    const { repo } = fakeRepo();
    const svc = createBookingService(repo, () => new Date(2026, 10, 7, 9, 0)); // Saturday
    await assert.rejects(svc.book(USER, "2026-11-06"), InvalidBookingDateError);
    await svc.book(USER, "2026-11-09");
    await svc.book(USER, "2026-11-12");
  });

  it("maps pg 23505 to BookingAlreadyExistsError (FR12)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("dup"), { code: "23505" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09"),
      BookingAlreadyExistsError,
    );
  });

  it("maps pg 23503 to UnknownUserError (FR14)", async () => {
    const { repo } = fakeRepo({
      async create() {
        throw Object.assign(new Error("fk"), { code: "23503" });
      },
    });
    await assert.rejects(
      createBookingService(repo, () => NOW).book(USER, "2026-11-09"),
      UnknownUserError,
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
      createBookingService(repo, () => NOW).book(USER, "2026-11-09"),
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
  it("lists own dates from the server date and wraps them", async () => {
    const { repo, calls } = fakeRepo();
    const result = await createBookingService(repo, () => NOW).listMine(USER);
    assert.deepEqual(result, [{ date: "2026-11-06" }, { date: "2026-11-09" }]);
    assert.deepEqual(calls, [{ op: "list", args: [USER, "2026-11-06"] }]);
  });
});
