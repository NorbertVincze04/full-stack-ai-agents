import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDeskRepository } from "../src/repositories/deskRepository.ts";
import { createDeskService } from "../src/services/deskService.ts";
import { InvalidBookingDateError } from "../src/services/bookingService.ts";

function fakeDb(rows: Array<Record<string, unknown>> = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  return {
    calls,
    db: {
      async query(text: string, values: unknown[]) {
        calls.push({ text, values });
        return { rows };
      },
    },
  };
}

describe("deskRepository.list", () => {
  it("maps grid_row/grid_col to row/col and returns only layout fields (AC6)", async () => {
    const { db, calls } = fakeDb([
      { id: "D01", label: "D01", grid_row: 1, grid_col: 1, user_id: "x", email: "a@b.c" },
      { id: "D05", label: "D05", grid_row: "2", grid_col: "1" },
    ]);
    const result = await createDeskRepository(db).list();
    assert.deepEqual(result, [
      { id: "D01", label: "D01", row: 1, col: 1 },
      { id: "D05", label: "D05", row: 2, col: 1 },
    ]);
    assert.match(calls[0].text, /FROM public\.desks/);
    assert.match(calls[0].text, /ORDER BY grid_row, grid_col/);
    assert.doesNotMatch(calls[0].text, /bookings|users|email/i);
  });

  it("uses the quoted schema for non-public schemas", async () => {
    const { db, calls } = fakeDb([]);
    await createDeskRepository(db, "ico-env").list();
    assert.match(calls[0].text, /FROM "ico-env"\.desks/);
  });

  it("rejects an invalid schema name", () => {
    assert.throws(() => createDeskRepository(fakeDb().db, 'x"; DROP TABLE desks;--'));
  });
});

describe("deskRepository.availability", () => {
  it("passes the date as a bind parameter and selects the booker's full_name only (AC6)", async () => {
    const { db, calls } = fakeDb([]);
    await createDeskRepository(db).availability("2026-11-09");
    assert.deepEqual(calls[0].values, ["2026-11-09"]);
    assert.doesNotMatch(calls[0].text, /2026-11-09/);
    const selectList = calls[0].text.split(/\sFROM\s/i)[0];
    assert.match(selectList, /full_name/);
    assert.doesNotMatch(selectList, /email|password|user_id|u\.id/i);
  });

  it("returns booked with bookedBy for booked desks and no bookedBy otherwise (AC2, AC6)", async () => {
    const { db } = fakeDb([
      { id: "D01", booked: false, booked_by: null },
      { id: "D02", booked: true, booked_by: "Ana Example", user_id: "secret", email: "ana@example.com" },
    ]);
    const result = await createDeskRepository(db).availability("2026-11-09");
    assert.deepEqual(result, [
      { id: "D01", booked: false },
      { id: "D02", booked: true, bookedBy: "Ana Example" },
    ]);
  });

  it("a desk booked by a legacy/unknown name still reports booked: true", async () => {
    const { db } = fakeDb([{ id: "D03", booked: true, booked_by: null }]);
    assert.deepEqual(await createDeskRepository(db).availability("2026-11-09"), [{ id: "D03", booked: true }]);
  });
});

describe("deskService", () => {
  const NOW = new Date(2026, 10, 6, 12, 0);

  it("availability delegates for a bookable date (AC6)", async () => {
    const seen: string[] = [];
    const svc = createDeskService(
      {
        async list() {
          return [];
        },
        async availability(date) {
          seen.push(date);
          return [{ id: "D01", booked: false }];
        },
      },
      () => NOW,
    );
    assert.deepEqual(await svc.availability("2026-11-09"), [{ id: "D01", booked: false }]);
    assert.deepEqual(seen, ["2026-11-09"]);
  });

  for (const date of ["2026-11-05", "2026-11-07", "2026-11-08", "2026-11-12"]) {
    it(`availability rejects ${date} (same window as booking) without touching the repository`, async () => {
      let called = false;
      const svc = createDeskService(
        {
          async list() {
            return [];
          },
          async availability() {
            called = true;
            return [];
          },
        },
        () => NOW,
      );
      await assert.rejects(svc.availability(date), InvalidBookingDateError);
      assert.equal(called, false);
    });
  }
});
