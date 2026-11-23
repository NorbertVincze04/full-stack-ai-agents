// preToolUse guard: denies shell commands that the agent "Never" rules forbid. Anything else returns {} (no decision).
const fs = require('node:fs');

const rules = [
  [/\bgit\s+push\b[^\n;|&]*(--force\b|--force-with-lease|\s-f\b)/, 'force-push is forbidden'],
  [/\bgit\s+push\b[^\n;|&]*[\s:](main|master)(\s|$)/, 'pushing main/master is forbidden'],
  [/\bgit\s+(switch\s+-[cC]\s+(?!task\/)|checkout\s+-[bB]\s+(?!task\/)|branch\s+(?!-|task\/)\S)/, 'only task/<id> branches may be created'],
  [/--no-verify\b/, 'bypassing git hooks (--no-verify) is forbidden'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work'],
  [/\bgit\s+branch\s+-[dD]\s+(?!task\/)|\bgit\s+push\b[^\n;|&]*--delete\s+(?!task\/|\S+\s+task\/)/, 'only task/<id> branches may be deleted'],
  [/\b(podman|docker)(\s+|-)compose\s+down\b[^\n;|&]*(\s-v\b|--volumes)/, 'compose down -v deletes the database volume'],
  [/\b(podman|docker)\s+(system\s+(prune|reset)|volume\s+(rm|prune))\b/, 'prune/volume removal needs human approval'],
  [/\bpodman\s+machine\s+(rm|reset|init)\b/, 'machine changes need human approval'],
  [/\bnpm\s+audit\s+fix\b/, 'npm audit fix is forbidden (dependency changes need a spec)'],
  [/\b(get-content|gc|cat|type)\s+[^\n|;&]*\.env(?!\.example)\b/, 'printing .env would expose secrets'],
];

function strings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    try { strings(JSON.parse(value), out); } catch { /* plain string */ }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) strings(v, out);
  }
  return out;
}

try {
  const event = JSON.parse(fs.readFileSync(0, 'utf8'));
  const text = strings(event.toolArgs).join('\n').toLowerCase();
  for (const [re, why] of rules) {
    if (re.test(text)) {
      process.stdout.write(JSON.stringify({
        permissionDecision: 'deny',
        permissionDecisionReason: `Blocked by .github/hooks/guard.cjs: ${why}. Ask the human to run it manually if it is really needed.`,
      }));
      process.exit(0);
    }
  }
} catch {
  // Unreadable event: make no decision rather than blocking all tools.
}
process.stdout.write('{}');
