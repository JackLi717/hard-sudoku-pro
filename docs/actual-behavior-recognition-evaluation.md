# 实际行为识别原型与人工评价协议

归因字段、最低成本默认选择和禁止归因原因只引用《玩家技巧归因协议（唯一权威）》。本文只规定样本、回放和评价流程，不重新定义归因策略。

## 样本单位

一个 `BehaviorReviewSample` 对应一个不可变起始盘面上的连续行为片段，包含：样本 ID、场景族、游戏命令类型序列、完整 `GrowthAnalysisRequest`、已结束片段的系统归因，以及人工审核字段。请求中保留 session、segment、revision、起始/预期盘面指纹、独立 `growthCandidates` 和规范 effect，因此能够原样交给 native analyzer 重放。只有 `finality=final` 的结果可以进入人工真值集；连续 elimination 期间的 `provisional` 结果只用于诊断，不能提前生成归因样本。

人工审核人必须填写：

- `shouldBeEligible`：该片段是否应允许独立归因；
- `intendedTechnique`：审核真值中的主要技巧，负例为 `null`；
- `acceptableCandidateTechniques`：动作结果可接受的全部默认解释；
- `notes`：判定依据、争议或需要复查的盘面位置。

首批样本按九个场景族分层抽取：`subset`、`fish`、`chain`、`coloring`、`placement_closure`，以及提示、撤销、自动铅笔、快速操作四类反例。正例不能只复用技巧检测器自身夹具；TG-2 签收前必须加入人工执行的命令序列。

## 回放

适配器每次发出的 `GrowthAnalysisRequest` 是回放输入。回放必须使用保存的起始盘面、`growthCandidates`、given cells 和 observed effects，不读取最终答案，不从当前游戏重新推测候选，也不把旧请求改绑到新 revision。native 返回后，仍需通过适配器的 request/session/segment/revision/fingerprint 过期检查。

`exportBehaviorReviewSamples` 输出可提交人工审核的 JSON；`replayBehaviorReviewSamples` 把保存的请求重新交给注入的 native analyzer；`evaluateBehaviorReviewSamples` 读取审核后的同一结构并生成报告。原型阶段样本可作为测试夹具或本地文件保存，但不得写入正式成长表或用户档案。

仓库内首批种子可用 `npm run behavior:samples:build` 重建，使用 `npm run behavior:samples:evaluate` 生成初始报告。样本位于 `tools/behavior-evaluation/samples/`，人工清单和评价结果位于相邻的 `reports/`。评价器明确区分 `pending` 与 `reviewed`；待审核样本不进入任何准确率或召回率分母。

## TG-2 评价输出

评价器固定输出：

- 逐技巧 `candidateRecallByTechnique`；
- `defaultExplanationAccuracy`；
- 误归因、漏记和歧义的计数与比例；
- 四类反例的总体 `pollutionIsolationRate`；
- 人工主要技巧到 `automaticTechnique`（含 `none`）的混淆矩阵。

TG-2 只有在首批九类样本均存在、逐技巧结果可人工追溯、污染负例没有产生默认归因，且报告由产品负责人复核后才通过。当前代码完成只代表原型工具具备，不自动宣告 TG-2 通过。

TG-2 通过后才能进入本地影子运行。影子数据只保存诊断请求、系统输出和人工复核结果，不展示成长结论。真实试玩复核完成后才校准 `humanCost`；TG-4 通过前不得实现成长评分、成长存储或正式成长界面。
