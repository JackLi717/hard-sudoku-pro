# Platon Sudoku 当前商店文案与素材

更新日期：2026-10-13

本目录保存 Google Play 首发当前文案，策略见 [ASO 长期策略](../aso-strategy.md)，后台状态与效果见 [执行追踪](../aso-tracker.md)。JSON 的 title、shortDescription、fullDescription 可直接填写对应后台字段。所有奖励承诺遵循 [商业方案](../../premium-reward-design.md)。

| 文件                     | 商店语言               | 标题方向             |
| ------------------------ | ---------------------- | -------------------- |
| [en-GB.json](en-GB.json) | English United Kingdom | 品牌加经典数独       |
| [de-DE.json](de-DE.json) | German                 | 品牌加经典谜题       |
| [ja-JP.json](ja-JP.json) | Japanese               | 品牌加数独与ナンプレ |
| [ko-KR.json](ko-KR.json) | Korean                 | 品牌加经典스도쿠     |

四语均表达经典 9×9、10,000+ 题、五档难度、核心离线、无需账号、无强制广告打断、免费可编辑自动候选、分步逻辑提示和复盘。免费提示与自愿广告、永久一次性购买分别说明，不写所有人无限提示或完全无广告。商店文案不承诺已获完整广告填充；广告是否可用取决于联网、地区与库存。

## 手机素材

当前前三张素材分别为简单游戏、自动候选和提示讲解。来自 com.platongames.sudoku 1.0.16（19）的真实 Android Release 测试构建，使用独立临时模拟器，不清空原测试设备数据，不重绘 UI、不伪造落数或讲解。

文件保存在仓库已有素材位置 `.local/google-play/listing/<locale>/screenshots/phone/`，前三张命名为 `01-classic-game.png`、`02-auto-notes.png`、`03-logic-hint.png`。新文件就地作为当前基线更新，不保留每轮实验副本。

默认英文共六张，后三张为既有 `phone-replay-midgame-1080x1920.png`、`phone-multiselect-1080x1920.png`、`phone-home-metal-1080x1920.png`。德语、日语和韩语各三张对应语言截图。原有其他设备组素材保留；本轮四语范围为文案与前三张手机图，不宣称全设备素材已经本地化。当前构建的完整验收边界仍见发行及分析文档。

2026-10-13 已核对四语后台文案与前三图顺序，并将七项 Store listings 变更提交审核。当前为 Changes in review 且快速检查运行中，不能据此宣称已生效。既有宣传横图的 AI 声明保留；新图为真实界面截图。

## 核对规则

1. 标题最多 30、短描述最多 80、长描述最多 4,000 字符；按 Unicode 字符检查，不以 UTF-8 字节数替代。
2. 四种语言功能及商业含义一致，用本地自然表达，语言核查不虚称母语审核。
3. 手机截图为 1080×1920、不含透明背景，前三张来自实际游戏界面，文件与后台顺序一致。
4. 后台保存后重新读取字段与文件名；审核状态另记录，只有已生效才标为已生效。
5. 不修改包名、签名、Alpha 名单、加入链接、地区或生产轨道；本轮不上传应用构建。
