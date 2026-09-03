# iPad mini 影子运行修复与复验（2026-09-03）

归因与恢复边界只引用[玩家技巧归因协议](player-technique-attribution-policy.md)。本次只修复实际行为适配和审核导出，不修改 C++ 技巧规则、`humanCost`、正式成长存储或界面。

## 真实试玩证据

核对 iPad mini 第六代模拟器中 2026-09-03 09:47（墨尔本时间）完成的一级对局：有效游戏时间 33 分 33 秒，错误 0、提示 0、自动候选 1 次。

- 原始诊断有 72 个请求、72 个结果，对应 60 次 placement 和 12 次 elimination；独立的候选补写不生成分析请求。
- 72 个保存请求的动作与前后盘面指纹一致；原样 C++ 回放与保存结果一致。
- 原始结果为 66 matched、4 no_match、2 invalid_input；一致可复现不等于玩家技巧意图正确，也不消除两条 invalid_input 的适配缺陷。
- 两次撤销均有禁止归因记录；原始 SQLite 完整性检查正常。

## 修复

### 1. 恢复运行后的编号复用与导出覆盖

旧适配器在 attach/restore 后把 segment 和 request 计数重置为 1；旧导出器仅以 segmentId 为键，因此同局恢复与不同对局均可能相互覆盖。

新生成的 ID 包含会话、本次观察运行的时间/随机标识与进程内序号，再附加片段或请求序号。重复恢复同一 revision、重新 attach、重建控制器不复用 ID。

导出关联使用 session、segment、起始 revision 和起始盘面。对本次保留的旧数据，这些证据足以区分重复段号；迟到的旧响应不改变后续撤销的目标，也不覆盖较新累计请求的结束结果。invalidation 保留优先级。

只读复验：

| 数据范围 | 修复前导出 | 修复后导出 |
| --- | ---: | ---: |
| 本次完成的一局 | 62 | 72 |
| 当前库中两局合并 | 64 | 138 |

两局合计包含无请求的最终诊断，因此样本数不必等于请求数。该历史恢复只对已有证据能够区分的记录成立，不宣称能还原所有可能缺少身份信息的旧记录。

### 2. 删除候选、加回候选、正确落数

旧实现从独立 growthCandidates 删除候选后忽略加回操作，导致后续正确落数不在分析候选中。

新适配器保留候选删除所属片段的记录，按权威协议处理加回与重建；既覆盖开放片段，也覆盖已结束片段。恢复一个删除后仍保留其他尚未撤回的删除证据。普通手动补写草稿不生成 effect，不把 UI 候选网格复制成算法真值。

从本局提取两个最小盘面夹具，执行真实游戏 reducer → 适配器 → C++ 回放：

| 场景 | 删除结果 | 加回处理 | 新片段落数结果 |
| --- | --- | --- | --- |
| R6C5 删除 1 → 加回 1 → 填 1 | no_match | 删除片段 restore_polluted | matched，默认 hiddenSingle |
| R3C4 删除 5 → 加回 5 → 填 5 | no_match | 删除片段 restore_polluted | matched，默认 hiddenSingle |

这里重建的是最小动作序列，不是改写原始请求后声称“原样回放成功”。旧库的两条 invalid_input 仍然保留，没有自动变成人工真值或成功归因。

## 验证

- 全量 Jest：25 个套件、313 项测试通过。
- TypeScript、ESLint、Prettier、git diff --check 通过。
- 回归覆盖同 revision 恢复、不同会话、控制器重建、旧响应迟到、累计请求、撤销优先级、无请求诊断、手动/快速草稿、普通候选补写、开放/已结束片段恢复、多片段分别恢复。
- 最小 native 检查脚本直接加载当前适配器和游戏 reducer，读取测试盘面，不写模拟器数据库。

使用 Node 24（SQLite 测试依赖 node:sqlite）运行常规测试：

```sh
npm test -- --runInBand --no-watchman
npm run typecheck
npm run lint
npm run format:check
```

编译现有回放入口后运行可重复的两盘面 native 回归：

```sh
audit_dir=$(mktemp -d)
c++ -O2 -std=c++20 -Wall -Wextra -Wpedantic -Werror \
  -Inative/hsp-hint-core/include \
  native/hsp-hint-core/src/bridge.cpp \
  native/hsp-hint-core/src/engine.cpp \
  native/hsp-hint-core/src/techniques.cpp \
  tools/behavior-evaluation/native_replay.cpp \
  -o "$audit_dir/native_replay"
node tools/behavior-evaluation/check_candidate_restoration.mjs "$audit_dir/native_replay"
```

## 结论与剩余验收

本次两个缺陷的代码修复、旧数据导出复验和最小动作序列回归通过。原始数据库没有修改，没有重新开启玩家对局，也没有完成修复版的新一局模拟器试玩。

下一步在修复版上进行新的本地影子试玩，覆盖跨恢复运行和候选反复删除/加回，核对新增原始记录。仍不宣告 TG-4 通过；本局没有实际提示操作，不能替代提示污染实机覆盖，也不能据此判断高级技巧召回或玩家真实技巧意图。
