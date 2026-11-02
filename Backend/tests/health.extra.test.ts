import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import { parseDbSchema } from "../src/config/dbSchema.ts";
import type { Queryable } from "../src/repositories/userRepository.ts";

const UNAVAILABLE = { success: false, message: "Database unavailable" };

describe("GET /api/health (additional spec cases)", () => {
  const servers: Server[] = [];
  const originalError = console.error;
  const logged: string[] = [];

  before(() => {
    console.error = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };
  });

  after(async () => {
    console.error = originalError;
    await Promise.all(
      servers.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
    );
  });

  async function start(options: Parameters<typeof createApp>[0]) {
    const server = createApp(options).listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  const okProbe: Queryable = { async query() { return { rows: [{ "?column?": 1 }] }; } };

  it("is public: ignores a bogus Authorization header", async () => {
    const baseUrl = await start({ dbProbe: okProbe });
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Authorization: "Bearer not-a-token" },
    });
    assert.equal(res.status, 200);
  });

  it("is not rate limited: 30 rapid requests all answer 200", async () => {
    const baseUrl = await start({ dbProbe: okProbe });
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200, `request ${i + 1}`);
    }
  });

  it("returns 503 with the fixed body when the probe throws synchronously", async () => {
    const baseUrl = await start({
      dbProbe: {
        query() {
          throw new Error("sync failure at 10.9.9.9");
        },
      },
    });
    const res = await fetch(`${baseUrl}/api/health`);
    const text = await res.text();
    assert.equal(res.status, 503);
    assert.deepEqual(JSON.parse(text), UNAVAILABLE);
    assert.ok(!text.includes("10.9.9.9"));
  });

  it("returns 200 again after a failure (no sticky state)", async () => {
    let fail = true;
    const baseUrl = await start({
      dbProbe: {
        async query() {
          if (fail) throw new Error("down");
          return { rows: [] };
        },
      },
    });
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 503);
    fail = false;
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  });

  it("success body has exactly the keys success and payload.status", async () => {
    const baseUrl = await start({ dbProbe: okProbe });
    const body = (await (await fetch(`${baseUrl}/api/health`)).json()) as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), ["payload", "success"]);
    assert.deepEqual(Object.keys(body.payload as object), ["status"]);
  });

  it("does not accept POST on /api/health", async () => {
    const baseUrl = await start({ dbProbe: okProbe });
    const res = await fetch(`${baseUrl}/api/health`, { method: "POST" });
    assert.equal(res.status, 404);
  });

  it("keeps unknown routes at 404 and login mounted", async () => {
    const baseUrl = await start({ dbProbe: okProbe });
    assert.equal((await fetch(`${baseUrl}/api/unknown`)).status, 404);
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

describe("DB_SCHEMA validation (additional unsafe values)", () => {
  it("rejects whitespace, path, quote and non-ASCII values", () => {
    for (const bad of [" ", " public", "public ", "../x", "a/b", "a'b", "a`b", "schéma", "a\tb", "a\0b", "a--b;"]) {
      assert.throws(() => parseDbSchema(bad), /DB_SCHEMA/, JSON.stringify(bad));
    }
  });

  it("accepts other safe identifiers", () => {
    for (const ok of ["a", "A_b-9", "_x", "-"]) {
      assert.equal(parseDbSchema(ok), ok);
    }
  });

  it("error message does not echo the rejected value", () => {
    assert.throws(
      () => parseDbSchema("secret;value"),
      (err: Error) => !err.message.includes("secret"),
    );
  });
});
