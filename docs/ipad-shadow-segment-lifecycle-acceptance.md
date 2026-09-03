# iPad mini 行为片段生命周期修复复验（2026-09-03）

归因边界只引用[玩家技巧归因协议](player-technique-attribution-policy.md)。本次修复实际行为适配器和异步控制器，不增加 C++ 技巧，不调整 `humanCost`，不修改正式成长存储或界面。

## 真实试玩证据

来源为已完成对局 `session-1788414078679-z8mfc77i`，最终 revision 96。

- R1C6 删除候选 7 后约 885ms，关闭铅笔使 revision 从 15 变为 16，但盘面值不变。
- 删除请求的 matched 结果约 2.665 秒后保存；旧适配器因 revision 不同将其判为 `revision_expired`，但未关闭旧片段。
- 约 30 秒后的 R1C1=9 被追加到旧删除片段；随后操作又触发取消与快速操作污染。
- 单独回放原删除可以解释为 `lockedCandidates.pointing`；保留该删除后单独识别 R1C1=9 可以解释为 `hiddenSingle`。这验证了存在合理解释，不代表确定玩家实际采用的心算方法。

延迟是请求到诊断记录的耗时，不等于纯 C++ 执行时间；本次修复不宣称消除了耗时来源。

## 修复范围

- 记录连续、已观察到且不改变分析证据的界面操作所对应的内部兼容 revision；原请求身份及 issuedRevision 保持不变。未观察到的 revision 跳变仍不可接受。
- 连续删除的空闲截止时间由最后一个实际 effect 决定；切换铅笔、选格和慢响应不再延长片段。截止时没有分析结果也会封闭证据，且在下一条命令前补查截止时间，覆盖 JS 定时器延迟。
- 当前请求过期、盘面不一致、取消或失败后结束旧片段；较旧回调不能清除后来的新片段。已结束收集的删除片段因分析仍未完成而被替代时，记录分析取消，不误称玩家快速操作污染。
- 提示、撤销、恢复和候选加回的隔离边界不因 revision 兼容而放宽。

## 可重复验证

新增 `__tests__/behavior-segment-lifecycle.test.ts`，使用真实游戏 reducer、适配器和控制器，包含 13 项时序回归。默认使用可控响应；完整自动验收另以新编译的 C++ 回放程序执行同一组用例。

覆盖原始慢响应场景、选格/铅笔/候选来源/自动草稿/普通候选补写、连续删除、旧回调晚到、30 秒无响应、JS 定时器延迟、提示中断、分析拒绝、revision/指纹失效和取消。

本次执行 `node tools/behavior-evaluation/run_acceptance.mjs`：

- 11 个自动验收环节全部通过，`engineeringPassed=true`。
- 全量 Jest：33 个套件、461 项测试通过。
- 13 项生命周期用例在原生 C++ 回放模式下全部通过。
- TypeScript、ESLint、Prettier、`git diff --check` 通过；iPad mini iOS 17.5 Release 构建通过。
- 验收运行目录：`/var/folders/5g/pxgvwb694mjczcphtcb7yq5w0000gn/T/behavior-acceptance-C4Sp1P`。该临时报告对应本次未提交代码，不应仅用其中基线 commit 标识修复版。

已覆盖安装并启动 iPad mini 修复版，首页正常。构建包与安装包的 `main.jsbundle` SHA-256 一致，且安装包包含新兼容 revision 字段。更新前后 `user.sqlite`（1528 行）和 `behavior-shadow.sqlite`（1029 行）的全部非内部表内容校验值一致，完整性检查均为 ok；8 局已完成对局及原始诊断未被修改。

## 结论边界

本次缺陷已通过自动回归；尚未完成修复版上的新一局真实试玩。原始历史归因记录不回写，不把旧失败记录改成成功结果。

`growthReleaseReady` 仍为 false；同一机会去重、跨进程提示曝光持久化等既有延期项仍按[自动验收说明](automated-behavior-acceptance.md)处理。本次不据此宣称成长发布门槛或人类意图识别已经全部完成。
