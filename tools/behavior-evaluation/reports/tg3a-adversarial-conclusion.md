# TG-3A 对抗性模拟玩家验收

结论：**通过工程对抗验收**。

- 20 个固定随机种子，共 2000 个策略步骤、7338 次游戏 API 调用。
- 游戏实际接受 4881 条持久化命令。
- 产生 1475 个最终诊断；抽取 120 个可审核样本。
- native 重放 110 个请求：匹配 84，无匹配 26，歧义 78。
- 不完整机会集合 0，非法 effect 0，协议不变量失败 0。

覆盖策略：

- `direct_placement`：215
- `all_then_placement`：196
- `partial_then_placement`：170
- `elimination_idle`：195
- `wrong_then_erase`：199
- `undo_after_result`：199
- `hint_interruption`：190
- `pause_resume`：228
- `rejected_command`：201
- `rapid_placements`：207

> 该结论证明真实游戏命令路径、持久化、分段、污染隔离、异步防护和 native 重放能够协同工作；它不证明真人实际采用了某项技巧，也不替代 TG-4 真人复核。
