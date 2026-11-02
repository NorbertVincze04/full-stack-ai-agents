export const DEFAULT_DB_SCHEMA = "public";

const SCHEMA_PATTERN = /^[A-Za-z0-9_-]+$/;

// Unset or empty falls back to `public`; any other value must match SCHEMA_PATTERN.
export function parseDbSchema(raw: string | undefined): string {
  if (raw === undefined || raw === "") {
    return DEFAULT_DB_SCHEMA;
  }
  if (!SCHEMA_PATTERN.test(raw)) {
    throw new Error("DB_SCHEMA must match ^[A-Za-z0-9_-]+$");
  }
  return raw;
}
