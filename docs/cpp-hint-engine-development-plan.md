# Hard Sudoku Pro：C++ 智能提示引擎开发计划

> 实现状态（2026-09-01）：纯 C++ 核心的 39 个 Level 1–5 技巧、确定性
> 流水线、有界/可取消高级搜索、单元测试、100 题完整回放、1,000 个固定随机
> 合法中间盘面、sanitizer、React Native Codegen TurboModule、iOS/Android
> 后台执行和双平台原生构建已经完成。结果见
> `docs/cpp-hint-engine-acceptance-report.md` 和
> `docs/phase-1-native-integration-acceptance.md`。
> 同日完成教学提示迭代：同级实例枚举、人类成本排序、可变长度证明页、旧提示兼容和
> 逐页证据高亮；当前体验盘面固定选择中右宫的 `R5C9=4` Hidden Single。

## 1. 决策与目标

运行时智能提示采用独立的 C++20 静态库 `hsp-hint-core`，通过 React Native New Architecture 的薄 TurboModule 适配器同时服务 iOS 和 Android。HoDoKu2 只作为本地及 CI 的离线对照工具，不进入 App；成熟 MIT C# 数独项目可用于理解算法、证据模型和构造测试，但不直接嵌入运行时，也不机械逐行翻译。

引擎唯一核心操作为 `nextStep(board, hintCandidates)`：在当前已确认盘面和持久化内部候选状态上，返回一个最简单、确定、可解释的原子逻辑步骤。一步可以填入一个确定数字，也可以排除一组由同一逻辑结论产生的候选数。禁止猜测、试错、回溯、暴力求解以及利用答案反推提示。

## 2. 架构边界

```text
React Native UI / 游戏状态
          │ HintStep v1
          ▼
纯 C++ TurboModule 适配层（后台线程、类型转换）
          │
          ▼
hsp-hint-core（候选关系、技巧检测、结构化证据）
```

核心库不依赖 React Native、JSI、SQLite、界面、本地化、题目答案或 HoDoKu。技巧只返回稳定代码、格子、区域、前提、已填数字证据、排除、填数和证明原因；四语言文字由 App 根据模板渲染。答案只允许在库外的测试安全校验中使用。

## 3. 保留、重写与验证范围

成熟 C# 项目的价值主要是技巧定义、搜索策略、图关系和测试样例。预计需研读约 `15,000–22,000` 行相关实现，最终原创 C++ 核心约 `11,000–19,000` 行，测试与回放工具约 `8,000–15,000` 行。UI、反射、source generator、依赖注入、序列化、日志、桌面工具和 .NET 特有基础设施全部舍弃。

所有技巧必须重新实现为：无全局可变状态、固定遍历顺序、显式证据对象、无异常跨桥接、可在单元测试中独立调用。参考第三方实现时必须记录来源和许可证，避免复制不兼容代码。

## 4. 分阶段计划

### A. 核心骨架与 Level 1（已完成）

- 建立 CMake C++20 静态库、无第三方测试程序和仓库检查命令。
- 冻结 81 格盘面、9-bit 候选、技巧目录、结果状态和 `HintStep` 证据结构。
- 实现请求校验、Full House、Naked Single、Hidden Single 和确定性顺序。
- 建立非法盘面、已完成、无支持步骤和重复调用测试。

### B. Level 2–3（6–9 周）

- 实现 Locked Candidates、Pairs/Triples/Quads、X-Wing。
- 增加组合枚举、强弱关系等可复用原语，先测试原语再测试技巧。
- 对当前100题的每个中间状态与 HoDoKu2 进行轨迹交叉验证。

### C. Level 4（6–9 周）

- 实现 Swordfish、Wing、Kite、Turbot、Coloring、Rectangle 等发行技巧。
- 对每种技巧建立正例、近似反例、边界例和证据完整性测试。

### D. Level 5（8–12 周）

- 实现 Jellyfish、X/XY Chain、AIC、Grouped AIC、复杂着色及受控 Forcing 技巧。
- 明确链搜索上限和取消机制；即使没有找到步骤也不能退化为猜测。

### E. 双平台集成与发行验证（4–7 周）

- 已增加共用 C++ 桥接边界和 RN 0.87 Codegen TurboModule；iOS/Android 均在
  专用串行后台执行器运行，并映射现有 TypeScript `HintEngine` 契约。
- 已支持跨桥取消、原生异常隔离、结果 JSON 形状校验和返回步骤的领域安全复验。
- 完成 `hintCandidates` 的保存、撤销、退出恢复和连续提示回放。
- 在 iOS/Android 真机验证取消、异常隔离、内存和耗时。
- 全量回放候选题库，再冻结正式发行技巧集合和题库评级策略。

单人开发总工期建议按 `5–8` 个月规划；Level 4–5 的证明与验证比代码搬运更耗时，不以技巧数量线性估算。

## 5. 固定验收门槛

- 相同 `board + hintCandidates` 必须逐字段返回同一步。
- 每个动作应用后盘面仍合法；排除不能移除题目答案候选，填数必须匹配答案。
- 技巧等级由统一目录决定，简单等级存在时不得返回更难等级；同级步骤按可解释的
  `humanCost` 排序，不以目录或检测循环中的首次命中作为产品优先级。
- 每种技巧均有正例、反例、变形和性能测试；100题只是早期回归集，不是充分证明。
- 普通技巧 P95 目标 `<100 ms`，高级技巧 P95 目标 `<300 ms`，且不阻塞 UI。
- Sanitizer、Clang/GCC 警告、双平台原生构建、随机合法中间盘面回放全部通过。

## 6. 项目布局与近期工作

```text
native/hsp-hint-core/
  include/hsp/hint_core/  公共契约与引擎 API
  src/                     技巧实现与共用算法
  tests/                   无平台单元测试
  CMakeLists.txt           iOS/Android 可复用构建入口
scripts/test-hint-core.sh  开发机快速编译检查
```

技巧核心、TurboModule、生产题库回放、`hintCandidates` 持久化/撤销和正式动态提示界面
均已交付。后续继续以生产题库全轨迹、双平台构建和模拟器/真机体验作为任何提示排序或证明
模型变更的固定回归门槛。
