import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";

export interface AuthenticatedUser {
  id: string;
  name?: string;
  email?: string;
  type?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unauthorized(res: Parameters<RequestHandler>[1]): void {
  res.status(401).json({ success: false, message: "Authentication required" });
}

// Verifies the HS256 Bearer token and sets res.locals.user from its claims (identity comes from the token only).
export function createAuthenticate(): RequestHandler {
  return (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set");
    }
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
    if (!match) {
      unauthorized(res);
      return;
    }
    let claims: string | jwt.JwtPayload;
    try {
      claims = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    } catch {
      unauthorized(res);
      return;
    }
    if (typeof claims === "string" || typeof claims.id !== "string" || !UUID_PATTERN.test(claims.id)) {
      unauthorized(res);
      return;
    }
    const user: AuthenticatedUser = {
      id: claims.id,
      ...(typeof claims.name === "string" ? { name: claims.name } : {}),
      email: typeof claims.email === "string" ? claims.email : undefined,
      type: typeof claims.type === "string" ? claims.type : undefined,
    };
    res.locals.user = user;
    next();
  };
}
