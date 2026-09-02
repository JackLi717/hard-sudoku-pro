import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(toolRoot, 'samples/tg2-initial-review-samples.json');
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(toolRoot, 'samples/tg2-proxy-reviewed-samples.json');
const samples = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const decisions = {
  'tg2-subset-001': {
    shouldBeEligible: true,
    intendedTechnique: 'nakedTriple',
    notes:
      'Proxy technical review: the source action sequence intentionally executes the Naked Triple fixture; the lower-cost Locked Triple remains a valid result explanation.',
  },
  'tg2-fish-001': {
    shouldBeEligible: true,
    intendedTechnique: 'xWing',
    notes:
      'Proxy technical review: the source action sequence intentionally executes the X-Wing fixture; pointing and subset explanations also cover the observed eliminations.',
  },
  'tg2-chain-001': {
    shouldBeEligible: true,
    intendedTechnique: 'xChain',
    notes:
      'Proxy technical review: the source action sequence intentionally executes the X-Chain fixture; several lower-cost techniques explain the same atomic elimination.',
  },
  'tg2-coloring-001': {
    shouldBeEligible: true,
    intendedTechnique: 'complexColoring',
    notes:
      'Proxy technical review: the source action sequence intentionally executes the Complex Coloring fixture; Simple Coloring is also a complete lower-cost explanation.',
  },
  'tg2-placement-closure-001': {
    shouldBeEligible: true,
    intendedTechnique: 'lockedCandidates.claiming',
    notes:
      'Proxy technical review: the placement is the accepted one-hop closure of the Locked Candidates Claiming fixture.',
  },
  'tg2-hint-counterexample-001': {
    shouldBeEligible: false,
    intendedTechnique: null,
    notes:
      'Proxy protocol review: preparing or revealing a hint invalidates independent attribution.',
  },
  'tg2-undo-counterexample-001': {
    shouldBeEligible: false,
    intendedTechnique: null,
    notes:
      'Proxy protocol review: undo invalidates the preceding segment and requires candidate reconstruction.',
  },
  'tg2-auto-pencil-counterexample-001': {
    shouldBeEligible: true,
    intendedTechnique: null,
    notes:
      'Proxy protocol review: automatic pencil generation is not a player elimination, so it produces no attribution without making a nonexistent segment ineligible.',
  },
  'tg2-rapid-operation-counterexample-001': {
    shouldBeEligible: false,
    intendedTechnique: null,
    notes:
      'Proxy protocol review: a pending result cannot cross into an unorderable new segment.',
  },
};

for (const sample of samples) {
  const decision = decisions[sample.sampleId];
  const effectiveDecision =
    decision ??
    (sample.reviewSeedTechnique
      ? {
          shouldBeEligible: true,
          intendedTechnique: sample.reviewSeedTechnique,
          notes: `Proxy technical review: the action sequence intentionally executes the ${sample.reviewSeedTechnique} acceptance fixture; all native result explanations remain acceptable candidates.`,
        }
      : null);
  if (!effectiveDecision) {
    throw new Error(`No proxy decision exists for ${sample.sampleId}.`);
  }
  const candidates = sample.systemAttribution.candidateTechniques.map(
    candidate => candidate.technique,
  );
  if (
    effectiveDecision.intendedTechnique !== null &&
    !candidates.includes(effectiveDecision.intendedTechnique)
  ) {
    throw new Error(
      `${sample.sampleId} does not recall intended technique ${effectiveDecision.intendedTechnique}.`,
    );
  }
  sample.humanReview = {
    status: 'proxy_reviewed',
    shouldBeEligible: effectiveDecision.shouldBeEligible,
    intendedTechnique: effectiveDecision.intendedTechnique,
    acceptableCandidateTechniques: effectiveDecision.shouldBeEligible
      ? candidates
      : [],
    notes: effectiveDecision.notes,
  };
}

fs.writeFileSync(outputPath, `${JSON.stringify(samples, null, 2)}\n`);
console.log(`Wrote ${samples.length} proxy-reviewed samples to ${outputPath}`);
