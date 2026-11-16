import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// Static checks of the desks migrations (AC9); no database is touched.
const files = {
  "migrations/004_create_desks_and_booking_desk.sql": readFileSync(
    new URL("../migrations/004_create_desks_and_booking_desk.sql", import.meta.url),
    "utf8",
  ),
  "db/migrations/005_ico_env_desks.sql": readFileSync(
    new URL("../db/migrations/005_ico_env_desks.sql", import.meta.url),
    "utf8",
  ),
};

// Rollback instructions live in comment lines; executable SQL is everything else.
const executable = (sql: string) =>
  sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

for (const [name, sql] of Object.entries(files)) {
  const code = executable(sql);
  describe(`${name}`, () => {
    it("drops, deletes, updates and truncates nothing", () => {
      assert.doesNotMatch(code, /\b(DROP|DELETE|UPDATE|TRUNCATE)\b/i);
    });

    it("is idempotent: IF NOT EXISTS / ON CONFLICT everywhere", () => {
      assert.match(code, /CREATE TABLE IF NOT EXISTS .*desks/i);
      assert.match(code, /CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_date_desk/i);
      assert.match(code, /ON CONFLICT DO NOTHING/i);
      assert.doesNotMatch(code, /CREATE TABLE (?!IF NOT EXISTS)/i);
      assert.doesNotMatch(code, /CREATE UNIQUE INDEX (?!IF NOT EXISTS)/i);
      assert.doesNotMatch(code, /ADD COLUMN (?!IF NOT EXISTS)/i);
    });

    it("seeds 12 desks D01..D12 in a 4 x 3 grid", () => {
      const rows = [...code.matchAll(/\('(D\d{2})', '(D\d{2})', (\d), (\d)\)/g)];
      assert.equal(rows.length, 12);
      rows.forEach((m, i) => {
        const id = `D${String(i + 1).padStart(2, "0")}`;
        assert.equal(m[1], id);
        assert.equal(Number(m[3]), Math.floor(i / 4) + 1);
        assert.equal(Number(m[4]), (i % 4) + 1);
      });
    });

    it("has a partial unique index on (booking_date, booking_desk) WHERE booking_desk IS NOT NULL", () => {
      assert.match(
        code,
        /ux_bookings_date_desk\s+ON\s+\S+\.bookings\s*\(booking_date, booking_desk\)\s+WHERE booking_desk IS NOT NULL/i,
      );
    });

    it("references desks(id) from bookings.booking_desk", () => {
      assert.match(code, /FOREIGN KEY \(booking_desk\) REFERENCES \S+\.desks\(id\)/i);
    });

    it("the seed only inserts into desks (no other table is written)", () => {
      const inserts = [...code.matchAll(/INSERT INTO\s+(\S+)/gi)].map((m) => m[1]);
      for (const target of inserts) {
        assert.match(target, /desks$|schema_migrations$/);
      }
    });
  });
}

describe("Cloud Foundry migration adds the column, local one expects it", () => {
  it("004 adds bookings.booking_desk as nullable", () => {
    const code = executable(files["migrations/004_create_desks_and_booking_desk.sql"]);
    assert.match(code, /ADD COLUMN IF NOT EXISTS booking_desk varchar\(10\);/i);
  });
});
