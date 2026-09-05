# 题库生成与质量检查

当前是未上线的实验阶段。直接更新 App 使用的 `output/content-v4/`，保持内容版本不变；不保留每轮日志和旧题库作为审计归档。

## 分级条件

HSP 引擎每一步先用最低可用等级，持续执行至无步骤才允许升级。整题必须在标注等级以内完整解出，低一级的技巧集合必须在某个关键盘面停住。例如 L2 必须用 L1–L2 解完，而仅 L1 无法完成。

这是相对于固定检测器和确定性路径的验证，不是对所有可能解题顺序的数学证明。每道题另验唯一解、答案、动作正确性及数据库完整性。

## L5 每种技巧至少 50 道

针对八种 L5 技巧分别生成至少 50 个不同题面和不同关键盘面的案例。目标技巧必须在 L1–L4 全部无步可走时出场；同级可有其他解法，训练路径在该前沿选择目标技巧。若目标技巧枚举达到上限，该次命中不计入配额。

候选既可由 HoDoKu2 生成，也可从相关种子题改变给定数，并对完整答案做保持行、列、宫规则的局部四格交换。所有候选从普通给定数重新创建候选集，不人为拼接中间候选数。仅改变题面而得到同一关键盘面的案例不重复计数。

## 更新流程

```bash
# 在 tools/puzzle-generator/ 目录执行：重评、补题、合并、更新资源校验值。
python3 scripts/rebuild_production.py
```

默认自动使用并清理临时工作目录。需要中断后继续时，可显式给出 `--work-dir /tmp/hsp-content-work`；`--validate-only` 只重评。单独定向补题仍可用 `grow_technique_puzzles.py`。完成合并不需要新版本号或人工审计审批。


首次合并可接收前一轮 50 道 AIC 专项；后续构建也可以直接运行 `grow_technique_puzzles.py aic`。临时检查点用于避免重复计算，完成后清理。正式保留简洁的验证结果和评级所需的关键盘面，不保留原始生成日志。

```bash
python3 -m unittest discover -s tests -v
python3 scripts/verify_generation_witnesses.py output/content-v4
npm run content:production:check
```
