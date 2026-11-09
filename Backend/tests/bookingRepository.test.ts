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
  it("create inserts the user's database name with the booking", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-09" }]);
    const result = await createBookingRepository(db).create(USER, "2026-11-09");
    assert.deepEqual(result, { date: "2026-11-09" });
    assert.match(calls[0].text, /^INSERT INTO public\.bookings \(user_id, booking_date, user_name\)/);
    assert.match(calls[0].text, /SELECT full_name FROM public\.users WHERE id = \$1/);
    assert.deepEqual(calls[0].values, [USER, "2026-11-09"]);
    assert.doesNotMatch(calls[0].text, /email/i);
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
    const { db, calls } = fakeDb([{ date: "2026-11-06" }, { date: "2026-11-09" }]);
    const result = await createBookingRepository(db).listByUser(USER, "2026-11-06");
    assert.deepEqual(result, ["2026-11-06", "2026-11-09"]);
    assert.match(calls[0].text, /WHERE user_id = \$1 AND booking_date >= \$2 ORDER BY booking_date/);
    assert.deepEqual(calls[0].values, [USER, "2026-11-06"]);
  });

  it("uses the quoted schema table for non-public schemas", async () => {
    const { db, calls } = fakeDb([{ date: "2026-11-09" }]);
    await createBookingRepository(db, "ico-env").create(USER, "2026-11-09");
    assert.match(calls[0].text, /INSERT INTO "ico-env"\.bookings /);
    assert.match(calls[0].text, /SELECT full_name FROM "ico-env"\.users WHERE id = \$1/);
  });

  it("rejects an invalid schema name", () => {
    assert.throws(() => createBookingRepository(fakeDb().db, 'x"; DROP TABLE users;--'));
  });
});
