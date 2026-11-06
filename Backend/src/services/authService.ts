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

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export interface PublicUser {
  fullName: string;
  email: string;
  type: "admin" | "user";
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
}

const BCRYPT_COST = 10;
const PG_UNIQUE_VIOLATION = "23505";

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
  dummyHash ??= bcrypt.hash("dummy-password-for-timing", BCRYPT_COST);
  return dummyHash;
}

function signToken(
  secret: string,
  user: { id: string; email: string; type: "admin" | "user" },
): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    DEFAULT_JWT_EXPIRES_IN) as SignOptions["expiresIn"];
  return jwt.sign({ id: user.id, email: user.email, type: user.type }, secret, {
    algorithm: "HS256",
    expiresIn,
  });
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
      return {
        token: signToken(secret, user),
        user: { fullName: user.fullName, email: user.email, type: user.type },
      };
    },
    async register({ fullName, email, password }) {
      const secret = getJwtSecret();
      const normalisedEmail = email.trim().toLowerCase();
      if (await userRepository.findByEmail(normalisedEmail)) {
        throw new EmailAlreadyRegisteredError();
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      let created;
      try {
        created = await userRepository.create({
          fullName: fullName.trim(),
          email: normalisedEmail,
          passwordHash,
        });
      } catch (err) {
        if ((err as { code?: unknown } | null)?.code === PG_UNIQUE_VIOLATION) {
          throw new EmailAlreadyRegisteredError();
        }
        throw err;
      }
      return {
        token: signToken(secret, created),
        user: { fullName: created.fullName, email: created.email, type: created.type },
      };
    },
  };
}
