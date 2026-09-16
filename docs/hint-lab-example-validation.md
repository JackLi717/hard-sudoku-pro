# Hint Lab 当前例题验收结果

当前开发基线包含 **543 个正式例子、40 项技巧**。543 例均通过原生独立验证；40 项技巧均通过已声明的模式与布局门槛，没有未解决的覆盖缺口。每项至少有 3 个独立来源。

本次重建没有把旧目录整体合并回来，因为新增的 Level 4 技法会改变一部分旧例的最早可用提示。仅补入的 Jellyfish 单目标例仍经过当前原生目录重新回放并通过相同门槛。

## 验证范围

- 原题唯一解；给定格身份、盘面和候选由真实原生步骤精确回放，不能靠任意删候选构造。
- 明确偏序中的低级技巧没有任何可执行第一步。检查完整；取消或未完成枚举不会被当作不存在低级技巧。
- 目标效果安全且有效，存储的完整目标证明与原生重新生成的证明完全一致，覆盖标签来自同一证明。
- 主要模式按独立来源计数，至少两个；布局至少一个。数字重命名、旋转和镜像归入同一来源，不增加独立配额。
- 检查器从原生目录读取全部 40 项技巧，核对主例顺序、唯一 ID、技巧等级、候选范围与回放长度；不信任数据中自带的“通过”标记。

低级技巧的执行定义与几何分类见 [质量要求](hint-lab-example-requirements.md)。这里不声称排除所有同级、高级或任意长度的链式替代解释。Jellyfish 的低密度教学组定义为 8–10 个模式候选，高密度组为 11–16 个；原始各基础区域候选数仍保留。覆盖低密度组不表示声称已经覆盖 8 候选的极端形态。

## 当前覆盖

“来源”按数字置换、旋转、镜像去重；布局后的数字是合格例子数量。完整观察标签、结论类型计数与机器验收结果见 [当前验证报告](../src/debug/generated/hint-lab-validation.json)。本次报告没有传入历史基线，因此不报告“新增来源”计数。

| 技巧 | 例子 | 来源 | 主要模式（独立来源数） | 必需布局（例数） |
|---|---:|---:|---|---|
| `fullHouse` | 6 | 6 | `direct` × 6 | `row` × 2；`column` × 2；`box` × 2 |
| `nakedSingle` | 3 | 3 | `direct` × 3 | 不另设方向配额 |
| `hiddenSingle` | 6 | 6 | `direct` × 6 | `row` × 2；`column` × 2；`box` × 2 |
| `lockedCandidates.pointing` | 8 | 8 | `direct` × 8 | `row` × 4；`column` × 4 |
| `lockedCandidates.claiming` | 8 | 8 | `direct` × 8 | `row` × 4；`column` × 4 |
| `lockedPair` | 8 | 8 | `direct` × 8 | `row` × 4；`column` × 4 |
| `lockedTriple` | 28 | 28 | `direct` × 28 | `row` × 14；`column` × 14 |
| `nakedPair` | 20 | 20 | `direct` × 20 | `row` × 8；`column` × 8；`box` × 12 |
| `hiddenPair` | 12 | 12 | `direct` × 12 | `row` × 4；`column` × 4；`box` × 4 |
| `nakedTriple` | 42 | 42 | `direct` × 42 | `row` × 14；`column` × 14；`box` × 14 |
| `hiddenTriple` | 12 | 12 | `direct` × 12 | `row` × 4；`column` × 4；`box` × 4 |
| `nakedQuad` | 35 | 35 | `direct` × 35 | `row` × 13；`column` × 9；`box` × 13 |
| `hiddenQuad` | 7 | 7 | `direct` × 7 | `row` × 2；`column` × 2；`box` × 3 |
| `xWing` | 8 | 8 | `direct` × 8 | `row` × 4；`column` × 4 |
| `swordfish` | 25 | 25 | `direct` × 25 | `row` × 13；`column` × 12；`sparse` × 8；`mixed-density` × 17 |
| `skyscraper` | 8 | 8 | `direct` × 8 | `row` × 4；`column` × 4 |
| `twoStringKite` | 3 | 3 | `direct` × 3 | 不另设方向配额 |
| `turbotFish` | 4 | 4 | `direct` × 4 | 不另设方向配额 |
| `wWing` | 20 | 20 | `direct` × 20 | `strong-row` × 8；`strong-column` × 8；`strong-box` × 12 |
| `xyWing` | 10 | 10 | `direct` × 10 | `box-line` × 8；`row-column` × 2 |
| `xyzWing` | 8 | 8 | `direct` × 8 | `row-link` × 4；`column-link` × 4 |
| `simpleColoring` | 7 | 7 | `color_trap` × 5；`color_conflict` × 2 | 不另设方向配额 |
| `multiColoring` | 4 | 4 | `multi_color` × 4 | 不另设方向配额 |
| `remotePair` | 12 | 12 | `remote_pair` × 12 | `linear` × 8；`branched` × 4；`short` × 4；`long` × 8 |
| `emptyRectangle` | 4 | 4 | `direct` × 4 | `strong-row` × 2；`strong-column` × 2 |
| `uniqueRectangleType4` | 8 | 8 | `direct` × 8 | `strong-row` × 4；`strong-column` × 4；`strong-box` × 4 |
| `hiddenRectangle` | 8 | 8 | `direct` × 8 | `two-strong-links` × 8；四种目标角各 2 |
| `avoidableRectangle` | 8 | 8 | `avoidable` × 8 | `corner-top-left` × 2；`corner-top-right` × 2；`corner-bottom-left` × 2；`corner-bottom-right` × 2 |
| `uniqueRectangle` | 8 | 8 | `direct` × 8 | `corner-top-left` × 2；`corner-top-right` × 2；`corner-bottom-left` × 2；`corner-bottom-right` × 2 |
| `bugPlusOne` | 3 | 3 | `direct` × 3 | 不另设方向配额 |
| `finnedXWing` | 16 | 16 | `direct` × 16 | `row` × 8；`column` × 8；`single-fin` × 8；`multiple-fins` × 8 |
| `sashimiXWing` | 16 | 16 | `direct` × 16 | `row` × 8；`column` × 8；`single-fin` × 8；`multiple-fins` × 8 |
| `jellyfish` | 15 | 15 | `direct` × 15 | `row` × 11；`column` × 4；`sparse` × 4；`mixed-density` × 11 |
| `xChain` | 10 | 10 | `endpoints` × 10 | `short` × 4；`medium` × 4；`long` × 2 |
| `xyChain` | 12 | 12 | `endpoints` × 12 | `short` × 4；`medium` × 4；`long` × 4 |
| `aic` | 12 | 12 | `contradiction` × 12 | 不另设方向配额 |
| `groupedAic` | 45 | 45 | `endpoints` × 45 | `group-size-2` × 32；`group-size-3` × 25；`single-group` × 16；`multiple-groups` × 29；`endpoint-group` × 29；`internal-group` × 26 |
| `complexColoring` | 8 | 8 | `complex_color` × 8 | 不另设方向配额 |
| `forcingChain` | 8 | 8 | `common` × 8 | 不另设方向配额 |
| `forcingNet` | 58 | 58 | `contradiction` × 17；`common` × 41 | 不另设方向配额 |

AIC 的矛盾填数与矛盾删除、Forcing Chain 的共同填数与共同删除、Forcing Net 的共同填数、共同删除与矛盾删除，均分别满足至少两个独立来源。Forcing Net 另有真实多前提依赖覆盖。

## 单目标与多目标

下列九项技巧均将单个候选删除与多个候选删除作为明确验收门槛，不能只增加同一种结果数量。

| 技巧 | 单目标例子 | 多目标例子 |
|---|---:|---:|
| `xWing` | 4 | 4 |
| `swordfish` | 12 | 13 |
| `xyWing` | 6 | 4 |
| `xyzWing` | 4 | 4 |
| `finnedXWing` | 8 | 8 |
| `sashimiXWing` | 8 | 8 |
| `jellyfish` | 1 | 14 |
| `xChain` | 6 | 4 |
| `xyChain` | 6 | 6 |

Jellyfish 的单目标例子通过真实回放获得：在已有唯一解源题中执行两步完整的原生 Forcing Net 删除，保留全部鱼形前提与盘面；重新检查低级规则停滞后，原生 Jellyfish 本身恰好产生一次删除。它不是从多目标结果中手工截取的一项，也不冒充新的独立原题。

## 复核入口

```sh
bash scripts/test-hint-lab-validation.sh
python3 tools/hint-lab/check_corpus.py src/debug/generated/hint-lab-fixtures.json --output /tmp/hint-lab-validation.json
```

重复构建不要求相对自身再新增例子。首次验收使用了开始任务时的临时基线；新增来源计数仅在显式传入 `--baseline` 的报告中给出。默认重建不进行历史比较，也不保存历史题库或逐轮审计档案。

## 应用与原生验收

2026-09-16 对当前 543 例开发基线完成以下检查：

- `format:check`、`typecheck` 和 `git diff --check` 通过；`lint` 无错误，保留 12 个与本次技巧拆分无关的既有警告。
- 完整 Jest 共 86 个已运行套件、3366 项测试通过；另有 2 个套件、17 项测试按既有配置跳过。覆盖四语言讲解、全部正式例子的应用与撤销、例题切换和既有行为流程。
- `hint:core:check` 通过：40 项技巧正例、反例和安全结果检查，100 题共 6179 个逻辑步骤回放，1000 个随机合法状态，以及原生例题策略与 8 项 Python 检查器回归。
- 原生回放 P95：L1 0.48 ms、L2 1.40 ms、L3 6.37 ms、L4 20.28 ms、L5 173.65 ms，均满足现有门槛。
- 当前 Hint Lab 543 例全部重新生成原生证明并通过覆盖校验；`uniqueRectangleType4` 与 `hiddenRectangle` 各有 8 个独立来源。
- 生产内容的 10420 题完成 672634 个逻辑步骤回放，40 个 detector 均通过，并保持现有 SQLite、校验和及难度分布不变。
- 行为归因目录包含 40 项技巧和 5 个协议样例；40 项技巧的候选召回率均为 1。

本轮没有进行模拟器或真机人工检查；例题正确性、覆盖与现有内容兼容性由上述自动化门槛验收。
