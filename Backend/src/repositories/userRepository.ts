export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  type: "admin" | "user";
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
}

export interface Queryable {
  query(
    text: string,
    values: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export function createUserRepository(db: Queryable): UserRepository {
  return {
    async findByEmail(email) {
      const result = await db.query(
        "SELECT id, email, password_hash, type FROM public.users WHERE email = $1",
        [email],
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        id: row.id as string,
        email: row.email as string,
        passwordHash: row.password_hash as string,
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
};
