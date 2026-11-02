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

const requiredEnv = {
  JWT_SECRET: "test-secret",
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/ico-env",
};

describe("server startup", () => {
  it("exits non-zero when JWT_SECRET and DATABASE_URL are missing", async () => {
    const result = await new Promise<{ code: number | null; stderr: string }>(
      (resolve) => {
        const child = spawn(process.execPath, ["src/server.ts"], {
          cwd: backendDir,
          env: { ...process.env, PORT: "0", JWT_SECRET: "", DATABASE_URL: "" },
          stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on("exit", (code) => resolve({ code, stderr }));
      },
    );
    assert.equal(result.code, 1);
    assert.match(result.stderr, /JWT_SECRET, DATABASE_URL/);
  });

  it("logs exactly `hello world` on startup (node src/server.ts)", async () => {
    const { stdout, stderr } = await runUntilLine(["src/server.ts"], {
      PORT: "0",
      ...requiredEnv,
    });
    assert.equal(stdout.trim(), "hello world");
    assert.equal(stderr, "");
  });

  it("logs `hello world` from the compiled build when dist/ exists", async (t) => {
    if (!existsSync(join(backendDir, "dist", "server.js"))) {
      t.skip("dist/ not built; run `npm run build` first");
      return;
    }
    const { stdout } = await runUntilLine(["dist/server.js"], {
      PORT: "0",
      ...requiredEnv,
    });
    assert.equal(stdout.trim(), "hello world");
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    // Windows cannot deliver POSIX signals to a child; kill() is a hard terminate there.
    it(`shuts down gracefully with exit 0 on ${signal}`, async (t) => {
      if (process.platform === "win32") {
        t.skip("POSIX signals are not deliverable on Windows");
        return;
      }
      const code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, ["src/server.ts"], {
          cwd: backendDir,
          env: { ...process.env, PORT: "0", ...requiredEnv },
          stdio: ["ignore", "pipe", "ignore"],
        });
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("no graceful exit within 10 s"));
        }, 10000);
        child.stdout.on("data", (chunk: Buffer) => {
          if (chunk.toString().includes("hello world")) child.kill(signal);
        });
        child.on("exit", (exitCode) => {
          clearTimeout(timer);
          resolve(exitCode);
        });
      });
      assert.equal(code, 0);
    });
  }
});
