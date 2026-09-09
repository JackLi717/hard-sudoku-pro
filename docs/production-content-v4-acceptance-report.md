# Production Content v4 验收报告

## 发行内容

- 内容版本：`4`
- 评级版本：`1`
- 题目总数：`10,420`
- Level 1：`505`
- Level 2：`2,085`
- Level 3：`358`
- Level 4：`2,904`
- Level 5：`4,568`

评级策略使用显式 HoDoKu→HSP 技巧白名单。未知 ALS、Sue de Coq、变体鱼等
技巧不会默认归入 Level 5。发行数据库只保存稳定 HSP 技巧代码，HoDoKu 原始代码
仅保留在审计报告中。

`difficulty_score` 保存 HSP 标准路径的固定原始人类负担分，不再保存 HoDoKu
累计分。最难步骤占主导，其余高级和基础步骤分别按 25% 和 5% 累加；链类
技巧额外计算证明节点、最大依赖深度、分支数及长链非线性成本。该分数只用于
同一 Level 内排序，不参与等级计算，也不依赖当前题库的数量或分布。

## 产物验收

`npm run content:production:check` 已通过：

- 10,420 道题面全部唯一。
- SQLite `integrity_check` 和 `foreign_key_check` 通过。
- 数据库与 manifest 的五级分布完全一致。
- manifest 中全部发行文件 SHA-256 校验通过。
- `hardest_technique` 全部属于 TypeScript/C++ 共享的 HSP 技巧目录。
- 无 Brute Force、Give Up、Incomplete Solution 或未映射技巧。

## 原始分重算

C++ `hsp-hint-core` 已从每道原题重放评分路径：

- 完成题目：`10,420 / 10,420`。
- 没有题目因评分重算被拒绝。
- 现有五级分布和最高技巧保持不变，评分不参与升降级。
- `difficulty_score` 范围为 `446–53,648`。
- SQLite `content_metadata.rating_version` 和全部题目行的 `rating_version`
  均为 `1`。

生产文件位于 `tools/puzzle-generator/output/content-v4/`，其中
`content.sqlite` 是 App 后续只读内容安装层应采用的数据库。
