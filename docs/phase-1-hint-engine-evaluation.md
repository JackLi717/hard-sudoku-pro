# Hard Sudoku Pro：阶段 1 智能提示引擎评估

## 1. 结论

截至 2026-09-01，候选引擎审计结论不变；运行时已落地为原创的独立 C++20 核心 `hsp-hint-core`。它保留异步 `HintEngine` 边界、独立 `hintCandidates` 状态和结果安全校验，通过 RN 0.87 Codegen TurboModule 薄适配层服务双平台，不引入任何被否决的候选库。

HoDoKu2 仅用作本地/CI 离线测试 oracle，不进入任何可分发 App 构建；因此运行时方案不再依赖其商业授权。成熟 MIT 实现只作为技巧算法、证据结构和测试构造参考，按需要重写为确定性 C++ 检测器，而不是移植其 UI、框架或运行时。任何参考和重写都必须保留许可证记录并以交叉回放为准，不能凭少量单元测试自行宣布正确。详细阶段、代码范围和验收门槛见 `docs/cpp-hint-engine-development-plan.md`。

## 2. 固定验收规则

- 每次只返回一个最简单的原子逻辑步骤：一次填数，或一组同一结论的候选排除。
- 禁止 Guess、Backtracking、Trial and Error，以及从已知答案反推提示。
- 相同盘面和 `hintCandidates` 必须稳定返回同一步。
- 步骤必须包含技巧代码、前提候选、关注格/区域和动作；展示文案由 App 本地化。
- 每个动作先通过答案安全校验：填数必须等于答案，排除不得删除答案候选。答案只用于验证，不参与寻找步骤。
- 100 题全轨迹与抽样中间盘面必须通过 HoDoKu2 对照；普通提示 P95 小于 100 ms，高级提示 P95 小于 300 ms，并在后台线程执行。

## 3. 候选审计

### [`jkomoros/sudoku`](https://github.com/jkomoros/sudoku)

审计固定提交 `6d8ef4184b13bddde1035a03e0b6d8f295b66a31`，许可证 Apache-2.0。它提供 Go 技巧检测器和候选排除状态，但默认 `Hint()` 会随机选择并返回包含前置排除与最终填数的复合步骤。现有技巧只覆盖 singles、subsets、pointing、X-Wing、Swordfish、XY-Wing 和 forcing chain；缺少当前题库实际使用的 Skyscraper、W-Wing、XY-Chain、AIC、着色、唯一矩形等。结论：不接入，也不生成 AAR/XCFramework。

### [`@sudoku-tools/classic9`](https://github.com/RichardCao/classic9-sudoku) 0.5.0

MIT、纯 TypeScript、结构化证据和候选 mask 与本项目高度匹配，自带快速测试通过。独立回放 100 题时仅 86 题完成，14 题在默认 stable 路径产生候选矛盾；仓库当时仅 6 个提交、0 stars。开发机整题回放 P95 约 87.5 ms 不能抵消正确性失败。结论：拒绝作为运行时依赖。

### [`kyoyama-kazusa/Sudoku`](https://github.com/kyoyama-kazusa/Sudoku)

MIT、长期维护且技巧覆盖完整。稳定标签 v3.4.2 目标为 .NET 9，分析器依赖 source generator、运行时类型发现和反射；当前主分支已是 .NET 11 preview。[微软 NativeAOT 库文档](https://learn.microsoft.com/dotnet/core/deploying/native-aot/libraries)同时说明静态库不是正式支持路径，iOS 静态库仍有公开未解决问题。结论：可作为算法和测试参考，不能直接作为双平台运行时 SDK。

## 4. 已落地的安全边界

- `HintEngine` 是异步接口，UI 不依赖具体语言或库。
- `HintEngineRequest.hintCandidates` 明确为 81 个 9-bit mask。
- 可从确定数字盘面建立完整内部候选状态；玩家两份草稿不参与。
- 应用填数时保留已经证明的排除，并清理同行、同列、同宫；应用排除时只修改内部候选状态。
- 盘面指纹、候选合法性、原子动作、重复动作、空候选、答案冲突均有自动校验。
- 固定 HoDoKu2 JAR 可通过 `npm run hint:oracle:check` 作为离线基准，输出 JSON 逻辑路径；检测到 Brute Force、Template 或 Give Up 时测试失败。

## 5. 集成结论

C++ 核心技巧集合、生产题库回放和双平台桥接现已稳定。适配层不含解题算法：TypeScript 负责请求/结果安全复验，iOS/Android 负责后台调度，全部技巧检测和稳定结果序列化来自同一 C++ 边界。任何 TestFlight、Google Play 测试或正式安装包仍不得包含或链接 HoDoKu2。最低目标真机签收完成后即可关闭阶段 1，并继续阶段 2、3 和 5 的状态持久化及正式提示体验。
