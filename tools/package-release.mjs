import { mkdirSync, cpSync, writeFileSync, existsSync, lstatSync, realpathSync, rmSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
const workspace = realpathSync(process.cwd());
const releaseRoot = join(workspace, '.release');
const target = join(releaseRoot, 'kora-war');
if (!existsSync('dist/index.html')) throw new Error('Run npm run build first.');
// Rebuild only this verified output directory; stale files must never enter an artifact.
if (!target.startsWith(workspace + sep) || dirname(target) !== releaseRoot)
  throw new Error('Invalid release output path.');
for (const path of [releaseRoot, target])
  if (existsSync(path) && (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory()))
    throw new Error('Release output must use ordinary directories.');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
// Explicit allowlist: no .data, credentials, uploads, cache or node_modules.
for (const name of [
  'dist',
  'server',
  'src',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.server.json',
  'README.md',
  'docs',
  'backend',
  'assets',
  'public',
  'tools/install-model-animation.ts',
])
  if (existsSync(name)) {
    mkdirSync(dirname(join(target, name)), { recursive: true });
    cpSync(name, join(target, name), {
      recursive: true,
      filter: (path) => !/[\\/](node_modules|bin|obj|\.data|\.env[^\\/]*)([\\/]|$)/.test(path),
    });
  }
writeFileSync(
  join(target, 'RELEASE.json'),
  JSON.stringify(
    {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      node: '24',
      entrypoint: 'node --import tsx server/index.ts',
      install: 'npm ci --include=dev',
      database: 'Create or mount .data; never overwrite existing database',
    },
    null,
    2,
  ),
);
writeFileSync(
  join(target, 'START.md'),
  '# Kora War runtime package\n\nNode 24: `npm ci --include=dev`, then `node --import tsx server/index.ts`. Production frontend is already built. Runtime configuration/SQLite/uploads live in `.data/`; back them up and retain them across releases. Local bind is loopback. Full public API/PvP hosting needs an HTTPS server/runtime; GitHub Pages deploys the static AI demo. See docs/TEAM-WORKFLOW.md.\n',
);
console.log('Release package prepared:', target);
