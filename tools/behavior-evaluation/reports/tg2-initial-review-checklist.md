# TG-2 首批人工审核清单

> 当前九项均为算法夹具或污染协议生成的待审核种子，不是人工真值；全部完成独立复核前 TG-2 不通过。

| 样本 | 场景 | 动作数 | 审核状态 |
| --- | --- | ---: | --- |
| tg2-subset-001 | subset | 9 | pending |
| tg2-fish-001 | fish | 2 | pending |
| tg2-chain-001 | chain | 1 | pending |
| tg2-coloring-001 | coloring | 2 | pending |
| tg2-placement-closure-001 | placement_closure | 1 | pending |
| tg2-hint-counterexample-001 | hint_counterexample | 2 | pending |
| tg2-undo-counterexample-001 | undo_counterexample | 2 | pending |
| tg2-auto-pencil-counterexample-001 | auto_pencil_counterexample | 1 | pending |
| tg2-rapid-operation-counterexample-001 | rapid_operation_counterexample | 2 | pending |

审核顺序：先在对应中间盘面人工执行动作，独立写出 intendedTechnique 与全部 acceptableCandidateTechniques，再查看 systemAttribution；最后将 status 改为 reviewed。
