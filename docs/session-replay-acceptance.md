# 单局复盘验收记录

日期：2026-09-04。当前基线 `main / 046ceff`，本轮修改留在原工作区，未提交、未推送。先写入实施交接第 8 节的边界，再实现。新增当前预发布事件表，没有提升 schema / 内容 / 算法版本，没有改变 C++ 技巧种类。

## 事件记录与读取

- `PersistentGameService` 为已接受且改变状态的持久命令生成事件。包括原始操作、撤销及目标操作、自动候选生成/重新生成、铅笔开关、候选来源、提示准备/实际展示/关闭/应用，以及暂停、恢复、结束边界。选格、数字浏览、滚动与动画不记录。
- `game_replay_events` 追加写入，与会话状态、操作 active 标志、收据、扣费及结算使用同一事务。事件 ID 唯一，session/revision 唯一；记录前后 revision、时间、操作关联和完整 UndoSnapshot。revision 决定顺序，不要求相邻整数；提示内部准备可能递增两次。
- 同一服务的重复事件 ID 共用原 Promise，不重复执行；不同命令复用 ID 报错。失败可重试。数据库收据保护重复提交，过期 revision 拒绝写入；恢复后重用已提交 ID 不会覆盖新状态。缓存最多保留最近 128 次已完成请求，串行持久化和输入目标捕获保持原有边界。
- 新局保存记录起点；完整事件链可重放已撤销分支，撤销帧显示目标动作，展示提示与应用提示分开。旧局继续保存原来的有效操作路径；从旧局继续游戏，只从实际启用点记录，不补造先前事件，也不声称有完整事件覆盖。
- 历史读取在一个事务中取得状态、操作与事件。新事件不足或损坏时降级有效路径；数值链不可恢复时显示最终快照。列表和详情共用 `replayRecoverability`。不要求旧局序号连续，也不要求相邻完整候选快照相等。
- 旧局快照间可确认的候选/模式差异插入“候选状态更新·来源未知”，保留操作前后切换。这些帧没有 GameMove，不生成玩家排除或独立技巧证据。仍无法补回旧局的撤销发生时间、候选变化来源和缺失曝光。
- 表在现有开发数据库打开时幂等补建，不重置用户库，不回填虚构事件。SQL 参考基线同步到 `database/schema/user-v2.sql`，没有新增顺序迁移或多套版本。

## 演练呈现

- 常驻区分“已记录事件时间线”“历史有效操作路径”与“推理演示·候选由程序计算”。真实复盘与理论副本独立；理论演练不调用游戏命令、不扣提示、不增加曝光或成长记录。
- 列表标题为“可能的解释”，技巧名称下增加具体结论摘要，例如“第一宫只有 R3C2 可以放 2”。保留全部找到且验证通过的非重复解释，不截成前三条，也不折叠基础技巧。已有提示另有“当时展示/当时使用”标记。
- 继续复用 `buildHintPresentation` 和 `SudokuBoard`：每页按证明强调相关宫/行/列、候选数字与已填数证据，并弱化无关内容。候选、正文和触控目标字号未缩小。
- 保留原有落子高亮、操作前后切换、进度条、播放、退出演练与 Finish 返回原位置。演练使用程序候选，退出恢复真实当时草稿；搜索异步取消与过期结果隔离仍有测试。

## 自动验证

- `npm test -- --runInBand --no-watchman`：46 个套件、894 项通过；按既有配置跳过 1 套件 / 11 项。包括撤销再落子、快速输入、重复请求、候选生成/重生成、候选来源切换、恢复、旧局启用边界、仅展示提示、应用提示、损坏事件降级、只读和异步过期。
- 新增事务故障测试：事件插入失败时，状态、钱包、操作及收据整体回滚；再次提交成功。200 次输入的 SQL 调用数保持常数，仅增加一次事件 insert。
- `npm run typecheck`、`npm run lint`（无警告）、`npm run schema:check`、改动文件 Prettier 及 `git diff --check` 通过。
- `npm run hint:core:check`：100 局、6,166 个逻辑步骤、1,000 个随机合法状态和 39 种技巧验证通过。本轮不改原生实现，未重新安装/构建 App；两台模拟器通过现有 Metro 刷新并从实际新文案确认运行当前代码，原生枚举实际可用。
- 更新只读采集工具：表存在时同时采集 replayEvents，旧库没有表时保持缺失；不回填。
- 测试前重新采集 iPad mini 9 局 / Android 19 局，共 28 局、2,047 条操作。全库行为回归生成 1,235 次分析请求，明确失败 0，状态仍是 `checks_passed_with_incomplete_evidence`。
- 复盘专检：原 28 局全部可恢复有效操作路径，186 个快照候选状态更新明确保留；所有局最终数字和完整 CandidateState 均与保存状态相等。
- 测试后采集 29 局（只新增下面的 Android 验证局），29 局均可重放。逐项比较原 28 局的 `state`、所有 `moves`（含 inactive）和原 `records`，变化 0。采集摘要因新增字段变化，不拿整包 digest 冒充数据被修改。

## 模拟器体验与截图

Android：`emulator-5554`，`com.jackli717.sudoku`。iPad mini：`90B067D2-29A4-4D4E-97EB-E9138113F1EF`。都保留原存档，使用现有英文设置，中文组件文案另有测试。

- Android 原最新 Level 4 局：第 1 步 R3C2=2，Hidden Single 摘要正确；5 页演练逐页走查，第一宫和 2 明显突出，后续按阻挡行列显示证据；Finish 回到第 1 步，操作前后切换仍有效。
- iPad 原最新 Level 2 局：前两次候选编辑、第三帧来源未知候选更新、第四帧 R4C4=2 均可读取。Hidden Single 的第五宫观察页、行证据页和五页结束均走通；Finish 回到第 4 帧，恢复真实候选。
- Android 新增验证局 `session-1788491799179-r0k3m4zb`，Level 1，已结束为 abandoned，保留在历史中，未删除测试数据。实际操作：误填 → 撤销 → 自动候选 → 手动来源 → 铅笔关闭 → 提示准备/展示/关闭（未应用）→ 暂停 → Reload → 恢复 → 手动 R6C3=5 → 暂停 → 结束。SQLite 中共有 13 条事件，revision 0→13 连续，撤销目标正确，只有 1 次提示曝光。新局详情实际显示“Recorded event timeline”、第 2 帧 Undo 及第 7 帧 Hint shown / Shown then。
- 实战新测试局按原规则使用 1 次自动候选和 1 次提示额度；复盘与理论演练没有额外消耗。

本机截图和验收日志保存在 Git 忽略目录 `.local/behavior-regression/replay-next-20260904/`：

- [Android 解释摘要](../.local/behavior-regression/replay-next-20260904/screenshots/android-explanations.png)
- [Android 第一宫观察页](../.local/behavior-regression/replay-next-20260904/screenshots/android-observe.png)
- [Android 第二页证据](../.local/behavior-regression/replay-next-20260904/screenshots/android-reason-2.png)
- [Android 完成返回](../.local/behavior-regression/replay-next-20260904/screenshots/android-finish.png)
- [新事件：撤销目标](../.local/behavior-regression/replay-next-20260904/screenshots/android-event-undo.png)
- [新事件：仅展示提示](../.local/behavior-regression/replay-next-20260904/screenshots/android-event-hint-shown.png)
- [iPad 观察页](../.local/behavior-regression/replay-next-20260904/screenshots/ipad-observe.png)
- [iPad 第二页证据](../.local/behavior-regression/replay-next-20260904/screenshots/ipad-reason-2.png)
- [iPad 完成返回](../.local/behavior-regression/replay-next-20260904/screenshots/ipad-finish.png)

完整本机回归报告：`/private/tmp/hsp-replay-next/run-csqNh3/report.json`。测试前/后样本：`capture-AbTYJd` / `capture-maa5xa`（同目录）；最终快照专检及历史不变比较分别见本地交付目录 `replay-audit.json`、`preservation-audit.json`。这些是本机验收材料，不随 App 打包。

## 保留边界

- 旧局缺失事件无法恢复；旧局中途启用日志仍降级为有效操作路径，不混排虚构时间线。
- iPad 最新局 R4C4=2 的自动扩展搜索曾显示“分析失败，请重试”；已验证的直接 Hidden Single 保留且可完整演练。本轮不扩大 C++ 技巧和搜索规则，不宣称所有动作或所有路径都能解释。
- 已实测上述两台模拟器的英文竖屏与默认字号；没有验证真机、其他屏幕、大字体或所有语言/配色的视觉组合。
