import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import type { Desk, DeskAvailability, DeskRepository } from "../src/repositories/deskRepository.ts";

// Task 650: desks A1..D4. Static checks of the renumbering migration (R1/R2: never executed, no database).
const LABELS = ["A", "B", "C", "D"].flatMap((l) => [1, 2, 3, 4].map((n) => `${l}${n}`));

const executable = (sql: string) =>
  sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

// The renumbering migration is the first file numbered 006 or higher (name is chosen by the implementer).
function findMigration(dir: string): { name: string; code: string } | undefined {
  const url = new URL(`../${dir}/`, import.meta.url);
  const name = readdirSync(url)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f) && Number(f.slice(0, 3)) >= 6)
    .sort()[0];
  return name ? { name, code: executable(readFileSync(new URL(name, url), "utf8")) } : undefined;
}

for (const dir of ["migrations", "db/migrations"]) {
  describe(`${dir}: desk renumbering migration (650)`, () => {
    const found = findMigration(dir);

    it("exists as a new file numbered 006 or higher (FR6)", () => {
      assert.ok(found, `no 006+ migration in Backend/${dir}`);
    });

    it("inserts 16 desks A1..D4 with id = label (FR1, FR2, AC1)", () => {
      assert.ok(found);
      const rows = [...found.code.matchAll(/\('([A-D][1-4])',\s*'([A-D][1-4])',\s*(\d+),\s*(\d+)\)/g)];
      assert.equal(rows.length, 16);
      assert.deepEqual(rows.map((m) => m[1]).sort(), [...LABELS].sort());
      for (const m of rows) assert.equal(m[1], m[2]);
    });

    it("places each letter in a 2 x 2 block, A/B above C/D (FR4, AC2)", () => {
      assert.ok(found);
      const rows = [...found.code.matchAll(/\('([A-D])([1-4])',\s*'[A-D][1-4]',\s*(\d+),\s*(\d+)\)/g)];
      assert.equal(rows.length, 16);
      const byLetter = new Map<string, { row: number; col: number }[]>();
      for (const m of rows) {
        byLetter.set(m[1], [...(byLetter.get(m[1]) ?? []), { row: Number(m[3]), col: Number(m[4]) }]);
      }
      const cells = new Set(rows.map((m) => `${m[3]}/${m[4]}`));
      assert.equal(cells.size, 16, "grid cells must be unique");
      const origin: Record<string, { row: number; col: number }> = {};
      for (const [letter, pos] of byLetter) {
        const r0 = Math.min(...pos.map((p) => p.row));
        const c0 = Math.min(...pos.map((p) => p.col));
        assert.deepEqual(
          pos.map((p) => `${p.row - r0}/${p.col - c0}`).sort(),
          ["0/0", "0/1", "1/0", "1/1"],
          `${letter} is not a 2 x 2 block`,
        );
        origin[letter] = { row: r0, col: c0 };
      }
      assert.ok(origin.A.row < origin.C.row && origin.B.row < origin.D.row, "A/B must be above C/D");
      assert.ok(origin.A.col < origin.B.col && origin.C.col < origin.D.col, "A left of B, C left of D");
    });

    it("numbers within a block row by row: A1 A2 / A3 A4 (FR4)", () => {
      assert.ok(found);
      const rows = [...found.code.matchAll(/\('([A-D])([1-4])',\s*'[A-D][1-4]',\s*(\d+),\s*(\d+)\)/g)];
      for (const letter of "ABCD") {
        const mine = rows.filter((m) => m[1] === letter).sort((a, b) => Number(a[2]) - Number(b[2]));
        const pos = mine.map((m) => [Number(m[3]), Number(m[4])]);
        assert.equal(pos[0][0], pos[1][0], `${letter}1 and ${letter}2 share a row`);
        assert.equal(pos[2][0], pos[3][0], `${letter}3 and ${letter}4 share a row`);
        assert.ok(pos[2][0] > pos[0][0], `${letter}3 is below ${letter}1`);
        assert.ok(pos[0][1] < pos[1][1] && pos[2][1] < pos[3][1], `${letter}1/${letter}3 left of ${letter}2/${letter}4`);
        assert.equal(pos[0][1], pos[2][1]);
      }
    });

    it("sets bookings.booking_desk to NULL before deleting desks (FR5, R1)", () => {
      assert.ok(found);
      const update = found.code.search(/UPDATE\s+\S*bookings\s+SET\s+booking_desk\s*=\s*NULL/i);
      const del = found.code.search(/DELETE\s+FROM\s+\S*desks\b/i);
      assert.ok(update >= 0, "missing UPDATE bookings SET booking_desk = NULL");
      assert.ok(del >= 0, "missing DELETE FROM desks");
      assert.ok(update < del, "UPDATE must come before DELETE (FK has no ON DELETE action)");
    });

    it("deletes no booking and drops or truncates nothing (AC5)", () => {
      assert.ok(found);
      assert.doesNotMatch(found.code, /DELETE\s+FROM\s+\S*bookings/i);
      assert.doesNotMatch(found.code, /\b(DROP|TRUNCATE)\b/i);
      assert.doesNotMatch(found.code, /UPDATE\s+(?!\S*bookings\s+SET\s+booking_desk\s*=\s*NULL)/i);
    });

    it("is guarded so a second run changes nothing (AC5, FR6)", () => {
      assert.ok(found);
      // A bare UPDATE/DELETE without a condition would null a new booking on the second run.
      assert.match(found.code, /\bIF\b|\bWHERE\b[\s\S]*\bEXISTS\b|\bDO\s+\$\$/i, "no guard clause");
      const update = found.code.match(/UPDATE\s+\S*bookings\s+SET\s+booking_desk\s*=\s*NULL([^;]*);/i);
      assert.ok(update, "missing UPDATE");
      const guarded = /\bWHERE\b/i.test(update[1]) || /\bIF\b[\s\S]*\bTHEN\b[\s\S]*UPDATE/i.test(found.code);
      assert.ok(guarded, "UPDATE is not conditional");
    });

    it("runs in one transaction and keeps FK and unique index (FR7)", () => {
      assert.ok(found);
      assert.match(found.code, /\bBEGIN\b/i);
      assert.match(found.code, /\bCOMMIT\b/i);
      assert.doesNotMatch(found.code, /ux_bookings_date_desk[\s\S]{0,40}DROP|DROP[\s\S]{0,40}ux_bookings_date_desk/i);
    });
  });
}

describe("db/migrations renumbering records itself (650)", () => {
  it("inserts its version into schema_migrations idempotently", () => {
    const found = findMigration("db/migrations");
    assert.ok(found, "no 006+ migration in Backend/db/migrations");
    assert.match(found.code, /INSERT INTO\s+\S*schema_migrations[\s\S]*ON CONFLICT \(version\) DO NOTHING/i);
  });
});

// API behaviour with the new ids (fake repository, no database).
const SECRET = "renumber-test-secret";
const NOW = new Date(2026, 10, 6, 12, 0);
const DESKS: Desk[] = LABELS.map((id, i) => ({
  id,
  label: id,
  row: Math.floor(i / 8) * 2 + Math.floor((i % 4) / 2) + 1,
  col: (Math.floor(i / 4) % 2) * 2 + (i % 2) + 1,
}));
const repository: DeskRepository = {
  async list() {
    return DESKS;
  },
  async availability() {
    return DESKS.map((d): DeskAvailability => (d.id === "C3" ? { id: "C3", booked: true, bookedBy: "Ana Example" } : { id: d.id, booked: false }));
  },
};

describe("GET /api/desks with A1..D4 (650, AC1, AC3)", () => {
  let server: Server;
  let baseUrl: string;
  let saved: string | undefined;
  before(async () => {
    saved = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
    server = createApp({ deskRepository: repository, now: () => NOW }).listen(0);
    await new Promise<void>((r) => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("returns 16 desks A1..D4 in order, id = label", async () => {
    const res = await fetch(`${baseUrl}/api/desks`);
    const desks = ((await res.json()) as { payload: { desks: Desk[] } }).payload.desks;
    assert.deepEqual(desks.map((d) => d.id), LABELS);
    assert.ok(desks.every((d) => d.id === d.label));
  });

  it("availability marks C3 booked and the rest free", async () => {
    const t = jwt.sign({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "a@b.c", type: "user" }, SECRET, { algorithm: "HS256" });
    const res = await fetch(`${baseUrl}/api/desks/availability?date=2026-11-09`, { headers: { authorization: `Bearer ${t}` } });
    const desks = ((await res.json()) as { payload: { desks: DeskAvailability[] } }).payload.desks;
    assert.equal(desks.length, 16);
    assert.deepEqual(desks.find((d) => d.id === "C3"), { id: "C3", booked: true, bookedBy: "Ana Example" });
    assert.equal(desks.filter((d) => d.booked).length, 1);
  });
});
