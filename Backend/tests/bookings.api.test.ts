import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import { createAuthenticate } from "../src/middleware/authenticate.ts";
import type { BookingRepository } from "../src/repositories/bookingRepository.ts";

const SECRET = "api-test-secret";
const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GHOST = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOW = new Date(2026, 10, 6, 12, 0); // Friday 2026-11-06; window 06, 09, 10, 11

interface Row {
  userId: string;
  date: string;
  desk: string | null;
}

interface Store extends BookingRepository {
  rows: Row[];
  users: Set<string>;
  error?: unknown;
}

const DESK_IDS = Array.from({ length: 16 }, (_, i) => `${'ABCD'[Math.floor(i / 4)]}${(i % 4) + 1}`);

// Behaves like the database: FK on user and desk, unique (date, user), partial unique (date, desk).
function makeStore(): Store {
  const store: Store = {
    rows: [],
    users: new Set([ALICE, BOB]),
    async create(userId, date, desk) {
      if (store.error) throw store.error;
      if (!store.users.has(userId)) {
        throw Object.assign(new Error("fk"), { code: "23503", constraint: "bookings_user_id_fkey" });
      }
      if (!DESK_IDS.includes(desk)) {
        throw Object.assign(new Error("fk"), { code: "23503", constraint: "bookings_booking_desk_fkey" });
      }
      if (store.rows.some((r) => r.date === date && r.desk === desk)) {
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "ux_bookings_date_desk" });
      }
      if (store.rows.some((r) => r.userId === userId && r.date === date)) {
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "bookings_booking_date_user_id_key" });
      }
      store.rows.push({ userId, date, desk });
      return { date, desk };
    },
    async delete(userId, date) {
      const i = store.rows.findIndex((r) => r.userId === userId && r.date === date);
      if (i < 0) return false;
      store.rows.splice(i, 1);
      return true;
    },
    async listByUser(userId, from) {
      return store.rows
        .filter((r) => r.userId === userId && r.date >= from)
        .map((r) => ({ date: r.date, desk: r.desk }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  };
  return store;
}

const token = (id: string, opts: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign({ id, email: "x@example.com", type: "user" }, secret, { algorithm: "HS256", ...opts });

let server: Server;
let baseUrl: string;
let store: Store;
let savedSecret: string | undefined;
let authOverride: RequestHandler | undefined;

before(async () => {
  savedSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
  store = makeStore();
  server = createApp({
    bookingRepository: {
      create: (u, d, k) => store.create(u, d, k),
      delete: (u, d) => store.delete(u, d),
      listByUser: (u, f) => store.listByUser(u, f),
    },
    authMiddleware: (req, res, next) => (authOverride ?? passthroughReal)(req, res, next),
    now: () => NOW,
  }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (savedSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = savedSecret;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  store.rows.length = 0;
  store.users = new Set([ALICE, BOB]);
  store.error = undefined;
  authOverride = undefined;
});

const realAuth = createAuthenticate();
const passthroughReal: RequestHandler = (req, res, next) => realAuth(req, res, next);

async function call(method: string, path: string, opts: { token?: string; header?: string; body?: unknown; raw?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.header !== undefined) headers.authorization = opts.header;
  else if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.raw !== undefined) {
    headers["content-type"] = "application/json";
    body = opts.raw;
  } else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${baseUrl}/api/bookings${path}`, { method, headers, body });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("POST /api/bookings", () => {
  it("201 stores the date and desk for the token's user (AC4, AC7, FR10)", async () => {
    const r = await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A3" } });
    assert.equal(r.status, 201);
    assert.deepEqual(r.json, { success: true, payload: { booking: { date: "2026-11-09", desk: "A3" } } });
    assert.deepEqual(store.rows, [{ userId: ALICE, date: "2026-11-09", desk: "A3" }]);
  });

  it("ignores a user id supplied in the body (AC7, FR10)", async () => {
    const r = await call("POST", "", {
      token: token(ALICE),
      body: { date: "2026-11-09", desk: "A1", userId: BOB, user_id: BOB, id: BOB, email: "bob@example.com" },
    });
    assert.equal(r.status, 201);
    assert.deepEqual(store.rows, [{ userId: ALICE, date: "2026-11-09", desk: "A1" }]);
  });

  it("allows one user to hold several dates (AC7)", async () => {
    for (const date of ["2026-11-06", "2026-11-10", "2026-11-11"]) {
      assert.equal((await call("POST", "", { token: token(ALICE), body: { date, desk: "A1" } })).status, 201);
    }
    assert.equal(store.rows.length, 3);
  });

  it("201 for today and for the last day of the window (FR2)", async () => {
    assert.equal((await call("POST", "", { token: token(ALICE), body: { date: "2026-11-06", desk: "A1" } })).status, 201);
    assert.equal((await call("POST", "", { token: token(ALICE), body: { date: "2026-11-11", desk: "A1" } })).status, 201);
  });

  for (const [label, body] of [
    ["missing desk", { date: "2026-11-09" }],
    ["null desk", { date: "2026-11-09", desk: null }],
    ["numeric desk", { date: "2026-11-09", desk: 3 }],
    ["empty desk", { date: "2026-11-09", desk: "" }],
    ["object desk", { date: "2026-11-09", desk: { id: "A1" } }],
    ["unknown desk", { date: "2026-11-09", desk: "Z9" }],
    ["unknown desk id A0", { date: "2026-11-09", desk: "A0" }],
    ["desk with SQL characters", { date: "2026-11-09", desk: "A1'; DROP TABLE desks;--" }],
    ["overlong desk", { date: "2026-11-09", desk: "D".repeat(500) }],
  ] as const) {
    it(`400 on the desk field for ${label} (AC7)`, async () => {
      const r = await call("POST", "", { token: token(ALICE), body });
      assert.equal(r.status, 400);
      assert.equal(r.json.success, false);
      assert.equal(r.json.message, "Validation failed");
      assert.equal((r.json.errors as Array<{ field: string }>)[0].field, "desk");
      assert.equal(store.rows.length, 0);
    });
  }

  it("409 Desk already booked when another user holds the desk on that date (AC5, AC7)", async () => {
    await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "B1" } });
    const r = await call("POST", "", { token: token(BOB), body: { date: "2026-11-09", desk: "B1" } });
    assert.equal(r.status, 409);
    assert.deepEqual(r.json, { success: false, message: "Desk already booked" });
    assert.equal(store.rows.length, 1);
  });

  it("201 for the same desk on a different date (AC7)", async () => {
    await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "B1" } });
    const r = await call("POST", "", { token: token(BOB), body: { date: "2026-11-10", desk: "B1" } });
    assert.equal(r.status, 201);
  });

  it("201 for two different desks on the same date (AC7)", async () => {
    await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "B1" } });
    const r = await call("POST", "", { token: token(BOB), body: { date: "2026-11-09", desk: "B2" } });
    assert.equal(r.status, 201);
  });

  it("the desk is free again after withdrawing (AC7)", async () => {
    await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "B1" } });
    await call("DELETE", "/2026-11-09", { token: token(ALICE) });
    const r = await call("POST", "", { token: token(BOB), body: { date: "2026-11-09", desk: "B1" } });
    assert.equal(r.status, 201);
  });

  it("a legacy booking without desk occupies no desk (AC7)", async () => {
    store.rows.push({ userId: BOB, date: "2026-11-09", desk: null });
    const r = await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A1" } });
    assert.equal(r.status, 201);
  });

  it("400 when both the date is out of the window and the desk is missing", async () => {
    const r = await call("POST", "", { token: token(ALICE), body: { date: "2026-11-07" } });
    assert.equal(r.status, 400);
    assert.equal(store.rows.length, 0);
  });

  for (const [label, date] of [
    ["a past date", "2026-11-05"],
    ["a Saturday", "2026-11-07"],
    ["a Sunday", "2026-11-08"],
    ["a date after the window", "2026-11-12"],
  ] as const) {
    it(`400 for ${label} (FR9)`, async () => {
      const r = await call("POST", "", { token: token(ALICE), body: { date, desk: "A1" } });
      assert.equal(r.status, 400);
      assert.equal(r.json.success, false);
      assert.equal(r.json.message, "Validation failed");
      assert.equal((r.json.errors as Array<{ field: string }>)[0].field, "date");
      assert.equal(store.rows.length, 0);
    });
  }

  for (const [label, body] of [
    ["missing date", { desk: "A1" }],
    ["null date", { date: null, desk: "A1" }],
    ["numeric date", { date: 20261109, desk: "A1" }],
    ["wrong format", { date: "09-11-2026", desk: "A1" }],
    ["impossible date", { date: "2026-02-30", desk: "A1" }],
    ["date with time", { date: "2026-11-09T10:00:00Z", desk: "A1" }],
  ] as const) {
    it(`400 for ${label}`, async () => {
      const r = await call("POST", "", { token: token(ALICE), body });
      assert.equal(r.status, 400);
      assert.equal(r.json.message, "Validation failed");
      assert.equal(store.rows.length, 0);
    });
  }

  it("400 for a malformed JSON body", async () => {
    const r = await call("POST", "", { token: token(ALICE), raw: "{not json" });
    assert.equal(r.status, 400);
  });

  it("409 when the same user books the same date twice on another desk (FR12)", async () => {
    await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A1" } });
    const r = await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A2" } });
    assert.equal(r.status, 409);
    assert.deepEqual(r.json, { success: false, message: "Booking already exists" });
    assert.equal(store.rows.length, 1);
  });

  it("201 for two different users on the same date and different desks (FR12, AC6)", async () => {
    assert.equal((await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A1" } })).status, 201);
    assert.equal((await call("POST", "", { token: token(BOB), body: { date: "2026-11-09", desk: "A2" } })).status, 201);
    assert.equal(store.rows.length, 2);
  });

  it("401 and nothing stored when the user no longer exists (FR14)", async () => {
    const r = await call("POST", "", { token: token(GHOST), body: { date: "2026-11-09", desk: "A1" } });
    assert.equal(r.status, 401);
    assert.deepEqual(r.json, { success: false, message: "Authentication required" });
    assert.equal(store.rows.length, 0);
  });

  it("500 with a generic message on unexpected repository errors", async () => {
    store.error = Object.assign(new Error("relation does not exist: secret-detail"), { code: "42P01" });
    const r = await call("POST", "", { token: token(ALICE), body: { date: "2026-11-09", desk: "A1" } });
    assert.equal(r.status, 500);
    assert.deepEqual(r.json, { success: false, message: "Internal server error" });
  });
});

describe("DELETE /api/bookings/:date", () => {
  it("200 removes only the caller's booking for that date (AC5, FR11)", async () => {
    store.rows.push(
      { userId: ALICE, date: "2026-11-09", desk: "A1" },
      { userId: ALICE, date: "2026-11-10", desk: "A1" },
      { userId: BOB, date: "2026-11-09", desk: "A2" },
    );
    const r = await call("DELETE", "/2026-11-09", { token: token(ALICE) });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { success: true });
    assert.deepEqual(store.rows, [
      { userId: ALICE, date: "2026-11-10", desk: "A1" },
      { userId: BOB, date: "2026-11-09", desk: "A2" },
    ]);
  });

  it("404 for a date the caller has not booked", async () => {
    const r = await call("DELETE", "/2026-11-09", { token: token(ALICE) });
    assert.equal(r.status, 404);
    assert.deepEqual(r.json, { success: false, message: "Booking not found" });
  });

  it("404 and the other user's booking stays when deleting someone else's date (ownership)", async () => {
    store.rows.push({ userId: BOB, date: "2026-11-09", desk: "A2" });
    const r = await call("DELETE", "/2026-11-09", { token: token(ALICE) });
    assert.equal(r.status, 404);
    assert.deepEqual(store.rows, [{ userId: BOB, date: "2026-11-09", desk: "A2" }]);
  });

  it("200 withdraws a legacy booking without desk by date (AC7, AC8)", async () => {
    store.rows.push({ userId: ALICE, date: "2026-11-09", desk: null });
    assert.equal((await call("DELETE", "/2026-11-09", { token: token(ALICE) })).status, 200);
    assert.equal(store.rows.length, 0);
  });

  it("404 on a second withdraw of the same date", async () => {
    store.rows.push({ userId: ALICE, date: "2026-11-09", desk: "A1" });
    assert.equal((await call("DELETE", "/2026-11-09", { token: token(ALICE) })).status, 200);
    assert.equal((await call("DELETE", "/2026-11-09", { token: token(ALICE) })).status, 404);
  });

  for (const bad of ["abc", "2026-13-01", "2026-02-30", "09-11-2026", "20261109"]) {
    it(`400 for malformed date "${bad}"`, async () => {
      const r = await call("DELETE", `/${bad}`, { token: token(ALICE) });
      assert.equal(r.status, 400);
      assert.equal(r.json.message, "Validation failed");
    });
  }
});

describe("GET /api/bookings/mine", () => {
  it("200 returns only the caller's bookings with desk, ascending (AC7)", async () => {
    store.rows.push(
      { userId: ALICE, date: "2026-11-10", desk: "A4" },
      { userId: BOB, date: "2026-11-09", desk: "A2" },
      { userId: ALICE, date: "2026-11-06", desk: "A1" },
    );
    const r = await call("GET", "/mine", { token: token(ALICE) });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, {
      success: true,
      payload: {
        bookings: [
          { date: "2026-11-06", desk: "A1" },
          { date: "2026-11-10", desk: "A4" },
        ],
      },
    });
  });

  it("returns desk null for a legacy booking (AC7)", async () => {
    store.rows.push({ userId: ALICE, date: "2026-11-09", desk: null });
    const r = await call("GET", "/mine", { token: token(ALICE) });
    assert.deepEqual(r.json.payload, { bookings: [{ date: "2026-11-09", desk: null }] });
  });

  it("omits bookings before the server date", async () => {
    store.rows.push(
      { userId: ALICE, date: "2026-11-05", desk: "A1" },
      { userId: ALICE, date: "2026-11-09", desk: "A1" },
    );
    const r = await call("GET", "/mine", { token: token(ALICE) });
    assert.deepEqual(r.json.payload, { bookings: [{ date: "2026-11-09", desk: "A1" }] });
  });

  it("200 with an empty list when the user has no bookings", async () => {
    const r = await call("GET", "/mine", { token: token(BOB) });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.payload, { bookings: [] });
  });

  it("does not expose e-mail or user id in bookings", async () => {
    store.rows.push({ userId: ALICE, date: "2026-11-09", desk: "A1" });
    const r = await call("GET", "/mine", { token: token(ALICE) });
    assert.deepEqual(Object.keys((r.json.payload as { bookings: object[] }).bookings[0]), ["date", "desk"]);
  });
});

describe("authentication on all booking endpoints (FR10)", () => {
  const endpoints: Array<[string, string, unknown?]> = [
    ["POST", "", { date: "2026-11-09", desk: "A2" }],
    ["DELETE", "/2026-11-09"],
    ["GET", "/mine"],
  ];
  const cases: Array<[string, () => { token?: string; header?: string }]> = [
    ["missing token", () => ({})],
    ["non-Bearer scheme", () => ({ header: `Basic ${token(ALICE)}` })],
    ["garbage token", () => ({ token: "not.a.jwt" })],
    ["wrong signature", () => ({ token: token(ALICE, {}, "other-secret") })],
    ["expired token", () => ({ token: token(ALICE, { expiresIn: -60 }) })],
    ["token without a uuid id", () => ({ token: token("not-a-uuid") })],
  ];
  for (const [method, path, body] of endpoints) {
    for (const [label, build] of cases) {
      it(`${method} ${path || "/"} -> 401 for ${label}`, async () => {
        store.rows.push({ userId: ALICE, date: "2026-11-09", desk: "A1" });
        const r = await call(method, path, { ...build(), body });
        assert.equal(r.status, 401);
        assert.deepEqual(r.json, { success: false, message: "Authentication required" });
        assert.equal(store.rows.length, 1);
      });
    }
  }

  it("uses an injected authMiddleware (identity from res.locals.user)", async () => {
    authOverride = (_req, res, next) => {
      res.locals.user = { id: BOB };
      next();
    };
    const r = await call("POST", "", { body: { date: "2026-11-09", desk: "A1" } });
    assert.equal(r.status, 201);
    assert.deepEqual(store.rows, [{ userId: BOB, date: "2026-11-09", desk: "A1" }]);
  });

  it("unknown booking sub-route still requires auth (no leak)", async () => {
    const r = await call("GET", "/other", {});
    assert.equal(r.status, 401);
  });
});
