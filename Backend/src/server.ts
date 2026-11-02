import "dotenv/config";
import pg from "pg";
import { createApp } from "./app.ts";
import { createUserRepository } from "./repositories/userRepository.ts";

const missing = ["JWT_SECRET", "DATABASE_URL"].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

createApp({ userRepository: createUserRepository(pool) }).listen(port, () => {
  console.log("hello world");
});
