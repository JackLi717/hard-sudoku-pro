# TG-3A 对抗性模拟玩家

TG-3A 位于代理 TG-2 与真人 TG-4 之间，目标是快速验证“真实游戏命令 → 持久化 → 行为分段 → native 解释 → 本地诊断”整条工程链路。它不增加 C++ 技巧规则，不生成成长评分，也不把模拟器的策略标签当作真人技巧真值。

## 两个独立角色

`runAdversarialPlayer` 是确定性的模拟玩家。它只能调用 `OfflineGameCoordinator` 暴露的游戏操作，不能直接调用行为适配器或修改盘面。固定随机种子决定格子、数字和策略顺序；失败批次会先写入 `failedRuns`，保留种子、违规原因和逐步 trace，然后测试才返回失败。

验收器独立读取游戏结果、协调器实际接受的持久化命令和影子诊断。它检查被拒命令没有进入观察器、游戏没有出现意外错误、所有策略均被覆盖、最终样本保持 `pending`，并将保存的 `GrowthAnalysisRequest` 重新交给 C++ native analyzer。native 审核检查候选按 `humanCost` 排序、默认解释等于首个候选、不可归因记录没有默认技巧、机会集合完整且没有非法 effect。对于已经被提示、撤销或恢复污染的片段，回放结果写入独立的 `nativeReplayAttribution`，不得覆盖真实游戏路径确定的 `systemAttribution`。

## 策略范围

- 直接 placement；
- 删除全部或部分候选后 placement；
- 只删除候选并等待片段结束；
- 错误输入后擦除；
- placement 后撤销；
- 消除过程中请求提示；
- 暂停与恢复；
- 明确会被游戏拒绝的命令；
- 不等待人为停顿的快速连续 placement。

自动铅笔只通过真实 `toggleQuickPencil` 路径生成，模拟器随后对 quick candidate 的修改才属于玩家 elimination。所有游戏状态与动作仍由 `UserRepository` 和 `PersistentGameService` 保存，测试不使用绕开事务的内存游戏实现。

## 运行和产物

运行 `npm run behavior:adversarial:run`。正式批次使用 20 个固定种子，每个种子 100 个策略步骤；测试先生成诊断和待审核样本，再编译当前 C++ 核心完成 native 重放，最后运行独立协议审计。任一步失败都会返回非零状态。

产物包括：

- `samples/tg3a-adversarial-pending.json`：最多 120 个可人工复核样本；
- `reports/tg3a-adversarial-report.json`：机器可读指标和失败原因；
- `reports/tg3a-adversarial-native-appendix.md`：逐样本 native 输出；
- `reports/tg3a-adversarial-conclusion.md`：工程验收结论。

通过 TG-3A 只说明协议和接入层经受住确定性对抗测试。模拟玩家知道答案是为了主动制造正确与错误路径，但它无法证明真人脑中采用了哪个技巧，也不能用于校准 `humanCost`。TG-4 真实试玩复核仍然是成长评分、档案和界面的前置门槛。
