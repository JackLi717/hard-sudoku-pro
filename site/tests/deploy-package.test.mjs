import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const redirect = '/index.php https://readytradie.com/ 301\n';

for (const [name, headers, redirects, valid] of [
  [
    'complete package',
    '/*\n  X-Content-Type-Options: nosniff\n',
    redirect,
    true,
  ],
  ['missing redirects', '/*\n  X-Content-Type-Options: nosniff\n', null, false],
  ['missing headers', null, redirect, false],
  ['empty redirects', '/*\n  X-Content-Type-Options: nosniff\n', '', false],
  [
    'temporary redirect',
    '/*\n  X-Content-Type-Options: nosniff\n',
    redirect.replace('301', '302'),
    false,
  ],
  [
    'wrong destination',
    '/*\n  X-Content-Type-Options: nosniff\n',
    redirect.replace('readytradie.com/', 'readytradie.com/platon-sudoku/'),
    false,
  ],
  [
    'duplicate legacy rule',
    '/*\n  X-Content-Type-Options: nosniff\n',
    redirect + redirect,
    false,
  ],
]) {
  test(`deployment check: ${name}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'platon-deploy-check-'));
    try {
      if (headers !== null) writeFileSync(join(directory, '_headers'), headers);
      if (redirects !== null)
        writeFileSync(join(directory, '_redirects'), redirects);
      const result = spawnSync(
        'python3',
        ['scripts/check_deploy.py', directory],
        {
          cwd: new URL('../', import.meta.url),
          encoding: 'utf8',
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status === 0, valid, result.stdout + result.stderr);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
