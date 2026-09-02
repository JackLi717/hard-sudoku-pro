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
    sourceCommands: effects.map(
      effect =>
        `input_digit:${effect.kind}:${effect.cell}:${effect.digit}`,
    ),
    analysisRequest: requestFor(sampleId, fixture, effects),
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
    sourceCommands: [
      `input_digit:placement:${closureEffect.cell}:${closureEffect.digit}`,
    ],
    analysisRequest: requestFor(
      'tg2-placement-closure-001',
      closureFixture,
      [closureEffect],
    ),
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
    systemAttribution: emptyAttribution('rapid_operation_polluted'),
    humanReview: pendingReview(
      'Confirm that an unorderable cross-segment operation cannot reuse the pending result.',
    ),
  },
];

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
console.log(`Wrote ${samples.length} pending-review samples to ${outputPath}`);
