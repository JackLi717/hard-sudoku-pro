# Hint 生成规则与优先级验收

日期：2026-09-15。实施基线为 `main / 5afe697`。

本轮把 Hint 的候选来源、直接性和排序规则固定为一条可验证的运行时路径。提示只使用当前可见且通过完整性检查的 Quick Candidates、当前盘面直接生成的候选，或用户已经明确应用的 Hint 步骤。隐藏 Quick、手工 Pencil 和来源不明的历史候选缩减不能成为证明。Quick 出现空候选、盘面非法候选或删掉正确候选时，提示停止，不消耗额度、不修改候选，并返回问题格供棋盘短暂高亮。

引擎只枚举当前候选状态上直接成立的技巧，不在后台串联未展示技巧。最低技巧等级先形成候选前沿；前沿内按 `humanCost`、与当前选中格的关联、格与数字的稳定顺序选择。选中格只打破同成本并列，不能越过更简单或教学成本更低的步骤。

用户应用候选排除型 Hint 后，步骤与候选来源随游戏状态和 Undo 快照保存。后续由该步骤形成的 Naked Single 会明确说明“已应用的提示”删除了哪些候选，不再显示无法追溯的“此前已验证排除”。当前可见 Quick 自己形成的 Naked Single 继续使用“按照你当前的候选”文案。

Hint Lab 的每个例子新增 `candidateBasis`：`board_direct` 表示由展示盘面直接生成候选，`applied_hint_sequence` 表示依赖已回放步骤。三个 Naked Single 正式例子全部要求 `board_direct`、`sourceIteration = 0`，且候选掩码必须等于展示盘面的完整合法候选。原第三例已替换为盘面直接成立的 R3C8 = 8；生成器和独立校验器都会拒绝再次引入依赖回放的 Naked Single 正式例子。

自动验收覆盖候选来源恢复、明确应用步骤的连续推理、Quick 错误阻断、原生桥接参数、选中格软排序、四语言教学文案以及 537 个 Hint Lab 例子的原生重放。验收命令和结果：

- `npm run typecheck`：通过。
- `npm run hint:core:check`：通过，包含 C++ 严格警告编译与选中格并列排序回归。
- `python3 -m unittest test_check_corpus.py`（`tools/hint-lab`）：8 项通过。
- `bash scripts/test-hint-lab-validation.sh`：通过。
- 相关 Jest：4 套、1125 项通过。
- 全量 Jest：85 套、3317 项通过；`game-response-performance.test.tsx` 保留既有的单项渲染计数差异（期望 13，当前 14），与本轮 Hint 路径无关。
- `npm run lint`：0 个错误；保留仓库既有的 12 个警告。
- 本轮修改的 TypeScript／TSX 文件通过 Prettier，`git diff --check` 通过。
- Android `./gradlew compileDebugKotlin`：通过。
- iOS Simulator Debug `xcodebuild`：通过。
