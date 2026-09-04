# 39 项技巧逐步讲解验证清单

本次改造针对首个公开版本的开发基线。未增加内容版本、迁移序列或并行 proof 版本；没有改写 `content-v1` / `content-v4`。旧记录缺少教学证据时显示明确的旧式说明与原始结论。

## 明早优先查看

进入开发版 **Hint Lab**，打开下列图例，逐页点击 Next，再点 Conclusion；可切换 en / ja / de / zh-Hans。游戏结论页仍由 Apply 执行一次可撤销操作；保存记录复盘与推理路径共用 `buildHintPresentation(..., 'replay', candidateSnapshot)`，只读文案不包含 Apply / Undo 指令。

1. **XY-Wing / XYZ-Wing**：查看同一个枢轴的全部两/三种取值；XYZ 的共享数字分支直接落在枢轴。每个分支后撤回问号，目标必须看见全部可能落点。
2. **X-Wing / Swordfish / Jellyfish**：按基础区域逐条读真实落点，再看相同数量的覆盖区域如何全部被占用。不要把任意四格当成一个推理步骤。
3. **Finned X-Wing / Sashimi X-Wing**：另看列表末尾 `x-wing-two-fins`、`sashimi-two-fins`。两个鳍都在同一宫；分别解释任一鳍成立、全部鳍不成立。缺角明确不是候选。
4. **Locked Candidates · Pointing / Claiming**：来源与影响区域有不同角色；即使交换原生区域数组顺序，来源也不变。**Locked Triple / Naked Quad / Hidden Quad** 的最终理由必须包含完整三/四数字集合。
5. **Simple Coloring / Multi-Coloring / Complex Coloring**：候选框带分量编号和 A/B，圆角绿框与方角暖色框区分两种状态，不单靠颜色。另看 `color-same-side-conflict`，与普通图例的“目标看见两色”比较。Complex Coloring 按原生保存的实际分量路径逐步传播。
6. **Unique Rectangle / Hidden Rectangle / Avoidable Rectangle**：明确唯一解前提，逐页比较两种交换填法；Avoidable Rectangle 的三个值是玩家已填值，不是给定。
7. **Forcing Chain / Forcing Net**：普通 Net 图例是单假设矛盾；另看 `net-common-elimination`、`net-common-placement` 的三个完整分支。每个分支保留实际依赖，公共结论明确是真还是假。
8. **X-Chain / XY-Chain / AIC / Grouped AIC**：实线表示强关系、虚线表示互斥关系；按有序节点读真假传播。分组候选有相同的大括号编号。另看 `aic-forced-placement`，与默认 AIC 的自矛盾删除比较。
9. **Two-String Kite / Turbot Fish / Empty Rectangle / Skyscraper**：沿用已有专用页面，确认固定背景、真实候选、假设、排除、被迫成立、冲突和撤回没有退化。

以上是人工验收步骤，不表示已经执行真机验收。本次运行的是原生 C++ 测试、Jest 与 React Native 组件渲染检查；没有伪称在 iPhone/iPad/Android 上逐页手工验收。

## 逐项覆盖与检测器范围

“通过”表示真实正例进入经过候选与结构校验的讲解；完整结果、四语、假设撤回和只读一致性由自动测试验证。以下范围描述现有算法，不暗示支持该技巧的所有文献变体。

| 技巧 | 覆盖 | 教学内容 / 当前范围 |
|---|---|---|
| fullHouse | 通过 | 区域只缺一个数，显示已填证据 |
| nakedSingle | 通过 | 该格完整候选只剩一个 |
| hiddenSingle | 通过 | 有已填数完整覆盖时沿用最短覆盖；否则明确使用已验证候选快照 |
| lockedCandidates.pointing | 通过 | 宫为来源、行/列为影响区域；顺序无关 |
| lockedCandidates.claiming | 通过 | 行/列为来源、宫为影响区域；顺序无关 |
| lockedPair | 通过 | 两格完整并集与共同区域 |
| lockedTriple | 通过 | 三格完整并集，交叉区域的合法删除 |
| nakedPair | 通过 | 两格占满两数 |
| hiddenPair | 通过 | 两数的全部落点限制在两格 |
| nakedTriple | 通过 | 逐格候选，完整三数集合 |
| hiddenTriple | 通过 | 逐数字落点，完整三数集合 |
| nakedQuad | 通过 | 逐格候选，完整四数集合 |
| hiddenQuad | 通过 | 逐数字落点，完整四数集合 |
| xWing | 通过 | 两个基础 / 两个覆盖区域 |
| swordfish | 通过 | 三个基础 / 三个覆盖区域 |
| skyscraper | 通过 | 保留既有专用假设矛盾图解 |
| twoStringKite | 通过 | 保留既有专用假设矛盾图解 |
| turbotFish | 通过 | 保留既有专用假设矛盾图解 |
| wWing | 通过 | 两个相同双值翼、真实连接强对、两翼外数不能同时为假 |
| xyWing | 通过 | 枢轴两分支与两翼共同可见目标 |
| xyzWing | 通过 | 枢轴三分支，含共享数字在枢轴；目标同时看见三格 |
| simpleColoring | 通过 | 同色冲突 / 目标同时看见两色均有真实图例 |
| multiColoring | 通过 | 两分量互斥色导致至少一个反色为真；目标见两反色 |
| remotePair | 通过 | 双值格的二分连通结构；不用排序坐标冒充线性链 |
| emptyRectangle | 通过 | 保留既有专用宫内交叉与强对证明；不属于唯一性 |
| hiddenRectangle | 通过 | 当前为同一行的两个 roof、两个精确双值 floor、roof 行强对 |
| avoidableRectangle | 通过 | 三个非给定已填值与一个未填角，保存给定格身份；演示交换 |
| uniqueRectangle | 通过 | 当前仅 Type 1，三个精确双值角与一个额外候选角 |
| bugPlusOne | 通过 | 全盘除一格外双值，逐区域核对所有缺失数字次数，显示目标行列宫三次计数；唯一解前提 |
| finnedXWing | 通过 | 两基础区域，鳍限于同一宫；包括多个鳍 |
| sashimiXWing | 通过 | 一个缺角，其余真实鱼身与同宫鳍；包括多个鳍 |
| jellyfish | 通过 | 四个基础 / 四个覆盖区域 |
| xChain | 通过 | 单数字有序强弱交替，最多 9 条边，双端排除 |
| xyChain | 通过 | 有序双值格与格内/格间传递，现有最多 10 格搜索界限 |
| aic | 通过 | 原生当前支持假真导假删除、假假导真填数；不宣称新增独立端点 AIC 检测器 |
| groupedAic | 通过 | 单数字候选 OR 组，真实组强弱边，最多 7 条边；双端组排除 |
| complexColoring | 通过 | 至少三个真实分量的实际传播，回到起始分量反色形成矛盾 |
| forcingChain | 通过 | 候选真假两个分支，静态蕴涵路径汇聚到相同真/假事实；现有深度 18 / 访问 1200 上限 |
| forcingNet | 通过 | 3–6 候选分支的单数传播：单分支矛盾 / 所有分支共同删除 / 共同填数；保留候选格或区域分支的静态回退 |

## 证据与实现边界

- 原生 `teaching` 保留检测时的有序候选组、真假、规则、父节点、区域、颜色分量与分支。规范化仅作用于原始原子结果；不对教学节点排序。
- 简单结构由展示层在原始 focus、候选快照与原始结论范围内验证；链、染色和 forcing 使用原生捕获的证据。展示层不调用检测器找另一个答案。
- 强边核对区域/双值格的完整候选集合；弱边核对所有相关候选确实互斥；单数传播核对被删除选项的实际父节点；分支结论必须逐项等于原子结果。
- 暂时值仅进入 `hypotheticalValues`。最终页清空假设，Apply / Undo 的原子状态处理没有增加新的操作。
- 新 fixture 导出先写临时文件，成功后才替换开发图例，避免测试读取到半份 JSON。
- `__tests__/hint-teaching.test.ts` 验证 39 项与分支变体、完整集合、区域角色、真实候选、依赖破坏回退、四语、原始结果不可变与复盘一致性；`sudoku-board-hints.test.tsx` 检查实际颜色/组/假设组件。

## 本轮实际验证结果（2026-09-05）

- `npm run format:check`、`npm run lint`、`npm run typecheck`：通过，最终 lint 无警告。
- `npm run schema:check`：通过。
- `npm run hint:core:check`：严格 C++20 编译、单元测试、回放，以及全部 39 技巧的正例/负例/安全结果测试通过。
- 用本轮 `-O2 -std=c++20 -Wall -Wextra -Wpedantic -Werror` 编译的 `tools/behavior-evaluation/native_replay.cpp` 设置 `BEHAVIOR_NATIVE_REPLAY` 后，全量 Jest **59 套件、1133 项通过，无跳过**。包括真实原生推理路径的 15 项默认关闭测试。
- 最后补齐缺角图示的固定空间背景，再运行教学与棋盘组件回归：**2 套件、123 项通过**，包括新增缺角背景回归；随后确认格式、lint、类型检查通过。
- Hint Lab：39 个原有目录图例和 6 个补充变体均由原生导出。新生成内容通过候选合法性、原子结果与参考解检查；导出成功后原子替换开发 JSON。
- 首轮同时运行多个重测试时曾出现一个 5 秒 UI 测试超时；最终串行全量运行已通过。旧的按四候选分页断言已替换成完整候选集合及真实因果校验，没有隐藏失败或将跳过记为通过。
- 没有真机截图或真机验收结论；组件渲染检查与上面的人工验证步骤分别列明。
