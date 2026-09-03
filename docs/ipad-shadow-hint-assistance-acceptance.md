# iPad 提示后归因修复验收（2026-09-03）

归因含义、提示边界及准入规则只引用[唯一权威协议](player-technique-attribution-policy.md)。本次不增加 C++ 技巧，不扩展递归闭包，不调整 humanCost，也不写成长档案。

## 已确认问题

真实会话 `session-1788399054523-36auwajj`：第 61 步应用双线风筝提示，删除 R4C6 的候选 3；第 62 步玩家填写 R9C6=3。提示后该列只有 R9C6 可以填 3。

原识别请求 revision 87 重建候选时错误地加回了 R4C6 的 3，使 native 再次通过双线风筝的一步闭包解释 placement，进而生成独立高阶归因。

修复后，候选由已填数字和仍有效的已接受提示历史共同重建。请求保留提示来源及受助效果，native 使用提示后的真实候选；适配器和离线回放独立执行准入检查。

## 验证

- 真实局面经过游戏 reducer、适配器、C++ 回放：R9C6=3 的最低成本候选为 `hiddenSingle`，资格为 `ineligible:hint_polluted`，默认技巧和玩家选择均为 `null`。
- 重建观察器后重复同一路径，结果一致。
- 后续 Full House 自动填入 R4C6=8 后，玩家填写 R9C5=8 仍正常归为 `hiddenSingle`；未整局禁用归因。
- 覆盖暂停恢复、快速草稿、无关落数、提示关闭/撤销、同一观察器恢复、擦除提示前提、错误输入及撤销、异步过期、离线回放不重新授予归因。
- Jest：28 套、371 项通过。TypeScript、ESLint、Prettier、diff 空白检查通过。既有 6 个候选恢复/直接落数 C++ 回归样本全部保持通过。
- iPad mini 第六代、iOS 17.5 的 Release 模拟器构建通过。

可重复运行：

```sh
node tools/behavior-evaluation/check_hint_assistance.mjs <native_replay>
node tools/behavior-evaluation/check_candidate_restoration.mjs <native_replay>
```

## 整局对照回放

只读读取该局原始 46 条请求，根据请求时间与已接受提示历史补齐候选及来源后回放 C++；这是旧请求的修正对照，不是新版本完整实时采集，也不是人工独立真值。原始数据库未改写。

| 项目 | 原请求 | 补齐提示状态后 |
| --- | --- | --- |
| native matched | 41 | 44 |
| native no_match | 5 | 2 |
| R9C6=3 | 独立双线风筝 | 唯一数候选；提示辅助，不归因 |

其他变化：revision 57、58 的删除可由显性数对解释；revision 62 的落数可由指向排除解释；revision 61、65、71 的最低成本解释降为唯一数。匹配增加并不证明玩家实际使用这些技巧，也不表示算法已经全部验收完成。

## 尚未覆盖的边界

已应用提示可从游戏历史跨进程恢复。只展示后关闭、或已撤销而不在历史中的提示，当前只保留进程内已知展示记忆；应用完全重启后的这类证据缺失仍待处理。当前仅隔离提示直接效果和一步唯一数，不递归隔离整条后续链。
