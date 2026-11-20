// Keeps docs/agents/*.md small: merges the oldest table rows of "## Tasks" and "## Defects and lessons" into one "Earlier" row.
// Usage: node scripts/compact-agent-context.mjs [--write] [file ...]   (without --write it only reports)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MAX_ROWS = 12;
const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter((a) => !a.startsWith('--'));
const targets = files.length
  ? files
  : readdirSync(join(root, 'docs/agents')).filter((f) => f.endsWith('.md')).map((f) => `docs/agents/${f}`);

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const short = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`/g, '').slice(0, 40);

function compactSection(lines, heading) {
  const start = lines.findIndex((l) => l.startsWith(heading));
  if (start < 0) return 0;
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith('|')) { if (lines[i].startsWith('## ')) return 0; i++; }
  const headerIdx = i;
  const first = headerIdx + 2; // header, separator
  let end = first;
  while (end < lines.length && lines[end].startsWith('|')) end++;
  const rows = lines.slice(first, end);
  if (rows.length <= MAX_ROWS) return 0;
  const cols = cells(lines[headerIdx]).length;
  const keep = rows.slice(-(MAX_ROWS - 1));
  const old = rows.slice(0, rows.length - keep.length);
  const names = old.filter((r) => !/^\| Earlier /.test(r)).map((r) => short(cells(r)[0]));
  const previous = old.filter((r) => /^\| Earlier /.test(r)).map((r) => cells(r)[1]);
  const summary = `${[...previous, ...names].join('; ')} (details in docs/handover and docs/runs)`;
  const merged = ['| Earlier tasks', summary, ...Array(Math.max(0, cols - 2)).fill('-')].join(' | ') + ' |';
  lines.splice(first, end - first, merged, ...keep);
  return rows.length - keep.length;
}

let changed = 0;
for (const f of targets) {
  const path = join(root, f);
  const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const merged = compactSection(lines, '## Tasks') + compactSection(lines, '## Defects and lessons');
  if (merged) {
    changed++;
    console.log(`${f}: ${merged} old rows ${write ? 'merged' : 'would be merged (use --write)'}`);
    if (write) writeFileSync(path, lines.join('\n'));
  }
}
if (!changed) console.log('nothing to compact');
