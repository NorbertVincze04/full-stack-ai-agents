import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookableDates,
  isValidDateString,
  toDateString,
} from "../src/services/bookingDates.ts";

// Local-time constructors; 2026-11-06 is a Friday.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 30);

describe("bookableDates (FR2/FR9)", () => {
  it("starts today when today is a weekday and skips the weekend", () => {
    assert.deepEqual(bookableDates(at(2026, 11, 6)), [
      "2026-11-06",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);
  });

  it("returns 4 consecutive weekdays on a Monday", () => {
    assert.deepEqual(bookableDates(at(2026, 11, 2)), [
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
  });

  it("starts on the next Monday when today is Saturday", () => {
    assert.deepEqual(bookableDates(at(2026, 11, 7)), [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);
  });

  it("starts on the next Monday when today is Sunday", () => {
    assert.deepEqual(bookableDates(at(2026, 11, 8)), [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);
  });

  it("ignores the time of day (just after midnight and just before)", () => {
    assert.equal(bookableDates(at(2026, 11, 6, 0))[0], "2026-11-06");
    assert.equal(bookableDates(new Date(2026, 10, 6, 23, 59, 59))[0], "2026-11-06");
  });

  it("crosses month and year boundaries", () => {
    assert.deepEqual(bookableDates(at(2026, 12, 31)), [
      "2026-12-31",
      "2027-01-01",
      "2027-01-04",
      "2027-01-05",
    ]);
  });

  it("never contains a weekend day", () => {
    for (let d = 1; d <= 28; d++) {
      for (const date of bookableDates(at(2026, 2, d))) {
        const day = new Date(`${date}T00:00:00Z`).getUTCDay();
        assert.ok(day !== 0 && day !== 6, `${date} is a weekend day`);
      }
    }
  });
});

describe("isValidDateString", () => {
  it("accepts real calendar dates", () => {
    assert.equal(isValidDateString("2026-11-06"), true);
    assert.equal(isValidDateString("2028-02-29"), true);
  });

  it("rejects bad formats and impossible dates", () => {
    for (const v of [
      "",
      "2026-1-6",
      "06-11-2026",
      "2026/11/06",
      "2026-13-01",
      "2026-02-30",
      "2027-02-29",
      "2026-11-06T00:00:00Z",
      " 2026-11-06",
      "abcd-ef-gh",
    ]) {
      assert.equal(isValidDateString(v), false, v);
    }
  });
});

describe("toDateString", () => {
  it("formats the local calendar date", () => {
    assert.equal(toDateString(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
    assert.equal(toDateString(new Date(2026, 11, 31, 0, 0)), "2026-12-31");
  });
});
