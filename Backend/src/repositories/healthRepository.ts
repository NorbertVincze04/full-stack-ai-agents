import type { Queryable } from "./userRepository.ts";

export interface HealthRepository {
  ping(): Promise<void>;
}

export function createHealthRepository(db: Queryable): HealthRepository {
  return {
    async ping() {
      await db.query("SELECT 1", []);
    },
  };
}

// Used when createApp() gets no DB probe: the health route then answers 503.
export const unconfiguredHealthRepository: HealthRepository = {
  async ping() {
    throw new Error("Database probe is not configured");
  },
};
