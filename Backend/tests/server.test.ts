import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function runUntilLine(
  args: string[],
  env: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: backendDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout; stdout=${stdout} stderr=${stderr}`));
    }, 15000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.includes("hello world")) {
        clearTimeout(timer);
        child.kill();
        resolve({ stdout, stderr });
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("exit", (code) => {
      if (!stdout.includes("hello world")) {
        clearTimeout(timer);
        reject(new Error(`exited ${code}; stdout=${stdout} stderr=${stderr}`));
      }
    });
  });
}

describe("server startup", () => {
  it("logs exactly `hello world` on startup (node src/server.ts)", async () => {
    const { stdout, stderr } = await runUntilLine(["src/server.ts"], {
      PORT: "0",
    });
    assert.equal(stdout.trim(), "hello world");
    assert.equal(stderr, "");
  });

  it("logs `hello world` from the compiled build when dist/ exists", async (t) => {
    if (!existsSync(join(backendDir, "dist", "server.js"))) {
      t.skip("dist/ not built; run `npm run build` first");
      return;
    }
    const { stdout } = await runUntilLine(["dist/server.js"], { PORT: "0" });
    assert.equal(stdout.trim(), "hello world");
  });
});
