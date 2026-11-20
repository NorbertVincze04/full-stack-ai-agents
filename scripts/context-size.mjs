// Estimates how much text (about chars/4 = tokens) an agent call loads. Usage: node scripts/context-size.mjs [task-id]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const taskId = process.argv[2];
const text = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const tokens = (p) => Math.ceil(text(p).length / 4);
const lines = (p) => (text(p) ? text(p).split('\n').length : 0);
const row = (name, p) => `${name.padEnd(46)} ${String(lines(p)).padStart(5)} ${String(tokens(p)).padStart(7)}`;

const agentFiles = readdirSync(join(root, '.github/agents')).filter((f) => f.endsWith('.agent.md'));
const agents = agentFiles.map((f) => {
  const t = text(`.github/agents/${f}`);
  return { slug: basename(f, '.agent.md'), name: t.match(/^name: "?([^"\n]+)"?/m)?.[1], file: `.github/agents/${f}` };
});
const skills = readdirSync(join(root, '.github/skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = `.github/skills/${d.name}`;
    const files = readdirSync(join(root, dir)).map((f) => `${dir}/${f}`);
    const owner = text(`${dir}/SKILL.md`).match(/^Agent: `([^`]+)`/m)?.[1];
    return { name: d.name, dir, owner, main: `${dir}/SKILL.md`, files };
  });

console.log('file'.padEnd(46), 'lines', 'tokens');
console.log('-- skills (SKILL.md is loaded on every use, annexes only when referenced)');
for (const s of skills) {
  console.log(row(s.name, s.main));
  for (const f of s.files.filter((x) => x !== s.main)) console.log(row(`  + ${basename(f)}`, f));
}
console.log('-- agents + their context files');
for (const a of agents) {
  console.log(row(a.slug, a.file), '|', row(`docs/agents/${a.slug}.md`, `docs/agents/${a.slug}.md`).trim());
}
console.log('-- shared context (read by most calls)');
for (const p of ['docs/context/project.md', 'docs/context/frontend.md', 'docs/context/backend.md', 'docs/context/containers.md', 'docs/context/pipelines.md']) console.log(row(p, p));
if (taskId) {
  for (const p of [`docs/runs/${taskId}/brief.md`, `docs/specs/${taskId}.md`]) console.log(row(p, p));
}

console.log('\nEstimated fixed load of one call (agent + its largest skill + agent context + project.md + the largest area context):');
const area = Math.max(...['frontend', 'backend', 'containers', 'pipelines'].map((a) => tokens(`docs/context/${a}.md`)));
for (const a of agents) {
  const own = skills.filter((s) => s.owner === a.name);
  const biggest = own.reduce((m, s) => Math.max(m, tokens(s.main)), 0);
  const total = tokens(a.file) + biggest + tokens(`docs/agents/${a.slug}.md`) + tokens('docs/context/project.md') + area;
  console.log(`${a.slug.padEnd(20)} ~${total} tokens`);
}
