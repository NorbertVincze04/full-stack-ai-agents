import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createAuthenticate } from "../src/middleware/authenticate.ts";

const SECRET = "unit-test-secret";
const ID = "22222222-2222-4222-8222-222222222222";

interface Outcome {
  status?: number;
  body?: unknown;
  nextCalled: boolean;
  locals: Record<string, unknown>;
}

function run(authorization?: string): Outcome {
  const out: Outcome = { nextCalled: false, locals: {} };
  const res = {
    locals: out.locals,
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    },
  };
  const req = { headers: authorization === undefined ? {} : { authorization } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (createAuthenticate() as any)(req, res, () => {
    out.nextCalled = true;
  });
  return out;
}

const sign = (payload: object, opts: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign(payload, secret, { algorithm: "HS256", ...opts });

describe("authenticate middleware (FR10)", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
  });

  it("accepts a valid token and sets res.locals.user from the claims", () => {
    const out = run(`Bearer ${sign({ id: ID, email: "a@b.co", type: "user" })}`);
    assert.equal(out.nextCalled, true);
    assert.deepEqual(out.locals.user, { id: ID, email: "a@b.co", type: "user" });
  });

  it("accepts the lower-case bearer scheme", () => {
    assert.equal(run(`bearer ${sign({ id: ID })}`).nextCalled, true);
  });

  const rejects: Array<[string, () => string | undefined]> = [
    ["missing header", () => undefined],
    ["empty header", () => ""],
    ["wrong scheme", () => `Basic ${sign({ id: ID })}`],
    ["no token after Bearer", () => "Bearer"],
    ["garbage token", () => "Bearer not.a.jwt"],
    ["wrong secret", () => `Bearer ${sign({ id: ID }, {}, "other-secret")}`],
    ["expired token", () => `Bearer ${sign({ id: ID }, { expiresIn: -10 })}`],
    ["alg none", () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
      return `Bearer ${b64({ alg: "none", typ: "JWT" })}.${b64({ id: ID })}.`;
    }],
    ["HS512 token", () => `Bearer ${sign({ id: ID }, { algorithm: "HS512" })}`],
    ["id claim missing", () => `Bearer ${sign({ email: "a@b.co" })}`],
    ["id claim not a uuid", () => `Bearer ${sign({ id: "42" })}`],
    ["id claim not a string", () => `Bearer ${sign({ id: 42 })}`],
  ];
  for (const [label, header] of rejects) {
    it(`401 for ${label}`, () => {
      const out = run(header());
      assert.equal(out.status, 401);
      assert.deepEqual(out.body, { success: false, message: "Authentication required" });
      assert.equal(out.nextCalled, false);
      assert.equal(out.locals.user, undefined);
    });
  }

  it("throws when JWT_SECRET is not set (surfaces as 500)", () => {
    delete process.env.JWT_SECRET;
    assert.throws(() => run(`Bearer ${sign({ id: ID })}`), /JWT_SECRET/);
  });
});
