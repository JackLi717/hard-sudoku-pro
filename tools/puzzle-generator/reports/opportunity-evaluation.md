# 39技巧多机会算法评价

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
| 默认搜索中位耗时合计（4盘面） | 77903 µs |
| 扩容搜索中位耗时合计（4盘面） | 83921 µs |
| 扩容后仍达到边界的技巧 | — |

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
| hsp-bec7b14c7309c1129bc9:0 | 30412 µs | 33518 µs | 1.10× | 2 |
| hsp-bec7b14c7309c1129bc9:1 | 29489 µs | 30872 µs | 1.05× | 0 |
| hsp-e9a30c1d248620dd7f76:16 | 15284 µs | 15512 µs | 1.01× | 0 |
| hsp-01a88d306bf9f0584f71:40 | 2718 µs | 4019 µs | 1.48× | 10 |

## 解释边界

39/39召回证明每个既有正例都能进入多机会 identity 集合；汇总数量按 source puzzle 与 iteration 对盘面去重，逐技巧表仍保留39行。动作安全检查可以排除与题目答案冲突的结果。它不能证明集合包含盘面上全部人类可见机会，也不能把同 outcome 的某一种技巧解释认定为玩家真实采用的技巧。

`reachedEnumerationLimit` 是保守的不完整风险信号：它表示检测器候选收集达到当前边界，不等于已经证明存在漏检。出现该信号的技巧必须进入后续定向扩容与人工真值检查。

扩容对照把等级2–4候选上限从256提高到1024、等级5从64提高到512。扩容新增 identity 证明默认边界确实会省略部分当前盘面机会；这些新增结果仍只通过动作安全性检查，不能替代逐项人工技巧真值标注。

耗时记录受主机负载、编译器和硬件影响。验收硬门槛是三次运行输出完全一致、扩容不丢失默认 identity；本轮微秒数仅用于评估完整性收益的相对成本。
