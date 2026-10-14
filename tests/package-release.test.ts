import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packager = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/package-release.mjs');

test('release rebuild removes stale output and excludes runtime data and build caches', () => {
  const tempRoot = realpathSync(tmpdir());
  const dir = mkdtempSync(join(tempRoot, 'kora-package-test-'));
  const file = (name: string, contents = 'fixture') => {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };
  const run = () => execFileSync(process.execPath, [packager], { cwd: dir, stdio: 'pipe' });
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: dir });
    file('dist/index.html', '<html>production</html>');
    file('server/index.ts');
    file('backend/AssetApi/source.cs');
    file('backend/AssetApi/obj/cache');
    file('backend/AssetApi/bin/runtime.dll');
    file('public/design/image.png');
    file('.data/game.sqlite', 'test-only private data');
    file('.env', 'test-only secret');
    file('assets/.env.local', 'test-only nested secret');
    file('assets/node_modules/dependency.js');
    execFileSync('git', ['add', 'dist/index.html'], { cwd: dir });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Package Test',
        '-c',
        'user.email=package-test@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'fixture',
      ],
      { cwd: dir },
    );
    run();
    file('.release/kora-war/.data/old.sqlite', 'stale private data');
    file('.release/kora-war/backend/AssetApi/obj/stale');
    file('.release/kora-war/node_modules/stale');
    file('.release/kora-war/server/removed.ts');
    run();
    const output = join(dir, '.release/kora-war');
    for (const name of [
      '.data',
      '.env',
      'assets/.env.local',
      'assets/node_modules',
      'node_modules',
      'backend/AssetApi/obj',
      'backend/AssetApi/bin',
      'server/removed.ts',
    ])
      assert.equal(existsSync(join(output, name)), false, name + ' excluded after rebuild');
    for (const name of [
      'dist/index.html',
      'server/index.ts',
      'backend/AssetApi/source.cs',
      'public/design/image.png',
      'START.md',
      'RELEASE.json',
    ])
      assert.equal(existsSync(join(output, name)), true, name + ' included');
    assert.equal(JSON.parse(readFileSync(join(output, 'RELEASE.json'), 'utf8')).node, '24');
  } finally {
    if (!resolve(dir).startsWith(tempRoot + sep) || !dir.includes('kora-package-test-'))
      throw new Error('Invalid package test cleanup path');
    rmSync(dir, { recursive: true, force: true });
  }
});
