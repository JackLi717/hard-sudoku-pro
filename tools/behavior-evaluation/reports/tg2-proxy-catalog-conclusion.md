# TG-2 代理工程审核结论

> 本报告是产品负责人授权跳过独立盲审后，由实现方执行的代理工程审核。它不是独立人工真值，也不是真实玩家行为数据。

结论：**未通过代理 TG-2 工程门槛。**

## 核心结果

- 样本：45 个，其中代理审核 45 个、独立人工审核 0 个。
- 技巧覆盖：39/39；逐技巧候选召回 全部为 100%。
- 正例：41 个；漏记 0，误归因 0。
- 四类反例隔离：4/4（100.0%）。
- 默认技巧与审核种子同名：73.2%；歧义片段：27/41（65.9%）。
- 搜索完整性：全部完整，无枚举上限截断；使用扩展搜索 7 个。

这里的 42.5% 是“默认技巧与 fixture 种子技巧同名率”，不是候选解释准确率。其余样本中，种子技巧仍然全部保留在 `candidateTechniques`，而 `automaticTechnique` 按协议选择了能完整解释动作的最低成本技巧。因此这部分属于预期歧义，不按误归因处理，也不应为了提高同名率而继续扩展 C++ 匹配规则。

## 默认解释不同的样本

| 审核种子 | 最低成本默认 | 候选数 |
| --- | --- | ---: |
| lockedCandidates.pointing | hiddenPair | 6 |
| lockedCandidates.claiming | hiddenPair | 6 |
| lockedPair | hiddenPair | 6 |
| lockedTriple | lockedCandidates.pointing | 7 |
| nakedPair | hiddenPair | 6 |
| nakedTriple | hiddenQuad | 2 |
| turbotFish | skyscraper | 4 |
| simpleColoring | twoStringKite | 5 |
| multiColoring | skyscraper | 4 |
| emptyRectangle | twoStringKite | 5 |
| xChain | forcingNet | 3 |

## 边界与下一步

- 允许：进入 TG-3/TG-4，仅接入已接受的真实游戏命令并在本地保存可删除的诊断记录。
- 禁止：生成掌握、成长、待巩固评分；修改玩家档案；向玩家展示技巧成长结论；据此校准 `humanCost`。
- 仍需真实试玩验证：操作分段、revision/指纹过期、后台延迟、恢复、提示、撤销、自动铅笔和快速输入在实际 UI 路径中的表现。
- TG-4 仍须以真实试玩抽样复核；本次代理审核不能替代 TG-4，也不能成为正式成长功能的上线依据。
