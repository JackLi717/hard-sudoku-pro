# 我的技巧与技巧详情：收藏册改版

后续首页/完成页入口与本局足迹改版见 [成长入口与足迹验收](technique-growth-entry-refresh.md)。

2026-09-04，用户批准先重做这两页，实际效果确认后再考虑推广。原成长归因、统计算法、学习事件、奖励以及本局足迹和完成页均不在本轮改版范围内。

## 这次改变了什么

| 内容 | 新位置与交互 |
| --- | --- |
| 技巧目录 | 数独图形、技巧名、一条短状态。根据后续体验反馈，手机横竖屏均改为单列横向列表，iPad Mini保留三列收藏格；大字体单列。没有记录的技巧保持可访问，不用锁、失败色或掌握等级。 |
| 最近的真实经历 | 详情首屏展示最近记录对应的操作前棋盘、学习接触/应用记录/可能解释短标签、活动日期和难度；主按钮直接进入原复盘。 |
| 记录依据 | 在主按钮下按需展开。仍能查看提示辅助、实际活动时间、原对局时间、默认归因/可能解释、缺失证据和备选解释。 |
| 历史记录与筛选 | 收进「过往记录」。保留学习/应用/值得回看筛选、分页和每条记录的深链。 |
| 三项数量、窗口、里程碑 | 收进「统计与里程碑」，数值仍直接来自原共享 view model。 |
| 技巧简介 | 收进「了解这个技巧」，沿用已有教学文案。 |
| 长定义与整体覆盖 | 放在顶栏统计说明按钮中，不再逐卡重复。 |

图形使用代码绘制的数独单元/模式符号，不是新的教学例题，也不是完成徽章。没有加动画、渐变、进度条、依赖或新奖励。主要文字维持16–32逻辑单位，按钮至少48，展开行至少64；减字来自内容顺序和折叠，而不是缩小字号。

## 真实盘面约束

`record-preview.ts` 只通过已有 `SessionReplaySource` 读取原对局，复用稳定引用解析和原回放构建器。预览取对应首个动作的 `before` 快照，不调用原生分析、不修复证据、不写数据库；源对局不符、引用失效、没有before快照或仍在进行时不提供替代棋盘。

预览明确标注「操作前·第N步」，省略微小候选数。完整棋盘与候选阅读交给主回看按钮。预览作为一个读屏图像节点，提供步骤及进入完整复盘的说明；装饰图形不进入读屏焦点。缺样本时显示无记录空态，失效的历史引用显示无可恢复预览，并保留原来明确失效的回放入口。

详情折叠、筛选、加载条数与滚动位置保留在页面状态中，打开复盘时保持来源页挂载，返回后恢复。滚动偏移只在切换页面时恢复，数据刷新不强制滚回位置。关注沿用已有持久化设置，没有新增偏好字段。

## 验收记录

手机单列调整另由组件测试覆盖手机横竖屏、手机大字体、iPad常规与大字体布局；以下设备截图和全量测试为调整前的两页改版验收记录。

- iPad Mini：实际查看新版最近/全部39项/关注集合、X-Wing无记录详情、Naked Single应用详情、Two-String Kite仅学习接触详情。关注X-Wing后出现在关注集合，测试后取消，恢复原状态。
- iPad学习筛选→原局第3/58步R3C2填3→返回，保留「过往记录」展开和学习筛选。没有完成演练或写入新学习事件。
- Android：实际查看两列收藏册、中文/英文详情、可能解释、展开统计及原复盘第67/70步R8C8填8。真实预览与该步骤的操作前快照对应。
- Android最初试用百分比换行网格时发现像素取整造成错行，已改为固定九行、每行九个等分单元；修正后在真实设备截图核对。未保留错误网格作为交付效果图。
- iPad `accessibility-large` 下详情改为单列，主按钮保持清晰；收藏册变为整行技巧卡。已恢复原 `large`。图形说明按钮保持独立48单位目标，避免大字体裁切图标。
- Android临时设为1.5倍字体后，模拟器还在被同时操作，已切到原复盘演练页；带页面守卫的导航检测到变化后没有点击。已恢复1.0，不打断当前演练。Android大字体下的新两页未取得独立设备截图，不将原复盘画面冒充为成长页验收；该项依据iPad实测及组件单列测试。
- 基础读屏检查覆盖技巧名与短状态、展开状态、选中筛选、预览说明和回看按钮；未宣称已完成实体设备的语音读屏全流程。
- 组件/适配器新增6项测试：真实before来源、错源/缺失/进行中拒绝、折叠与返回、可能解释及空预览、大字体单列、原足迹消费者不回归。
- 全量Jest：51套件、933测试通过，既有1套件/15测试跳过。TypeScript、Lint（无警告）、Prettier和`git diff --check`通过。本轮没有改原生或归因代码，因此没有把上一轮原生审计冒充为本轮新增算法验收。

## 数据与产物

本轮目录：`.local/behavior-regression/growth-redesign-20260904/`。

iPad前后逐表读取对照：`game_sessions`、`game_moves`、`game_replay_events`、`technique_growth_projection`、`technique_learning_events`、`growth_feedback_receipts`全部相同；10局、1条原有学习完成、1条原有轻反馈回执。结果见 `ipad-data-comparison.json`，因此浏览与预览没有创造新学习或奖励反馈。

Android前后只读快照分别为 `capture-xqB8QW` 与 `capture-N9FsHc`。原1499条成长记录无丢失、无修改，应用数保持83；1373条move全部一致，信用流水349条、钱包、19条完成奖励及轻反馈回执全部一致。期间模拟器仍被操作并进入演练，新增4条演练完成学习记录，实际保存为 Naked Single、Hidden Single、Pointing、Jellyfish；本轮代理没有点击Android「完成演练」，也不将这些新增事件称为“数据完全不变”。另有原进行中对局的暂停/计时变化。完整对照见 `android-data-comparison.json`。静态预览不会写入学习事件，另由适配器与组件测试验证。

截图均为实际模拟器画面。iPad改版前两页在本轮修改前拍摄；Android本轮开始时已通过实际界面树核对旧两页，前后对比采用同日上一轮保存的旧版总览/详情截图（原目录`growth-20260904/screenshots`）。本轮初始预截图落在首页和游戏页，另行保留为`android-before-home.png`、`android-startup-game.png`，不把它们误标为旧两页。

| 对比 | 改版前 | 改版后 |
| --- | --- | --- |
| iPad总览 | `screenshots/ipad-before-overview.png` | `screenshots/ipad-after-overview.png` |
| iPad详情 | `screenshots/ipad-before-detail.png` | `screenshots/ipad-after-detail.png` |
| Android总览 | `screenshots/android-before-overview.png` | `screenshots/android-after-overview.png` |
| Android详情 | `screenshots/android-before-detail.png` | `screenshots/android-after-detail.png` |

另有 `ipad-after-empty.png`、`ipad-after-following.png`、`ipad-after-learning.png`、`ipad-large-detail.png`、`ipad-large-overview.png`，以及Android原复盘定位图。测试日志位于`/private/tmp/hsp-album-full-tests.log`。

仅这两页进入本轮可体验状态，等用户确认视觉方向后再推广到完成页或本局足迹。未提交或推送。
