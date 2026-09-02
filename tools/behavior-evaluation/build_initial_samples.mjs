import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolRoot, '../..');
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(repositoryRoot, 'src/debug/generated/hint-lab-fixtures.json'),
    'utf8',
  ),
).fixtures;
const evaluation = JSON.parse(
  fs.readFileSync(
    path.join(
      repositoryRoot,
      'tools/puzzle-generator/reports/opportunity-evaluation.json',
    ),
    'utf8',
  ),
).fixtures;

const fixtureByTechnique = new Map(
  fixtures.map(fixture => [fixture.techniqueCode, fixture]),
);
const evaluationByTechnique = new Map(
  evaluation.map(fixture => [fixture.techniqueCode, fixture]),
);

function expectedFingerprint(boardFingerprint, effects) {
  const values = [...boardFingerprint];
  for (const effect of effects) {
    if (effect.kind === 'placement') {
      values[effect.cell] = String(effect.digit);
    }
  }
  return values.join('');
}

function requestFor(sampleId, fixture, effects) {
  return {
    requestId: `seed-request-${sampleId}`,
    sessionId: `seed-session-${fixture.sourcePuzzleId}`,
    segmentId: `seed-segment-${sampleId}`,
    startingRevision: 0,
    issuedRevision: effects.length,
    startingBoardFingerprint: fixture.boardFingerprint,
    expectedBoardFingerprint: expectedFingerprint(
      fixture.boardFingerprint,
      effects,
    ),
    growthCandidates: fixture.candidateMasks,
    givenCells: fixture.givenCells,
    observedEffects: effects,
  };
}

function attributionFromEvaluation(entry) {
  const candidates = entry.explanationCandidates.map(candidate => ({
    technique: candidate.techniqueCode,
    humanCost: candidate.humanCost,
    directPlacementMatch: candidate.directPlacementMatch,
    oneHopPlacementMatch: candidate.oneHopPlacementMatch,
    matchingOpportunityCount: candidate.matchingOpportunityCount,
  }));
  return {
    candidateTechniques: candidates,
    automaticTechnique:
      entry.explanationAutomaticTechnique === 'none'
        ? null
        : entry.explanationAutomaticTechnique,
    selectedTechnique: null,
    attributionEligibility: { status: 'eligible' },
  };
}

function pendingReview(note) {
  return {
    status: 'pending',
    shouldBeEligible: null,
    intendedTechnique: null,
    acceptableCandidateTechniques: [],
    notes: note,
  };
}

function stepEffects(fixture) {
  const step = fixture.engineResult.step;
  return [
    ...step.eliminations.map(candidate => ({
      kind: 'elimination',
      ...candidate,
    })),
    ...step.placements.map(candidate => ({
      kind: 'placement',
      ...candidate,
    })),
  ];
}

function positive(sampleId, scenarioFamily, technique) {
  const fixture = fixtureByTechnique.get(technique);
  const entry = evaluationByTechnique.get(technique);
  if (!fixture || !entry) {
    throw new Error(`Missing seed fixture for ${technique}`);
  }
  const effects = stepEffects(fixture);
  return {
    sampleId,
    scenarioFamily,
    reviewSeedTechnique: technique,
    sourceCommands: effects.map(
      effect => `input_digit:${effect.kind}:${effect.cell}:${effect.digit}`,
    ),
    analysisRequest: requestFor(sampleId, fixture, effects),
    analysisDiagnostics: null,
    systemAttribution: attributionFromEvaluation(entry),
    humanReview: pendingReview(
      `Seeded from ${fixture.id}; replay the game actions and independently review the reasoning before changing status to reviewed.`,
    ),
  };
}

function emptyAttribution(reason = null) {
  return {
    candidateTechniques: [],
    automaticTechnique: null,
    selectedTechnique: null,
    attributionEligibility: reason
      ? { status: 'ineligible', reason }
      : { status: 'eligible' },
  };
}

const closureEntry = evaluationByTechnique.get('lockedCandidates.claiming');
if (
  !closureEntry ||
  closureEntry.explanationClosurePlacementCount < 1 ||
  closureEntry.explanationClosureExpectedTechniqueCandidateCount < 1
) {
  throw new Error('The locked-candidates placement-closure seed is invalid.');
}
const closureFixture = fixtureByTechnique.get(closureEntry.techniqueCode);
if (!closureFixture) {
  throw new Error('The locked-candidates Hint Lab fixture is missing.');
}
// The existing C++ closure acceptance fixture records one immediate placement
// for this case. Keep the reviewed seed explicit instead of regenerating the
// performance report (whose timing fields are intentionally machine-local).
const closureEffect = { kind: 'placement', cell: 46, digit: 9 };

const samples = [
  positive('tg2-subset-001', 'subset', 'nakedTriple'),
  positive('tg2-fish-001', 'fish', 'xWing'),
  positive('tg2-chain-001', 'chain', 'xChain'),
  positive('tg2-coloring-001', 'coloring', 'complexColoring'),
  {
    sampleId: 'tg2-placement-closure-001',
    scenarioFamily: 'placement_closure',
    reviewSeedTechnique: 'lockedCandidates.claiming',
    sourceCommands: [
      `input_digit:placement:${closureEffect.cell}:${closureEffect.digit}`,
    ],
    analysisRequest: requestFor('tg2-placement-closure-001', closureFixture, [
      closureEffect,
    ]),
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution(),
    humanReview: pendingReview(
      `Placement closure seeded from ${closureFixture.id}; native replay must fill candidates before review.`,
    ),
  },
  {
    sampleId: 'tg2-hint-counterexample-001',
    scenarioFamily: 'hint_counterexample',
    sourceCommands: ['prepare_hint', 'reveal_hint'],
    analysisRequest: null,
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution('hint_polluted'),
    humanReview: pendingReview(
      'Confirm that merely preparing or viewing a hint closes the active independent segment.',
    ),
  },
  {
    sampleId: 'tg2-undo-counterexample-001',
    scenarioFamily: 'undo_counterexample',
    sourceCommands: ['input_digit:placement', 'undo'],
    analysisRequest: null,
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution('undo_polluted'),
    humanReview: pendingReview(
      'Confirm that undo invalidates the pre-undo segment and rebuilds growth candidates.',
    ),
  },
  {
    sampleId: 'tg2-auto-pencil-counterexample-001',
    scenarioFamily: 'auto_pencil_counterexample',
    sourceCommands: ['generate_quick_draft'],
    analysisRequest: null,
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution(),
    humanReview: pendingReview(
      'Confirm that automatic candidate generation produces no player elimination and no attribution.',
    ),
  },
  {
    sampleId: 'tg2-rapid-operation-counterexample-001',
    scenarioFamily: 'rapid_operation_counterexample',
    sourceCommands: [
      'input_digit:placement:request_pending',
      'input_digit:placement:new_segment',
    ],
    analysisRequest: null,
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution('rapid_operation_polluted'),
    humanReview: pendingReview(
      'Confirm that an unorderable cross-segment operation cannot reuse the pending result.',
    ),
  },
];

function cellName(cell) {
  return `r${Math.floor(cell / 9) + 1}c${(cell % 9) + 1}`;
}

function validateSample(sample) {
  const request = sample.analysisRequest;
  if (request === null) {
    if (sample.systemAttribution.automaticTechnique !== null) {
      throw new Error(`${sample.sampleId} has attribution without effects.`);
    }
    return;
  }
  if (
    request.startingBoardFingerprint.length !== 81 ||
    request.expectedBoardFingerprint.length !== 81 ||
    request.growthCandidates.length !== 81 ||
    request.givenCells.length !== 81 ||
    request.observedEffects.length === 0
  ) {
    throw new Error(`${sample.sampleId} has an invalid replay shape.`);
  }
  for (const effect of request.observedEffects) {
    if (
      request.startingBoardFingerprint[effect.cell] !== '0' ||
      (request.growthCandidates[effect.cell] & (1 << (effect.digit - 1))) === 0
    ) {
      throw new Error(
        `${sample.sampleId} has an illegal ${effect.kind} at ${cellName(
          effect.cell,
        )}=${effect.digit}.`,
      );
    }
  }
  if (
    request.expectedBoardFingerprint !==
    expectedFingerprint(
      request.startingBoardFingerprint,
      request.observedEffects,
    )
  ) {
    throw new Error(
      `${sample.sampleId} has a mismatched expected fingerprint.`,
    );
  }
  const attribution = sample.systemAttribution;
  if (
    attribution.attributionEligibility.status === 'eligible' &&
    attribution.automaticTechnique !==
      (attribution.candidateTechniques[0]?.technique ?? null)
  ) {
    throw new Error(`${sample.sampleId} violates minimum-cost ordering.`);
  }
}

for (const sample of samples) {
  validateSample(sample);
}

function boardLines(fingerprint) {
  const rows = [];
  for (let row = 0; row < 9; row += 1) {
    const cells = [...fingerprint.slice(row * 9, row * 9 + 9)].map(value =>
      value === '0' ? '.' : value,
    );
    rows.push(
      `${cells.slice(0, 3).join(' ')} | ${cells.slice(3, 6).join(' ')} | ${cells
        .slice(6)
        .join(' ')}`,
    );
    if (row === 2 || row === 5) {
      rows.push('------+-------+------');
    }
  }
  return rows;
}

function candidateLines(request) {
  const rows = [];
  for (let row = 0; row < 9; row += 1) {
    const cells = [];
    for (let column = 0; column < 9; column += 1) {
      const cell = row * 9 + column;
      if (request.startingBoardFingerprint[cell] !== '0') {
        continue;
      }
      const digits = [];
      for (let digit = 1; digit <= 9; digit += 1) {
        if ((request.growthCandidates[cell] & (1 << (digit - 1))) !== 0) {
          digits.push(digit);
        }
      }
      cells.push(`${cellName(cell)}={${digits.join('')}}`);
    }
    rows.push(cells.join('  '));
  }
  return rows;
}

function actionLines(sample) {
  if (sample.analysisRequest === null) {
    return sample.sourceCommands.map(command => `- 命令：\`${command}\``);
  }
  return sample.analysisRequest.observedEffects.map(
    effect => `- ${effect.kind}：${cellName(effect.cell)} = ${effect.digit}`,
  );
}

const outputDirectory = path.join(toolRoot, 'samples');
fs.mkdirSync(outputDirectory, { recursive: true });
const outputPath = path.join(
  outputDirectory,
  'tg2-initial-review-samples.json',
);
fs.writeFileSync(outputPath, `${JSON.stringify(samples, null, 2)}\n`);
const reportDirectory = path.join(toolRoot, 'reports');
fs.mkdirSync(reportDirectory, { recursive: true });
const checklist = [
  '# TG-2 首批人工审核清单',
  '',
  '> 当前九项均为算法夹具或污染协议生成的待审核种子，不是人工真值；全部完成独立复核前 TG-2 不通过。',
  '',
  '| 样本 | 场景 | 动作数 | 审核状态 |',
  '| --- | --- | ---: | --- |',
  ...samples.map(
    sample =>
      `| ${sample.sampleId} | ${sample.scenarioFamily} | ${sample.sourceCommands.length} | ${sample.humanReview.status} |`,
  ),
  '',
  '审核顺序：先在对应中间盘面人工执行动作，独立写出 intendedTechnique 与全部 acceptableCandidateTechniques，再查看 systemAttribution；最后将 status 改为 reviewed。',
  '',
].join('\n');
fs.writeFileSync(
  path.join(reportDirectory, 'tg2-initial-review-checklist.md'),
  checklist,
);

const worksheet = [
  '# TG-2 行为样本盲审工作表',
  '',
  '> 本文件故意不显示场景分类、技巧名称和系统结论。请先独立完成每项判断，再打开系统答案附录。',
  '',
  ...samples.flatMap((sample, index) => {
    const board = sample.analysisRequest?.startingBoardFingerprint;
    return [
      `## 样本 ${index + 1}`,
      '',
      ...(board ? ['```text', ...boardLines(board), '```', ''] : []),
      ...(sample.analysisRequest
        ? [
            '起始候选：',
            '',
            '```text',
            ...candidateLines(sample.analysisRequest),
            '```',
            '',
          ]
        : []),
      '观察到的动作：',
      '',
      ...actionLines(sample),
      '',
      '- 是否允许归因（是/否）：____',
      '- 主要技巧（无则填 none）：____',
      '- 全部合理候选技巧：____',
      '- 判断依据或污染原因：____',
      '',
    ];
  }),
].join('\n');
fs.writeFileSync(
  path.join(reportDirectory, 'tg2-blind-review-worksheet.md'),
  `${worksheet}\n`,
);

const appendix = [
  '# TG-2 系统归因附录',
  '',
  '> 仅在盲审工作表填写完成后查看。本附录是系统当前输出，不是人工真值。',
  '',
  ...samples.flatMap((sample, index) => [
    `## 样本 ${index + 1}：${sample.sampleId}`,
    '',
    `- scenarioFamily：\`${sample.scenarioFamily}\``,
    `- attributionEligibility：\`${
      sample.systemAttribution.attributionEligibility.status
    }${
      sample.systemAttribution.attributionEligibility.reason
        ? `:${sample.systemAttribution.attributionEligibility.reason}`
        : ''
    }\``,
    `- automaticTechnique：\`${
      sample.systemAttribution.automaticTechnique ?? 'none'
    }\``,
    `- candidateTechniques：${
      sample.systemAttribution.candidateTechniques.length === 0
        ? '—'
        : sample.systemAttribution.candidateTechniques
            .map(
              candidate =>
                `\`${candidate.technique}\` (${candidate.humanCost})`,
            )
            .join('、')
    }`,
    `- analysisDiagnostics：${
      sample.analysisDiagnostics
        ? `opportunities=${
            sample.analysisDiagnostics.opportunityCount
          }, complete=${
            sample.analysisDiagnostics.opportunitySetComplete
          }, expanded=${
            sample.analysisDiagnostics.usedExpandedSearch
          }, limits=${
            sample.analysisDiagnostics.reachedEnumerationLimitTechniques.join(
              ',',
            ) || 'none'
          }`
        : 'not replayed'
    }`,
    '',
  ]),
].join('\n');
fs.writeFileSync(
  path.join(reportDirectory, 'tg2-system-attribution-appendix.md'),
  `${appendix}\n`,
);
console.log(`Wrote ${samples.length} pending-review samples to ${outputPath}`);
