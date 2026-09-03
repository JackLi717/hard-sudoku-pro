# 通用完整机会关联原型

语义以 [玩家技巧归因协议](player-technique-attribution-policy.md) 为唯一权威；本文提供实现、运行和验收说明。

## 实现范围

`src/application/technique-recognition/opportunity-processes.ts` 实现两个入口：

- `buildOpportunityProcesses(records, sessionId)`：从全部候选的完整 placement/elimination 结果构建关联图，保留实际执行、未执行结果、重叠机会与后续单数。
- `verifyOpportunityProcesses(report, analyzer)`：在冻结起点对实际累积结果进行原 native 复验，输出整段归因。逐步归因不变。

复验报告还输出 `placementExplanations`：查看某次落数的 `localAttribution`、依赖状态及前置过程 `paths`。每条路径提供起始 revision、盘面、前置实际效果及该过程归因。具体准入、成本比较范围及禁止重复计数的语义只在权威协议中定义。

代码不包含针对三数组、四数组、鱼、链、着色等技巧的判断。技巧代码只作为目录数据和解释标签；算法比较的是结果、盘面、独立候选与归因证据。

本轮是离线原型，不改变现有回顾页面的去重统计、不建设成长档案、不向玩家发布掌握结论，也不更改 C++ 技巧或 humanCost。相同完整结果可有多种技巧解释；部分重叠的完整结果不强行合并。图中过程数不能作为使用次数。

## 只读回放工具

使用 Node 24（支持 `node:sqlite`），先由 `npm run behavior:acceptance` 生成报告目录中的 `native_replay`，然后运行：

```sh
node tools/behavior-evaluation/analyze_opportunity_processes.mjs \
  /absolute/path/behavior-shadow.sqlite SESSION_ID \
  /absolute/path/native_replay /absolute/path/new-report.json
```

输入也可为原始 `BehaviorShadowRecord[]` JSON。数据库以只读方式打开；新报告使用独占创建，已有文件不会被覆盖。采集运行中的 SQLite 时必须同时复制 WAL/SHM；优先分析已提取的诊断快照，不对设备数据库做写操作。

复验的资源边界遵循权威协议。输出中的 `verification.completedBatchSizes`、`attempted`、`attributed` 用于检查是否处理完整局，例如 129 个过程应输出两批 `[128, 1]`，而不是 `verification_limit`。这些计数不是玩家技巧使用次数。

## 39 技巧验收矩阵

`__tests__/opportunity-processes.test.ts` 直接遍历现有技巧目录的 39 个 Hint Lab 样本，校验目录与样本逐项一致：

- 每个技巧进行正序、逆序、轮换起点执行。
- 每个技巧检查部分执行：不能补造未执行的 elimination；单结果技巧第一次操作即完成。
- 每个完整过程回到原起点进行 native 复验，要求对应技巧仍存在于整段候选中。
- 覆盖独立观察运行、候选恢复、提示、撤销、缺失结果、枚举不完整、native 身份错误及资源限制反例。
- 另用玩家实际题目检查“先排除后落数”和“先落数再继续排除”。测试中的实例数据不参与生产算法分支。
- 检查 0、1、128、129、257 个过程的批次完整性，以及单过程失败后仍继续下一批。`behavior-candidate-boundaries.test.ts` 使用同局盘面复现提示前后候选事实丢失问题，并在 `segment-lifecycle` 阶段用真实 native 验证修复后的默认解释。
- 39 个目录样本逐项检查是否产生新的一步单数：有收尾的样本验证前置技巧不被局部单数覆盖；没有新单数的样本只验证不制造收尾。另检查实际 R2C2=8 的前置对子、省略删除的心算备选，以及提示、撤销、缺失记录和复验失败隔离。

## R2C2=8 的前置依赖回归

会话 `session-1788434565754-fpoff1wo` 中，玩家先删除 R2C8 的 1、8 和 R1C7 的 7，再填 R2C2=8。最后一步局部默认是 `hiddenSingle`；原始起点的完整排除机会默认是 `hiddenPair`。回归保留这两个层次，不能用局部单数替换源技巧。四数组仍可保留为当前盘面的合理解释，但不能因为玩家提到了四数组，就断言它是此前排除的唯一来源。

此回归使用冻结日志盘面与规范操作，不读取或改写用户正在进行的游戏。离线报告变化不会自动改变历史回顾页面；页面接入和成长统计继续独立验收。

统一自动验收新增 `opportunity-processes-39` 阶段，产出逐项 Jest JSON。普通 Jest 使用契约测试响应；该验收阶段强制使用本次构建的真实 C++。原有目录阶段继续使用独立数独求解器检验操作真值。

## 本轮真实日志复验

会话 `session-1788427345446-09ifcnhz` 的 revision 72 起，六次删除形成一个完整机会，整段复验同时得到 `hiddenQuad` 和 `nakedTriple`，按既有成本默认 `hiddenQuad`。填 R6C8=7 作为原本已有简单解释的执行后续保留。之后的错误输入、撤销形成边界，R2C8=5 不被强行接回这一过程。

纯净回归路径没有误填/撤销时，两次落数均可作为执行后续关联；直接落数而未点掉的候选仍记为未显式执行，不能伪造完整删除日志。

该局完成后保存的 129 个候选过程，使用分批复验得到 `[128, 1]`、129 次尝试和 129 个归因结果对象，图枚举完整；不会改写原来保存的局部诊断，也不代表玩家独立使用了 129 次技巧。

同局还暴露了提示边界错误清空玩家候选事实的问题：此前 R3C5 删除 5，经过两次提示后被错误加回，导致 R5C5 删除 3、8 被默认解释为 `forcingNet`；保留该事实的游戏命令回归中，两次删除分别及连续执行时均默认 `hiddenPair`。辅助补全前保留 R5C5 删除 8 后，后续 R5C5=5 默认 `nakedSingle`，不再因候选被错误加回而默认 `hiddenPair`。这些是受控重放结果，不是历史记录已经被修正；生产实现没有针对该题或技巧名称的分支。

## 证据限制与下一步

39 个目录样本通过证明该关联算法覆盖现有技巧接口并通过回归，不等于证明所有盘面都无漏识别，也不是独立的人类技巧标签真值。单结果技巧没有多个删除可重排，三种顺序在这些样本上相同。

下一步应扩大多局、多实例和交错操作的回放覆盖，审核重叠解释及边界隔离，再决定是否把新关联图接入影子回顾。不得仅因本阶段通过就启用成长评分或调整 humanCost。
