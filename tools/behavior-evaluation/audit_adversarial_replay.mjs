import fs from 'node:fs';

const [samplePath, reportPath, conclusionPath] = process.argv.slice(2);
if (!samplePath || !reportPath || !conclusionPath) {
  throw new Error(
    'Usage: node audit_adversarial_replay.mjs <samples.json> <report.json> <conclusion.md>',
  );
}

const samples = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const violations = [...report.invariantViolations];
let matched = 0;
let ambiguous = 0;
let incomplete = 0;
let invalid = 0;

for (const sample of samples) {
  if (sample.humanReview.status !== 'pending') {
    violations.push(`non_pending_review:${sample.sampleId}`);
  }
  const request = sample.analysisRequest;
  if (!request) {
    if (sample.systemAttribution.automaticTechnique !== null) {
      violations.push(`attribution_without_request:${sample.sampleId}`);
    }
    continue;
  }
  const diagnostics = sample.analysisDiagnostics;
  if (!diagnostics?.opportunitySetComplete) {
    incomplete += 1;
  }
  const nativeAttribution =
    sample.nativeReplayAttribution ?? sample.systemAttribution;
  if (nativeAttribution.attributionEligibility.reason === 'invalid_effect') {
    invalid += 1;
  }
  const candidates = nativeAttribution.candidateTechniques;
  if (candidates.length > 0) {
    matched += 1;
  }
  if (candidates.length > 1) {
    ambiguous += 1;
  }
  if (
    nativeAttribution.automaticTechnique !== (candidates[0]?.technique ?? null)
  ) {
    violations.push(`automatic_not_first_candidate:${sample.sampleId}`);
  }
  for (let index = 1; index < candidates.length; index += 1) {
    if (candidates[index - 1].humanCost > candidates[index].humanCost) {
      violations.push(`candidate_cost_order:${sample.sampleId}`);
      break;
    }
  }
  if (
    sample.systemAttribution.attributionEligibility.status === 'ineligible' &&
    sample.systemAttribution.automaticTechnique !== null
  ) {
    violations.push(`ineligible_default:${sample.sampleId}`);
  }
}

report.nativeReplay = {
  replayedSampleCount: samples.filter(sample => sample.analysisRequest).length,
  matchedSampleCount: matched,
  noMatchSampleCount:
    samples.filter(sample => sample.analysisRequest).length - matched,
  ambiguousSampleCount: ambiguous,
  incompleteOpportunitySetCount: incomplete,
  invalidEffectCount: invalid,
};
report.invariantViolations = [...new Set(violations)];
report.passed =
  report.invariantViolations.length === 0 && incomplete === 0 && invalid === 0;
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# TG-3A 对抗性模拟玩家验收',
  '',
  `结论：**${report.passed ? '通过工程对抗验收' : '未通过工程对抗验收'}**。`,
  '',
  `- ${report.runCount} 个固定随机种子，共 ${report.requestedStrategySteps} 个策略步骤、${report.requestedCommandCount} 次游戏 API 调用。`,
  `- 游戏实际接受 ${report.acceptedDurableCommandCount} 条持久化命令。`,
  `- 产生 ${report.finalDiagnosticSampleCount} 个最终诊断；抽取 ${report.exportedPendingSampleCount} 个可审核样本。`,
  `- native 重放 ${report.nativeReplay.replayedSampleCount} 个请求：匹配 ${matched}，无匹配 ${report.nativeReplay.noMatchSampleCount}，歧义 ${ambiguous}。`,
  `- 不完整机会集合 ${incomplete}，非法 effect ${invalid}，协议不变量失败 ${report.invariantViolations.length}。`,
  '',
  '覆盖策略：',
  '',
  ...Object.entries(report.strategyCounts).map(
    ([strategy, count]) => `- \`${strategy}\`：${count}`,
  ),
  '',
  '> 该结论证明真实游戏命令路径、持久化、分段、污染隔离、异步防护和 native 重放能够协同工作；它不证明真人实际采用了某项技巧，也不替代 TG-4 真人复核。',
  '',
];
fs.writeFileSync(conclusionPath, lines.join('\n'));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) {
  process.exitCode = 1;
}
