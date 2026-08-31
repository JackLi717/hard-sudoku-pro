# Production Content v4 验收报告

## 发行内容

- 内容版本：`4`
- 评级版本：`hodoku2-2.4.3+hsp-1.2`
- 题目总数：`10,000`
- Level 1：`500`（5%）
- Level 2：`1,000`（10%）
- Level 3：`1,500`（15%）
- Level 4：`3,000`（30%）
- Level 5：`4,000`（40%）
- 生成并评级的候选数：`26,832`

评级策略使用显式 HoDoKu→HSP 技巧白名单。未知 ALS、Sue de Coq、变体鱼等
技巧不会默认归入 Level 5。发行数据库只保存稳定 HSP 技巧代码，HoDoKu 原始代码
仅保留在审计报告中。

## 产物验收

`npm run content:production:check` 已通过：

- 10,000 道题面全部唯一。
- SQLite `integrity_check` 和 `foreign_key_check` 通过。
- 数据库与 manifest 的五级分布完全一致。
- manifest 中全部发行文件 SHA-256 校验通过。
- `hardest_technique` 全部属于 TypeScript/C++ 共享的 HSP 技巧目录。
- 无 Brute Force、Give Up、Incomplete Solution 或未映射技巧。

## 运行时提示回放

C++ `hsp-hint-core` 从每道原题开始，使用持久化候选状态回放至完成：

- 完成题目：`10,000 / 10,000`
- 总原子逻辑步骤：`641,053`
- 每一步均重复调用并验证逐字段确定性。
- 所有填数均与版本化答案一致。
- 所有排除均未删除答案候选。
- 39 个运行时技巧检测器全部获得独立覆盖。
- 回放 P95：Level 1 `0.011 ms`、Level 2 `0.130 ms`、Level 3
  `1.214 ms`、Level 4 `2.315 ms`、Level 5 `4.864 ms`。

生产文件位于 `tools/puzzle-generator/output/content-v4/`，其中
`content.sqlite` 是 App 后续只读内容安装层应采用的数据库。
