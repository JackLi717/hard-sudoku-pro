# Hard Sudoku Pro：多机会搜索算法验收基线

日期：2026-09-02  
阶段：首个公开版本发布前，纯算法评价

## 1. 验收范围

本基线只评价 C++ 提示核心的当前盘面直接机会搜索、机会身份归一化、同动作歧义和选择遮蔽分类。它不评价玩家行为归因、发现时间、成长评分、存储、线程调度或界面，也不搜索执行某一步以后产生的未来机会树。

稳定口径如下：

- `outcome = canonical(placements, eliminations)`。
- `identity = technique + outcome`。
- 同 identity 的不同证明折叠为一个机会并累计 `proofVariantCount`。
- 同 outcome、不同 technique 属于歧义动作。
- 未被选择的同等级 identity 属于前沿排序遮蔽。
- 高于已选择等级的 identity 属于低等级遮蔽。

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

完整的逐技巧数据见 `tools/puzzle-generator/reports/opportunity-evaluation.json` 和 `.md`。16个盘面来自技巧正例夹具，不能作为真实游戏中歧义比例的无偏估计。

## 6. 当前结论与下一门槛

机会身份、证明折叠、完整 outcome 歧义、部分 effect 歧义和两类遮蔽协议已经具备可测试基线。39项现有正例都能进入多机会集合，但默认枚举边界会省略部分 `forcingNet` 与 `xyChain` identity。当前样本仍不足以批准玩家行为识别或成长产品接入。

下一门槛是对共享 effect 的子集、鱼、链和着色组合建立人工归因真值，确定“唯一技巧、同技巧多机会、跨技巧歧义、保守放弃”四类判定规则；同时比较扩容搜索的完整性收益与计算成本。只有该真值集达到预定的低误报门槛，才能设计玩家动作匹配算法。
