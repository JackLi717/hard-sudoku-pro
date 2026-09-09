# Hard Sudoku Pro 题库生成工具

当前是未上线的实验阶段。`output/content-v4/` 是 App 使用的开发题库，直接更新，不为每轮实验递增版本或保存历史审计副本。

`rating-report.json` 是可重新生成的逐题诊断文件，只在本地生成流程中使用，不属于需要提交的开发题库产物。仓库保留精简的 `validation-report.json` 作为验证摘要。

当前题库共有 **10,420 道**：L1 505、L2 2,085、L3 358、L4 2,904、L5 4,568。原一万题已全部重新分级，另合入 420 道新题，其中八种 L5 技巧各新增 50 道不同题面与关键盘面的案例。

## 生成与分级

HoDoKu2 提供候选，HSP C++ 引擎验证逻辑求解。Python 负责调用、唯一解检查、种子题给定数调整和保持数独规则的局部答案交换；不另写一套逻辑技巧检测器。

- 每一步先用最低可用等级。低一级技巧用尽后必须卡住，目标等级以内必须完整解出。
- L5 定向案例只在 L1–L4 无步可走时选择目标技巧；同级技巧可能存在其他解法。
- 同题或相同目标关键盘面不重复计入新增案例配额。
- 所有题目通过唯一解、答案一致、逻辑动作、等级分布及 SQLite 完整性检查。
- 同级排序使用 HSP 标准路径产生的固定原始人类负担分。最难步骤占主导，
  其余高级步骤按 25%、基础步骤按 5% 累加；链类技巧另外计入证明节点、
  最大依赖深度、分支数和超过八层后的非线性深度成本。分数只依赖题目和
  固定公式，新增或删除其他题目不会改变已有分数。
- `difficulty_level` 始终优先于 `difficulty_score`；分数只用于同级排序，
  不参与升降级。当前未上线基线统一写入 `rating_version = "1"`。

详细命令见 [生成与补题](generation/README.md)。生成期间的临时检查点只用于避免重复计算，完成后清理。保留题库本体、评级必要数据和简洁验证结果。

## 环境与检查

需要 Java 21+、Python 3.11+ 和 C++20 编译器。

```bash
# 在一个尚不存在的临时目录生成小批验证题。
python3 scripts/build_puzzles.py --per-level 20 --output-dir /tmp/hsp-validation

# 从仓库根目录运行。
npm run content:production:check
python3 tools/puzzle-generator/scripts/verify_generation_witnesses.py \
  tools/puzzle-generator/output/content-v4
python3 -m unittest discover -s tools/puzzle-generator/tests -v
```

生成验收路径与 App 默认提示路径可以并列统计：

```bash
npm run content:coverage
python3 tools/puzzle-generator/scripts/query_puzzles_by_technique.py \
  --all xWing,xyWing --difficulty 4 --limit 20
```

路径中的技巧关联不表示每个玩家必定采用该技巧；定向题的质量门槛是低级无步可走时能使用目标技巧并完整解出。

## 离线工具边界

固定 HoDoKu2 `2.4.3 build 116` 的 JAR、许可证和第三方声明保存在 `vendor/hodoku2/`。保留工具完整性校验。HoDoKu2 只在构建阶段运行，不能打包到 iOS/Android App。

App 的题库只读，随 App 资源更新，与用户进度存储分离。上线前按 `AGENTS.md` 更新当前基线；公开发布后再建立真实的数据兼容与迁移边界。

离线 oracle 仍可用于提示引擎测试：

```bash
npm run hint:oracle:check
python3 tools/puzzle-generator/scripts/hodoku_oracle.py \
  --puzzle 530070000600195000098000060800060003400803001700020006060000280000419005000080079
```
