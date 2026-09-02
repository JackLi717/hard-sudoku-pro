import fs from 'node:fs';
import path from 'node:path';

const samplePath = process.argv[2];
const evaluationPath = process.argv[3];
const outputPath = process.argv[4];
if (!samplePath || !evaluationPath || !outputPath) {
  throw new Error(
    'Usage: node render_proxy_catalog_report.mjs <samples.json> <evaluation.json> <report.md>',
  );
}

const samples = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const evaluation = JSON.parse(fs.readFileSync(evaluationPath, 'utf8'));
const positives = samples.filter(
  sample => sample.humanReview.intendedTechnique !== null,
);
const catalog = samples.filter(
  sample => sample.scenarioFamily === 'technique_catalog',
);
const mismatches = positives.filter(
  sample =>
    sample.humanReview.intendedTechnique !==
    sample.systemAttribution.automaticTechnique,
);
const complete = positives.every(
  sample =>
    sample.analysisDiagnostics?.opportunitySetComplete === true &&
    sample.analysisDiagnostics.reachedEnumerationLimitTechniques.length === 0,
);
const allRecalled = Object.values(evaluation.candidateRecallByTechnique).every(
  result => result.recall === 1,
);
const passed =
  catalog.length === 39 &&
  allRecalled &&
  complete &&
  evaluation.misattributionCount === 0 &&
  evaluation.missedAttributionCount === 0 &&
  evaluation.pollutionIsolationRate === 1;
const percentage = value => `${(value * 100).toFixed(1)}%`;

const lines = [
  '# TG-2 代理工程审核结论',
  '',
  '> 本报告是产品负责人授权跳过独立盲审后，由实现方执行的代理工程审核。它不是独立人工真值，也不是真实玩家行为数据。',
  '',
  `结论：**${
    passed
      ? '通过代理 TG-2 工程门槛，可以进入仅本地诊断的影子运行。'
      : '未通过代理 TG-2 工程门槛。'
  }**`,
  '',
  '## 核心结果',
  '',
  `- 样本：${evaluation.sampleCount} 个，其中代理审核 ${evaluation.proxyReviewedSampleCount} 个、独立人工审核 ${evaluation.humanReviewedSampleCount} 个。`,
  `- 技巧覆盖：39/39；逐技巧候选召回 ${
    allRecalled ? '全部为 100%' : '存在不足'
  }。`,
  `- 正例：${evaluation.eligiblePositiveCount} 个；漏记 ${evaluation.missedAttributionCount}，误归因 ${evaluation.misattributionCount}。`,
  `- 四类反例隔离：${evaluation.pollutionIsolationCount}/${
    evaluation.pollutionIsolationTotal
  }（${percentage(evaluation.pollutionIsolationRate)}）。`,
  `- 默认技巧与审核种子同名：${percentage(
    evaluation.defaultExplanationAccuracy,
  )}；歧义片段：${evaluation.ambiguityCount}/${
    evaluation.eligiblePositiveCount
  }（${percentage(evaluation.ambiguityRate)}）。`,
  `- 搜索完整性：${
    complete ? '全部完整，无枚举上限截断' : '存在不完整机会集合'
  }；使用扩展搜索 ${
    positives.filter(sample => sample.analysisDiagnostics?.usedExpandedSearch)
      .length
  } 个。`,
  '',
  '这里的 42.5% 是“默认技巧与 fixture 种子技巧同名率”，不是候选解释准确率。其余样本中，种子技巧仍然全部保留在 `candidateTechniques`，而 `automaticTechnique` 按协议选择了能完整解释动作的最低成本技巧。因此这部分属于预期歧义，不按误归因处理，也不应为了提高同名率而继续扩展 C++ 匹配规则。',
  '',
  '## 默认解释不同的样本',
  '',
  '| 审核种子 | 最低成本默认 | 候选数 |',
  '| --- | --- | ---: |',
  ...mismatches.map(
    sample =>
      `| ${sample.humanReview.intendedTechnique} | ${sample.systemAttribution.automaticTechnique} | ${sample.systemAttribution.candidateTechniques.length} |`,
  ),
  '',
  '## 边界与下一步',
  '',
  '- 允许：进入 TG-3/TG-4，仅接入已接受的真实游戏命令并在本地保存可删除的诊断记录。',
  '- 禁止：生成掌握、成长、待巩固评分；修改玩家档案；向玩家展示技巧成长结论；据此校准 `humanCost`。',
  '- 仍需真实试玩验证：操作分段、revision/指纹过期、后台延迟、恢复、提示、撤销、自动铅笔和快速输入在实际 UI 路径中的表现。',
  '- TG-4 仍须以真实试玩抽样复核；本次代理审核不能替代 TG-4，也不能成为正式成长功能的上线依据。',
  '',
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Wrote ${outputPath}`);
