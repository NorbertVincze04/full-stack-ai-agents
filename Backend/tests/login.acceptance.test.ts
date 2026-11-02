import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";
import type { AppOptions } from "../src/app.ts";
import { createUserRepository } from "../src/repositories/userRepository.ts";
import type { UserRecord, UserRepository } from "../src/repositories/userRepository.ts";

const SECRET = "acceptance-test-secret";
const PASSWORD = "correct-password";

const envSnapshot = { ...process.env };
function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in envSnapshot)) delete process.env[key];
  }
  Object.assign(process.env, envSnapshot);
}

let servers: Server[] = [];

async function start(options: AppOptions = {}) {
  const server = createApp(options).listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = (body: unknown) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { baseUrl, login };
}

async function closeAll(): Promise<void> {
  const open = servers;
  servers = [];
  await Promise.all(
    open.map(
      (s) =>
        new Promise<void>((resolve) => {
          s.close(() => resolve());
          s.closeAllConnections();
        }),
    ),
  );
}

describe("login acceptance (fake repository)", () => {
  let user: UserRecord;
  let calls: string[];
  let repo: UserRepository;

  before(async () => {
    user = {
      id: "6f1c1c1e-0000-4000-8000-000000000002",
      email: "jane@example.com",
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      type: "admin",
    };
  });

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.LOGIN_RATE_LIMIT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
    calls = [];
    repo = {
      async findByEmail(email) {
        calls.push(email);
        return email === user.email ? user : null;
      },
    };
    mock.method(console, "error", () => {});
  });

  afterEach(async () => {
    await closeAll();
    mock.restoreAll();
    restoreEnv();
  });

  describe("AC1 token", () => {
    it("signs with HS256 and the type claim of the user", async () => {
      const { login } = await start({ userRepository: repo });
      const res = await login({ email: user.email, password: PASSWORD });
      assert.equal(res.status, 200);
      const { payload } = await res.json();
      const decoded = jwt.decode(payload.token, { complete: true });
      assert.equal(decoded?.header.alg, "HS256");
      assert.equal((decoded?.payload as jwt.JwtPayload).type, "admin");
    });

    it("is rejected when verified with another secret", async () => {
      const { login } = await start({ userRepository: repo });
      const { payload } = await (await login({ email: user.email, password: PASSWORD })).json();
      assert.throws(() => jwt.verify(payload.token, "other-secret", { algorithms: ["HS256"] }));
    });

    it("honours JWT_EXPIRES_IN", async () => {
      process.env.JWT_EXPIRES_IN = "1h";
      const { login } = await start({ userRepository: repo });
      const { payload } = await (await login({ email: user.email, password: PASSWORD })).json();
      const decoded = jwt.verify(payload.token, SECRET) as jwt.JwtPayload;
      assert.equal((decoded.exp as number) - (decoded.iat as number), 3600);
    });

    it("falls back to 8h when JWT_EXPIRES_IN is empty", async () => {
      process.env.JWT_EXPIRES_IN = "";
      const { login } = await start({ userRepository: repo });
      const { payload } = await (await login({ email: user.email, password: PASSWORD })).json();
      const decoded = jwt.verify(payload.token, SECRET) as jwt.JwtPayload;
      assert.equal((decoded.exp as number) - (decoded.iat as number), 8 * 3600);
    });
  });

  describe("AC2 invalid credentials", () => {
    it("never exposes the hash or user data in 200 or 401 bodies", async () => {
      const { login } = await start({ userRepository: repo });
      const ok = await (await login({ email: user.email, password: PASSWORD })).text();
      const bad = await (await login({ email: user.email, password: "nope" })).text();
      const unknown = await (await login({ email: "x@example.com", password: "nope" })).text();
      for (const text of [ok, bad, unknown]) {
        assert.ok(!text.includes(user.passwordHash));
        assert.ok(!text.includes(user.id));
      }
      assert.deepEqual(JSON.parse(bad), JSON.parse(unknown));
    });

    it("rejects a password differing only by case", async () => {
      const { login } = await start({ userRepository: repo });
      const res = await login({ email: user.email, password: PASSWORD.toUpperCase() });
      assert.equal(res.status, 401);
    });
  });

  describe("AC3 validation", () => {
    it("reports exactly the invalid field", async () => {
      const { login } = await start({ userRepository: repo });
      const noEmail = await (await login({ password: "x" })).json();
      assert.deepEqual(
        noEmail.errors.map((e: { field: string }) => e.field),
        ["email"],
      );
      const noPassword = await (await login({ email: user.email })).json();
      assert.deepEqual(
        noPassword.errors.map((e: { field: string }) => e.field),
        ["password"],
      );
      const both = await (await login({})).json();
      assert.deepEqual(
        both.errors.map((e: { field: string }) => e.field),
        ["email", "password"],
      );
      for (const e of [...noEmail.errors, ...noPassword.errors, ...both.errors]) {
        assert.equal(typeof e.message, "string");
      }
    });

    it("rejects whitespace-only email, null, array and primitive bodies without a DB call", async () => {
      const { login } = await start({ userRepository: repo });
      for (const body of [
        { email: "   ", password: PASSWORD },
        { email: null, password: null },
        { email: true, password: 1 },
        { email: { a: 1 }, password: PASSWORD },
        null,
        [],
        "text",
      ]) {
        const res = await login(body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal((await res.json()).success, false);
      }
      assert.deepEqual(calls, []);
    });

    it("returns 400 for malformed JSON without a DB call", async () => {
      const { baseUrl } = await start({ userRepository: repo });
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).success, false);
      assert.deepEqual(calls, []);
    });
  });

  describe("AC4 JWT_SECRET", () => {
    it("issues no token and does no lookup when JWT_SECRET is unset", async () => {
      delete process.env.JWT_SECRET;
      const { login } = await start({ userRepository: repo });
      const res = await login({ email: user.email, password: PASSWORD });
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { success: false, message: "Internal server error" });
      assert.deepEqual(calls, []);
    });

    it("issues no token when JWT_SECRET is empty", async () => {
      process.env.JWT_SECRET = "";
      const { login } = await start({ userRepository: repo });
      const res = await login({ email: user.email, password: PASSWORD });
      assert.equal(res.status, 500);
      assert.equal((await res.json()).payload, undefined);
    });

    it("signs with whatever JWT_SECRET is set at request time (no built-in default)", async () => {
      process.env.JWT_SECRET = "another-secret";
      const { login } = await start({ userRepository: repo });
      const { payload } = await (await login({ email: user.email, password: PASSWORD })).json();
      jwt.verify(payload.token, "another-secret", { algorithms: ["HS256"] });
      assert.throws(() => jwt.verify(payload.token, SECRET));
    });
  });

  describe("AC5 parameterised lookup and no secret logging", () => {
    it("passes the email only as a bound value", async () => {
      const queries: Array<{ text: string; values: unknown[] }> = [];
      const repository = createUserRepository({
        async query(text, values) {
          queries.push({ text, values });
          return { rows: [] };
        },
      });
      const evil = "x' OR '1'='1'; DROP TABLE public.users; --";
      assert.equal(await repository.findByEmail(evil), null);
      assert.equal(queries.length, 1);
      assert.match(queries[0].text, /FROM public\.users WHERE email = \$1/);
      assert.ok(!queries[0].text.includes(evil));
      assert.ok(!queries[0].text.includes("DROP"));
      assert.deepEqual(queries[0].values, [evil]);
    });

    it("maps a row to a record", async () => {
      const repository = createUserRepository({
        async query() {
          return {
            rows: [{ id: "i", email: "e@x.y", password_hash: "h", type: "user", full_name: "N" }],
          };
        },
      });
      assert.deepEqual(await repository.findByEmail("e@x.y"), {
        id: "i",
        email: "e@x.y",
        passwordHash: "h",
        type: "user",
      });
    });

    it("end-to-end: the service sends the normalised email as a bound parameter", async () => {
      const seen: unknown[][] = [];
      const repository = createUserRepository({
        async query(_text, values) {
          seen.push(values);
          return { rows: [] };
        },
      });
      const { login } = await start({ userRepository: repository });
      await login({ email: "  Jane@Example.COM ", password: PASSWORD });
      assert.deepEqual(seen, [["jane@example.com"]]);
    });

    it("never logs the password or the hash, on 401 or on 500", async () => {
      const failing: UserRepository = {
        async findByEmail() {
          throw new Error("db down");
        },
      };
      const a = await start({ userRepository: repo });
      await a.login({ email: user.email, password: "wrong-password-xyz" });
      const b = await start({ userRepository: failing });
      await b.login({ email: user.email, password: "wrong-password-xyz" });
      const logged = JSON.stringify(
        (console.error as unknown as ReturnType<typeof mock.fn>).mock.calls.map((c) => c.arguments),
      );
      assert.ok(!logged.includes("wrong-password-xyz"));
      assert.ok(!logged.includes(user.passwordHash));
    });
  });

  describe("AC7 CORS", () => {
    const get = async (origin: string, method = "GET") => {
      const { baseUrl } = await start();
      return fetch(`${baseUrl}/x`, {
        method,
        headers: {
          origin,
          ...(method === "OPTIONS" ? { "access-control-request-method": "POST" } : {}),
        },
      });
    };

    it("defaults to http://localhost:4200 and not * when CORS_ORIGIN is unset", async () => {
      delete process.env.CORS_ORIGIN;
      const res = await get("http://localhost:4200");
      assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:4200");
      const other = await get("http://evil.example");
      assert.notEqual(other.headers.get("access-control-allow-origin"), "*");
      assert.notEqual(other.headers.get("access-control-allow-origin"), "http://evil.example");
    });

    it("keeps the default when NODE_ENV=production and CORS_ORIGIN is unset", async () => {
      delete process.env.CORS_ORIGIN;
      process.env.NODE_ENV = "production";
      const res = await get("http://localhost:4200");
      assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:4200");
    });

    it("honours an explicit origin in production", async () => {
      process.env.CORS_ORIGIN = "https://app.example.test";
      process.env.NODE_ENV = "production";
      const res = await get("https://app.example.test");
      assert.equal(res.headers.get("access-control-allow-origin"), "https://app.example.test");
    });

    it("allows * when NODE_ENV is unset or non-production, never with credentials (incl. preflight)", async () => {
      process.env.CORS_ORIGIN = "*";
      for (const env of [undefined, "development", "test"]) {
        if (env === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = env;
        for (const method of ["GET", "OPTIONS"]) {
          const res = await get("http://any.test", method);
          assert.equal(res.headers.get("access-control-allow-origin"), "*", `${env}/${method}`);
          assert.equal(res.headers.get("access-control-allow-credentials"), null);
        }
      }
    });

    it("sends no Access-Control-Allow-Credentials for the default or an explicit origin", async () => {
      delete process.env.CORS_ORIGIN;
      assert.equal((await get("http://localhost:4200")).headers.get("access-control-allow-credentials"), null);
      process.env.CORS_ORIGIN = "http://example.test";
      assert.equal((await get("http://example.test")).headers.get("access-control-allow-credentials"), null);
    });

    it("throws when CORS_ORIGIN=* and NODE_ENV=production, with no listener started", () => {
      process.env.CORS_ORIGIN = "*";
      process.env.NODE_ENV = "production";
      assert.throws(() => createApp({ userRepository: repo }), /CORS_ORIGIN/);
    });
  });

  describe("AC11 rate limit", () => {
    it("429 has the spec body and headers and makes no repository call", async () => {
      const { login } = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      assert.equal((await login({ email: user.email, password: "bad" })).status, 401);
      const callsBefore = calls.length;
      const res = await login({ email: user.email, password: "bad" });
      assert.equal(res.status, 429);
      assert.deepEqual(await res.json(), {
        success: false,
        message: "Too many login attempts, please try again later",
      });
      assert.ok(Number(res.headers.get("retry-after")) > 0);
      assert.ok(res.headers.get("ratelimit") || res.headers.get("ratelimit-limit"));
      assert.equal(res.headers.get("x-ratelimit-limit"), null);
      assert.equal(calls.length, callsBefore);
    });

    it("blocks even valid credentials once the limit is exceeded", async () => {
      const { login } = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      await login({ email: user.email, password: "bad" });
      const callsBefore = calls.length;
      const res = await login({ email: user.email, password: PASSWORD });
      assert.equal(res.status, 429);
      assert.equal(calls.length, callsBefore);
    });

    it("counts 400 validation failures as attempts", async () => {
      const { login } = await start({ userRepository: repo, loginRateLimit: { max: 2 } });
      assert.equal((await login({})).status, 400);
      assert.equal((await login({})).status, 400);
      assert.equal((await login({})).status, 429);
      assert.deepEqual(calls, []);
    });

    it("does not count successful logins", async () => {
      const { login } = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      for (let i = 0; i < 4; i++) {
        assert.equal((await login({ email: user.email, password: PASSWORD })).status, 200);
      }
    });

    it("does not limit other routes", async () => {
      const { baseUrl, login } = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      await login({ email: user.email, password: "bad" });
      assert.equal((await login({ email: user.email, password: "bad" })).status, 429);
      for (let i = 0; i < 5; i++) {
        assert.equal((await fetch(`${baseUrl}/api/other`)).status, 404);
      }
    });

    it("reads LOGIN_RATE_LIMIT_MAX from the environment", async () => {
      process.env.LOGIN_RATE_LIMIT_MAX = "1";
      const { login } = await start({ userRepository: repo });
      assert.equal((await login({ email: user.email, password: "bad" })).status, 401);
      assert.equal((await login({ email: user.email, password: "bad" })).status, 429);
    });

    it("falls back to the default of 10 when LOGIN_RATE_LIMIT_MAX is invalid", async () => {
      for (const invalid of ["abc", "0", "-3", "1.5", ""]) {
        process.env.LOGIN_RATE_LIMIT_MAX = invalid;
        const { login } = await start({ userRepository: repo });
        for (let i = 0; i < 10; i++) {
          assert.equal((await login({ email: user.email, password: "bad" })).status, 401, invalid);
        }
        assert.equal((await login({ email: user.email, password: "bad" })).status, 429, invalid);
        await closeAll();
      }
    });

    it("keeps separate counters per app instance (fresh limiter per createApp)", async () => {
      const a = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      await a.login({ email: user.email, password: "bad" });
      assert.equal((await a.login({ email: user.email, password: "bad" })).status, 429);
      const b = await start({ userRepository: repo, loginRateLimit: { max: 1 } });
      assert.equal((await b.login({ email: user.email, password: "bad" })).status, 401);
    });
  });
});
