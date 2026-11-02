import type { HealthRepository } from "../repositories/healthRepository.ts";

export const DEFAULT_HEALTH_TIMEOUT_MS = 2000;

export interface HealthService {
  isDatabaseUp(): Promise<boolean>;
}

export function createHealthService(
  repository: HealthRepository,
  timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS,
): HealthService {
  return {
    async isDatabaseUp() {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      });
      try {
        await Promise.race([repository.ping(), timeout]);
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
