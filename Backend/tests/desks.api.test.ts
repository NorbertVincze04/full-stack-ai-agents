import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import type { Desk, DeskAvailability, DeskRepository } from "../src/repositories/deskRepository.ts";

const SECRET = "desks-api-test-secret";
const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = new Date(2026, 10, 6, 12, 0); // Friday 2026-11-06; window 06, 09, 10, 11

const DESKS: Desk[] = Array.from({ length: 12 }, (_, i) => ({
  id: `D${String(i + 1).padStart(2, "0")}`,
  label: `D${String(i + 1).padStart(2, "0")}`,
  row: Math.floor(i / 4) + 1,
  col: (i % 4) + 1,
}));

let availabilityCalls: string[] = [];
let booked: Record<string, string> = {};

const repository: DeskRepository = {
  async list() {
    return DESKS;
  },
  async availability(date) {
    availabilityCalls.push(date);
    return DESKS.map((d): DeskAvailability =>
      booked[d.id] ? { id: d.id, booked: true, bookedBy: booked[d.id] } : { id: d.id, booked: false },
    );
  },
};

const token = (id: string, opts: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign({ id, email: "alice@example.com", type: "user" }, secret, { algorithm: "HS256", ...opts });

let server: Server;
let baseUrl: string;
let savedSecret: string | undefined;

before(async () => {
  savedSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
  server = createApp({ deskRepository: repository, now: () => NOW }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (savedSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = savedSecret;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  availabilityCalls = [];
  booked = {};
});

async function get(path: string, opts: { token?: string; header?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.header !== undefined) headers.authorization = opts.header;
  else if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${baseUrl}/api/desks${path}`, { headers });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("GET /api/desks (public layout)", () => {
  it("200 without a token returns the 12 desks (AC6)", async () => {
    const r = await get("");
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    const desks = (r.json.payload as { desks: Desk[] }).desks;
    assert.equal(desks.length, 12);
    assert.deepEqual(desks.map((d) => d.id), DESKS.map((d) => d.id));
  });

  it("returns only id, label, row, col per desk, no booking or user data (AC6)", async () => {
    booked = { D01: "Ana Example" };
    const r = await get("");
    for (const desk of (r.json.payload as { desks: object[] }).desks) {
      assert.deepEqual(Object.keys(desk).sort(), ["col", "id", "label", "row"]);
    }
    assert.doesNotMatch(JSON.stringify(r.json), /Ana Example|booked|email|user/i);
  });

  it("is a 4 x 3 grid: rows 1-3, columns 1-4 (AC1)", async () => {
    const desks = ((await get("")).json.payload as { desks: Desk[] }).desks;
    assert.deepEqual([...new Set(desks.map((d) => d.row))].sort(), [1, 2, 3]);
    assert.deepEqual([...new Set(desks.map((d) => d.col))].sort(), [1, 2, 3, 4]);
    assert.equal(new Set(desks.map((d) => `${d.row}/${d.col}`)).size, 12);
  });

  it("ignores an invalid token (public endpoint)", async () => {
    assert.equal((await get("", { token: "not.a.jwt" })).status, 200);
  });
});

describe("GET /api/desks/availability", () => {
  it("200 returns all 12 desks with booked and bookedBy for booked ones (AC6)", async () => {
    booked = { D02: "Ana Example", D07: "Ben Example" };
    const r = await get("/availability?date=2026-11-09", { token: token(ALICE) });
    assert.equal(r.status, 200);
    const desks = (r.json.payload as { desks: DeskAvailability[] }).desks;
    assert.equal(desks.length, 12);
    assert.deepEqual(desks.find((d) => d.id === "D02"), { id: "D02", booked: true, bookedBy: "Ana Example" });
    assert.deepEqual(desks.find((d) => d.id === "D07"), { id: "D07", booked: true, bookedBy: "Ben Example" });
    assert.deepEqual(desks.find((d) => d.id === "D01"), { id: "D01", booked: false });
    assert.deepEqual(availabilityCalls, ["2026-11-09"]);
  });

  it("exposes no user id or e-mail, only id, booked and bookedBy (AC6)", async () => {
    booked = { D02: "Ana Example" };
    const r = await get("/availability?date=2026-11-09", { token: token(ALICE) });
    for (const desk of (r.json.payload as { desks: object[] }).desks) {
      for (const key of Object.keys(desk)) assert.ok(["id", "booked", "bookedBy"].includes(key), key);
    }
    assert.doesNotMatch(JSON.stringify(r.json), /user_?id|e-?mail|@/i);
  });

  it("accepts today and the last day of the window", async () => {
    assert.equal((await get("/availability?date=2026-11-06", { token: token(ALICE) })).status, 200);
    assert.equal((await get("/availability?date=2026-11-11", { token: token(ALICE) })).status, 200);
  });

  const authCases: Array<[string, () => { token?: string; header?: string }]> = [
    ["missing token", () => ({})],
    ["non-Bearer scheme", () => ({ header: `Basic ${token(ALICE)}` })],
    ["garbage token", () => ({ token: "not.a.jwt" })],
    ["wrong signature", () => ({ token: token(ALICE, {}, "other-secret") })],
    ["expired token", () => ({ token: token(ALICE, { expiresIn: -60 }) })],
  ];
  for (const [label, build] of authCases) {
    it(`401 for ${label} (AC6)`, async () => {
      const r = await get("/availability?date=2026-11-09", build());
      assert.equal(r.status, 401);
      assert.deepEqual(r.json, { success: false, message: "Authentication required" });
      assert.equal(availabilityCalls.length, 0);
    });
  }

  it("401 takes precedence over date validation", async () => {
    assert.equal((await get("/availability?date=bad")).status, 401);
  });

  for (const [label, query] of [
    ["missing date", ""],
    ["empty date", "?date="],
    ["wrong format", "?date=09-11-2026"],
    ["impossible date", "?date=2026-02-30"],
    ["date with time", "?date=2026-11-09T10:00:00Z"],
    ["array date", "?date=2026-11-09&date=2026-11-10"],
    ["a past date", "?date=2026-11-05"],
    ["a Saturday", "?date=2026-11-07"],
    ["a Sunday", "?date=2026-11-08"],
    ["a date after the window", "?date=2026-11-12"],
  ] as const) {
    it(`400 for ${label} (AC6)`, async () => {
      const r = await get(`/availability${query}`, { token: token(ALICE) });
      assert.equal(r.status, 400);
      assert.equal(r.json.success, false);
      assert.equal(r.json.message, "Validation failed");
      assert.equal((r.json.errors as Array<{ field: string }>)[0].field, "date");
      assert.equal(availabilityCalls.length, 0);
    });
  }

  it("500 with a generic message when the repository fails", async () => {
    const failing = createApp({
      deskRepository: {
        async list() {
          throw new Error("secret-detail");
        },
        async availability() {
          throw new Error("secret-detail");
        },
      },
      now: () => NOW,
    }).listen(0);
    await new Promise<void>((resolve) => failing.once("listening", resolve));
    try {
      const url = `http://127.0.0.1:${(failing.address() as AddressInfo).port}/api/desks`;
      const res = await fetch(url);
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { success: false, message: "Internal server error" });
    } finally {
      await new Promise<void>((resolve) => failing.close(() => resolve()));
    }
  });
});
