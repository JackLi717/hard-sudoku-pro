import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const samples = path.join(
  root,
  'tools/behavior-evaluation/samples/tg3a-adversarial-pending.json',
);
const report = path.join(
  root,
  'tools/behavior-evaluation/reports/tg3a-adversarial-report.json',
);
const appendix = path.join(
  root,
  'tools/behavior-evaluation/reports/tg3a-adversarial-native-appendix.md',
);
const conclusion = path.join(
  root,
  'tools/behavior-evaluation/reports/tg3a-adversarial-conclusion.md',
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(
  process.execPath,
  [
    path.join(root, 'node_modules/jest/bin/jest.js'),
    '--runInBand',
    '--no-watchman',
    '__tests__/behavior-adversarial-player.test.ts',
  ],
  {
    env: { ...process.env, BEHAVIOR_ADVERSARIAL_WRITE_REPORT: '1' },
  },
);
run('bash', [
  path.join(root, 'scripts/replay-behavior-samples.sh'),
  samples,
  appendix,
  'TG-3A 对抗模拟 native 归因附录',
  'true',
]);
run(process.execPath, [
  path.join(root, 'tools/behavior-evaluation/audit_adversarial_replay.mjs'),
  samples,
  report,
  conclusion,
]);
