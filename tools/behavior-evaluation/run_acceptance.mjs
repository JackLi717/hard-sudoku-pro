import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { allRequiredStagesPassed } from './acceptance-stages.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const args = process.argv.slice(2);
const allowed = new Set(['--output-root', '--require-growth-ready']);
let parent = os.tmpdir();
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  if (args[i] === '--output-root') {
    if (!args[i + 1] || args[i + 1].startsWith('--'))
      throw new Error('Missing output root');
    parent = path.resolve(args[++i]);
  }
}
fs.mkdirSync(parent, { recursive: true });
const output = fs.mkdtempSync(path.join(parent, 'behavior-acceptance-'));
const stages = [];
const tool = name => path.join(root, 'tools/behavior-evaluation', name);
const artifact = name => path.join(output, name);
const native = artifact('native_replay');

function stage(name, command, arguments_, env = {}) {
  console.log(`Starting ${name}`);
  const start = Date.now();
  const result = spawnSync(command, arguments_, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.writeFileSync(
    artifact(name + '.log'),
    (result.stdout ?? '') +
      (result.stderr ?? '') +
      (result.error?.message ?? ''),
  );
  const status = result.status === 0 ? 'passed' : 'failed';
  stages.push({
    name,
    status,
    durationMs: Date.now() - start,
    exitCode: result.status,
    log: name + '.log',
  });
  console.log(`${name}: ${status}`);
  return status === 'passed';
}
function nodeStage(name, arguments_, env) {
  return stage(name, process.execPath, arguments_, env);
}
nodeStage('oracle-controls', [
  '--test',
  tool('independent-solver.test.mjs'),
  tool('acceptance-audit.test.mjs'),
  tool('played-game-oracle.test.mjs'),
  tool('played-game-baseline.test.mjs'),
]);
nodeStage('game-regressions', [
  path.join(root, 'node_modules/jest/bin/jest.js'),
  '--runInBand',
  '--no-watchman',
  '--json',
  `--outputFile=${artifact('jest.json')}`,
]);
nodeStage('typecheck', [
  path.join(root, 'node_modules/typescript/bin/tsc'),
  '--noEmit',
]);
const nativeBuilt = stage('native-build', process.env.CXX ?? 'c++', [
  '-O2',
  '-std=c++20',
  '-Wall',
  '-Wextra',
  '-Wpedantic',
  '-Werror',
  '-Inative/hsp-hint-core/include',
  'native/hsp-hint-core/src/bridge.cpp',
  'native/hsp-hint-core/src/engine.cpp',
  'native/hsp-hint-core/src/techniques.cpp',
  tool('native_replay.cpp'),
  '-o',
  native,
]);
if (nativeBuilt) {
  nodeStage('catalog-outcomes', [
    tool('check_catalog_acceptance.mjs'),
    native,
    artifact('catalog.json'),
  ]);
  nodeStage('candidate-restoration', [
    tool('check_candidate_restoration.mjs'),
    native,
  ]);
  nodeStage('hint-assistance', [tool('check_hint_assistance.mjs'), native]);
  nodeStage(
    'segment-lifecycle',
    [
      path.join(root, 'node_modules/jest/bin/jest.js'),
      '__tests__/behavior-segment-lifecycle.test.ts',
      '__tests__/behavior-candidate-boundaries.test.ts',
      '--runInBand',
      '--no-watchman',
    ],
    { BEHAVIOR_NATIVE_REPLAY: native },
  );
  nodeStage('opportunity-deduplication', [
    path.join(root, 'node_modules/jest/bin/jest.js'),
    '__tests__/opportunity-groups.test.ts', '--runInBand', '--no-watchman',
  ], { BEHAVIOR_NATIVE_REPLAY: native });
  nodeStage('opportunity-processes-39', [
    path.join(root, 'node_modules/jest/bin/jest.js'),
    '__tests__/opportunity-processes.test.ts', '__tests__/reasoning-stages.test.ts', '__tests__/reasoning-paths.test.ts', '__tests__/reasoning-paths-native.test.ts', '--runInBand', '--no-watchman',
    '--json', `--outputFile=${artifact('opportunity-processes-39.json')}`,
  ], { BEHAVIOR_NATIVE_REPLAY: native });
}
nodeStage('durable-hint-exposure', [
  path.join(root, 'node_modules/jest/bin/jest.js'),
  '__tests__/hint-exposure-persistence.test.ts', '--runInBand', '--no-watchman',
]);
const simulated = nodeStage(
  'seeded-gameplay',
  [
    path.join(root, 'node_modules/jest/bin/jest.js'),
    '__tests__/behavior-adversarial-player.test.ts',
    '--runInBand',
    '--no-watchman',
  ],
  {
    BEHAVIOR_ADVERSARIAL_WRITE_REPORT: '1',
    BEHAVIOR_ADVERSARIAL_OUTPUT_DIR: output,
  },
);
const samples = artifact('tg3a-adversarial-pending.json');
if (simulated && nativeBuilt) {
  if (
    nodeStage('seeded-native-replay', [
      tool('replay_samples.mjs'),
      native,
      samples,
      artifact('native-appendix.md'),
      '自动工程验收 native 回放',
      'true',
    ])
  ) {
    nodeStage('seeded-protocol-audit', [
      tool('audit_adversarial_replay.mjs'),
      samples,
      artifact('tg3a-adversarial-report.json'),
      artifact('adversarial-conclusion.md'),
    ]);
  }
}
const git = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
});
const tracked = spawnSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    'src',
    'native',
    '__tests__',
    'tools/behavior-evaluation',
    'package.json',
  ],
  { cwd: root, encoding: 'utf8' },
);
const digest = crypto.createHash('sha256');
for (const file of [...new Set(tracked.stdout.trim().split('\n'))].sort()) {
  if (fs.existsSync(path.join(root, file)))
    digest.update(file).update(fs.readFileSync(path.join(root, file)));
}
const engineeringPassed = allRequiredStagesPassed(stages);
const report = {
  scope:
    'Automated engineering acceptance; human experience is continuous, not a required worksheet.',
  commit: git.stdout.trim(),
  sourceFingerprint: digest.digest('hex'),
  generatedAt: new Date().toISOString(),
  engineeringPassed,
  growthReleaseReady: false,
  stages,
  completedCapabilities: [
    { id: 'offline-opportunity-processes-39', status: stages.find(s => s.name === 'opportunity-processes-39')?.status ?? 'failed' },
    { id: 'same-opportunity-deduplication', status: stages.find(s => s.name === 'opportunity-deduplication')?.status ?? 'failed' },
    { id: 'hint-exposure-across-process-restart', status: stages.find(s => s.name === 'durable-hint-exposure')?.status ?? 'failed' },
  ],
  remainingGates: [
    {
      id: 'growth-scoring-policy',
      status: 'pending',
      reason:
        'Opportunity grouping is operational evidence, not mastery. Scoring policy and humanCost calibration are not approved by these engineering checks.',
    },
  ],
  evidenceLimits: [
    'Outcome oracle checks Sudoku truth, not the unique name of a human technique.',
    'Catalog seeds are engine-derived; recall checks are regression evidence, not independent label truth.',
    'No humanCost calibration or human-intent accuracy is inferred.',
  ],
  output,
};
fs.writeFileSync(
  artifact('acceptance.json'),
  JSON.stringify(report, null, 2) + '\n',
);
fs.writeFileSync(
  artifact('acceptance.md'),
  [
    '# 自动化归因工程验收',
    '',
    `工程检查：${
      engineeringPassed ? '通过' : '未通过'
    }；成长评分准入：尚未通过。`,
    '',
    ...stages.map(s => `- ${s.name}: ${s.status}`),
    '',
    '待完成的独立门槛：',
    '',
    ...report.remainingGates.map(g => `- ${g.id}: ${g.reason}`),
    '',
    ...report.evidenceLimits.map(s => `- ${s}`),
    '',
    `源码指纹：${report.sourceFingerprint}`,
    '',
  ].join('\n'),
);
console.log(`Report: ${artifact('acceptance.json')}`);
process.exitCode =
  engineeringPassed && !args.includes('--require-growth-ready') ? 0 : 1;
