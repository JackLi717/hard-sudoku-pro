# Platon Sudoku 宣传事实台账

更新日期：2026-09-24

## 1. 状态定义

| 状态 | 含义 | 对外使用 |
| --- | --- | --- |
| `READY` | 已实现，存在自动或内容验收证据，且属于 Android 首发范围 | 可以按批准措辞使用 |
| `CONDITIONAL` | 代码或自动化已完成，但真机、商店、文案或发行配置仍待签署 | 只能在测试招募中明确写成 beta，不能作为正式商店承诺 |
| `HYPOTHESIS` | 有产品依据，但市场价值或玩家理解尚未验证 | 可以作为问题或实验，不可当作既定优势 |
| `BLOCKED` | 与现状不符、容易误导或缺少必要证据 | 不得发布 |

## 2. 可用事实

| ID | 状态 | 事实 | 安全表达 | 证据与限制 |
| --- | --- | --- | --- | --- |
| C-01 | `READY` | Android 包含 10,539 道唯一题目，分为五级 | `10,000+ offline classic Sudoku puzzles across five technique-based levels.` | [发行题库验收](../production-content-v4-acceptance-report.md)；不要写成手工精选题 |
| C-02 | `READY` | 10,539 道发行题由运行时逻辑核心完整重放 | `Every release puzzle was replayed end to end by the same logic engine used for hints.` | 共 680,092 个逻辑步骤；数字变化时必须更新 |
| C-03 | `READY` | 提示核心覆盖 39 种技巧 | `Hints cover 39 solving techniques, from singles to advanced chains.` | [提示体验验收](../phase-5-hint-experience-acceptance.md)；不要暗示每道题都会用到全部技巧 |
| C-04 | `READY` | 提示禁止 Guess、Backtracking、Trial and Error 回退 | `Hints use supported logical techniques rather than guessing or backtracking.` | 只约束提示和发行评级路径，不评价玩家自己的解法 |
| C-05 | `READY` | 提示以观察、依据、结论分步呈现，最后由玩家应用 | `See the logic before choosing whether to apply the step.` | 每次提示消耗有限次数；不能写 unlimited hints |
| C-06 | `READY` | 记录改变游戏状态的事件并提供单局回放 | `Replay the moves, candidate edits, undos and hints recorded during your game.` | 选格、浏览和动画不记录；旧局或损坏记录会降级 |
| C-07 | `READY` | 复盘可寻找验证通过的可能解释 | `Explore one or more possible logical explanations for a recorded move.` | 不能证明玩家真实思路；不保证每一步或全量路径都有解释 |
| C-08 | `READY` | 复盘明确保留未知和提示影响 | `Recorded facts, possible explanations and unknowns stay separate.` | 是核心定位事实；避免使用“AI knows how you think” |
| C-09 | `READY` | 手工与快速候选是独立可编辑草稿 | `Keep manual notes separate from an editable auto-filled candidate draft.` | 快速候选首次生成和重新生成消耗次数 |
| C-10 | `READY` | 候选格可自然多选并批量删除 | `Tap or drag across candidate cells, then remove one candidate from all matching selections.` | 只在格子优先且玩家主动开启设置后生效；默认关闭 |
| C-11 | `READY` | 批量删除后保留选区，数字键显示 `−N` | `The keypad shows how many selected cells will lose that candidate.` | 最适合用录屏证明，不能声称市场首创 |
| C-12 | `READY` | 核心游戏、题库、提示、复盘、进度和统计不依赖账号 | `No account. Core play, hints and replay work offline.` | 广告、购买、恢复与隐私同意可能需要网络 |
| C-13 | `READY` | 游戏流程没有自动广告调用 | `No forced ads interrupt a puzzle.` | 免费用户主动补给辅助次数时仍可选择激励广告 |
| C-14 | `READY` | 首发不包含活动、排行榜、社交或账号 | `A focused single-player Sudoku without streak pressure or social clutter.` | `without streak pressure` 属定位表达；不要攻击具体竞品 |
| C-15 | `CONDITIONAL` | Premium 是 Google Play 一次性永久商品 | `A one-time Lifetime Premium purchase, not a subscription.` | Play 商品、实时价格、购买/恢复/退款真机流程尚待签署 |
| C-16 | `CONDITIONAL` | 创始测试者可获得 Premium 兑换码 | `Qualified founding testers will receive a Google Play Lifetime Premium code after launch.` | 必须先公布资格、名额、发放时间、Android 账号边界；不能交换评分或评论 |
| C-17 | `CONDITIONAL` | 英语、日语、德语、简体中文四语 | `Available in English, Japanese, German and Simplified Chinese.` | 结构完整，但首发真机、母语和截断验收尚未全部签署 |

## 3. 需要验证的市场假设

| ID | 状态 | 假设 | 推荐验证方式 |
| --- | --- | --- | --- |
| H-01 | `HYPOTHESIS` | 玩家会因为单局复盘而更愿意长期使用 | 发布 15 秒“实际操作 → 复盘解释”视频，比较加入测试转化 |
| H-02 | `HYPOTHESIS` | 候选格自然多选能吸引重度玩家 | 展示 `−N` 和连续删除，询问是否会开启，并观察实际反馈 |
| H-03 | `HYPOTHESIS` | 39 种技巧与验证数据能提高信任 | 对比“功能型文案”和“工程证据型文案”的报名率 |
| H-04 | `HYPOTHESIS` | 无账号、离线和不强制广告能成为换 App 理由 | 在 Android 社区测试安静体验角度，而非数独技巧社区 |
| H-05 | `HYPOTHESIS` | 玩家理解 `possible explanation`，且不会把它误解为真实思路识别 | 访谈或问卷询问复盘的事实边界 |

## 4. 禁止或需要纠正的说法

| ID | 状态 | 不得使用 | 原因 | 替代 |
| --- | --- | --- | --- | --- |
| B-01 | `BLOCKED` | `The first/only Sudoku app with replay.` | 市场已有 move replay 产品，无法证明唯一 | `Replay recorded moves and explore possible explanations.` |
| B-02 | `BLOCKED` | `The smartest/best hint system.` | 主观且竞品已有相同主张 | 描述 39 技巧、分步证明和禁止猜测 |
| B-03 | `BLOCKED` | `AI understands how you solved.` | 系统不证明玩家心理过程，也不应称为 AI | `The logic engine analyzes possible explanations.` |
| B-04 | `BLOCKED` | `Every move is explained.` | 搜索有预算和覆盖边界 | `Key moves can have one or more possible explanations.` |
| B-05 | `BLOCKED` | `Completely ad-free.` | 免费用户可主动观看激励广告 | `No forced ads interrupt a puzzle.` |
| B-06 | `BLOCKED` | `Completely offline.` | 商店、广告、恢复和同意需要网络 | `Core play works offline.` |
| B-07 | `BLOCKED` | `Unlimited hints/Quick Candidates.` | 辅助使用有限次数 | 说明免费试用、主动补给和 Premium 完成补给 |
| B-08 | `BLOCKED` | `All data never leaves the device.` | 玩家主动观看广告时会接入 Google Mobile Ads/UMP | `Game progress and statistics are stored locally.` |
| B-09 | `BLOCKED` | `Handcrafted puzzles.` | 题目来自受控离线生成和验证流水线 | `Validated, unique, logic-solvable puzzles.` |
| B-10 | `BLOCKED` | `Lifetime Premium code for a five-star review.` | 违反 Google Play 对激励评分和评论的政策 | 奖励完成测试任务和私下反馈，与商店评分无关 |
| B-11 | `BLOCKED` | 同一内容使用小号制造推荐 | 违反社区真实性和反垃圾规则 | 公开开发者身份，使用允许推广的频道 |

## 5. 发帖前检查

- [ ] 使用的产品名与当前品牌决定一致；
- [ ] 功能属于 Android 首发 Release，而非保留的成长页、学堂或 Hint Lab；
- [ ] 说法在本台账中是 `READY`，或明确标为 beta 的 `CONDITIONAL`；
- [ ] 视频来自真实 Android 构建；
- [ ] 数字和截图仍与当前构建一致；
- [ ] 没有把可能解释写成玩家真实思路；
- [ ] 没有把可选激励广告写成完全无广告；
- [ ] Premium 奖励没有与安装、评分或评论绑定；
- [ ] 社区规则允许自我推广、测试招募和外部链接；
- [ ] 帖子披露开发者身份。

## 6. 政策依据

- [Google Play 用户评分、评论和安装政策](https://support.google.com/googleplay/android-developer/answer/9898684)：禁止以奖励换取评分或评论；
- [Google Play Promo Codes](https://developer.android.com/google/play/billing/promo)：一次性商品每季度最多 500 个单次码；
- [Google Play 商店素材最佳实践](https://support.google.com/googleplay/android-developer/answer/13393723)：功能、状态和图像不得虚假或误导；
- [Reddit Rules](https://redditinc.com/policies/reddit-rules)：必须真实参与并遵守各社区规则。
