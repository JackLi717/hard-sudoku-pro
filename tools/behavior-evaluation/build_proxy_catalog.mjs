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
const initial = JSON.parse(
  fs.readFileSync(
    path.join(toolRoot, 'samples/tg2-initial-review-samples.json'),
    'utf8',
  ),
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

function emptyAttribution() {
  return {
    candidateTechniques: [],
    automaticTechnique: null,
    selectedTechnique: null,
    attributionEligibility: { status: 'eligible' },
  };
}

const catalogSamples = fixtures.map(fixture => {
  const step = fixture.engineResult.step;
  const effects = [
    ...step.eliminations.map(candidate => ({
      kind: 'elimination',
      ...candidate,
    })),
    ...step.placements.map(candidate => ({
      kind: 'placement',
      ...candidate,
    })),
  ];
  const sampleId = `tg2-catalog-${fixture.techniqueCode}`;
  return {
    sampleId,
    scenarioFamily: 'technique_catalog',
    reviewSeedTechnique: fixture.techniqueCode,
    sourceCommands: effects.map(
      effect => `input_digit:${effect.kind}:${effect.cell}:${effect.digit}`,
    ),
    analysisRequest: {
      requestId: `catalog-request-${fixture.techniqueCode}`,
      sessionId: `catalog-session-${fixture.sourcePuzzleId}`,
      segmentId: `catalog-segment-${fixture.techniqueCode}`,
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
    },
    analysisDiagnostics: null,
    systemAttribution: emptyAttribution(),
    humanReview: {
      status: 'pending',
      shouldBeEligible: null,
      intendedTechnique: null,
      acceptableCandidateTechniques: [],
      notes: `Pending proxy review of ${fixture.id}.`,
    },
  };
});

const specialSamples = initial.filter(
  sample =>
    sample.scenarioFamily === 'placement_closure' ||
    sample.scenarioFamily.endsWith('_counterexample'),
);
const samples = [...catalogSamples, ...specialSamples];
const outputPath = path.join(
  toolRoot,
  'samples/tg2-proxy-catalog-pending.json',
);
fs.writeFileSync(outputPath, `${JSON.stringify(samples, null, 2)}\n`);
console.log(
  `Wrote ${catalogSamples.length} technique and ${specialSamples.length} special samples to ${outputPath}`,
);
