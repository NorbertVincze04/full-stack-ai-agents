import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { UserRepository } from "../repositories/userRepository.ts";

export const DEFAULT_JWT_EXPIRES_IN = "8h";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export interface AuthService {
  login(email: string, password: string): Promise<string>;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

// Compared against when the user does not exist, to even out response timing.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("dummy-password-for-timing", 10);
  return dummyHash;
}

export function createAuthService(userRepository: UserRepository): AuthService {
  return {
    async login(email, password) {
      const secret = getJwtSecret();
      const user = await userRepository.findByEmail(email.trim().toLowerCase());
      const matches = await bcrypt.compare(
        password,
        user ? user.passwordHash : await getDummyHash(),
      );
      if (!user || !matches) {
        throw new InvalidCredentialsError();
      }
      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        DEFAULT_JWT_EXPIRES_IN) as SignOptions["expiresIn"];
      return jwt.sign(
        { id: user.id, email: user.email, type: user.type },
        secret,
        { algorithm: "HS256", expiresIn },
      );
    },
  };
}
