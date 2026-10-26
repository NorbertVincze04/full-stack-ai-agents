// Launches the Azure DevOps MCP server with PAT auth.
// The server expects PERSONAL_ACCESS_TOKEN = base64("<any-email>:<pat>"), which mcp.json inputs cannot compute.
import { spawn } from "node:child_process";

const org = process.argv[2];
const pat = process.env.ADO_PAT;

if (!org || !/^[A-Za-z0-9._-]+$/.test(org)) {
  console.error("Missing or invalid Azure DevOps organization name.");
  process.exit(1);
}
if (!pat) {
  console.error("ADO_PAT is not set.");
  process.exit(1);
}

// NODE_USE_ENV_PROXY makes Node's fetch honor HTTP(S)_PROXY (needed behind the corporate proxy).
const env = { ...process.env, NODE_USE_ENV_PROXY: "1", PERSONAL_ACCESS_TOKEN: Buffer.from(`agent:${pat}`).toString("base64") };
delete env.ADO_PAT;

// Domains limited to what the agents need; `core` is required by the server.
const child = spawn(
  "npx",
  ["-y", "@azure-devops/mcp", org, "--authentication", "pat", "-d", "core", "work-items"],
  { stdio: "inherit", env, shell: process.platform === "win32" },
);

child.on("exit", (code) => process.exit(code ?? 1));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
