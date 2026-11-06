import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import type { UserRecord, UserRepository } from "../src/repositories/userRepository.ts";

const SECRET = "unit-test-secret";

async function start(repo: UserRepository, max = 100) {
  const server: Server = createApp({
    userRepository: repo,
    loginRateLimit: { max },
  }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = (body: unknown) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { server, login };
}

describe("POST /api/auth/login", () => {
  let user: UserRecord;
  let calls: string[];
  let fail: boolean;
  let ctx: Awaited<ReturnType<typeof start>>;
  const savedEnv = { ...process.env };

  const repo: UserRepository = {
    async findByEmail(email) {
      calls.push(email);
      if (fail) throw new Error("db down");
      return email === user.email ? user : null;
    },
  };

  before(async () => {
    user = {
      id: "6f1c1c1e-0000-4000-8000-000000000001",
      email: "jane@example.com",
      passwordHash: await bcrypt.hash("correct-password", 4),
      type: "user",
    };
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.JWT_EXPIRES_IN;
    calls = [];
    fail = false;
    ctx = await start(repo);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
    process.env = { ...savedEnv };
  });

  after(() => {
    process.env = savedEnv;
  });

  it("returns 200 and a verifiable HS256 token", async () => {
    const res = await ctx.login({ email: " Jane@Example.com ", password: "correct-password" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.payload), ["token", "user"]);
    const decoded = jwt.verify(body.payload.token, SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    assert.equal(decoded.id, user.id);
    assert.equal(decoded.email, user.email);
    assert.equal(decoded.type, "user");
    assert.equal((decoded.exp as number) - (decoded.iat as number), 8 * 3600);
    assert.deepEqual(calls, ["jane@example.com"]);
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    const wrong = await ctx.login({ email: user.email, password: "nope" });
    const unknown = await ctx.login({ email: "who@example.com", password: "nope" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    const a = await wrong.json();
    const b = await unknown.json();
    assert.deepEqual(a, b);
    assert.deepEqual(a, { success: false, message: "Invalid credentials" });
  });

  it("returns 400 with field errors and makes no repository call", async () => {
    for (const body of [
      {},
      { password: "x" },
      { email: user.email },
      { email: "", password: "" },
      { email: 42, password: ["x"] },
    ]) {
      const res = await ctx.login(body);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.message, "Validation failed");
      assert.ok(json.errors.length >= 1);
    }
    assert.deepEqual(calls, []);
  });

  it("returns 500 without internals when the repository fails", async () => {
    fail = true;
    const res = await ctx.login({ email: user.email, password: "correct-password" });
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { success: false, message: "Internal server error" });
  });

  it("returns 500 and issues no token when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;
    const res = await ctx.login({ email: user.email, password: "correct-password" });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).payload, undefined);
  });

  it("rate limits after max failed attempts and ignores successful ones", async () => {
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
    ctx = await start(repo, 2);
    for (let i = 0; i < 3; i++) {
      assert.equal((await ctx.login({ email: user.email, password: "correct-password" })).status, 200);
    }
    assert.equal((await ctx.login({ email: user.email, password: "bad" })).status, 401);
    assert.equal((await ctx.login({ email: user.email, password: "bad" })).status, 401);
    const before = calls.length;
    const limited = await ctx.login({ email: user.email, password: "bad" });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("retry-after"));
    assert.equal((await limited.json()).success, false);
    assert.equal(calls.length, before);
  });
});

describe("createApp() CORS_ORIGIN=*", () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("sends Access-Control-Allow-Origin: * outside production, without credentials", async () => {
    process.env.CORS_ORIGIN = "*";
    process.env.NODE_ENV = "development";
    const server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/x`, { headers: { origin: "http://any.test" } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
    assert.equal(res.headers.get("access-control-allow-credentials"), null);
  });

  it("throws in production", () => {
    process.env.CORS_ORIGIN = "*";
    process.env.NODE_ENV = "production";
    assert.throws(() => createApp(), /CORS_ORIGIN/);
  });
});
