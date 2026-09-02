# Hard Sudoku Pro：多机会搜索算法验收基线

日期：2026-09-02  
阶段：首个公开版本发布前，纯算法评价

## 1. 验收范围

本基线只评价 C++ 提示核心的当前盘面直接机会搜索、机会身份归一化、原子动作的集合内归因和选择遮蔽分类。它不评价玩家是否独立发现、发现时间、成长评分、存储、线程调度或界面，也不搜索执行某一步以后产生的未来机会树。

稳定口径如下：

- `outcome = canonical(placements, eliminations)`。
- `identity = technique + outcome`。
- 同 identity 的不同证明折叠为一个机会并累计 `proofVariantCount`。
- 同 outcome、不同 technique 属于歧义动作。
- 未被选择的同等级 identity 属于前沿排序遮蔽。
- 高于已选择等级的 identity 属于低等级遮蔽。
- 单个 effect 只允许四种结果：`noMatch`、`uniqueTechnique`、`sameTechniqueMultipleOpportunities`、`crossTechniqueAmbiguous`。
- 只有前两种有匹配的单技巧结果输出技巧候选；跨技巧时不输出技巧。

## 2. 精确真值夹具

| 夹具 | 预期原始证明 | 预期 identity | 预期 outcome | 歧义 outcome | 关键断言 |
| --- | ---: | ---: | ---: | ---: | --- |
| 单空格终局 | 7 | 3 | 1 | 1 | Full House、Naked Single、Hidden Single 得到同一 placement；Full House 与 Hidden Single 各有 3 个区域证明 |
| 两个独立 Naked Single | 2 | 2 | 2 | 0 | 同技巧、不同动作不能合并 |
| Naked Single 与 Pointing 共存 | 2 | 2 | 2 | 0 | Pointing 保留为有效直接机会，并标记为被低等级遮蔽 |

精确集合共包含 7 个预期 identity。自动测试逐项比较 technique、placements 和 eliminations，并拒绝集合外结果：

- 真阳性：7
- 假阳性：0
- 假阴性：0
- 本夹具集精确率：100%
- 本夹具集召回率：100%

该百分比证明协议实现符合这三个已知真值，不代表39项技巧在真实玩家路径上的最终统计准确率。

原子归因另有四个精确单元真值：单一 Naked Single placement 返回唯一技巧；两个共享 elimination 的 X-Wing identity 返回同技巧多机会；X-Wing 与 Swordfish 共享 elimination 返回跨技巧歧义且不输出技巧；集合外 elimination 返回无匹配。四类输出、匹配 identity 和技巧候选均逐字段断言。

## 3. 题库中间状态回放

固定题库和随机种子抽取10个合法中间状态。第一个状态运行等级1–5的 `allDirect`，其余状态运行 `frontierOnly`；每个状态同时执行一次性搜索和逐检测器续搜。

当前确定性基线：

| 指标 | 数量 |
| --- | ---: |
| 原始检测器证明 | 553 |
| 去重机会 identity | 368 |
| 不同动作 outcome | 262 |
| 歧义 outcome | 74 |
| 原子 effect | 233 |
| 多技巧可解释 effect | 77 |
| 完全重复的原始证明 | 0 |
| 被同级前沿排序遮蔽 | 224 |
| 被低等级遮蔽 | 134 |

所有10个状态满足：一次性与续搜的终态、顺序、证明和机会集合完全一致；没有空动作机会或完全重复证明；选择顺序等级一致；所有 placement 与 elimination 均与题目答案相容。

## 4. 回归门槛

以下检查必须同时通过：

- `npm run hint:core:check`
- `npm run hint:core:sanitize`
- 100题、6166个逻辑步骤完整求解
- 1000个确定性随机合法状态
- 39项技巧正例、终局反例、近反例和结果安全性
- 三个精确多机会真值夹具零假阳性、零假阴性
- 10个中间状态一次性/续搜完全一致

## 5. 39技巧扩展评价

`npm run hint:opportunity:evaluate` 使用39项 Hint Lab 正例，在16个去重后的中间盘面上运行等级1–5的 `allDirect`：

- 39/39 目标 technique identity 被召回。
- 1269个原始证明折叠为776个 identity 和485个 outcome。
- 487个原子 placement/elimination effect 中，267个可由多个 identity 解释，266个涉及多个技巧。
- 全部返回动作与答案相容；没有空动作或完全重复证明。
- 4个盘面达到默认枚举边界，涉及 `forcingNet` 和 `xyChain`。
- 将等级2–4上限从256提高到1024、等级5从64提高到512后，新增12个 identity，未丢失任何默认 identity，且不再达到扩容边界；新增项为 `forcingNet` 2个、`xyChain` 10个。
- 4个风险盘面上，每种配置同进程重复3次，输出完全一致；同机性能对照写入生成报告，不把易受负载影响的微秒快照固化为协议值。
- 4个风险盘面共有135个默认 effect，扩容新增7个 effect，2个既有 effect 的四类归因状态发生变化。
- 默认集合输出70个技巧候选；扩容后69个仍输出相同技巧，1个从 `xyWing` 唯一候选变为 `xyWing + xyChain` 跨技巧歧义，没有候选错误切换为另一技巧。
- 被推翻的具体动作是 `hsp-01a88d306bf9f0584f71:40` 的 elimination `r4c7=1`。这构成“默认边界可能产生假唯一”的确定反例。

完整的逐技巧数据见 `tools/puzzle-generator/reports/opportunity-evaluation.json` 和 `.md`。16个盘面来自技巧正例夹具，不能作为真实游戏中歧义比例的无偏估计。微秒数受主机负载、编译器和硬件影响，只用于本轮同机相对成本，不是移动端发布延迟门槛。

## 6. 当前结论与下一门槛

机会身份、证明折叠、完整 outcome 歧义、部分 effect 歧义、四类原子归因、归因集合对照和两类遮蔽协议已经具备可测试基线。39项现有正例都能进入多机会集合，但默认枚举边界会省略部分 `forcingNet` 与 `xyChain` identity，并已实际造成一次 `xyWing` 假唯一。因此达到边界的默认结果必须扩容复算；扩容仍达到边界时必须保守放弃，不能接入成长事件。

本轮新增第7节的最小多动作序列状态机，并完成第8节的39项真实 outcome 序列回放。下一门槛是针对当前 `ambiguous` 和重叠未决结果扩大子集、鱼、链和着色的人工 effect 真值盘面，避免结论只依赖现有 Hint Lab 正例和4个边界风险状态。只有人工真值达到预定低误报门槛，才能把候选归因接入成长事件。

## 7. 连续多动作序列匹配协议

本阶段只冻结并验证一个无玩家、计时、存储或界面依赖的状态机。输入机会必须来自已经完成边界安全检查的 `OpportunitySetAnalysis`；状态机不把有界集合自行升级为可靠归因。

初始化输入为机会集合和起始 `boardRevision`。后续每个输入包含事件类型、事件前 revision、事件后 revision，以及仅对玩家 effect 事件存在的 placement 或 elimination。事件类型固定为：玩家 effect、其他盘面变化、查看提示、应用提示、撤销。状态只保存累计 effect、仍与累计集合相容的 identity、当前 revision、终态和仅在安全完成时存在的技巧候选。

可验收不变量如下：

- 玩家 effect、其他盘面变化、应用提示和撤销必须恰好把 revision 增加一；查看提示不得改变 revision。事件前 revision 必须等于状态当前 revision。漏掉、乱序或跳跃的 revision 进入 `revisionInvalidated`。
- 玩家 effect 必须是合法且此前未出现的原子 placement 或 elimination。结构不合法的输入进入 `invalidInput`。
- 每个玩家 effect 都对仍存活的 identity 做集合交：只保留 outcome 包含累计全部 effect 的 identity。集合为空时进入 `superseded`，不得归因。
- 当所有存活 identity 都还缺 effect 时保持 `matching`。如果较短 identity 已完成但仍有较长重叠 identity 未完成，也继续保持 `matching`，避免提前关闭造成假归因。
- 只有至少一个 identity 完成且不存在未完成的存活 identity 时才关闭。完成 identity 只有一个 technique 时进入 `completed` 并输出技巧；涉及多个 technique 时进入 `ambiguous` 且不输出技巧。
- 其他盘面变化进入 `superseded`；查看或应用提示进入 `hintPolluted`；撤销进入 `undoPolluted`。这些状态都不得输出技巧。
- 所有非 `matching` 状态都是吸收终态；后续输入不再改变结果。累计 effect 使用规范排序，因此相同合法 effect 集合的匹配结果不依赖执行顺序。

首批精确真值覆盖：多 effect outcome 的部分与完整完成、同技巧长短 outcome 重叠、一个已完成短 identity 与另一个未完成长 identity 的跨技巧重叠、同 outcome 跨技巧歧义、无关 effect、合法连续 revision、revision 跳跃、撤销、查看提示和应用提示。跨技巧长短真值要求短 identity 完成后继续等待，直到新增 effect 排除短 identity 并安全解析为长 identity 的技巧。该状态机只回答“连续动作集合与哪个已知 outcome 相容”，不回答动作是否独立、是否在时间窗内、自动候选如何解释或是否生成成长事件。

## 8. 39技巧真实 outcome 序列回放

`npm run hint:opportunity:evaluate` 将39项 Hint Lab 检测器实际返回的目标 outcome 逐一转成连续玩家 effect。每项同时运行正序、逆序、重复、部分完成、无关动作、revision 跳跃、查看提示、应用提示和撤销路径。默认搜索达到枚举边界的盘面先扩容到等级2–4上限1024、等级5上限512；扩容仍达到边界时报告必须失败，不能把不完整集合送入序列状态机。

当前确定性基线：

| 指标 | 数量 |
| --- | ---: |
| 技巧序列 | 39 |
| 真实原子 effect | 94 |
| 多 effect outcome | 19 |
| 使用扩容机会集合的序列 | 25 |
| 完整后唯一技巧完成 | 10 |
| 完整后跨技巧歧义 | 13 |
| 完整后仍有更长重叠 identity | 16 |
| 重叠未决但技巧集合唯一 | 0 |
| 重叠未决且涉及多个技巧 | 16 |
| 部分序列保留目标 identity | 19/19 |
| 正序/逆序一致 | 39/39 |
| 重复运行确定 | 39/39 |
| 无关动作正确 supersede | 39/39 |
| revision 跳跃正确失效 | 39/39 |
| 查看提示、应用提示、撤销正确污染 | 各39/39 |

完整执行目标 fixture 后只有10项产生技巧候选；13项因多个技巧解释相同完整动作而进入 `ambiguous`，16项因更长的重叠 identity 仍可能成立而保持 `matching`。16项未决案例的存活 identity 全部跨技巧，没有“仅同一技巧但 outcome 长度不同”的安全提前归因候选；因此当前证据否决放宽关闭条件。后两类共29项全部保守放弃，不把“已做完目标 fixture”错误等同于“已证明玩家使用目标技巧”。完整冲突技巧集合与 identity 完成数量写入生成报告，作为下一轮人工 effect/证明真值目录。

这组正例回放证明状态机的不变量在39项真实 outcome 形状上成立，但不能测量真实玩家路径中的误判率。下一轮必须优先复核报告中的跨等级技巧重叠是否代表同一逻辑事实的不同强弱证明、检测器 outcome 粒度差异，或玩家确实无法区分的技巧路径；在人工真值支持前不增加显式序列关闭信号。

## 9. 代表冲突 proof 审计

生成报告固定审计四个非唯一代表：子集使用 `nakedTriple`，鱼使用 `xWing`，链使用 `xChain`，着色使用 `complexColoring`。每个存活 identity 输出技巧等级、完整/未完整关系、outcome 与剩余 effect 数、证明变体、`humanCost`、focus、premise 和 proof reason 序列；缺失目标 identity、空 proof、非 observe 开头或非 conclusion 结尾均使报告失败。

当前证据：

- `nakedTriple` 的9个目标 elimination 已完整匹配，同时存在要求额外3个 elimination 的 `lockedTriple`。两者 focus、premise 和 proof reason 结构相同，动作序列必须继续等待，不能用较低等级替代玩家技巧。
- `xWing` 的2个 elimination 同时完整匹配 `lockedCandidates.pointing`、`xWing` 和 `simpleColoring`，另有 `lockedTriple` 与 `nakedTriple` 长 outcome 未完成。不同 focus、等级和成本只能描述引擎证明，不能证明玩家采用哪一种。
- `xChain` 的单个 elimination 同时完整匹配 `turbotFish`、`multiColoring`、`xChain` 和 `forcingNet`；其中 proof reason 同时出现 `pattern_constraint` 与 `chain_inference`，但玩家动作没有暴露采用了哪条推理路径。
- `complexColoring` 的2个 elimination 与 `simpleColoring` 完全相同；两个 proof 的结构和成本不同，动作 outcome 仍无法区分。

结论是 proof 属于“为什么这个技巧在盘面上成立”的引擎证据，不是“玩家实际用了什么思路”的行为证据。因此不得把最低等级、最低 `humanCost`、proof reason 或目标 fixture 标签描述成真实思路证明。后续产品策略可以选择最低 `humanCost` 作为稳定的默认解释，但必须保留全部合理候选，并明确允许未来由玩家确认实际技巧。

## 10. 最低成本结果解释

`explainOpportunityEffects()` 接收不可变的起始棋盘/候选快照、边界安全的完整机会集合和一段连续玩家 effect。候选技巧必须覆盖本段所有已观察 elimination；placement 必须是技巧的直接结果，或应用该技巧全部 elimination 后新产生的一层 Naked Single/Hidden Single。闭包不得递归运行其他技巧，起始快照中已经存在的 single 也不能冒充该技巧的新结果。

完整 outcome 不再是玩家必须逐项操作的清单。单个或部分 elimination 可以构成证据，placement 结束该段操作；placement 后继续 effect、重复 effect、非法候选或无效起始快照均为无效输入。机会集合不完整时必须返回 `incompleteOpportunitySet`，不得从残缺集合中选择默认技巧。

所有匹配 identity 按技巧折叠，保留其机会列表；技巧候选按最低 `humanCost`、固定技巧目录顺序排列。首项作为 `automaticTechnique`，其余候选保留给诊断和未来可选的玩家确认。该默认值是“最简单的合理解释”，不是玩家真实思路的证明。

39项真实 fixture 的硬门槛为：完整结果39/39保留目标技巧，多 effect 的部分结果全部保留目标技巧，重复运行39/39一致，所有真实一层 placement 闭包均保留其来源技巧。自动默认是否等于 fixture 标签只作为策略观测，不作为准确率门槛，因为 fixture 标签不是玩家思路真值。
