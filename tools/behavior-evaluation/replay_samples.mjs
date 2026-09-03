import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [
  executable,
  inputPath,
  appendixPath,
  appendixTitle,
  preserveIneligibleValue,
] = process.argv.slice(2);
const preserveIneligible = preserveIneligibleValue === 'true';
if (!executable || !inputPath) {
  throw new Error(
    'Usage: node replay_samples.mjs <native-replay> <review-samples.json>',
  );
}
const samples = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function encodeEffects(effects) {
  return effects
    .map(
      effect =>
        `${effect.kind === 'placement' ? 'p' : 'e'}:${effect.cell}:${
          effect.digit
        }`,
    )
    .join(',');
}

function attribution(result, request) {
  const ineligibleReason =
    result.status === 'incomplete_opportunity_set'
      ? 'incomplete_opportunity_set'
      : result.status === 'cancelled'
      ? 'analysis_cancelled'
      : result.status === 'invalid_input'
      ? 'invalid_effect'
      : result.status === 'failed'
      ? 'analysis_failed'
      : request.hintAssistance?.exposureComplete === false || request.hintAssistance?.affectedEffects.length
      ? 'hint_polluted'
      : null;
  return {
    candidateTechniques: result.candidateTechniques,
    automaticTechnique: ineligibleReason
      ? null
      : result.candidateTechniques[0]?.technique ?? null,
    selectedTechnique: null,
    attributionEligibility: ineligibleReason
      ? { status: 'ineligible', reason: ineligibleReason }
      : { status: 'eligible' },
  };
}

for (const sample of samples) {
  const request = sample.analysisRequest;
  if (request === null) {
    continue;
  }
  const replay = spawnSync(
    executable,
    [
      request.startingBoardFingerprint,
      request.growthCandidates.join(','),
      request.givenCells.map(value => (value ? '1' : '0')).join(''),
      encodeEffects(request.observedEffects),
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (replay.status !== 0) {
    throw new Error(
      `Native replay failed for ${sample.sampleId}: ${replay.stderr}`,
    );
  }
  const result = JSON.parse(replay.stdout);
  const nativeReplayAttribution = attribution(result, request);
  sample.nativeReplayAttribution = nativeReplayAttribution;
  if (
    !preserveIneligible ||
    sample.systemAttribution.attributionEligibility.status === 'eligible'
  ) {
    sample.systemAttribution = nativeReplayAttribution;
  }
  sample.analysisDiagnostics = result.diagnostics;
}

fs.writeFileSync(inputPath, `${JSON.stringify(samples, null, 2)}\n`);
const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const appendix = [
  `# ${appendixTitle ?? 'TG-2 系统归因附录'}`,
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
    ...(sample.nativeReplayAttribution
      ? [
          `- nativeReplayAutomaticTechnique：\`${
            sample.nativeReplayAttribution.automaticTechnique ?? 'none'
          }\``,
        ]
      : []),
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
  appendixPath
    ? path.resolve(appendixPath)
    : path.join(toolRoot, 'reports/tg2-system-attribution-appendix.md'),
  `${appendix}\n`,
);
console.log(
  `Replayed ${
    samples.filter(sample => sample.analysisRequest).length
  } samples.`,
);
