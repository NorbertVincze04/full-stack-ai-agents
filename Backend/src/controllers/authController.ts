import type { Request, Response } from "express";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from "../services/authService.ts";
import type { AuthService } from "../services/authService.ts";

interface FieldError {
  field: "fullName" | "email" | "password";
  message: string;
}

const MAX_FULL_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 bytes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(body: unknown): Record<string, unknown> {
  return (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
}

function validateRegisterBody(body: unknown): FieldError[] {
  const data = asRecord(body);
  const errors: FieldError[] = [];

  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  if (typeof data.fullName !== "string" || fullName === "") {
    errors.push({ field: "fullName", message: "fullName is required and must be a non-empty string" });
  } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.push({
      field: "fullName",
      message: `fullName must be at most ${MAX_FULL_NAME_LENGTH} characters`,
    });
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (typeof data.email !== "string" || email === "") {
    errors.push({ field: "email", message: "email is required and must be a non-empty string" });
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.push({ field: "email", message: `email must be at most ${MAX_EMAIL_LENGTH} characters` });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "email must be a valid email address" });
  }

  const password = data.password;
  if (typeof password !== "string" || password === "") {
    errors.push({
      field: "password",
      message: "password is required and must be a non-empty string",
    });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push({
      field: "password",
      message: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  } else if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    errors.push({
      field: "password",
      message: `password must be at most ${MAX_PASSWORD_BYTES} bytes`,
    });
  } else if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    errors.push({
      field: "password",
      message: "password must contain at least one letter and one digit",
    });
  }

  return errors;
}

function validateLoginBody(body: unknown): FieldError[] {
  const data = asRecord(body);
  const errors: FieldError[] = [];
  if (typeof data.email !== "string" || data.email.trim() === "") {
    errors.push({ field: "email", message: "email is required and must be a non-empty string" });
  }
  if (typeof data.password !== "string" || data.password === "") {
    errors.push({
      field: "password",
      message: "password is required and must be a non-empty string",
    });
  }
  return errors;
}

export function createAuthController(authService: AuthService) {
  return {
    async login(req: Request, res: Response): Promise<void> {
      const errors = validateLoginBody(req.body);
      if (errors.length > 0) {
        res.status(400).json({ success: false, message: "Validation failed", errors });
        return;
      }
      const { email, password } = req.body as { email: string; password: string };
      try {
        const result = await authService.login(email, password);
        res.status(200).json({ success: true, payload: result });
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          res.status(401).json({ success: false, message: "Invalid credentials" });
          return;
        }
        throw err;
      }
    },

    async register(req: Request, res: Response): Promise<void> {
      const errors = validateRegisterBody(req.body);
      if (errors.length > 0) {
        res.status(400).json({ success: false, message: "Validation failed", errors });
        return;
      }
      // Only these three fields are read; `type` and anything else in the body is ignored.
      const { fullName, email, password } = req.body as {
        fullName: string;
        email: string;
        password: string;
      };
      try {
        const result = await authService.register({ fullName, email, password });
        res.status(201).json({ success: true, payload: result });
      } catch (err) {
        if (err instanceof EmailAlreadyRegisteredError) {
          res.status(409).json({ success: false, message: "Email already registered" });
          return;
        }
        throw err;
      }
    },
  };
}
