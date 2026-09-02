import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath) {
  throw new Error('Usage: node evaluate_samples.mjs <review-samples.json>');
}
const samples = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const reviewed = samples.filter(
  sample => sample.humanReview?.status === 'reviewed',
);
const positives = reviewed.filter(
  sample =>
    sample.humanReview.shouldBeEligible &&
    sample.humanReview.intendedTechnique !== null,
);
const negatives = reviewed.filter(
  sample => !sample.humanReview.shouldBeEligible,
);

const ratio = (value, total) => (total === 0 ? null : value / total);
const recall = {};
const confusionMatrix = {};
let defaultCorrect = 0;
let misattribution = 0;
let missed = 0;
let ambiguity = 0;
let pollutionIsolated = 0;

for (const sample of reviewed) {
  const expected = sample.humanReview.intendedTechnique ?? 'none';
  const actual = sample.systemAttribution.automaticTechnique ?? 'none';
  confusionMatrix[expected] ??= {};
  confusionMatrix[expected][actual] =
    (confusionMatrix[expected][actual] ?? 0) + 1;

  if (!sample.humanReview.shouldBeEligible) {
    if (
      sample.systemAttribution.attributionEligibility.status === 'ineligible' &&
      sample.systemAttribution.automaticTechnique === null
    ) {
      pollutionIsolated += 1;
    } else {
      misattribution += 1;
    }
    continue;
  }
  if (sample.humanReview.intendedTechnique === null) {
    if (sample.systemAttribution.automaticTechnique !== null) {
      misattribution += 1;
    }
    continue;
  }

  const technique = sample.humanReview.intendedTechnique;
  recall[technique] ??= { expected: 0, recalled: 0, recall: null };
  recall[technique].expected += 1;
  if (
    sample.systemAttribution.candidateTechniques.some(
      candidate => candidate.technique === technique,
    )
  ) {
    recall[technique].recalled += 1;
  }
  if (sample.systemAttribution.automaticTechnique === technique) {
    defaultCorrect += 1;
  }
  if (sample.systemAttribution.automaticTechnique === null) {
    missed += 1;
  } else if (
    !sample.humanReview.acceptableCandidateTechniques.includes(
      sample.systemAttribution.automaticTechnique,
    )
  ) {
    misattribution += 1;
  }
  if (sample.systemAttribution.candidateTechniques.length > 1) {
    ambiguity += 1;
  }
}

for (const value of Object.values(recall)) {
  value.recall = ratio(value.recalled, value.expected);
}

const report = {
  sampleCount: samples.length,
  reviewedSampleCount: reviewed.length,
  pendingReviewCount: samples.length - reviewed.length,
  eligiblePositiveCount: positives.length,
  candidateRecallByTechnique: recall,
  defaultExplanationAccuracy: ratio(defaultCorrect, positives.length),
  misattributionCount: misattribution,
  misattributionRate: ratio(misattribution, reviewed.length),
  missedAttributionCount: missed,
  missedAttributionRate: ratio(missed, positives.length),
  ambiguityCount: ambiguity,
  ambiguityRate: ratio(ambiguity, positives.length),
  pollutionIsolationCount: pollutionIsolated,
  pollutionIsolationTotal: negatives.length,
  pollutionIsolationRate: ratio(pollutionIsolated, negatives.length),
  confusionMatrix,
};
const encodedReport = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, encodedReport);
}
process.stdout.write(encodedReport);
