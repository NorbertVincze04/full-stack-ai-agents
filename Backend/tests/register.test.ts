import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import type {
  CreatedUser,
  NewUser,
  UserRecord,
  UserRepository,
} from "../src/repositories/userRepository.ts";

const SECRET = "unit-test-secret";
const VALID = { fullName: "Jane Doe", email: "jane@example.com", password: "abcdef12" };

interface FakeRepo extends UserRepository {
  rows: UserRecord[];
  created: NewUser[];
  findCalls: string[];
  createError?: unknown;
}

function makeRepo(): FakeRepo {
  const repo: FakeRepo = {
    rows: [],
    created: [],
    findCalls: [],
    async findByEmail(email) {
      repo.findCalls.push(email);
      return repo.rows.find((r) => r.email === email) ?? null;
    },
    async create(user): Promise<CreatedUser> {
      repo.created.push(user);
      if (repo.createError) throw repo.createError;
      const row: UserRecord = {
        id: `id-${repo.rows.length + 1}`,
        fullName: user.fullName,
        email: user.email,
        passwordHash: user.passwordHash,
        type: "user",
      };
      repo.rows.push(row);
      return { id: row.id, fullName: row.fullName, email: row.email, type: row.type };
    },
  };
  return repo;
}

async function start(repo: UserRepository, registerMax = 100) {
  const server: Server = createApp({
    userRepository: repo,
    registerRateLimit: { max: registerMax },
    loginRateLimit: { max: 100 },
  }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) =>
    fetch(`${baseUrl}/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { server, register: (b: unknown) => post("register", b), login: (b: unknown) => post("login", b) };
}

interface ErrorBody {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

describe("POST /api/auth/register", () => {
  let repo: FakeRepo;
  let ctx: Awaited<ReturnType<typeof start>>;
  const savedEnv = { ...process.env };

  beforeEach(async () => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.JWT_EXPIRES_IN;
    repo = makeRepo();
    ctx = await start(repo);
  });

  afterEach(async () => {
    ctx.server.closeAllConnections();
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
    process.env = { ...savedEnv };
  });

  after(() => {
    process.env = savedEnv;
  });

  async function expectFieldError(body: unknown, field: string) {
    const res = await ctx.register(body);
    assert.equal(res.status, 400);
    const json = (await res.json()) as ErrorBody;
    assert.equal(json.success, false);
    assert.equal(json.message, "Validation failed");
    assert.ok(
      json.errors?.some((e) => e.field === field),
      `expected an error for ${field}, got ${JSON.stringify(json.errors)}`,
    );
    assert.equal(repo.created.length, 0, "nothing may be inserted on a 400");
    assert.equal(repo.findCalls.length, 0, "repository must not be queried on a 400");
  }

  describe("success", () => {
    it("returns 201 with a verifiable token and the public user", async () => {
      const res = await ctx.register(VALID);
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.deepEqual(Object.keys(body.payload).sort(), ["token", "user"]);
      assert.deepEqual(body.payload.user, {
        fullName: "Jane Doe",
        email: "jane@example.com",
        type: "user",
      });
      const decoded = jwt.verify(body.payload.token, SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      assert.equal(decoded.id, "id-1");
      assert.equal(decoded.email, "jane@example.com");
      assert.equal(decoded.type, "user");
    });

    it("does not return the password or the hash anywhere in the response", async () => {
      const res = await ctx.register(VALID);
      const text = await res.text();
      assert.equal(res.status, 201);
      assert.ok(!text.includes(VALID.password), "password leaked");
      assert.ok(!text.includes(repo.created[0].passwordHash), "hash leaked");
      assert.ok(!/password/i.test(text), "response mentions a password field");
      assert.ok(!text.includes("$2"), "bcrypt hash prefix in response");
    });

    it("stores a bcrypt hash of the password, not the plain password", async () => {
      await ctx.register(VALID);
      assert.equal(repo.created.length, 1);
      const { passwordHash } = repo.created[0];
      assert.notEqual(passwordHash, VALID.password);
      assert.match(passwordHash, /^\$2[aby]\$10\$/);
      assert.equal(await bcrypt.compare(VALID.password, passwordHash), true);
    });

    it("lower-cases and trims the e-mail and trims the full name before storing", async () => {
      const res = await ctx.register({
        fullName: "  Jane Doe  ",
        email: "  Jane@Example.COM ",
        password: VALID.password,
      });
      assert.equal(res.status, 201);
      assert.equal(repo.created[0].email, "jane@example.com");
      assert.equal(repo.created[0].fullName, "Jane Doe");
      assert.deepEqual(repo.findCalls, ["jane@example.com"]);
      const body = await res.json();
      assert.equal(body.payload.user.email, "jane@example.com");
      assert.equal(body.payload.user.fullName, "Jane Doe");
    });

    it("never takes the type from the body (admin is ignored)", async () => {
      const res = await ctx.register({ ...VALID, type: "admin", role: "admin", id: "x" });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.payload.user.type, "user");
      const decoded = jwt.decode(body.payload.token) as jwt.JwtPayload;
      assert.equal(decoded.type, "user");
      assert.deepEqual(Object.keys(repo.created[0]).sort(), ["email", "fullName", "passwordHash"]);
      assert.equal(repo.rows[0].type, "user");
    });

    it("ignores confirmPassword and other unknown fields", async () => {
      const res = await ctx.register({ ...VALID, confirmPassword: "different1", extra: 1 });
      assert.equal(res.status, 201);
    });

    it("accepts boundary values (100-char name, 254-char e-mail, 8-char and 72-byte password)", async () => {
      const longEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
      assert.equal(longEmail.length, 254);
      const cases = [
        { ...VALID, fullName: "n".repeat(100), email: "one@example.com" },
        { ...VALID, email: longEmail },
        { ...VALID, email: "two@example.com", password: "abcdefg1" },
        { ...VALID, email: "three@example.com", password: `${"a".repeat(71)}1` },
      ];
      for (const c of cases) {
        const res = await ctx.register(c);
        assert.equal(res.status, 201, `expected 201 for ${JSON.stringify(c).slice(0, 60)}`);
      }
    });

    it("the new account can then log in and the login response carries the user", async () => {
      await ctx.register(VALID);
      const res = await ctx.login({ email: "JANE@example.com", password: VALID.password });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.payload.user, {
        fullName: "Jane Doe",
        email: "jane@example.com",
        type: "user",
      });
    });
  });

  describe("validation (400)", () => {
    it("fullName missing", () => expectFieldError({ ...VALID, fullName: undefined }, "fullName"));
    it("fullName empty", () => expectFieldError({ ...VALID, fullName: "" }, "fullName"));
    it("fullName only whitespace", () => expectFieldError({ ...VALID, fullName: "   " }, "fullName"));
    it("fullName longer than 100 chars", () =>
      expectFieldError({ ...VALID, fullName: "n".repeat(101) }, "fullName"));
    it("fullName must be a string (number)", () => expectFieldError({ ...VALID, fullName: 123 }, "fullName"));
    it("fullName must be a string (object)", () =>
      expectFieldError({ ...VALID, fullName: { $ne: "" } }, "fullName"));
    it("fullName must be a string (array)", () => expectFieldError({ ...VALID, fullName: ["a"] }, "fullName"));

    it("email missing", () => expectFieldError({ ...VALID, email: undefined }, "email"));
    it("email empty", () => expectFieldError({ ...VALID, email: "" }, "email"));
    it("email must be a string (number)", () => expectFieldError({ ...VALID, email: 5 }, "email"));
    it("email must be a string (object)", () =>
      expectFieldError({ ...VALID, email: { $ne: "" } }, "email"));
    it("email must be a string (array)", () =>
      expectFieldError({ ...VALID, email: ["jane@example.com"] }, "email"));
    it("email without @", () => expectFieldError({ ...VALID, email: "jane.example.com" }, "email"));
    it("email without domain dot", () => expectFieldError({ ...VALID, email: "jane@example" }, "email"));
    it("email with inner whitespace", () => expectFieldError({ ...VALID, email: "ja ne@example.com" }, "email"));
    it("email longer than 254 chars", () =>
      expectFieldError({ ...VALID, email: `${"a".repeat(250)}@b.co` }, "email"));

    it("password missing", () => expectFieldError({ ...VALID, password: undefined }, "password"));
    it("password empty", () => expectFieldError({ ...VALID, password: "" }, "password"));
    it("password must be a string (number)", () =>
      expectFieldError({ ...VALID, password: 12345678 }, "password"));
    it("password shorter than 8 characters", () => expectFieldError({ ...VALID, password: "abc123" }, "password"));
    it("password without a digit", () => expectFieldError({ ...VALID, password: "abcdefgh" }, "password"));
    it("password without a letter", () => expectFieldError({ ...VALID, password: "12345678" }, "password"));
    it("password longer than 72 bytes", () =>
      expectFieldError({ ...VALID, password: `${"a".repeat(72)}1` }, "password"));
    it("password longer than 72 bytes with multi-byte characters", () =>
      expectFieldError({ ...VALID, password: `${"é".repeat(36)}1` }, "password"));

    it("reports every failing field at once", async () => {
      const res = await ctx.register({ fullName: "", email: "bad", password: "short" });
      assert.equal(res.status, 400);
      const json = (await res.json()) as ErrorBody;
      assert.deepEqual(json.errors?.map((e) => e.field).sort(), ["email", "fullName", "password"]);
    });

    it("empty body", async () => {
      const res = await ctx.register({});
      assert.equal(res.status, 400);
    });

    it("non-object JSON body (array)", async () => {
      const res = await ctx.register([VALID]);
      assert.equal(res.status, 400);
    });

    it("malformed JSON", async () => {
      const res = await fetch(
        `http://127.0.0.1:${(ctx.server.address() as AddressInfo).port}/api/auth/register`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" },
      );
      assert.equal(res.status, 400);
    });

    it("does not echo the submitted password in a 400 response", async () => {
      const res = await ctx.register({ ...VALID, password: "short1" });
      const text = await res.text();
      assert.equal(res.status, 400);
      assert.ok(!text.includes("short1"));
    });
  });

  describe("duplicate e-mail (409)", () => {
    it("returns 409 from the findByEmail pre-check without inserting", async () => {
      repo.rows.push({
        id: "existing",
        fullName: "Someone",
        email: "jane@example.com",
        passwordHash: "hash",
        type: "user",
      });
      const res = await ctx.register({ ...VALID, email: "JANE@example.com" });
      assert.equal(res.status, 409);
      assert.deepEqual(await res.json(), { success: false, message: "Email already registered" });
      assert.equal(repo.created.length, 0);
    });

    it("returns 409 when create rejects with the pg unique violation (23505 race)", async () => {
      repo.createError = Object.assign(new Error("duplicate key value violates unique constraint"), {
        code: "23505",
      });
      const res = await ctx.register(VALID);
      assert.equal(res.status, 409);
      assert.deepEqual(await res.json(), { success: false, message: "Email already registered" });
      assert.equal(repo.created.length, 1);
    });

    it("a second registration of the same e-mail is rejected with 409", async () => {
      assert.equal((await ctx.register(VALID)).status, 201);
      const res = await ctx.register({ ...VALID, fullName: "Other" });
      assert.equal(res.status, 409);
      assert.equal(repo.rows.length, 1);
    });
  });

  describe("server errors (500)", () => {
    it("maps a non-23505 repository failure to a generic 500 without leaking details", async () => {
      repo.createError = Object.assign(new Error("connection to 10.0.0.5 refused"), { code: "ECONNREFUSED" });
      const original = console.error;
      console.error = () => {};
      try {
        const res = await ctx.register(VALID);
        const text = await res.text();
        assert.equal(res.status, 500);
        assert.deepEqual(JSON.parse(text), { success: false, message: "Internal server error" });
        assert.ok(!text.includes("10.0.0.5"));
      } finally {
        console.error = original;
      }
    });
  });

  describe("rate limit (429)", () => {
    it("returns 429 after the limit, counting successful sign-ups too", async () => {
      await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
      repo = makeRepo();
      ctx = await start(repo, 2);

      const r1 = await ctx.register({ ...VALID, email: "a@example.com" });
      const r2 = await ctx.register({ ...VALID, email: "b@example.com" });
      assert.equal(r1.status, 201);
      assert.equal(r2.status, 201);
      const r3 = await ctx.register({ ...VALID, email: "c@example.com" });
      assert.equal(r3.status, 429);
      assert.deepEqual(await r3.json(), {
        success: false,
        message: "Too many registration attempts, please try again later",
      });
      assert.equal(repo.created.length, 2, "the limited request must not reach the repository");
    });

    it("also counts invalid requests", async () => {
      await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
      repo = makeRepo();
      ctx = await start(repo, 2);

      assert.equal((await ctx.register({})).status, 400);
      assert.equal((await ctx.register({})).status, 400);
      assert.equal((await ctx.register(VALID)).status, 429);
    });

    it("does not limit the login endpoint", async () => {
      await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
      repo = makeRepo();
      ctx = await start(repo, 1);

      assert.equal((await ctx.register(VALID)).status, 201);
      assert.equal((await ctx.register(VALID)).status, 429);
      const res = await ctx.login({ email: VALID.email, password: VALID.password });
      assert.equal(res.status, 200);
    });
  });
});

describe("POST /api/auth/login - user object", () => {
  let ctx: Awaited<ReturnType<typeof start>>;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(async () => {
    ctx.server.closeAllConnections();
    await new Promise<void>((resolve) => ctx.server.close(() => resolve()));
    process.env = { ...savedEnv };
  });

  async function seed(type: "admin" | "user") {
    const repo = makeRepo();
    repo.rows.push({
      id: "u-1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      passwordHash: await bcrypt.hash("correct1pass", 4),
      type,
    });
    ctx = await start(repo);
  }

  it("returns user { fullName, email, type } next to the token", async () => {
    await seed("user");
    const res = await ctx.login({ email: "ada@example.com", password: "correct1pass" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.payload.user, { fullName: "Ada Lovelace", email: "ada@example.com", type: "user" });
    assert.equal(typeof body.payload.token, "string");
    assert.deepEqual(Object.keys(body.payload.user).sort(), ["email", "fullName", "type"]);
  });

  it("reflects the stored type (admin) and keeps the JWT claims id, email, type", async () => {
    await seed("admin");
    const res = await ctx.login({ email: "ada@example.com", password: "correct1pass" });
    const body = await res.json();
    assert.equal(body.payload.user.type, "admin");
    const decoded = jwt.verify(body.payload.token, SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    assert.equal(decoded.id, "u-1");
    assert.equal(decoded.email, "ada@example.com");
    assert.equal(decoded.type, "admin");
  });

  it("never includes id, passwordHash or password in the response", async () => {
    await seed("user");
    const res = await ctx.login({ email: "ada@example.com", password: "correct1pass" });
    const text = await res.text();
    assert.ok(!/passwordHash|password_hash|\$2[aby]\$/.test(text));
    assert.ok(!text.includes("correct1pass"));
    assert.ok(!text.includes('"id"'));
  });

  it("keeps 401 for bad credentials and 400 for a missing body, without a user object", async () => {
    await seed("user");
    const bad = await ctx.login({ email: "ada@example.com", password: "wrong" });
    assert.equal(bad.status, 401);
    assert.equal((await bad.json()).payload, undefined);
    const empty = await ctx.login({});
    assert.equal(empty.status, 400);
  });
});
