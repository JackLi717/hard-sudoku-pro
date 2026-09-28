# Platon Sudoku：免费辅助钱包与 Lifetime Premium 设计

更新日期：2026-09-28

状态：运行时与四语文案已按本文切换；真机商店、广告及 Beta 验收仍待发布流程完成。

## 1. 决策结论

首个公开版本保留跨题累计的免费辅助钱包，并把 Lifetime Premium 改为无限辅助：

| 能力           | 免费玩家                                       | Lifetime Premium |
| -------------- | ---------------------------------------------- | ---------------- |
| 初始快速候选   | `3` 次                                         | 无限             |
| 初始智能提示   | `5` 次                                         | 无限             |
| 每次有效辅助   | 从对应钱包扣除 `1` 次                          | 不扣次数         |
| 激励广告       | 所选资源 `+1`，可储存                          | 不展示           |
| 首次完成奖励   | 快速候选 `+1`，智能提示按等级 `+1/+1/+2/+2/+3` | 不需要           |
| 钱包上限       | 两种资源分别为 `99`                            | 不显示钱包       |
| 自动或强制广告 | 无                                             | 无               |

本次决定保留 2026-09-10 已实现的免费初始额度、广告奖励钱包、离线储存、奖励流水和 `99` 上限，
但取代以下旧规则：免费完成不发辅助额度、Premium 继续扣除库存、Premium 首次完成按等级
`+1–5` 补给及首次购买补满 `99`。

项目仍处于首次公开发行前，后续实现直接替换当前开发基线，不保留并行奖励策略。

## 2. 产品目标

- 免费玩家可以通过开始额度、完成新题和主动激励广告获得可跨题保存的真实奖励。
- 简单题中节省或获得的额度可以留给更困难的题，不机械限制每题最多使用多少次。
- Lifetime Premium 的价值直接、永久且容易解释：无限智能提示、无限快速候选、无广告。
- 提示继续帮助学习，不变成自动连续解题；无限表示不受次数限制，不表示自动执行整条解题路径。
- 题目难度、HSP 分数和分配不以增加广告展示为目标；广告只是免费钱包不足时的自愿补充。
- 免费完成补给低于旧 Premium 表，避免大多数免费玩家长期只增不减，同时不惩罚愿意学习的玩家。

## 3. 免费玩家规则

### 3.1 初始钱包与上限

新安装首次建立用户数据时一次性发放：

| 资源     | 初始额度 | 持有上限 |
| -------- | -------: | -------: |
| 快速候选 |      `3` |     `99` |
| 智能提示 |      `5` |     `99` |

- 两种额度跨题保存，可以在离线状态下使用。
- 开始新局、重新挑战、重置统计、恢复购买或升级 App 均不能重复发放初始额度。
- 两种资源分别计算，不能互相转换。
- 到达 `99` 后停止对应资源的广告兑换入口；完成奖励只按剩余容量实际入账。
- 未能入账的超出部分不形成待领取奖励，也不能在以后反复补领。

### 3.2 智能提示消费时机

- 只有成功找到并展示一条有效结构化提示的第一阶段时才消耗 `1` 次。
- 同一条提示的后续推理页和应用操作不重复消耗。
- 用户看过第一阶段后关闭，仍视为已经使用。
- 当前盘面冲突、存在标红错误、棋局已经完成或引擎无法产生有效步骤时不消耗。
- 玩家修改盘面后旧提示失效；重新请求新的有效提示需要新的额度。
- 使用过智能提示的对局标记为“提示辅助完成”，不计为独立完成或完美完成。

### 3.3 快速候选消费时机

- 当前题第一次成功生成快速候选消耗 `1` 次。
- 显示、隐藏和恢复同一份已经生成的快速候选始终免费。
- 正常落数引起的候选自动清理免费。
- 玩家手工修改快速候选后，确认覆盖并重新生成再消耗 `1` 次。
- 盘面不合法、存在标红错误、生成失败或用户取消确认时不消耗。

### 3.4 激励广告奖励

- 免费玩家每完成一条有效标准激励广告，只为所选资源增加 `1` 次。
- 广告奖励写入全局钱包，可以立即使用，也可以储存后离线使用。
- 玩家可以从奖励页主动补充，也可以从对应资源不足的游戏入口进入。
- 每次广告都必须在播放前明确说明所选资源和固定奖励，并由玩家逐次主动选择。
- 只有广告 SDK 返回有效奖励事件后才入账；加载失败、无填充、提前关闭、跳过、断网或拒绝均不入账。
- 奖励到账后，即使玩家取消本次辅助、盘面失效或辅助计算失败，已经获得的 `1` 次仍保留。
- 不设置每日广告任务，不批量播放，也不自动连续播放广告。

## 4. 免费玩家完成奖励

只有每道题的第一次合法完成发放辅助额度，重玩不重复发放：

| 首次完成难度 | 快速候选 | 智能提示 |
| ------------ | -------: | -------: |
| Level 1      |     `+1` |     `+1` |
| Level 2      |     `+1` |     `+1` |
| Level 3      |     `+1` |     `+2` |
| Level 4      |     `+1` |     `+2` |
| Level 5      |     `+1` |     `+3` |

结算规则：

- 奖励资格按完成时为免费权益且该题尚未完成过判断。
- 独立完成、提示辅助完成和完美完成获得同一等级基础补给，避免玩家因担心失去奖励而拒绝学习。
- 失败、放弃、开局或暂停不发放奖励。
- 完美完成、连续完成、零错误和无提示不额外叠加辅助额度；它们继续作为成绩事实和积分因素。
- 快速候选固定 `+1`，让正常完成者可以补回一次基础候选生成；反复重新生成仍形成净消耗。
- 智能提示最高只补 `+3`，低于旧 Premium 的 `+1–5` 表，让重度辅助用户仍可能需要广告或 Premium。
- 完成记录、首次完成标记、实际入账奖励、钱包和流水必须在同一事务内保存。
- 达到 `99` 时按剩余容量裁剪；完成页只显示实际增加量，并明确已达上限的情况。

免费阶段已经首次完成的题目，之后购买 Premium 不追补，也不需要追补；Premium 已经无限。
如果 Premium 权益以后被退款或撤销，Premium 期间完成的题目不补发免费完成奖励。

## 5. Lifetime Premium 规则

- 一次性非消耗型购买，权益由当前平台商店账号购买和恢复。
- 智能提示无限使用，不读取或扣除免费钱包。
- 快速候选首次生成和重新生成均无限使用。
- 不请求或展示激励广告，也不展示辅助余额、补给或库存上限。
- 完成题目不发放辅助次数，因为 Premium 已经无限。
- 仍然一次只讲解一个原子逻辑步骤，不自动串联提示，不自动解完整题。
- 使用智能提示后仍记录真实提示次数，并按提示辅助完成处理；Premium 不改变成绩事实。
- 无网络时使用本地缓存的有效 Premium 权益，联网后按既有商店同步规则刷新。

购买 Premium 时保留原有免费钱包余额，但将其隐藏并停止消费。恢复购买不得重复发放额度。
如果购买被商店退款或撤销，后续在权威同步确认后恢复免费规则及购买前保留的钱包余额；
撤权不追扣历史使用，也不为 Premium 期间完成的题目补发免费奖励。

## 6. 完成结果与展示

免费玩家符合资格时显示本局实际入账补给；Premium 玩家不显示补给模块。两类玩家都继续保存和展示：

- 首次完成和重复完成；
- 当前难度、用时、错误和提示次数；
- 独立完成、提示辅助完成和完美完成；
- 当前连胜、最佳时间、单局积分和复盘；
- 已批准范围内的技巧事实与成长数据。

免费玩家和 Premium 玩家使用同一完成判定。Premium 的价值来自无限辅助和无广告，
不是完成后领取消耗型资源。

## 7. 难度与商业化边界

- 保持现有五档技巧等级、HSP 评分算法和正式题库难度范围。
- 不提高 HSP 最低分，不选择高分题来迫使免费玩家消耗额度或观看广告。
- 同一等级继续保留相对轻松、典型和较难的题目节奏。
- 所有发行题在逻辑上都可以零提示完成；不能把任何题描述为“必须看广告”。
- Beta 观察按等级区分余额净变化、提示使用、广告补充、满仓率和零余额后放弃，
  但不能以广告展示量单独评价题目质量或提示策略。

## 8. 四语界面文案草案

本节是已经随运行时行为同步应用的目标文案；后续修改必须继续保持四语与实际规则一致。

### 8.1 English

Premium page:

- Eyebrow: `LIFETIME · ONE-TIME`
- Hero: `Unlimited help`
- Body: `One purchase. Unlimited Smart Hints and Quick Candidates. No ads.`
- Benefit: `Unlimited Smart Hints`
- Benefit: `Unlimited Quick Candidates`
- Benefit: `No rewarded ads`
- Benefit: `Lifetime access with one purchase`

Free assistance:

- `Start with 5 Smart Hints and 3 Quick Candidates uses.`
- `Complete new puzzles to earn more assistance.`
- `Watch an optional rewarded ad to add 1 use of the selected assistance feature.`
- `Watch ad · +1`

Completion reward:

- Title: `Puzzle reward`
- `Quick Candidates +{{count}}`
- `Smart Hints +{{count}}`
- `Your reward was limited by the 99-use balance cap.`

### 8.2 日本語

Premium page:

- Eyebrow: `永久 · 1回購入`
- Hero: `回数制限なしのサポート`
- Body: `1回の購入で、スマートヒントとクイック候補を無制限に利用できます。広告は表示されません。`
- Benefit: `スマートヒントを無制限に利用`
- Benefit: `クイック候補を無制限に利用`
- Benefit: `リワード広告なし`
- Benefit: `1回の購入で永久に利用`

Free assistance:

- `スマートヒント5回、クイック候補3回から始められます。`
- `新しい問題を初めてクリアすると、補助回数を獲得できます。`
- `任意のリワード広告を見ると、選んだ補助を1回追加できます。`
- `広告を見る · +1`

Completion reward:

- Title: `問題クリア報酬`
- `クイック候補 +{{count}}`
- `スマートヒント +{{count}}`
- `所持上限99回のため、実際の追加回数が調整されました。`

### 8.3 Deutsch

Premium page:

- Eyebrow: `DAUERHAFT · EINMALIGER KAUF`
- Hero: `Unbegrenzte Hilfe`
- Body: `Ein Kauf. Unbegrenzte intelligente Hinweise und Schnellkandidaten. Keine Werbung.`
- Benefit: `Unbegrenzte intelligente Hinweise`
- Benefit: `Unbegrenzte Schnellkandidaten`
- Benefit: `Keine Werbung mit Belohnung`
- Benefit: `Dauerhafter Zugriff mit einem Kauf`

Free assistance:

- `Du startest mit 5 intelligenten Hinweisen und 3 Nutzungen der Schnellkandidaten.`
- `Löse neue Rätsel zum ersten Mal, um weitere Hilfen zu erhalten.`
- `Sieh dir freiwillig eine Werbung mit Belohnung an, um die ausgewählte Hilfe einmal hinzuzufügen.`
- `Werbung ansehen · +1`

Completion reward:

- Title: `Rätselbelohnung`
- `Schnellkandidaten +{{count}}`
- `Intelligente Hinweise +{{count}}`
- `Die tatsächliche Belohnung wurde durch das Guthabenlimit von 99 Nutzungen begrenzt.`

### 8.4 简体中文

Premium page:

- Eyebrow：`永久 · 一次购买`
- Hero：`无限辅助`
- Body：`一次购买，无限使用智能提示和快速候选，全程无广告。`
- Benefit：`无限智能提示`
- Benefit：`无限快速候选`
- Benefit：`无需观看激励广告`
- Benefit：`一次购买，永久使用`

Free assistance:

- `初始包含 5 次智能提示和 3 次快速候选。`
- `首次完成新题可以获得更多辅助次数。`
- `可主动观看一条激励广告，为所选辅助增加 1 次可用次数。`
- `观看广告 · +1`

Completion reward:

- Title：`本局奖励`
- `快速候选 +{{count}}`
- `智能提示 +{{count}}`
- `实际奖励已按 99 次持有上限结算。`

## 9. 实现状态

当前 App 已完成第 8 节文案与运行时行为的同批切换：免费首次完成使用 `+1/+1–3`
新表，Premium 无限辅助并绕过钱包，购买补满与 Premium 完成补给路径已经删除，完成页、
设置、辅助不足入口及四语文案也已同步。

发布前仍需按 [奖励模型验收](reward-model-acceptance.md) 完成两平台真机购买、恢复、
站外兑换、离线缓存、退款/撤权、激励广告及 Beta 试玩验证。任何后续改动都不得重新引入
Premium 有限额度、首次购买补满或 Premium 完成补给文案。
