import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.ts";
import { parseDbSchema } from "../src/config/dbSchema.ts";
import { createUserRepository } from "../src/repositories/userRepository.ts";
import type { Queryable } from "../src/repositories/userRepository.ts";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..");

async function listen(options: Parameters<typeof createApp>[0]) {
  const server: Server = createApp(options).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { baseUrl, close };
}

describe("GET /api/health", () => {
  const SECRET_DETAIL = "connect ECONNREFUSED 10.1.2.3:5432 password=hunter2";
  const queries: string[] = [];
  const logged: string[] = [];
  const originalError = console.error;
  const apps: Array<() => Promise<void>> = [];

  before(() => {
    console.error = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };
  });

  after(async () => {
    console.error = originalError;
    for (const close of apps) {
      await close();
    }
  });

  async function start(options: Parameters<typeof createApp>[0]) {
    const app = await listen(options);
    apps.push(app.close);
    return app.baseUrl;
  }

  it("returns 200 { success, payload: { status: ok } } when SELECT 1 succeeds", async () => {
    const probe: Queryable = {
      async query(text) {
        queries.push(text);
        return { rows: [{ "?column?": 1 }] };
      },
    };
    const baseUrl = await start({ dbProbe: probe });
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, payload: { status: "ok" } });
    assert.deepEqual(queries, ["SELECT 1"]);
  });

  it("needs no authentication", async () => {
    const baseUrl = await start({ dbProbe: { async query() { return { rows: [] }; } } });
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
  });

  it("returns 503 with a fixed body when the probe rejects, leaking nothing", async () => {
    logged.length = 0;
    const baseUrl = await start({
      dbProbe: {
        async query() {
          throw new Error(SECRET_DETAIL);
        },
      },
    });
    const res = await fetch(`${baseUrl}/api/health`);
    const text = await res.text();
    assert.equal(res.status, 503);
    assert.deepEqual(JSON.parse(text), { success: false, message: "Database unavailable" });
    for (const secret of ["ECONNREFUSED", "10.1.2.3", "hunter2"]) {
      assert.ok(!text.includes(secret));
      assert.ok(logged.every((line) => !line.includes(secret)));
    }
  });

  it("returns 503 when the probe does not answer within the timeout", async () => {
    const baseUrl = await start({
      dbProbe: { query: () => new Promise(() => {}) },
      healthTimeoutMs: 50,
    });
    const started = Date.now();
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { success: false, message: "Database unavailable" });
    assert.ok(Date.now() - started < 2000);
  });

  it("returns 503 when createApp() gets no DB probe", async () => {
    const baseUrl = await start({});
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { success: false, message: "Database unavailable" });
  });
});

describe("DB_SCHEMA validation", () => {
  it("defaults to public when unset or empty", () => {
    assert.equal(parseDbSchema(undefined), "public");
    assert.equal(parseDbSchema(""), "public");
  });

  it("accepts public and ico-env", () => {
    assert.equal(parseDbSchema("public"), "public");
    assert.equal(parseDbSchema("ico-env"), "ico-env");
  });

  it("rejects unsafe values", () => {
    for (const bad of ['a"b', "a b", "a;b", "a.b", 'x"; DROP TABLE users; --', "a\nb", "ico-env\n"]) {
      assert.throws(() => parseDbSchema(bad), /DB_SCHEMA/, JSON.stringify(bad));
    }
  });

  it("makes server.ts exit 1 on an invalid DB_SCHEMA without echoing it", async () => {
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      const child = spawn(process.execPath, ["src/server.ts"], {
        cwd: backendDir,
        env: {
          ...process.env,
          PORT: "0",
          JWT_SECRET: "test-secret",
          DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/ico-env",
          DB_SCHEMA: 'bad"schema',
        },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("exit", (code) => resolve({ code, stderr }));
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /DB_SCHEMA/);
    assert.ok(!result.stderr.includes("bad"));
  });
});

describe("login query schema", () => {
  async function capture(schema?: string) {
    const queries: Array<{ text: string; values: unknown[] }> = [];
    const repository = createUserRepository(
      {
        async query(text, values) {
          queries.push({ text, values });
          return { rows: [] };
        },
      },
      schema,
    );
    await repository.findByEmail("a@b.c");
    return queries[0];
  }

  it("uses public.users by default", async () => {
    const q = await capture();
    assert.equal(
      q.text,
      "SELECT id, email, password_hash, type, full_name FROM public.users WHERE email = $1",
    );
    assert.deepEqual(q.values, ["a@b.c"]);
  });

  it("uses public.users for DB_SCHEMA=public", async () => {
    assert.match((await capture("public")).text, /FROM public\.users WHERE email = \$1$/);
  });

  it('uses "ico-env".users for DB_SCHEMA=ico-env', async () => {
    const q = await capture("ico-env");
    assert.match(q.text, /FROM "ico-env"\.users WHERE email = \$1$/);
    assert.deepEqual(q.values, ["a@b.c"]);
  });

  it("refuses to build a query for an unsafe schema", () => {
    assert.throws(
      () => createUserRepository({ async query() { return { rows: [] }; } }, 'x"; DROP'),
      /DB_SCHEMA/,
    );
  });
});
