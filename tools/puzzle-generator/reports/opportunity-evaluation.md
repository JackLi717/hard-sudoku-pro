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

## 解释边界

39/39召回证明每个既有正例都能进入多机会 identity 集合；汇总数量按 source puzzle 与 iteration 对盘面去重，逐技巧表仍保留39行。动作安全检查可以排除与题目答案冲突的结果。它不能证明集合包含盘面上全部人类可见机会，也不能把同 outcome 的某一种技巧解释认定为玩家真实采用的技巧。

`reachedEnumerationLimit` 是保守的不完整风险信号：它表示检测器候选收集达到当前边界，不等于已经证明存在漏检。出现该信号的技巧必须进入后续定向扩容与人工真值检查。

扩容对照把等级2–4候选上限从256提高到1024、等级5从64提高到512。扩容新增 identity 证明默认边界确实会省略部分当前盘面机会；这些新增结果仍只通过动作安全性检查，不能替代逐项人工技巧真值标注。
