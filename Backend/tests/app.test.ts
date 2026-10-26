import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";

describe("createApp()", () => {
  let server: Server;
  let baseUrl: string;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  before(async () => {
    delete process.env.CORS_ORIGIN;
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  it("returns an Express app (callable handler with use/listen)", () => {
    const app = createApp();
    assert.equal(typeof app, "function");
    assert.equal(typeof app.use, "function");
    assert.equal(typeof app.listen, "function");
  });

  it("returns a new instance on every call", () => {
    assert.notEqual(createApp(), createApp());
  });

  it("responds 404 for an unknown GET route", async () => {
    const res = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(res.status, 404);
  });

  it("responds 404 for the root path (no routes defined)", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 404);
  });

  it("responds 404 for unknown POST route with a JSON body", async () => {
    const res = await fetch(`${baseUrl}/api/anything`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    assert.equal(res.status, 404);
  });

  it("allows the default CORS origin http://localhost:4200", async () => {
    const res = await fetch(`${baseUrl}/x`, {
      headers: { origin: "http://localhost:4200" },
    });
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "http://localhost:4200",
    );
  });

  it("does not grant CORS to a different origin", async () => {
    const res = await fetch(`${baseUrl}/x`, {
      headers: { origin: "http://evil.example" },
    });
    assert.notEqual(
      res.headers.get("access-control-allow-origin"),
      "http://evil.example",
    );
  });
});

describe("createApp() CORS_ORIGIN override", () => {
  let server: Server;
  const original = process.env.CORS_ORIGIN;

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (original === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = original;
    }
  });

  it("uses CORS_ORIGIN from the environment", async () => {
    process.env.CORS_ORIGIN = "http://example.test";
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/x`, {
      headers: { origin: "http://example.test" },
    });
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "http://example.test",
    );
  });
});
