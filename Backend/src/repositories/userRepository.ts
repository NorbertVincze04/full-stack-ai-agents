import { DEFAULT_DB_SCHEMA, parseDbSchema } from "../config/dbSchema.ts";

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  type: "admin" | "user";
}

export interface NewUser {
  fullName: string;
  email: string;
  passwordHash: string;
}

export type CreatedUser = Omit<UserRecord, "passwordHash">;

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  // Always inserts type 'user'; a duplicate e-mail rejects with the pg unique violation (code 23505).
  create(user: NewUser): Promise<CreatedUser>;
}

export interface Queryable {
  query(
    text: string,
    values: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

// `public` stays unquoted so the default query is unchanged; other (validated) schemas are quoted.
function usersTable(schema: string): string {
  const name = parseDbSchema(schema);
  return name === DEFAULT_DB_SCHEMA ? "public.users" : `"${name}".users`;
}

export function createUserRepository(
  db: Queryable,
  schema: string = DEFAULT_DB_SCHEMA,
): UserRepository {
  const table = usersTable(schema);
  const selectQuery = `SELECT id, email, password_hash, type, full_name FROM ${table} WHERE email = $1`;
  const insertQuery = `INSERT INTO ${table} (full_name, email, password_hash, type) VALUES ($1, $2, $3, 'user') RETURNING id, email, type, full_name`;
  return {
    async findByEmail(email) {
      const result = await db.query(selectQuery, [email]);
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        id: row.id as string,
        fullName: row.full_name as string,
        email: row.email as string,
        passwordHash: row.password_hash as string,
        type: row.type as "admin" | "user",
      };
    },
    async create(user) {
      const result = await db.query(insertQuery, [
        user.fullName,
        user.email,
        user.passwordHash,
      ]);
      const row = result.rows[0];
      return {
        id: row.id as string,
        fullName: row.full_name as string,
        email: row.email as string,
        type: row.type as "admin" | "user",
      };
    },
  };
}

// Used when createApp() gets no repository (e.g. tests that do not touch auth).
export const unconfiguredUserRepository: UserRepository = {
  async findByEmail() {
    throw new Error("User repository is not configured");
  },
  async create() {
    throw new Error("User repository is not configured");
  },
};
