// Collects repository facts for the discovery agent (no interpretation, no secrets).
// Usage: node scripts/discovery-scan.mjs scan            -> JSON facts of the whole repo
//        node scripts/discovery-scan.mjs stale [file]    -> is docs/discovery.md still current? JSON verdict
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const [mode = 'scan', arg] = process.argv.slice(2);

const SKIP = /(^|\/)(node_modules|\.git|dist|build|out|\.angular|coverage|\.venv|venv|__pycache__|target|\.next|\.cache|\.gradle)\//;
const TOOLING = new Set([
  'scripts/check-agents.mjs', 'scripts/compact-agent-context.mjs', 'scripts/context-size.mjs',
  'scripts/ado-mcp.mjs', 'scripts/discovery-scan.mjs',
]);
const LANGS = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.java': 'Java', '.kt': 'Kotlin', '.cs': 'C#', '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.php': 'PHP',
  '.swift': 'Swift', '.c': 'C', '.h': 'C', '.cpp': 'C++', '.vue': 'Vue', '.svelte': 'Svelte', '.sql': 'SQL', '.sh': 'Shell',
  '.ps1': 'PowerShell', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
};
const NOT_CODE = new Set(['HTML', 'CSS', 'SCSS', 'SQL', 'Shell', 'PowerShell']);
const MANIFESTS = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod',
  'Cargo.toml', 'composer.json', 'Gemfile', 'mix.exs', 'pubspec.yaml',
]);
const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'Pipfile.lock', 'Cargo.lock', 'go.sum', 'composer.lock', 'Gemfile.lock']);
const HINTS = {
  '@angular/core': 'Angular', react: 'React', vue: 'Vue', svelte: 'Svelte', next: 'Next.js', nuxt: 'Nuxt', express: 'Express',
  fastify: 'Fastify', '@nestjs/core': 'NestJS', koa: 'Koa', pg: 'PostgreSQL client (pg)', mysql2: 'MySQL client', mongoose: 'MongoDB (mongoose)',
  prisma: 'Prisma', typeorm: 'TypeORM', sequelize: 'Sequelize', jest: 'Jest', vitest: 'Vitest', mocha: 'Mocha', karma: 'Karma',
  jasmine: 'Jasmine', playwright: 'Playwright', cypress: 'Cypress', typescript: 'TypeScript', tsx: 'tsx', jsonwebtoken: 'JWT',
  bcryptjs: 'bcrypt', bcrypt: 'bcrypt', primeng: 'PrimeNG', rxjs: 'RxJS',
};

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null;
  }
};
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };

function walk(dir, out) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (SKIP.test(`${rel}/`)) continue;
    if (e.isDirectory()) walk(rel, out); else out.push(rel);
  }
}

function listFiles() {
  const out = git('ls-files', '-z', '--cached', '--others', '--exclude-standard');
  const files = out ? [...new Set(out.split('\0').filter(Boolean))] : (() => { const a = []; walk('', a); return a; })();
  return files.filter((f) => !SKIP.test(f) && existsSync(join(root, f))).sort();
}

const config = json('.github/config.json')?.discovery ?? {};
const discoveryFile = arg || config.file || 'docs/discovery.md';
const rescanThreshold = config.maxChangedFilesBeforeRescan ?? 50;

const IGNORED_CHANGES = /^docs\/(runs|tasks|specs|handover|agents|context)\/|^docs\/discovery\.md$|^\.github\/(agents|skills|hooks)\//;

function dirtyPaths() {
  return (git('status', '--porcelain', '-uall') ?? '').split('\n').filter(Boolean).map((line) => {
    const st = line.slice(0, 2).trim();
    return { status: !st || st[0] === '?' ? 'A' : st[0], path: line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '') };
  }).filter((c) => !SKIP.test(c.path) && !IGNORED_CHANGES.test(c.path));
}

// Content hash of the uncommitted files: a scan of a dirty tree stays fresh until those files change again.
function dirtyFingerprint(dirty) {
  if (dirty.length === 0) return 'clean';
  const h = createHash('sha1');
  for (const { path } of dirty) {
    h.update(path).update('\0');
    h.update(existsSync(join(root, path)) ? createHash('sha1').update(readFileSync(join(root, path))).digest('hex') : 'deleted');
  }
  return h.digest('hex').slice(0, 10);
}

function gitInfo() {
  const head = git('rev-parse', 'HEAD')?.trim() ?? null;
  const dirty = head ? dirtyPaths() : [];
  return {
    isRepo: head !== null,
    head,
    branch: git('rev-parse', '--abbrev-ref', 'HEAD')?.trim() ?? null,
    uncommittedFiles: dirty.length,
    dirty: dirtyFingerprint(dirty),
  };
}

function envVarNames(path) {
  return read(path).split('\n')
    .map((l) => l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
    .filter(Boolean);
}

function parseManifest(path) {
  const name = basename(path);
  const out = { path, kind: name };
  if (name === 'package.json') {
    const p = json(path);
    if (!p) return { ...out, error: 'unreadable' };
    const deps = (o) => Object.entries(o ?? {}).map(([n, v]) => ({ name: n, version: v }));
    const all = { ...p.dependencies, ...p.devDependencies, ...p.peerDependencies };
    return {
      ...out, name: p.name, version: p.version, type: p.type, main: p.main, engines: p.engines, workspaces: p.workspaces,
      scripts: p.scripts ?? {}, dependencies: deps(p.dependencies), devDependencies: deps(p.devDependencies),
      hints: [...new Set(Object.keys(all).filter((d) => HINTS[d]).map((d) => HINTS[d]))],
    };
  }
  if (name === 'requirements.txt') {
    return { ...out, requirements: read(path).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) };
  }
  if (name === 'go.mod') {
    const t = read(path);
    return { ...out, module: t.match(/^module\s+(\S+)/m)?.[1], go: t.match(/^go\s+(\S+)/m)?.[1], note: 'read the file for requires' };
  }
  return { ...out, note: 'not parsed: read the file' };
}

function scan() {
  const files = listFiles();
  const langs = {};
  const dirs = {};
  const groups = { manifests: [], lockfiles: [], containers: [], ci: [], envExamples: [], migrations: [], tests: [], docs: [], entryPoints: [], agentSetup: [] };
  let codeFiles = 0;

  for (const f of files) {
    const base = basename(f);
    const ext = extname(f).toLowerCase();
    const lang = LANGS[ext];
    const parts = f.split('/');
    const d2 = parts.slice(0, Math.min(2, parts.length - 1)).join('/') || '.';
    dirs[d2] = dirs[d2] ?? { files: 0, ext: {} };
    dirs[d2].files++;
    if (ext) dirs[d2].ext[ext] = (dirs[d2].ext[ext] ?? 0) + 1;

    if (lang) {
      let lines = 0;
      try { if (statSync(join(root, f)).size < 1_000_000) lines = read(f).split('\n').length; } catch { /* binary or unreadable */ }
      langs[lang] = langs[lang] ?? { files: 0, lines: 0 };
      langs[lang].files++;
      langs[lang].lines += lines;
      if (!NOT_CODE.has(lang) && !/^(\.github|docs)\//.test(f) && !TOOLING.has(f)) codeFiles++;
    }
    if (MANIFESTS.has(base) || /\.csproj$|\.sln$/.test(base)) groups.manifests.push(f);
    if (LOCKFILES.has(base)) groups.lockfiles.push(f);
    if (/^(Containerfile|Dockerfile)(\..+)?$|^(docker-)?compose(\..+)?\.ya?ml$|^\.(container|docker)ignore$/.test(base)) groups.containers.push(f);
    if (/^\.github\/workflows\//.test(f) || /^(\.gitlab-ci\.yml|azure-pipelines\.yml|Jenkinsfile)$/.test(f)) groups.ci.push(f);
    if (/^\.env(\..+)?\.(example|sample|template)$/.test(base)) groups.envExamples.push(f);
    if (/(^|\/)migrations?\//.test(f) || (ext === '.sql' && /(^|\/)(db|database|sql)\//.test(f))) groups.migrations.push(f);
    if (/\.(test|spec)\.[a-z]+$|_test\.[a-z]+$|(^|\/)(tests?|__tests__|e2e)\//.test(f)) groups.tests.push(f);
    if (/^readme/i.test(base) || /^docs\//.test(f)) groups.docs.push(f);
    if (/^(main|server|app|index|program)\.[a-z]+$|^manage\.py$/i.test(base) && parts.length <= 4 && !/^(docs|\.github)\//.test(f)) groups.entryPoints.push(f);
    if (/^\.github\/(agents|skills|hooks)\//.test(f) || /^(AGENTS|CLAUDE)\.md$|^\.github\/copilot-instructions\.md$/.test(f)) groups.agentSetup.push(f);
  }

  const manifests = groups.manifests.map(parseManifest);
  const envExamples = groups.envExamples.map((p) => ({ path: p, variableNames: envVarNames(p) }));
  const contextFiles = files.filter((f) => /^docs\/context\/[^/]+\.md$/.test(f));
  const hasManifestDeps = manifests.some((m) => (m.dependencies?.length ?? 0) + (m.devDependencies?.length ?? 0) + (m.requirements?.length ?? 0) > 0);

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    git: gitInfo(),
    projectState: codeFiles === 0 && !hasManifestDeps ? 'new' : 'existing',
    counts: { files: files.length, codeFiles },
    languages: Object.fromEntries(Object.entries(langs).sort((a, b) => b[1].lines - a[1].lines)),
    directories: Object.fromEntries(Object.entries(dirs).sort()),
    manifests,
    lockfiles: groups.lockfiles,
    containers: groups.containers,
    ci: groups.ci,
    envExamples,
    migrations: groups.migrations,
    tests: { count: groups.tests.length, files: groups.tests },
    entryPointCandidates: groups.entryPoints,
    docs: groups.docs.filter((f) => !/^docs\/(runs|tasks|specs|handover|agents)\//.test(f)),
    agentSetup: { files: groups.agentSetup.length, contextFiles, discoveryFileExists: existsSync(join(root, discoveryFile)) },
  };
}

function sectionsFor({ path, status }) {
  const base = basename(path);
  const ext = extname(path).toLowerCase();
  const s = new Set();
  if (MANIFESTS.has(base) || LOCKFILES.has(base) || /\.csproj$/.test(base)) ['Dependencies', 'Commands', 'Languages and tooling'].forEach((x) => s.add(x));
  else if (/^(Containerfile|Dockerfile)|compose.*\.ya?ml$|^\.github\/workflows\/|^(\.gitlab-ci\.yml|azure-pipelines\.yml|Jenkinsfile)$|nginx\.conf$/.test(path)) s.add('Build, CI/CD and containers');
  else if (/(^|\/)migrations?\//.test(path) || ext === '.sql') s.add('Data');
  else if (/^\.env(\..+)?\.(example|sample|template)$/.test(base)) s.add('Configuration');
  else if (/\.(test|spec)\.[a-z]+$|_test\.[a-z]+$|(^|\/)(tests?|__tests__|e2e)\//.test(path)) s.add('Tests');
  else if (LANGS[ext]) ['Implemented features', 'Interfaces'].forEach((x) => s.add(x));
  else if (/^readme|\.md$/i.test(base)) s.add('Summary');
  else s.add('Repository layout');
  if (/^[ADR?]/.test(status)) s.add('Repository layout');
  return [...s];
}

function stale() {
  const info = gitInfo();
  if (!existsSync(join(root, discoveryFile))) return { status: 'missing', file: discoveryFile, head: info.head };
  if (!info.isRepo) return { status: 'no-git', file: discoveryFile, note: 'cannot compare; treat as stale if unsure' };
  const headerLine = read(discoveryFile).match(/^>\s*Scanned:.*$/mi)?.[0] ?? '';
  const scanned = headerLine.match(/Commit:\s*([0-9a-f]{7,40})/i)?.[1];
  const scannedDirty = headerLine.match(/Dirty:\s*([0-9a-f]{10}|clean)/i)?.[1] ?? 'clean';
  if (!scanned) return { status: 'stale', file: discoveryFile, head: info.head, reason: 'no "Commit:" in the header', fullRescanRecommended: true };
  if (git('cat-file', '-e', `${scanned}^{commit}`) === null) {
    return { status: 'stale', file: discoveryFile, head: info.head, scannedCommit: scanned, reason: 'scanned commit not found in this repository', fullRescanRecommended: true };
  }

  const changes = new Map();
  for (const line of (git('diff', '--name-status', scanned, 'HEAD') ?? '').split('\n').filter(Boolean)) {
    const [st, ...p] = line.split('\t');
    changes.set(p[p.length - 1], st[0]);
  }
  // Uncommitted files count only if they differ from the dirty state that was scanned.
  if (info.dirty !== scannedDirty) for (const { path, status } of dirtyPaths()) if (!changes.has(path)) changes.set(path, status);
  const changed = [...changes].map(([path, status]) => ({ path, status }))
    .filter((c) => !SKIP.test(c.path) && !IGNORED_CHANGES.test(c.path));
  const sections = [...new Set(changed.flatMap(sectionsFor))];
  const fullRescanRecommended = changed.length >= rescanThreshold;
  return {
    status: changed.length === 0 ? 'fresh' : 'stale',
    file: discoveryFile,
    scannedCommit: scanned,
    head: info.head,
    dirty: info.dirty,
    changedCount: changed.length,
    changed: changed.slice(0, 200),
    sections,
    fullRescanRecommended,
  };
}

if (mode === 'scan') console.log(JSON.stringify(scan(), null, 2));
else if (mode === 'stale') console.log(JSON.stringify(stale(), null, 2));
else { console.error('Usage: node scripts/discovery-scan.mjs scan | stale [discovery file]'); process.exit(2); }
