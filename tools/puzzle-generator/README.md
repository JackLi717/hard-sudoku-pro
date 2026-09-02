# Hard Sudoku Pro 题库生成工具

本目录使用固定版本的 HoDoKu2，为 Hard Sudoku Pro 离线生成发行前候选题库。它不是题库后台，也不会被打包进 iOS/Android App。

## 已确定的职责

1. 调用 HoDoKu2 生成候选题。
2. 调用 HoDoKu2 求解并导出逻辑路径。
3. 按 `config/rating-policy.json` 将最高必需技巧映射为 Level 1–5。
4. 校验题面、答案、重复题、逻辑求解路径和禁用技巧。
5. 输出 JSON、CSV、审计报告和最终 `content.sqlite`。

项目没有重新实现数独生成器或技巧求解器。Python 脚本只是 HoDoKu2 的离线调用、文本解析和数据打包层。

## 环境

- Java 21 或更高版本。
- Python 3.11 或更高版本，仅使用标准库。

## 生成题库

在本目录执行：

```bash
python3 scripts/build_puzzles.py --per-level 20 --content-version 1
```

该命令生成 100 道流程验证题，Level 1–5 各 20 道。结果位于
`output/content-v1/`。

非均匀发行配额使用明确的 Level 1–5 数量：

```bash
python3 scripts/build_puzzles.py \
  --level-counts 500,1000,1500,3000,4000 \
  --content-version 4
```

第二条命令生成当前 10,000 道生产题库，分布为 5% / 10% / 15% /
30% / 40%。流程验证题只用于验证生成、评级、验收和数据库打包，不代表正式
发行题量或难度分布。

如果目标目录已经存在，命令会停止而不是覆盖已有题库。这个保护用于防止误改已经提交的审计或发行产物，不表示每次开发重建都应增加产品 `content-version`。

当前处于首版发行前开发期。`content-v1` 和 `content-v4` 是已经提交的历史审计产物，继续保留且不得覆盖；后续重复验证优先检查现有产物，或在明确的可丢弃/隔离环境中重建同一开发基线。只有形成新的不可变发行内容、且新版 App 需要区分题库身份时，才增加内容版本。不要仅为绕过“目录已存在”而生成 `content-v5`、`content-v6` 等无兼容意义的版本。

当前 10,000 题生产内容生成后，运行静态产物检查和 C++ 运行时全量回放：

```bash
npm run content:production:check
```

## 难度规则

HoDoKu2 的 `Easy / Medium / Hard / Unfair / Extreme` 只用于生成候选池。最终展示等级按完整求解路径中最高的 HSP 技巧等级计算，HoDoKu2 分数仅用于同级排序。因此候选来源等级和最终等级可能不同，这是预期行为。

所有求解步骤必须存在于 `config/rating-policy.json` 的显式 Level 1–5
白名单中。未知高级技巧不会默认归入 Level 5；包含未映射 ALS、Sue de Coq、
变体鱼等技巧的候选题会被淘汰，防止构建期可解但运行时提示引擎停滞。

## 固定版本与许可证边界

HoDoKu2 `2.4.3 build 116`、配置、许可证和第三方声明均保存在仓库中。构建清单记录 JAR 与配置的 SHA-256。HoDoKu2 只在离线制作阶段运行，React Native App 只读取生成后的 SQLite 数据。

阶段1还允许把固定 JAR 作为开发机或 CI 上的离线提示 oracle。它接收当前确定数字盘面，输出完整逻辑路径，用于验证其他运行时引擎的技巧、动作顺序和禁用回退：

```bash
npm run hint:oracle:check
python3 scripts/hodoku_oracle.py --puzzle 530070000600195000098000060800060003400803001700020006060000280000419005000080079
```

oracle 输出只属于测试证据，不能直接作为玩家任意中间候选状态的实时提示，也不能被 App 运行时代码、Android 或 iOS 工程引用。

## 非目标

- 在线更新或同步题库。
- 题库管理后台和审批系统。
- 在 App 中运行 HoDoKu2。
- 使用猜测或回溯结果计算用户可见难度。
- 将固定的离线求解路径直接用作玩家当前盘面的实时提示。

完整产品与数据架构记录在 `../../docs/product-and-data-architecture.md`。
