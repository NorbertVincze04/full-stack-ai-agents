import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBookingRepository } from "../src/repositories/bookingRepository.ts";

const USER = "33333333-3333-4333-8333-333333333333";

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

describe("bookingRepository", () => {
  it("create inserts the desk and the user's database name with the booking", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-09", desk: "D03" }]);
    const result = await createBookingRepository(db).create(USER, "2026-11-09", "D03");
    assert.deepEqual(result, { date: "2026-11-09", desk: "D03" });
    assert.match(calls[0].text, /^INSERT INTO public\.bookings \(user_id, booking_date, booking_desk, user_name\)/);
    assert.match(calls[0].text, /SELECT full_name FROM public\.users WHERE id = \$1/);
    assert.deepEqual(calls[0].values, [USER, "2026-11-09", "D03"]);
    assert.doesNotMatch(calls[0].text, /email/i);
  });

  it("create passes the desk as a bind parameter, never inside the SQL text (AC7)", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-09", desk: "D03" }]);
    await createBookingRepository(db).create(USER, "2026-11-09", "D03");
    assert.doesNotMatch(calls[0].text, /D03/);
  });

  it("delete filters on date AND user_id and reports hit/miss (FR11)", async () => {
    const hit = fakeDb([{ id: 1 }]);
    assert.equal(await createBookingRepository(hit.db).delete(USER, "2026-11-09"), true);
    assert.match(hit.calls[0].text, /WHERE booking_date = \$1 AND user_id = \$2/);
    assert.deepEqual(hit.calls[0].values, ["2026-11-09", USER]);

    const miss = fakeDb([]);
    assert.equal(await createBookingRepository(miss.db).delete(USER, "2026-11-09"), false);
  });

  it("listByUser filters by user and start date, ascending", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-06", desk: "D01" }, { date: "2026-11-09", desk: "D02" }]);
    const result = await createBookingRepository(db).listByUser(USER, "2026-11-06");
    assert.deepEqual(result, [
      { date: "2026-11-06", desk: "D01" },
      { date: "2026-11-09", desk: "D02" },
    ]);
    assert.match(calls[0].text, /WHERE user_id = \$1 AND booking_date >= \$2 ORDER BY booking_date/);
    assert.deepEqual(calls[0].values, [USER, "2026-11-06"]);
  });

  it("listByUser returns desk null for legacy bookings without a desk (AC7)", async () => {
    const { db } = fakeDb([{ date: "2026-11-06", desk: null }, { date: "2026-11-09" }]);
    const result = await createBookingRepository(db).listByUser(USER, "2026-11-06");
    assert.deepEqual(result, [
      { date: "2026-11-06", desk: null },
      { date: "2026-11-09", desk: null },
    ]);
  });

  it("listByUser exposes only date and desk", async () => {
    const { db } = fakeDb([{ date: "2026-11-06", desk: "D01", user_id: USER, email: "a@b.c" }]);
    const [item] = await createBookingRepository(db).listByUser(USER, "2026-11-06");
    assert.deepEqual(Object.keys(item).sort(), ["date", "desk"]);
  });

  it("uses the quoted schema table for non-public schemas", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-09", desk: "D01" }]);
    await createBookingRepository(db, "ico-env").create(USER, "2026-11-09", "D01");
    assert.match(calls[0].text, /INSERT INTO "ico-env"\.bookings /);
    assert.match(calls[0].text, /SELECT full_name FROM "ico-env"\.users WHERE id = \$1/);
  });

  it("rejects an invalid schema name", () => {
    assert.throws(() => createBookingRepository(fakeDb().db, 'x"; DROP TABLE users;--'));
  });
});
