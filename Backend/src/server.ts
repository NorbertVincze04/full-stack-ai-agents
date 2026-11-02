import "dotenv/config";
import pg from "pg";
import { createApp } from "./app.ts";
import { parseDbSchema } from "./config/dbSchema.ts";
import { createUserRepository } from "./repositories/userRepository.ts";

const missing = ["JWT_SECRET", "DATABASE_URL"].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

let dbSchema: string;
try {
  dbSchema = parseDbSchema(process.env.DB_SCHEMA);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Invalid DB_SCHEMA");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});
pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

const server = createApp({
  userRepository: createUserRepository(pool, dbSchema),
  dbProbe: pool,
}).listen(port, () => {
  console.log("hello world");
});

function shutdown(): void {
  // Hard stop if connections do not drain in time.
  setTimeout(() => process.exit(1), 5000).unref();
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  server.closeIdleConnections();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
