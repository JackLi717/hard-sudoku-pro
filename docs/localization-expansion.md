# Language expansion

Agreed scope (2026-10-09): 24 app languages — English, Japanese, German,
Simplified Chinese, Korean, Traditional Chinese, French, Spanish, Brazilian
Portuguese, Vietnamese, Hindi, Ukrainian, Romanian, Finnish, Arabic, Indonesian,
Italian, Turkish, Thai, Polish, Russian, Dutch, Malay and Filipino. Include UI,
accessibility labels, lessons, technique articles, hints, practice, replay, growth
and share cards. After the AI review, the user explicitly authorized committing
the app changes to Git and releasing an update through Google Play. Prepare
1.0.10 (version code 12) for the existing Closed testing — Alpha track, preserving
the package, signing key, testers, countries and opt-in link. Upload/submission
status is recorded below from the confirmed Console result.

Arabic uses horizontal RTL prose and interface layout. Boards, candidate
positions, coordinates, numeric controls and geometric reasoning diagrams keep
their established LTR order. Changes of app language take effect without restart.

## AI 复审结论（2026-10-09）：通过本轮语言复审，保留为本地待发布候选

上一轮列出的语言阻断问题已经修复，并复查了对应概念的相关句子。
本轮同意将当前 24 语种译文作为待发布候选；用户随后授权提交 Git 并发行 Alpha 更新。
用户指定 AI 为语言终审依据，母语者复核不是本次放行的前提。

这是按下述范围作出的 AI 质量判断，不是对 42,140 条译文逐句签认、零错误保证，
也不代表所有设备类别已经验收。自动检查只证明它们检查的结构约束，
语义结论来自另外进行的阅读、数独逻辑对照和人工修订。

### 本轮语义复核与修订范围

- 对 20 种新增语言逐一复核候选数、行／列／3×3 宫、显性／隐性数组、
  双候选格、强／弱关系及相关核心解释。强关系要求至少一端为真，
  弱关系要求至多一端为真；没有将这两个条件互换。
- 逐段阅读所有超过 250 个英文字符的源段落在 20 种新增语言中的译文：
  24 个源段落、480 个语言段落。检查推理前提、作用区域、数量限定、
  真／假状态、分支覆盖和排除结论。另复核了多组较短的核心定义、实际提示、
  BUG + 1、W-Wing、空矩形、远程数对、唯一矩形和染色说明。
- 对整套新增语料检查已知歧义线索，再对命中的上下文逐项修订，包括
  “宫”误译为单格、cover 误译为书封面、state 误译为国家、union 误译为工会、
  digit 误译为手指、deduction 误译为财务扣除、候选数被当成人员等。
  这类线索检查不能发现所有未知误译。
- 重新核对所有新增语言的笔记输入帮助及“先选格／先选数字”标签：
  操作先后不是第一格／第一个数字；手工笔记先补缺失候选，所选候选全部已有时
  再次输入才删除；快速候选模式下的编辑仅允许删除。
- 复核长篇产品说明，修正“技巧应用”被当成求职申请、
  “自由输入文本”被当成免费文本等问题。核对关闭分析开关只停止今后的上传、
  不撤销已收到报告，以及复盘学习按实际日期记录等含义。
- 审定文本覆盖表现有 4,209 个语言条目，上一轮为 2,470 个；
  本轮增加了 1,739 个固定条目，也修订了部分已有条目。
  这一数量包含短标签和术语修正，不能当作完整段落的阅读数量。
  术语表为每种新增语言固定 63 个术语／图例标签。
- 修正两处英文教学源文，并同步四个原有语言及全部新增译文：
  明确强弱关系的单向条件，准确描述 BUG + 1 的一格三候选、其余未解格双候选及
  额外候选在对应行、列、宫各出现三次的条件。既有中、日、德变量问题也已修复。

数独逻辑对照采用 HoDoKu 作者文档：[强弱关系](https://hodoku.sourceforge.net/en/tech_chains.php)、
[Pointing／Claiming](https://hodoku.sourceforge.net/en/tech_intersections.php)、
[显性数组](https://hodoku.sourceforge.net/en/tech_naked.php)、
[隐性数组](https://hodoku.sourceforge.net/en/tech_hidden.php)及
[基础鱼形](https://hodoku.sourceforge.net/en/tech_fishb.php)及
[四候选 X-Chain／空矩形变体](https://hodoku.sourceforge.net/en/tech_sdp.php)。

### 验证结果与判断边界

24 语种注册、系统语言匹配及可选择性已接入。新增 20 个静态目录各含
2,107 个不同英文源字符串，共 42,140 条译文；全部通过完整性和变量检查。
检查器拒绝缺失／空文本、变量丢失或新增、坐标变化、翻译标记、意外换行、
只剩标点或变量的句子、BUG／AIC 缩写丢失、审定文本变化及真／假图例相同。
自然语序允许重复原有变量。

实际文案回调的数量插值覆盖全部 24 语种及 0、1、2、5、21。
计数文案采用“标签：数值”等表达避免已知单复数问题；没有引入新的逐语言
复数规则系统。本次发行候选全量 Jest 测试通过 126 个套件、4,723 项测试，
另有 2 个套件、17 项按原有配置跳过。本轮检查包括：

- `npm run localization:check`：42,140 条新增译文及原有语言的结构检查通过。
- `npm run localization:test`：3 项 Node 和 11 项 Python 测试通过。
- 语言、术语及 RTL 的 3 个 Jest 套件：88 项通过。
- 新增阿拉伯语、韩语、繁体中文的全部五级课程标题测试：3 项通过。
- 提示实验室专项：1,232 项通过。
- 最新全量运行中，课程页面及全部 24 语种动画测试通过；没有更改超时或新增跳过。
- Android 原生方向策略单元测试 4 项通过。
- 类型检查、修改的 TypeScript 文件格式检查通过；lint 无错误，14 项既有警告。
- 教学目录重建并验证：100 节课、40 种技巧；预览目录 3 节课；
  `npm run lessons:test` 的 11 项测试通过。

短于上述阈值的教学／提示句子并非全部逐句阅读；其覆盖来自核心概念复核、
问题线索检查、术语约束、实际回调验证及抽样阅读。仍可能存在未发现的语气、
屈折、地区偏好或翻译问题。若以后发现会改变逻辑条件的译文，应修正源条目和
相关同源句，再复跑对应检查，不能用这次结论覆盖新的已知缺陷。

## Draft provenance and implementation

The user authorized sending app display copy to Google Translate. Draft requests
contain no player records or personal data. Ambiguous prose was sent as separate
complete sentences with protected variables and Sudoku symbols, then corrected
locally. Rate limiting stopped further requests; remaining drafting and corrections
were done locally. Traditional Chinese was rebuilt from the existing Simplified
Chinese editorial copy with ICU conversion and subsequent corrections.

The app bundles static JSON and makes no translation-service requests. Draft and
review tools are developer-only. Explicit corrected copy and terminology are checked
against the catalogs so regeneration cannot silently restore old mistakes.
`npm run check` includes localization validation.

## Native direction verification

Arabic prose, root layout, modals, navigation arrows, coordinate isolation and the
fixed 1–9 keypad order have unit tests. Android disables automatic physical
left/right style swapping before React Native starts. Arabic paragraphs use natural
text alignment with RTL writing direction: explicit right alignment in React Native
0.87 incorrectly flipped alignment in the native inspection and was corrected.

The Android debug APK compiled and installed. A separate read-only API 35 7-inch
tablet emulator, with English system language and Arabic app language, was used
without changing the connected phone or existing player data. Earlier checks covered
home, language selection, difficulty modal, game and fixed LTR keypad; this review
also inspected Arabic concept prose with an unchanged LTR candidate diagram.
A catalog containing the revised headings and labels was loaded again to verify the localized level heading,
candidate labels and worked-example action in the course directory/concept hub.

This is targeted native verification. It does not establish acceptance of all 24
languages on every device, Arabic as the system locale, accessibility, or TV/desktop
layouts. Those device checks are separate from this AI language decision.

## Alpha submission — 2026-10-09

The user authorized Git commit followed by Google Play release. App source and
the existing device-support baseline were committed on shared `main` as
`c183b19` (`Add 24 languages and retain device support`). Independent website,
feedback-monitor and referral-design changes were left outside the commit.

Built the signed AAB with `HSP_VERSION_CODE=12 HSP_VERSION_NAME=1.0.10
HSP_CLOSED_BETA_PREMIUM=1 ./gradlew :app:bundleRelease :app:testDebugUnitTest
--max-workers=1` from `android/`. Build and four Android tests passed. The upload
certificate matches the previous bundle; JAR signature verification passed.
All four ABIs contain the hint JNI bridge, SQLite and Nitro libraries. All 38
64-bit native libraries satisfy 16KB ELF load-segment alignment. R8 mapping and
native symbols are embedded; shipped `content.sqlite` matches the current
content-v4 database. Closed-beta Premium remains enabled.

Uploaded version **1.0.10 (12)** to the existing **Closed testing — Alpha** track,
release name `1.0.10 closed beta - 24 languages`, rollout **100%**. The Console
preview showed Ready to release and zero newly unsupported devices in every
category. Phone 12,345, tablet 6,783, TV 3,065 and Chromebook 77 remain unchanged;
these counts do not establish dedicated TV/PC store acceptance or opt-in.

Submitted the one Alpha release change. Publishing overview confirms **Changes
in review**, with Google's quick checks still running. Managed publishing remains
off, so successful checks and approval allow automatic release to existing
testers. Submission is not approval and does not mean testers already received
1.0.10. No tester-list, country, opt-in-link, signing or device-category switch was
changed. Before and after submission, the Dashboard showed **12 testers continuously opted in for 6 days**;
the production-access application remains disabled.
