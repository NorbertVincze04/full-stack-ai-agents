import type { Request, Response } from "express";
import { InvalidCredentialsError } from "../services/authService.ts";
import type { AuthService } from "../services/authService.ts";

interface FieldError {
  field: "email" | "password";
  message: string;
}

function validateLoginBody(body: unknown): FieldError[] {
  const data = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
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
        const token = await authService.login(email, password);
        res.status(200).json({ success: true, payload: { token } });
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          res.status(401).json({ success: false, message: "Invalid credentials" });
          return;
        }
        throw err;
      }
    },
  };
}
