// Static checks for the agent setup: skills, agents, per-agent context files, config. Usage: node scripts/check-agents.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const warnings = [];
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const rel = (p) => p.replace(/\\/g, '/');

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const agentsDir = '.github/agents';
const skillsDir = '.github/skills';
const agentFiles = readdirSync(join(root, agentsDir)).filter((f) => f.endsWith('.agent.md'));
const agentNames = new Set();
for (const f of agentFiles) {
  const fm = frontmatter(read(`${agentsDir}/${f}`));
  if (fm?.name) agentNames.add(fm.name.replace(/^"|"$/g, ''));
}

// Skills
const skillNames = new Set();
for (const dir of readdirSync(join(root, skillsDir), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = `${skillsDir}/${dir.name}/SKILL.md`;
  if (!existsSync(join(root, path))) { errors.push(`${path}: missing`); continue; }
  const text = read(path);
  const fm = frontmatter(text);
  if (!fm) { errors.push(`${path}: no frontmatter`); continue; }
  skillNames.add(dir.name);
  if (fm.name !== dir.name) errors.push(`${path}: name "${fm.name}" must equal the folder name`);
  if (!fm.description) errors.push(`${path}: description missing`);
  else if (fm.description.length > 1026) errors.push(`${path}: description longer than 1024 characters`);
  if (!fm['argument-hint']) errors.push(`${path}: argument-hint missing`);
  if (!['true', 'false'].includes(fm['user-invocable'])) errors.push(`${path}: user-invocable must be true or false`);
  for (const h of ['# Get task', '## Steps', '## When it fails', '## Never']) {
    if (!text.split('\n').includes(h)) errors.push(`${path}: missing section "${h}"`);
  }
  const owner = text.match(/^Agent: `([^`]+)`/m);
  if (!owner) errors.push(`${path}: missing "Agent:" line`);
  else if (!agentNames.has(owner[1])) errors.push(`${path}: unknown agent "${owner[1]}"`);
}

// Agents and their context files
for (const f of agentFiles) {
  const path = `${agentsDir}/${f}`;
  const text = read(path);
  const fm = frontmatter(text);
  if (!fm) { errors.push(`${path}: no frontmatter`); continue; }
  for (const k of ['name', 'description', 'tools']) if (!fm[k]) errors.push(`${path}: ${k} missing`);
  const list = fm.agents?.match(/"([^"]+)"/g) ?? [];
  for (const a of list.map((s) => s.slice(1, -1))) {
    if (!agentNames.has(a)) errors.push(`${path}: agents list names unknown agent "${a}"`);
  }
  const slug = basename(f, '.agent.md');
  const ctx = `docs/agents/${slug}.md`;
  if (!existsSync(join(root, ctx))) errors.push(`${path}: context file ${ctx} missing`);
  else if (!text.includes(ctx)) errors.push(`${path}: does not mention ${ctx}`);
}

for (const f of readdirSync(join(root, 'docs/agents')).filter((n) => n.endsWith('.md'))) {
  const path = `docs/agents/${f}`;
  const text = read(path);
  const lines = text.split('\n').length;
  if (lines > 90) errors.push(`${path}: ${lines} lines, limit is about 80 (merge old rows into "Earlier tasks")`);
  for (const h of ['## Tasks', '## Defects and lessons', '## Open items']) {
    if (!text.split('\n').some((l) => l.startsWith(h))) errors.push(`${path}: missing section "${h}"`);
  }
  if (!/^> Updated: \d{4}-\d{2}-\d{2}/m.test(text)) errors.push(`${path}: missing "> Updated: <date>" line`);
  if (!agentFiles.includes(`${basename(f, '.md')}.agent.md`)) errors.push(`${path}: no matching agent`);
}

// Paths mentioned in agents and skills must exist
const mentioned = [];
for (const f of agentFiles) mentioned.push([`${agentsDir}/${f}`, read(`${agentsDir}/${f}`)]);
for (const s of skillNames) mentioned.push([`${skillsDir}/${s}/SKILL.md`, read(`${skillsDir}/${s}/SKILL.md`)]);
for (const [path, text] of mentioned) {
  for (const m of text.matchAll(/`((?:docs\/agents\/[a-z-]+\.md)|(?:\.github\/skills\/[a-z-]+\/[A-Za-z.-]+))`/g)) {
    if (!existsSync(join(root, m[1]))) errors.push(`${path}: references missing file ${m[1]}`);
  }
}

// Config
try {
  const cfg = JSON.parse(read('.github/config.json'));
  for (const k of ['tdd', 'tddFirst', 'e2e', 'security', 'reviewers', 'maxFixIterations', 'maxTestFixLoops']) {
    if (!(k in (cfg.workflow ?? {}))) errors.push(`.github/config.json: workflow.${k} missing`);
  }
  if (!cfg.pipelines?.branches?.integration || !cfg.pipelines?.branches?.release) errors.push('.github/config.json: pipelines.branches incomplete');
} catch (e) {
  errors.push(`.github/config.json: ${e.message}`);
}

// Task consistency (warnings: legacy tasks predate some of these artifacts)
for (const f of readdirSync(join(root, 'docs/tasks')).filter((n) => n.endsWith('.md'))) {
  const id = basename(f, '.md');
  const status = frontmatter(read(`docs/tasks/${f}`))?.status;
  if (status === 'done') {
    if (!existsSync(join(root, `docs/specs/${id}.md`))) warnings.push(`task ${id}: done but no spec`);
    if (!existsSync(join(root, `docs/handover/${id}.md`))) warnings.push(`task ${id}: done but no handover`);
    const spec = existsSync(join(root, `docs/specs/${id}.md`)) ? read(`docs/specs/${id}.md`) : '';
    if (/^Status:.*(stays `implemented`|not yet|pending)/mi.test(spec)) warnings.push(`task ${id}: done but docs/specs/${id}.md still says it is not accepted`);
  }
}

for (const w of warnings) console.warn(`warning: ${rel(w)}`);
for (const e of errors) console.error(`error: ${rel(e)}`);
console.log(`${skillNames.size} skills, ${agentFiles.length} agents, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
