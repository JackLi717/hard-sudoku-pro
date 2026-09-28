# Platon Sudoku 社交内容手册

更新日期：2026-09-24

## 1. 内容原则

1. 每篇只证明一个具体价值，不罗列全部功能；
2. 先展示问题和交互，再介绍产品；
3. 用真实录屏代替“智能、专业、创新”等形容词；
4. 公开开发者身份，直接承认仍在 beta；
5. 允许推广的渠道才放下载链接；禁止推广的社区只做真诚的数独交流，不把讨论当隐蔽导流；
6. 结尾只设置一个行动：回答问题、加入测试或下载，不能同时要求点赞、关注、评论和安装；
7. 对外文案以英语为主，所有帖子保留原始版本、发布日期、渠道和结果。

## 2. 内容支柱

| 支柱 | 面向人群 | 核心问题 | 最佳证明素材 |
| --- | --- | --- | --- |
| 复盘解题过程 | 进阶学习者 | “完成以后，我能学到什么？” | 真实一步操作与复盘可能解释的前后对照 |
| 逻辑提示 | 从普通走向 Hard 的玩家 | “提示能不能不直接泄露答案？” | 观察 → 依据 → 结论的 12–20 秒录屏 |
| 候选数工作流 | 重度玩家 | “手机上整理候选为什么这么费操作？” | 真实数组推理加多选、`−N`、连续删除的 18–24 秒录屏 |
| 可信难度与题库 | 对难度失去信任的玩家 | “Extreme 真的需要高级技巧吗？” | 同一题的最高技巧、评级路径和简化图 |
| 安静的数独 | Android 普通玩家 | “能不能只解题，不被活动和广告打断？” | 开局到完成无强制广告的快速剪辑 |
| 开发透明度 | Indie/Android 社区 | “这个独立项目为什么值得试？” | 真实构建、验证数据、修复前后对比 |

## 3. 角度一：复盘不是分数，而是过程

### Hook

> Most Sudoku apps remember your time. What if one remembered the solve?

### 15 秒视频脚本

1. 玩家填入一个数字；
2. 完成后进入 Session Replay；
3. 时间线停在该步，切换 Before / After；
4. 展开 `Possible explanations`；
5. 显示一条具体结论；
6. 收尾：`Recorded move. Possible logic. Never a claim about what you were thinking.`

### 招募帖正文

> I’m building an Android Sudoku app that keeps more than a finish time.
>
> It records the moves that changed the game—placements, candidate edits, undos and hints—so you can replay the solve afterwards. For key moves, the logic engine can search for one or more valid explanations.
>
> The distinction matters: a recorded move is a fact; an explanation is only a possible logical path. If the evidence is missing, the replay keeps it unknown instead of pretending to know what you were thinking.
>
> I’m looking for Android testers who enjoy understanding a puzzle after finishing it.
>
> `[Google Play closed-test link]`

### 必须保留的限定

- 不写 “every move”；
- 不写 “understands your thinking”；
- 视频必须使用当前 Release 范围和玩家化文案，不能使用旧原型的“归因准入”“搜索投入”等工程词。

## 4. 角度二：提示不替你猜

### Hook

> A hint should show the logic before it changes the grid.

### 正文

> In Platon Sudoku, a hint is a small proof, not a revealed answer.
>
> It first shows where to look, then the relevant candidates or constraints, and only then the placement or elimination. You decide whether to apply it.
>
> The current engine covers 39 techniques and does not fall back to guessing or backtracking when it cannot produce a supported logical step.
>
> I’m testing whether the explanations are genuinely readable on a phone—not just technically correct.
>
> `[Android beta link]`

### 可测试的问题

> Would you rather see the technique name first, or discover the pattern before the name is revealed?

这个问题能产生产品反馈，不只是泛泛的 “Do you like it?”。

## 5. 角度三：候选格自然多选

### 标题 A

> Would this make pencil-mark cleanup faster—or just easier to trigger by accident?

### 标题 B

> I added tap-and-drag candidate removal to my Android Sudoku app

### 18–24 秒演示

1. 快速候选已经显示，先提出一道真实问题；
2. 给观众时间看出同一房屋中的隐性三数组；
3. 说明三个关键数字只能出现在这三个格中；
4. 点按或拖动选中这三个格；
5. 数字键对多余候选显示 `−N`，连续删除至少两种多余候选；
6. 选区保持，清理后的数组清楚可见；
7. 收尾：`Select once. Remove the extras. The selection stays.`

这里必须先证明删除理由，再展示操作。不能用任意盘面选择几个格、随意删数来充当功能证明。完整分镜和盘面条件见[首周视频创意与自制计划](video-production-week.md)。

### 正文

> I’m experimenting with a small interaction for people who use pencil marks heavily.
>
> In Cell-first mode, you can tap or drag across several cells containing candidates. Once two or more cells are selected, the keypad shows how many copies of each candidate can be removed. `−3` under 5 means candidate 5 appears in three selected cells.
>
> Removing it keeps the selection, so you can clean up another candidate without selecting the same cells again. There’s no temporary toolbar and no Done button. The feature is optional and off by default.
>
> Two things I want to learn:
>
> 1. Does selecting the second cell make the delete behavior feel natural?
> 2. Would you enable this, or would you prefer an explicit multi-select mode?
>
> I’m the developer, and the feature is available in the current Android closed test:
>
> `[Google Play closed-test link]`

### 真实价值

这是一篇适合获得互动和安装的帖子，因为玩家不需要相信宣传：他先亲自看出数组，再判断这套操作是否真的更顺手。

## 6. 角度四：为什么 Extreme 不只是更多空格

### Hook

> A Sudoku isn’t hard because it has more empty cells. It’s hard because of the logic it requires.

### 正文

> Platon Sudoku grades release puzzles by the supported techniques needed to solve them. The same logic engine then replayed all 10,539 release puzzles from start to finish—680,092 verified logical steps in total.
>
> That doesn’t make every puzzle equally beautiful, and it doesn’t mean a player will follow the same path. It does mean an Extreme label is tied to a defined logical path rather than a vague empty-cell count.

### CTA

> I’m looking for experienced Android players to tell me whether those five levels feel right in practice.

此角度适合招募高阶玩家，不适合面向休闲用户作为第一条内容。

## 7. 角度五：一款安静的数独

### Hook

> No account. No forced ad between you and the next move.

### 正文

> I wanted a Sudoku app that opens straight into a puzzle and keeps working offline.
>
> Platon Sudoku stores puzzles, progress and statistics on the device. It doesn’t require an account, and it doesn’t insert automatic ads when you start, resume, play or finish a puzzle.
>
> The free version may offer an optional rewarded ad when you choose to refill a hint or Quick Candidates use. That choice is separate from the game itself.

这是信任角度，不应写成“完全无广告”。

## 8. 角度六：独立开发与验证证据

### Hook

> Building a Sudoku hint engine was the easy claim. Proving it across 10,539 puzzles was the real work.

### 正文结构

1. 为什么不使用“算出答案再包装解释”；
2. 39 种技巧的检测范围；
3. 发行题全轨迹重放；
4. 一个曾经失败的边界案例；
5. 邀请技术型或高阶玩家挑战提示。

这一角度适合 r/SideProject、IndieDev、Android 开发社区，不适合大众商店文案。

## 9. 渠道适配

| 渠道 | 可以做什么 | 不应该做什么 | CTA |
| --- | --- | --- | --- |
| r/androidapps | 在当前 Self Promotion Megathread 中展示功能和测试链接 | 单独发自我推广帖、频繁重复 | 加入 Android 测试 |
| r/puzzles | 使用当前允许的项目推广帖 | 把每道题都变成产品广告 | 查看演示或加入测试 |
| r/droidappshowcase | 直接展示 Android App、截图和视频 | 没有实质内容的链接帖 | 安装测试 |
| r/SideProject / IndieDev 类社区 | 讲开发选择、验证和迭代 | 假装市场成功、夸大下载量 | 反馈定位或加入测试 |
| r/sudoku | 真诚回答题目和技巧问题、分享符合规则的单题 | App 发布、下载、测试招募、隐蔽导流 | 无产品 CTA |
| Facebook Page | 累积短视频、更新和测试者故事 | 建空页后期待自然流量 | 加入测试或候补名单 |
| YouTube Shorts / Reels | 复用 9:16 功能演示 | 只有静态文字、没有棋盘变化 | 查看测试链接 |

社区规则会变化，发布当天必须重新检查。[r/sudoku 已于 2026-03-13 明确禁止 App/网站发布和测试招募](https://www.reddit.com/r/sudoku/comments/1rsjzov/rule_update_no_more_appwebsite_announcement_posts/)，不把它列为获客渠道。

## 10. 素材规范

每个功能至少准备：

- 一份 1080×1920、8–20 秒、无声音也能理解的竖屏视频；
- 一张首帧仍能看懂的封面；
- 英文字幕，避免只靠旁白；
- 一个不超过 12 个词的 Hook；
- 一个具体问题；
- 一个 CTA；
- 当前构建号和录制日期留在内部素材清单中。

候选多选、提示和复盘必须使用同一道可复现题制作素材，便于评论区追问时解释。不得用设计稿或剪辑制造当前 App 不存在的动画、速度和界面。

## 11. 第一批内容顺序

1. 候选格多选：最容易用短视频判断价值；
2. 分步逻辑提示：建立产品基本定位；
3. 单局复盘：建立最强差异；
4. 10,539 题全轨迹验证：建立可信度；
5. 无账号、离线、不强制广告：建立信任；
6. “测试者改变了什么”：证明反馈会被采用。

不要把复盘作为第一条公开内容，除非玩家化文案和 Android 真机表现已经完成复验。
