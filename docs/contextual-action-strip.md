# Contextual Action Strip

游戏页只在存在临时棋盘操作时，于棋盘和数字键之间显示一条 Contextual Action Strip。平时不占位。它不是第二排工具栏：每次最多显示一条状态说明和右侧一个主操作；右侧操作统一使用品牌绿文字。状态结束后立即移除整条 Strip，不保留空白占位。

冲突按以下顺序处理，始终只显示最高优先级的可用内容：

1. 暂停和其他遮挡棋盘的模态界面接管交互，Strip 隐藏。
2. Hint 及一次性教学卡使用各自的语义视觉层，Strip 隐藏。打开 Hint 结束 Multi-select。
3. 提交操作、自动收尾等忙碌状态暂时隐藏 Strip，不添加第二个状态或操作。
4. Multi-select 显示选中格数与 `Done`。进入 Multi-select 时收起 Color palette，避免两个临时操作争用视觉焦点。
5. 普通下棋和仅打开 Color palette 时，Strip 隐藏。

首个落地场景是 Multi-select：长按空格直接选择第一格，不要求开启 Pencil；继续点空格可增减选择。点数字对选中格批量删除该候选数，选择保持可继续操作。点 `Done` 退出；最后一个选中格被取消、会话切换、暂停或 Hint 打开时也退出。第一次进入继续显示现有的一次性教学卡，教学文案改为使用 `Done` 结束。

Strip 只管理界面中的临时选择，不写入棋局、Undo 快照或复盘动作。批量候选删除仍走现有 `edit_candidates` 命令及 Undo/复盘路径。
