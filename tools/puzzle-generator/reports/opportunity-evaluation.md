# 39技巧多机会与动作序列算法评价

本报告由固定的39项 Hint Lab C++ 夹具生成。每个夹具在同一盘面上运行等级1–5的 `allDirect` 搜索，检查目标技巧 identity 是否被召回、全部动作是否与答案相容，以及检测器是否达到枚举边界。

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 目标技巧 identity | 39 |
| 成功召回 | 39 |
| 去重后的夹具盘面 | 16 |
| 不安全机会 | 0 |
| 原始证明 | 1269 |
| 去重机会 identity | 776 |
| 不同动作 outcome | 485 |
| 歧义 outcome | 164 |
| 原子 placement/elimination 效果 | 487 |
| 多机会可解释效果 | 267 |
| 多技巧可解释效果 | 266 |
| 完全重复证明 | 0 |
| 同级排序遮蔽 | 75 |
| 低等级遮蔽 | 685 |
| 达到枚举边界的检测器事件 | 4 |
| 达到默认边界的技巧 | xyChain, forcingNet |
| 进行扩容对照的不同盘面 | 4 |
| 扩容新增 identity | 12 |
| 扩容丢失默认 identity | 0 |
| 风险盘面的默认 effect | 135 |
| 扩容新增 effect | 7 |
| 归因状态变化 effect | 2 |
| 默认输出技巧候选 | 70 |
| 扩容后保持同技巧候选 | 69 |
| 扩容后变为跨技巧歧义 | 1 |
| 扩容后错误切换到另一技巧 | 0 |
| 默认搜索中位耗时合计（4盘面） | 125494 µs |
| 扩容搜索中位耗时合计（4盘面） | 135714 µs |
| 扩容后仍达到边界的技巧 | — |

## 真实 outcome 序列回放

每项技巧把 Hint Lab 检测器实际返回的完整 outcome 转成连续玩家 effect。达到默认枚举边界的盘面先使用扩容且不再触发边界的机会集合。硬门槛包括正序/逆序一致、重复运行一致、所有部分 outcome 保留目标 identity，以及无关动作、revision 跳跃、提示和撤销全部保守终止。

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
| 部分序列正确保持目标 identity | 19 |
| 正序/逆序一致 | 39 |
| 重复运行确定 | 39 |
| 无关动作正确 supersede | 39 |
| revision 跳跃正确失效 | 39 |
| 查看提示正确污染 | 39 |
| 应用提示正确污染 | 39 |
| 撤销正确污染 | 39 |

### 逐技巧序列结果

| 技巧 | 目标 effect | 机会集合 | 部分序列 | 完整序列终态 |
| --- | ---: | --- | --- | --- |
| fullHouse | 1 | default | not_applicable | ambiguous |
| nakedSingle | 1 | expanded | not_applicable | completed |
| hiddenSingle | 1 | expanded | not_applicable | completed |
| lockedCandidates.pointing | 2 | expanded | matching | ambiguous |
| lockedCandidates.claiming | 3 | expanded | matching | ambiguous |
| lockedPair | 2 | default | matching | ambiguous |
| lockedTriple | 12 | expanded | matching | completed |
| nakedPair | 2 | default | matching | completed |
| hiddenPair | 2 | expanded | matching | completed |
| nakedTriple | 9 | expanded | matching | matching |
| hiddenTriple | 9 | expanded | matching | completed |
| nakedQuad | 3 | expanded | matching | completed |
| hiddenQuad | 7 | default | matching | ambiguous |
| xWing | 2 | default | matching | matching |
| swordfish | 3 | expanded | matching | ambiguous |
| skyscraper | 1 | default | not_applicable | matching |
| twoStringKite | 1 | default | not_applicable | matching |
| turbotFish | 1 | expanded | not_applicable | matching |
| wWing | 1 | expanded | not_applicable | matching |
| xyWing | 1 | expanded | not_applicable | ambiguous |
| xyzWing | 1 | default | not_applicable | matching |
| simpleColoring | 2 | expanded | matching | ambiguous |
| multiColoring | 1 | expanded | not_applicable | matching |
| remotePair | 6 | default | matching | completed |
| emptyRectangle | 1 | expanded | not_applicable | matching |
| hiddenRectangle | 2 | default | matching | matching |
| avoidableRectangle | 1 | default | not_applicable | matching |
| uniqueRectangle | 2 | default | matching | matching |
| bugPlusOne | 1 | expanded | not_applicable | completed |
| finnedXWing | 1 | expanded | not_applicable | matching |
| sashimiXWing | 1 | expanded | not_applicable | matching |
| jellyfish | 2 | expanded | matching | ambiguous |
| xChain | 1 | expanded | not_applicable | matching |
| xyChain | 2 | default | matching | completed |
| aic | 1 | expanded | not_applicable | ambiguous |
| groupedAic | 1 | expanded | not_applicable | matching |
| complexColoring | 2 | default | matching | ambiguous |
| forcingChain | 1 | expanded | not_applicable | ambiguous |
| forcingNet | 1 | expanded | not_applicable | ambiguous |

### 非唯一序列审计目录

`matching` 行已经完成至少一个 identity，但仍有更长 identity 未完成；`ambiguous` 行的存活 identity 已全部完成但横跨多个技巧。只有所有存活 identity 都属于同一技巧，才具备进一步讨论提前输出技巧候选的前提。

| 目标技巧 | 终态 | 已完整 identity | 未完整 identity | 存活技巧 | 当前决定 |
| --- | --- | ---: | ---: | --- | --- |
| fullHouse | ambiguous | 3 | 0 | fullHouse, nakedSingle, hiddenSingle | 跨技巧，保守放弃 |
| lockedCandidates.pointing | ambiguous | 3 | 0 | lockedCandidates.pointing, lockedCandidates.claiming, simpleColoring | 跨技巧，保守放弃 |
| lockedCandidates.claiming | ambiguous | 4 | 0 | lockedCandidates.claiming, swordfish, xyWing, simpleColoring | 跨技巧，保守放弃 |
| lockedPair | ambiguous | 3 | 0 | lockedPair, nakedPair, hiddenQuad | 跨技巧，保守放弃 |
| nakedTriple | matching | 1 | 1 | lockedTriple, nakedTriple | 跨技巧，保守放弃 |
| hiddenQuad | ambiguous | 3 | 0 | lockedTriple, nakedTriple, hiddenQuad | 跨技巧，保守放弃 |
| xWing | matching | 3 | 2 | lockedCandidates.pointing, lockedTriple, nakedTriple, xWing, simpleColoring | 跨技巧，保守放弃 |
| swordfish | ambiguous | 4 | 0 | lockedCandidates.claiming, swordfish, xyWing, simpleColoring | 跨技巧，保守放弃 |
| skyscraper | matching | 5 | 3 | lockedCandidates.claiming, skyscraper, turbotFish, simpleColoring, multiColoring, jellyfish, xChain, groupedAic | 跨技巧，保守放弃 |
| twoStringKite | matching | 3 | 5 | lockedCandidates.claiming, swordfish, twoStringKite, xyWing, simpleColoring, sashimiXWing, jellyfish | 跨技巧，保守放弃 |
| turbotFish | matching | 4 | 2 | lockedCandidates.claiming, turbotFish, simpleColoring, multiColoring, xChain, forcingNet | 跨技巧，保守放弃 |
| wWing | matching | 2 | 3 | nakedPair, hiddenPair, nakedTriple, wWing, forcingNet | 跨技巧，保守放弃 |
| xyWing | ambiguous | 2 | 0 | nakedTriple, xyWing | 跨技巧，保守放弃 |
| xyzWing | matching | 3 | 4 | lockedCandidates.pointing, lockedTriple, hiddenPair, nakedTriple, nakedQuad, xyzWing, jellyfish | 跨技巧，保守放弃 |
| simpleColoring | ambiguous | 2 | 0 | lockedCandidates.claiming, simpleColoring | 跨技巧，保守放弃 |
| multiColoring | matching | 4 | 2 | lockedCandidates.claiming, turbotFish, simpleColoring, multiColoring, xChain, forcingNet | 跨技巧，保守放弃 |
| emptyRectangle | matching | 3 | 3 | lockedCandidates.pointing, lockedCandidates.claiming, simpleColoring, emptyRectangle, groupedAic, forcingNet | 跨技巧，保守放弃 |
| hiddenRectangle | matching | 2 | 1 | hiddenPair, hiddenTriple, hiddenRectangle | 跨技巧，保守放弃 |
| avoidableRectangle | matching | 1 | 1 | avoidableRectangle, xyChain | 跨技巧，保守放弃 |
| uniqueRectangle | matching | 3 | 5 | nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, remotePair, uniqueRectangle | 跨技巧，保守放弃 |
| finnedXWing | matching | 1 | 7 | lockedCandidates.claiming, swordfish, xyWing, simpleColoring, finnedXWing, jellyfish, groupedAic | 跨技巧，保守放弃 |
| sashimiXWing | matching | 5 | 2 | lockedCandidates.claiming, simpleColoring, multiColoring, sashimiXWing, xChain, groupedAic, forcingNet | 跨技巧，保守放弃 |
| jellyfish | ambiguous | 2 | 0 | lockedCandidates.claiming, jellyfish | 跨技巧，保守放弃 |
| xChain | matching | 4 | 2 | lockedCandidates.claiming, turbotFish, simpleColoring, multiColoring, xChain, forcingNet | 跨技巧，保守放弃 |
| aic | ambiguous | 3 | 0 | aic, forcingChain, forcingNet | 跨技巧，保守放弃 |
| groupedAic | matching | 2 | 2 | lockedCandidates.claiming, simpleColoring, groupedAic, forcingNet | 跨技巧，保守放弃 |
| complexColoring | ambiguous | 2 | 0 | simpleColoring, complexColoring | 跨技巧，保守放弃 |
| forcingChain | ambiguous | 3 | 0 | aic, forcingChain, forcingNet | 跨技巧，保守放弃 |
| forcingNet | ambiguous | 3 | 0 | aic, forcingChain, forcingNet | 跨技巧，保守放弃 |

### 代表冲突 proof 审计

以下四组固定代表分别覆盖子集、鱼、链和着色。`complete` 表示该 identity 与目标动作集合完全相同；`incomplete` 表示它包含目标动作但还要求更多 effect。proof 是引擎为各技巧生成的成立依据，不是玩家实际思路的观测证据。

| 家族 | 目标 | 冲突技巧 | 关系 | 等级 | outcome effect | 剩余 effect | proof 变体 | humanCost | focus cell/region | premise | proof 原因 |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| subset | nakedTriple<br>e r4c2=7, e r4c2=9, e r4c3=5, e r4c3=7, e r4c4=5, e r4c4=7, e r4c5=5, e r4c6=7, e r4c6=9 | lockedTriple | incomplete | 2 | 12 | 3 | 1 | 2134 | 3/5 | 8 | scan_region → pattern_constraint → pattern_constraint → valid_elimination |
| subset | nakedTriple<br>e r4c2=7, e r4c2=9, e r4c3=5, e r4c3=7, e r4c4=5, e r4c4=7, e r4c5=5, e r4c6=7, e r4c6=9 | nakedTriple | complete | 3 | 9 | 0 | 1 | 3131 | 3/5 | 8 | scan_region → pattern_constraint → pattern_constraint → valid_elimination |
| fish | xWing<br>e r4c2=9, e r4c6=9 | lockedCandidates.pointing | complete | 2 | 2 | 0 | 1 | 2056 | 2/2 | 2 | scan_region → pattern_constraint → valid_elimination |
| fish | xWing<br>e r4c2=9, e r4c6=9 | lockedTriple | incomplete | 2 | 9 | 7 | 1 | 2131 | 3/5 | 8 | scan_region → pattern_constraint → pattern_constraint → valid_elimination |
| fish | xWing<br>e r4c2=9, e r4c6=9 | nakedTriple | incomplete | 3 | 9 | 7 | 1 | 3131 | 3/5 | 8 | scan_region → pattern_constraint → pattern_constraint → valid_elimination |
| fish | xWing<br>e r4c2=9, e r4c6=9 | xWing | complete | 3 | 2 | 0 | 1 | 3074 | 4/2 | 4 | scan_region → pattern_constraint → valid_elimination |
| fish | xWing<br>e r4c2=9, e r4c6=9 | simpleColoring | complete | 4 | 2 | 0 | 1 | 4122 | 4/6 | 4 | scan_region → pattern_constraint → valid_elimination |
| chain | xChain<br>e r2c3=8 | lockedCandidates.claiming | incomplete | 2 | 2 | 1 | 1 | 2056 | 2/2 | 2 | scan_region → pattern_constraint → valid_elimination |
| chain | xChain<br>e r2c3=8 | turbotFish | complete | 4 | 1 | 0 | 1 | 4149 | 4/8 | 4 | scan_region → pattern_constraint → valid_elimination |
| chain | xChain<br>e r2c3=8 | simpleColoring | incomplete | 4 | 2 | 1 | 1 | 4080 | 2/4 | 2 | scan_region → pattern_constraint → valid_elimination |
| chain | xChain<br>e r2c3=8 | multiColoring | complete | 4 | 1 | 0 | 1 | 4149 | 4/8 | 4 | scan_region → pattern_constraint → valid_elimination |
| chain | xChain<br>e r2c3=8 | xChain | complete | 5 | 1 | 0 | 1 | 5149 | 4/8 | 4 | scan_region → chain_inference → valid_elimination |
| chain | xChain<br>e r2c3=8 | forcingNet | complete | 5 | 1 | 0 | 1 | 5234 | 7/12 | 7 | scan_region → chain_inference → chain_inference → valid_elimination |
| coloring | complexColoring<br>e r5c2=9, e r6c1=9 | simpleColoring | complete | 4 | 2 | 0 | 1 | 4101 | 3/5 | 3 | scan_region → pattern_constraint → valid_elimination |
| coloring | complexColoring<br>e r5c2=9, e r6c1=9 | complexColoring | complete | 5 | 2 | 0 | 1 | 5249 | 7/13 | 7 | scan_region → chain_inference → chain_inference → valid_elimination |

proof 结构可以区分引擎证明使用 `pattern_constraint` 还是 `chain_inference`，也能比较 focus、premise 和成本；但相同玩家 effect 可以同时拥有这些不同证明。它们不能反向证明玩家选择了较低等级、较低成本或目标 fixture 的技巧，因此本轮不增加 proof 优先级归因规则。


## 逐技巧结果

| 技巧 | 召回 | 目标状态 | identity | outcome | 效果 | 跨技巧歧义效果 | 枚举边界 | 扩容新增 |
| --- | :---: | --- | ---: | ---: | ---: | ---: | --- | ---: |
| fullHouse | 是 | selected | 49 | 28 | 34 | 19 | — | 0 |
| nakedSingle | 是 | selected | 57 | 39 | 44 | 24 | forcingNet | 2 |
| hiddenSingle | 是 | frontier_ranking | 57 | 39 | 44 | 24 | forcingNet | 2 |
| lockedCandidates.pointing | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| lockedCandidates.claiming | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| lockedPair | 是 | lower_level | 46 | 32 | 32 | 13 | — | 0 |
| lockedTriple | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| nakedPair | 是 | lower_level | 44 | 26 | 30 | 13 | — | 0 |
| hiddenPair | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| nakedTriple | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| hiddenTriple | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| nakedQuad | 是 | lower_level | 58 | 36 | 40 | 23 | forcingNet | 0 |
| hiddenQuad | 是 | lower_level | 56 | 34 | 28 | 21 | — | 0 |
| xWing | 是 | lower_level | 50 | 32 | 28 | 20 | — | 0 |
| swordfish | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| skyscraper | 是 | lower_level | 75 | 43 | 42 | 30 | — | 0 |
| twoStringKite | 是 | lower_level | 55 | 32 | 31 | 24 | — | 0 |
| turbotFish | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| wWing | 是 | lower_level | 59 | 32 | 34 | 13 | forcingNet | 0 |
| xyWing | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| xyzWing | 是 | lower_level | 50 | 29 | 34 | 17 | — | 0 |
| simpleColoring | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| multiColoring | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| remotePair | 是 | lower_level | 55 | 36 | 24 | 13 | — | 0 |
| emptyRectangle | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| hiddenRectangle | 是 | lower_level | 44 | 32 | 22 | 13 | — | 0 |
| avoidableRectangle | 是 | selected | 13 | 12 | 18 | 2 | — | 0 |
| uniqueRectangle | 是 | lower_level | 55 | 36 | 24 | 13 | — | 0 |
| bugPlusOne | 是 | selected | 18 | 15 | 17 | 5 | xyChain | 10 |
| finnedXWing | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| sashimiXWing | 是 | lower_level | 58 | 36 | 40 | 23 | forcingNet | 0 |
| jellyfish | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| xChain | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| xyChain | 是 | lower_level | 47 | 27 | 29 | 16 | — | 0 |
| aic | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| groupedAic | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| complexColoring | 是 | lower_level | 55 | 32 | 31 | 24 | — | 0 |
| forcingChain | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |
| forcingNet | 是 | lower_level | 57 | 39 | 44 | 24 | forcingNet | 2 |

## Effect 归因稳定性

下表只比较触发默认枚举边界的4个盘面。默认技巧候选若在扩容后变为跨技巧歧义，说明有界集合中的“唯一”存在误归因风险，不能直接进入成长事件。

| 盘面 | 默认 effect | 新增 effect | 状态变化 | 默认技巧候选 | 保持候选 | 变为跨技巧歧义 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hsp-bec7b14c7309c1129bc9:0 | 44 | 1 | 0 | 20 | 20 | 0 |
| hsp-bec7b14c7309c1129bc9:1 | 40 | 0 | 0 | 17 | 17 | 0 |
| hsp-e9a30c1d248620dd7f76:16 | 34 | 0 | 0 | 21 | 21 | 0 |
| hsp-01a88d306bf9f0584f71:40 | 17 | 6 | 2 | 12 | 11 | 1 |

### 被扩容推翻的技巧候选

| 盘面 | Effect | 默认技巧 | 扩容后涉及技巧 |
| --- | --- | --- | --- |
| hsp-01a88d306bf9f0584f71:40 | elimination r4c7=1 | xyWing | xyWing, xyChain |

## 枚举扩容性能对照

每个搜索配置在同一进程内重复3次，表中记录中位耗时。盘面按 source puzzle 与 iteration 去重；倍率只用于比较本次同机同轮成本，不是移动端发布延迟门槛。

| 盘面 | 默认中位耗时 | 扩容中位耗时 | 扩容/默认 | 新增 identity |
| --- | ---: | ---: | ---: | ---: |
| hsp-bec7b14c7309c1129bc9:0 | 47854 µs | 54161 µs | 1.13× | 2 |
| hsp-bec7b14c7309c1129bc9:1 | 48420 µs | 49818 µs | 1.03× | 0 |
| hsp-e9a30c1d248620dd7f76:16 | 24672 µs | 25074 µs | 1.02× | 0 |
| hsp-01a88d306bf9f0584f71:40 | 4548 µs | 6661 µs | 1.46× | 10 |

## 解释边界

39/39召回证明每个既有正例都能进入多机会 identity 集合；汇总数量按 source puzzle 与 iteration 对盘面去重，逐技巧表仍保留39行。动作安全检查可以排除与题目答案冲突的结果。它不能证明集合包含盘面上全部人类可见机会，也不能把同 outcome 的某一种技巧解释认定为玩家真实采用的技巧。

`reachedEnumerationLimit` 是保守的不完整风险信号：它表示检测器候选收集达到当前边界，不等于已经证明存在漏检。出现该信号的技巧必须进入后续定向扩容与人工真值检查。

扩容对照把等级2–4候选上限从256提高到1024、等级5从64提高到512。扩容新增 identity 证明默认边界确实会省略部分当前盘面机会；这些新增结果仍只通过动作安全性检查，不能替代逐项人工技巧真值标注。

耗时记录受主机负载、编译器和硬件影响。验收硬门槛是三次运行输出完全一致、扩容不丢失默认 identity；本轮微秒数仅用于评估完整性收益的相对成本。

动作序列中的 `completed` 只表示完整 effect 集合最终剩余一个技巧；`ambiguous` 表示同一完整动作仍有多个技巧解释；`matching` 表示目标 outcome 已做完但更长的重叠 identity 仍可能成立。后两类都不输出技巧候选。序列评价不证明玩家独立发现，也不包含计时、自动候选或成长事件策略。

当前16个 `matching` 案例的存活 identity 全部跨技巧，没有仅由同一技巧构成的重叠未决案例。因此现有证据不支持放宽提前关闭规则；下一步需要对审计目录中的具体 effect 和证明做人工真值扩充，而不是从正例 fixture 自动推定玩家采用的技巧。
