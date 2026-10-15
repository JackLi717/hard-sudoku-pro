# Platon Sudoku 当前商店文案与素材

更新日期：2026-10-16

## 22 种语言已统一上传并提交审核

2026-10-16 10:22 AEDT：22种语言的66个文案字段和88张手机成图已上传、保存并提交Google Play审核。后台确认 **Changes in review**，提交时快速检查正在运行；不据此写审核通过或已生效。队列共26项且全部为Store listings：20种新增语言，以及德语／韩语各自短描述、长描述、手机截图三项更新。英语与日语未进入本次变更清单，保留现有资料。

重载后台逐语言核对后，66个字段的字符数及UTF-16LE字节FNV-1a 64位指纹与Git原稿一致；每种语言四张图的数量与顺序均通过。批量AI导入曾使法语／俄语长描述出现少量字符差异，送审前已恢复为3996／3391字符原稿并再次核对。88张上传文件与已提交成图SHA-256一致，只在上传文件名加语言代码防止混用。逐语言读取未出现促销关键词警告；没有因此承诺搜索或推荐结果。现有图标、宣传横图及其AI标记、英／日资料和其他设备素材保留。

提交后只读仪表板显示Closed testing为Active，12名测试者已连续加入12天；Production仍为Inactive。未上传构建、改变包名／签名、名单、加入链接、地区或测试轨道，闭测继续运行。审核结果仍需以Google后续状态为准。

[审核状态凭证](../../../.local/google-play/listing/multilingual-review.png) · [闭测运行凭证](../../../.local/google-play/listing/multilingual-closed-test.png)。每种语言assets.json的upload记录包含上传文件名、SHA-256、核对方法和送审范围。以下全量表为当前资料入口；其后的制作和逐轮记录保留为历史。

## 24 种应用语言全量资料

2026-10-16 按应用现有24种语言完成整套ASO候选资料。本轮补齐俄语、简体中文、越南语、印地语、乌克兰语、罗马尼亚语、芬兰语、阿拉伯语、土耳其语、泰语、波兰语、荷兰语、马来语、菲律宾语，共14种。每种都有可上传文案、六款竞品词表JSON／CSV、三张真实原图和四张排版成图，本轮新增56张成图。所有语言均突出无强制广告、充足提示与奖励，其他真实相关表达在后段保留。

“全部”指应用当前支持的24种语言，不扩展到所有Google Play地区变体。商店语言代码参照[Google官方清单](https://support.google.com/googleplay/android-developer/answer/9844778?hl=en)；应用zh-Hans／zh-Hant对应zh-CN／zh-TW，其他地区代码按下表。英／日已在本轮回读核对并保持原资料；其余22种优化稿已统一上传并提交审核。完整当前状态见上节；没有构建或闭测轨道变更。

下表统计对象为各语言选定词项，包含相关产品延伸及研究排除项；“观察／覆盖”分别为在样本正文出现的词项数、在当前文案精确出现的词项数。嵌套表达可重叠，均不代表搜索量、独立查询数、国家下载排行或收录保证。

| 语言／商店代码 | 词表：总数／观察／覆盖 | 标题／短描述／长描述字符 | 文案／词表／四图 | 优化稿状态 |
| --- | --- | --- | --- | --- |
| 英语 en-GB | 75／57／63 | 30／79／3935 | [文案](en-GB.json) · [JSON](en-GB-keywords.json) · [CSV](en-GB-keywords.csv) · [总览](../../../.local/google-play/listing/en-GB/screenshots/phone/composed/overview.png) · [图清单](en-GB-assets.json) | 保留现有资料，本轮未改 |
| 日语 ja-JP | 76／65／71 | 22／57／2174 | [文案](ja-JP.json) · [JSON](ja-JP-keywords.json) · [CSV](ja-JP-keywords.csv) · [总览](../../../.local/google-play/listing/ja-JP/screenshots/phone/composed/overview.png) · [图清单](ja-JP-assets.json) | 保留现有资料，本轮未改 |
| 德语 de-DE | 86／65／80 | 24／76／3925 | [文案](de-DE.json) · [JSON](de-DE-keywords.json) · [CSV](de-DE-keywords.csv) · [总览](../../../.local/google-play/listing/de-DE/screenshots/phone/composed/overview.png) · [图清单](de-DE-assets.json) | 已上传，Changes in review |
| 韩语 ko-KR | 110／80／101 | 22／61／2767 | [文案](ko-KR.json) · [JSON](ko-KR-keywords.json) · [CSV](ko-KR-keywords.csv) · [总览](../../../.local/google-play/listing/ko-KR/screenshots/phone/composed/overview.png) · [图清单](ko-KR-assets.json) | 已上传，Changes in review |
| 法语 fr-FR | 88／56／82 | 29／79／3996 | [文案](fr-FR.json) · [JSON](fr-FR-keywords.json) · [CSV](fr-FR-keywords.csv) · [总览](../../../.local/google-play/listing/fr-FR/screenshots/phone/composed/overview.png) · [图清单](fr-FR-assets.json) | 已上传，Changes in review |
| 西班牙语 es-ES | 128／99／106 | 30／80／3993 | [文案](es-ES.json) · [JSON](es-ES-keywords.json) · [CSV](es-ES-keywords.csv) · [总览](../../../.local/google-play/listing/es-ES/screenshots/phone/composed/overview.png) · [图清单](es-ES-assets.json) | 已上传，Changes in review |
| 巴西葡萄牙语 pt-BR | 131／97／114 | 28／77／3988 | [文案](pt-BR.json) · [JSON](pt-BR-keywords.json) · [CSV](pt-BR-keywords.csv) · [总览](../../../.local/google-play/listing/pt-BR/screenshots/phone/composed/overview.png) · [图清单](pt-BR-assets.json) | 已上传，Changes in review |
| 繁体中文 zh-TW | 154／111／132 | 18／60／1781 | [文案](zh-TW.json) · [JSON](zh-TW-keywords.json) · [CSV](zh-TW-keywords.csv) · [总览](../../../.local/google-play/listing/zh-TW/screenshots/phone/composed/overview.png) · [图清单](zh-TW-assets.json) | 已上传，Changes in review |
| 意大利语 it-IT | 133／116／106 | 30／80／3993 | [文案](it-IT.json) · [JSON](it-IT-keywords.json) · [CSV](it-IT-keywords.csv) · [总览](../../../.local/google-play/listing/it-IT/screenshots/phone/composed/overview.png) · [图清单](it-IT-assets.json) | 已上传，Changes in review |
| 印尼语 id | 143／129／110 | 30／74／3998 | [文案](id.json) · [JSON](id-keywords.json) · [CSV](id-keywords.csv) · [总览](../../../.local/google-play/listing/id/screenshots/phone/composed/overview.png) · [图清单](id-assets.json) | 已上传，Changes in review |
| 俄语 ru-RU | 83／58／66 | 21／77／3391 | [文案](ru-RU.json) · [JSON](ru-RU-keywords.json) · [CSV](ru-RU-keywords.csv) · [总览](../../../.local/google-play/listing/ru-RU/screenshots/phone/composed/overview.png) · [图清单](ru-RU-assets.json) | 已上传，Changes in review |
| 简体中文 zh-CN | 105／86／81 | 18／55／1293 | [文案](zh-CN.json) · [JSON](zh-CN-keywords.json) · [CSV](zh-CN-keywords.csv) · [总览](../../../.local/google-play/listing/zh-CN/screenshots/phone/composed/overview.png) · [图清单](zh-CN-assets.json) | 已上传，Changes in review |
| 越南语 vi | 82／65／65 | 25／78／3026 | [文案](vi.json) · [JSON](vi-keywords.json) · [CSV](vi-keywords.csv) · [总览](../../../.local/google-play/listing/vi/screenshots/phone/composed/overview.png) · [图清单](vi-assets.json) | 已上传，Changes in review |
| 印地语 hi-IN | 79／62／62 | 21／71／2947 | [文案](hi-IN.json) · [JSON](hi-IN-keywords.json) · [CSV](hi-IN-keywords.csv) · [总览](../../../.local/google-play/listing/hi-IN/screenshots/phone/composed/overview.png) · [图清单](hi-IN-assets.json) | 已上传，Changes in review |
| 乌克兰语 uk | 76／55／60 | 21／73／3178 | [文案](uk.json) · [JSON](uk-keywords.json) · [CSV](uk-keywords.csv) · [总览](../../../.local/google-play/listing/uk/screenshots/phone/composed/overview.png) · [图清单](uk-assets.json) | 已上传，Changes in review |
| 罗马尼亚语 ro | 75／58／55 | 28／79／3261 | [文案](ro.json) · [JSON](ro-keywords.json) · [CSV](ro-keywords.csv) · [总览](../../../.local/google-play/listing/ro/screenshots/phone/composed/overview.png) · [图清单](ro-assets.json) | 已上传，Changes in review |
| 芬兰语 fi-FI | 71／50／56 | 27／78／3273 | [文案](fi-FI.json) · [JSON](fi-FI-keywords.json) · [CSV](fi-FI-keywords.csv) · [总览](../../../.local/google-play/listing/fi-FI/screenshots/phone/composed/overview.png) · [图清单](fi-FI-assets.json) | 已上传，Changes in review |
| 阿拉伯语 ar | 75／51／64 | 21／73／2735 | [文案](ar.json) · [JSON](ar-keywords.json) · [CSV](ar-keywords.csv) · [总览](../../../.local/google-play/listing/ar/screenshots/phone/composed/overview.png) · [图清单](ar-assets.json) | 已上传，Changes in review |
| 土耳其语 tr-TR | 78／52／60 | 29／74／3138 | [文案](tr-TR.json) · [JSON](tr-TR-keywords.json) · [CSV](tr-TR-keywords.csv) · [总览](../../../.local/google-play/listing/tr-TR/screenshots/phone/composed/overview.png) · [图清单](tr-TR-assets.json) | 已上传，Changes in review |
| 泰语 th | 78／57／62 | 21／61／2406 | [文案](th.json) · [JSON](th-keywords.json) · [CSV](th-keywords.csv) · [总览](../../../.local/google-play/listing/th/screenshots/phone/composed/overview.png) · [图清单](th-assets.json) | 已上传，Changes in review |
| 波兰语 pl-PL | 79／57／60 | 25／75／3146 | [文案](pl-PL.json) · [JSON](pl-PL-keywords.json) · [CSV](pl-PL-keywords.csv) · [总览](../../../.local/google-play/listing/pl-PL/screenshots/phone/composed/overview.png) · [图清单](pl-PL-assets.json) | 已上传，Changes in review |
| 荷兰语 nl-NL | 83／63／64 | 28／74／3280 | [文案](nl-NL.json) · [JSON](nl-NL-keywords.json) · [CSV](nl-NL-keywords.csv) · [总览](../../../.local/google-play/listing/nl-NL/screenshots/phone/composed/overview.png) · [图清单](nl-NL-assets.json) | 已上传，Changes in review |
| 马来语 ms | 79／68／59 | 24／75／3292 | [文案](ms.json) · [JSON](ms-keywords.json) · [CSV](ms-keywords.csv) · [总览](../../../.local/google-play/listing/ms/screenshots/phone/composed/overview.png) · [图清单](ms-assets.json) | 已上传，Changes in review |
| 菲律宾语 fil | 77／55／60 | 25／75／3295 | [文案](fil.json) · [JSON](fil-keywords.json) · [CSV](fil-keywords.csv) · [总览](../../../.local/google-play/listing/fil/screenshots/phone/composed/overview.png) · [图清单](fil-assets.json) | 已上传，Changes in review |

### 本轮14种语言的研究与校对

以下记录为上传前的本地制作阶段；最新上传和审核状态以上节及全量表为准。

每种语言均按Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation六款公开Google Play说明取样；这是固定国际竞品样本，未冒充当地流行度排行。累计1120个语言内词项，其中837项在竞品正文实际出现，874项被当前文案精确覆盖。所有选定且符合产品事实的相关表达均已覆盖；未支持的功能／效果承诺和重复错拼簇只保留研究记录。生硬但相关的实际表达，如俄语кроссворд судоку、芬兰语keskikokoinen Sudoku、波兰语twarde Sudoku和荷兰语harde Sudoku，仍在后段保留并关联本产品含义。公开说明前段优先说清经典9×9数独、无强制广告和提示奖励。

逐词记录出现应用数、各来源次数、文案次数、放置字段、处理理由与来源URL。只统计真实说明正文及可读取公开短描述；不计标题、标签、评价、截图、相关应用或外链网页。直接HTTPS补充读取只取主应用description字段，排除相关应用数据。原文没有静默翻译或与另一缓存版本拼接；正文中的网址／邮件文字原样参与统计。NFC、大小写、空白、撇号和连接号统一；中文／泰语按连续子串，其余按Unicode字母、组合标记和数字边界，土耳其语另处理I／İ。保留词形、重音、连字符和同义词区别，不能把统计次数理解成搜索量。

语言参数不等于实际语言：乌克兰语Andoku、罗马尼亚语Brainium、菲律宾语Oakever／GamoVation当前读取正文为英语；马来语Andoku为印尼语；芬兰语Easybrain大部分为芬兰语，难度段含丹麦语。各来源逐条注明回退和读取方式，不声称六份全是该语种母语文案。简体中文来源使用zh_CN／zh-CN／zh参数，均按实际简体正文计数。

术语先依据各语言竞品实际用法，再核对APK可见难度、笔记和提示。俄／芬／阿／土／泰／波／荷另对照Sudoku.name对应语言规则；其他七种仅用英语规则核对数独语义，不称其为当地术语证据。来源见各语言keywords.json的terminologySources，规则资料不计入六款分母。已完成语言和事实自行校对，未声称独立母语专家审核。

### 权益与截图事实

全部新文案保留：首次安装5+首次日奖3=8；按设备当地日历连续七天打开，3／3／5／5／5／10／10，最多41，循环七日；漏日重置序列但已得余额保留；余额上限99，溢出不储存或补发；每三道不同新题首次完成+1；自愿且有效激励广告+5，须联网并受地区可用性影响；新展示的有效提示扣1，重读同一解释不重复扣除。核心游戏／提示／复盘可离线且无需账号，广告／购买／恢复等流程可需联网。无限提示与完全无广告仅限可选一次性Lifetime Premium，无订阅；免费自动候选不限次、可编辑，重新生成有确认。依据[商业方案](../../premium-reward-design.md)，不把闭测999测试额度写入公众宣传。

四图顺序统一为无强制广告 → 充足每日提示 → 提示讲清理由 → 可编辑自动候选。沿用用户授权的官方adb，在全新独立API35模拟器安装现有1.0.16（19）APK，通过可见设置逐一切换语言；未改源码或重建APK。三张原图均为真实1080×1920画面，使用同一道未填数棋局；真实提示为Naked Single，R6C8仅剩7，保留应用自身技术标题省略号。第二、四图复用真实候选棋盘，不冒充奖励页。仅裁系统栏并等比缩放，加界面外文字；阿拉伯语连接字形与右对齐、印地语与泰语字体均已目视核对。第二图注明连续打开、99上限和漏日重置。罗马尼亚语候选图已重拍，排除生成中的加载画面。

检查通过：6720个来源／词项组合独立重算，JSON／CSV／文案字段覆盖一致；14套标题30／短描述80／长描述4000及alt text限制；56张1080×1920、24-bit RGB、非空真实界面及文字边界检查；14份总览逐张目视核对。APK哈希与安装1.0.16（19）核对，218份既有商店素材及51份既有修改文件哈希未变；渲染器语法与Git空白检查通过。独立临时模拟器拍摄后关闭；实体设备与已有模拟器数据未操作。只提交本轮ASO资料、必要渲染器支持和状态文档，其他功能修改保留。以下各语言历史记录保留，当前全量状态以本表为准。

## 印尼语本地优化稿（待后续统一上传）

2026-10-16 完成印尼语id文案、竞品词表和四张真实界面图。[当前文案](id.json)标题为 `Platon Sudoku: Teka-teki Angka`（30字符），短描述为 `Tanpa iklan paksa. Banyak petunjuk dan hadiah harian. Main sudoku offline.`（74字符），长描述3998字符。前置无强制广告、充足提示与每日奖励，次要表达放在功能及后段常见问题中；依据当地实际资料写作，没有直接翻译英语。

[词表JSON](id-keywords.json)／[CSV](id-keywords.csv)共143项，129项在六款竞品说明中出现，当前文案精确覆盖110项，108项含空格。六款沿用Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，均使用hl=id。不是印尼下载排行榜，也不据语言参数断言内容仅在印尼展示。Oakever实际读取的缓存页面标注2025-09-29更新，如实记录，不声称为最新版本。只统计Tentang game ini到Diupdate pada之间说明，含公开短描述；标题、标签、评价、截图、关联应用和外链网站不计，正文URL／邮件文字原样保留。NFC／大小写／空白／撇号／连接号统一后，以Unicode字母数字边界计连续完整表达；保留连字符、词形和同义词，嵌套词可重叠。次数不是搜索量、独立查询数或收录保证。

| 实际表达 | 出现应用数／6 | 文案安排 |
| --- | --- | --- |
| sudoku klasik | 3 | 开头品类 |
| teka-teki sudoku | 6 | 题库与产品说明 |
| teka-teki angka／puzzle sudoku | 各3 | 标题和后段品类 |
| sudoku mudah／sedang／sulit | 3／2／1 | 实际难度 |
| sudoku keras／sudoku ahli | 各1 | 保留别称，说明对应Sulit／Pakar |
| tingkat kesulitan／level kesulitan | 5／2 | 五档选择 |
| offline／sudoku offline | 3／1 | 短描述与联网边界 |
| petunjuk／petunjuk cerdas | 4／2 | 核心提示卖点 |
| catatan／mode catatan／mode pensil | 6／1／1 | 笔记与候选 |
| memo／not | 各1 | 后段保留实际笔记别称 |
| isi catatan otomatis／hapus catatan otomatis | 各1 | 自动候选工具 |
| simpan otomatis／penyimpanan otomatis | 各2 | 保存与继续 |
| statistik permainan／statistik sudoku personal | 2／1 | 真实记录功能 |
| tema gelap／mode gelap／mode Terang/Gelap | 各1 | 主题选择 |
| teknik penyelesaian／langkah demi langkah | 各1 | 提示讲解 |
| hadiah harian／hint gratis | 各1 | 提示奖励与额度 |

生硬但相关的sudoku keras、teka-teki gratis sudoku、permainan papan sudoku gratis、not、9x9 grid等仍保留。无强制广告、无需账号、候选数和极限难度等零样本词标为产品延伸，不冒充竞品高频词。sudoku otak／game otak仅表达休闲类型偏好，memori只说明笔记不必全部记住，不宣传认知改善。

28项涉及专用每日题／季节活动、无限撤销／独立重做／无限题库、云同步／社交／题目导入、六种变体、健康或认知效果、网页版本与外部题目求解器，只留研究表；另五项实际错拼sodoku／soduku／suduku／sedoku／sudoko记录来源和次数，不在正文堆成错拼清单，不声称它们无流量。术语对照Sudoku.name直接读取的印尼语规则，以及Sudoku Slate可读取的索引规则／候选指南（直接打开失败，来源注明），不混入六应用分母，不称独立母语审核。实际APK五档为Mudah、Sedang、Sulit、Pakar、Ekstrem。

完整保留首装5+首日3=8、连续七天打开3/3/5/5/5/10/10最多41、当地日历、漏日重置但余额保留、99上限／溢出不补发、三道不同新题首通+1、自愿有效广告+5及联网／地区可用性条件。无限提示和完全无广告限定可选一次性Lifetime Premium、无订阅；自动候选免费不限次，不宣传999闭测测试额度。

[四图清单](id-assets.json)／[图片总览](../../../.local/google-play/listing/id/screenshots/phone/composed/overview.png)：无强制广告 → 充足每日提示 → 讲清理由 → 可编辑自动候选。沿用已授权官方adb，在全新独立API35模拟器安装现有1.0.16（19）APK，通过可见设置选择Bahasa Indonesia，拍摄三张真实1080×1920原图。提示为Posisi Tunggal（Hidden Single）的第二步解释：第4、5行排除方块4中的其他位置，只剩R6C1可以填3。保留应用自身技术标题省略号。奖励与笔记两张复用真实候选棋盘，只裁系统栏、等比缩放、加界面外文字，不重绘UI，不冒充奖励页。第二图注明每日打开、99上限及漏日重置。临时模拟器已关闭，实体设备与已有模拟器数据未操作。

检查通过：858个来源／词项组合独立重算、110覆盖／28功能效果排除／五错拼清单排除、CSV与JSON一致、30／74／3998字符及alt text限制、四图1080×1920／24-bit RGB／非空UI／标题文字边界／总览目视核对、Python语法、APK哈希与安装版本、Git空白检查。145份既有商店JSON／CSV／PNG及51份既有修改文件校验和未变。本轮只提交印尼语ASO资料与必要素材工具支持，其他功能修改保留。未打开或操作Play Console、上传、保存后台或提交／重启审核；其他语言和现有闭测不动，留待统一上传。英／日只沿用此前审核记录，不声称新状态。

## 意大利语本地优化稿（待后续统一上传）

2026-10-16 完成意大利语it-IT文案、六款竞品词表与四张手机图。[当前文案](it-IT.json)标题为 `Platon Sudoku: Puzzle classici`（30字符），短描述为 `Senza pubblicità forzata. Tanti suggerimenti e premi quotidiani. Sudoku offline.`（80字符），长描述3993字符。无强制广告、充足提示与每日奖励前置，相关同义词和生硬但真实的表达放在后段功能与常见问题中；按意大利语实际资料写作，没有直接翻译英文。

[词表JSON](it-IT-keywords.json)／[CSV](it-IT-keywords.csv)共133项，116项在六款说明正文中出现，当前文案精确覆盖106项，96项含空格。样本沿用Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，全部使用hl=it；不是意大利下载排行榜，也不能据语言参数断言内容仅在意大利展示。只统计Informazioni sul gioco至Ultimo aggiornamento之间说明，含公开短描述；不计标题、标签、评价、截图、关联应用及外链网站，正文URL／邮件文字原样保留。NFC、大小写、空白、撇号与连接号统一，以Unicode字母／数字边界统计连续完整表达；保留重音、词形和同义变体，嵌套词可重叠。次数不是搜索量、独立查询数或收录保证。

| 实际表达 | 出现应用数／6 | 文案安排 |
| --- | --- | --- |
| sudoku classico | 3 | 开头品类 |
| puzzle di sudoku／puzzle sudoku | 各3 | 题库与后段说明 |
| sudoku facile／medio／difficile／esperto | 3／2／2／1 | 实际五档难度 |
| livelli di difficoltà | 5 | 难度段落 |
| offline | 3 | 短描述与联网边界 |
| suggerimenti／suggerimenti intelligenti | 4／2 | 提示主卖点 |
| note／appunti | 6／3 | 自动候选与手写笔记 |
| modalità Note／modalità matita | 各1 | 工具同义表达 |
| riempimento automatico delle note | 1 | 免费不限次自动候选 |
| tecniche di risoluzione／tecniche di soluzione | 各1 | 分步逻辑解法 |
| salvataggio automatico／salva automaticamente | 3／1 | 保存与继续 |
| statistiche di gioco／statistiche personali | 2／1 | 实际记录功能 |
| modalità oscura／modalità Chiaro/Scuro／tema scuro | 各1 | 主题选择 |
| premi giornalieri | 1 | 提示奖励条件 |
| gioco di puzzle numero Sudoku | 1 | 后段保留生硬的品类表达 |

无强制广告、候选数、自动笔记、离线同义表达等零样本词明确标为真实产品延伸。memoria只解释笔记不必全记住，不承诺认知改善。22项涉及每日专用题、云同步、排行榜、六种变体、无限撤销／独立重做、健康效果、网页版本或外部题目求解器，只留研究记录；另五种实际错拼sodoku／soduku／suduku／sedoku／sudoko记录来源和次数，不在正文堆成错拼清单，不声称它们没有流量。

术语核对使用Easybrain意大利语规则、Singoli ovvi／Singoli nascosti技术说明，以及GiocaSudoku.it的已索引规则正文（直接打开失败，读取方式在来源中注明）；这些资料不计入六款应用分母。不采用网站按给定数划分难度或认知效果的说法，也不把资料对照称为独立母语者审核。实际界面五档为Facile、Medio、Difficile、Esperto、Estremo。

奖励完整写明首装5+首日3=8、连续七天打开3/3/5/5/5/10/10最多41、当地日历、漏日重置但保留余额、99上限和溢出不补发、三道不同新题首次完成+1、自愿有效广告+5及联网／可用性条件。完全无广告和无限提示限定可选Lifetime Premium一次性购买、无订阅；自动候选免费不限次，不宣传999闭测额度。

[四图清单](it-IT-assets.json)／[图片总览](../../../.local/google-play/listing/it-IT/screenshots/phone/composed/overview.png)：无强制广告 → 充足每日提示 → 讲清理由 → 可编辑自动候选。沿用已授权的官方adb方法，在全新独立API35模拟器安装现有1.0.16（19）APK，通过可见设置选择Italiano，拍摄三张真实1080×1920原图。逻辑提示为Singolo Nudo（Naked Single），R6C8排除其他数字后只剩8。奖励与候选图复用真实候选棋盘；只裁系统栏、等比缩放、加界面外文字，不冒充奖励页、不重绘UI。保留应用自身技术标题省略号。第二图明确每日打开、余额99上限及漏日重置。模拟器已关闭，实体设备与已有模拟器数据未操作。

检查通过：798个来源／词项组合独立重算、106覆盖／22功能效果排除／五错拼清单排除、CSV与JSON一致、字段及alt text长度、四图24-bit RGB／非空UI／文字边界／总览目视核对、Python语法和Git空白检查。134份既有商店JSON／CSV／PNG及另核对的51份既有修改文件校验和未变。此前八种语言的ASO资料已提交为 `b5e4cdc`；本轮意大利语独立提交。没有打开或操作Play Console、上传、保存后台、提交／重启审核，也未改源码、奖励、APK或任何发行配置。其他语言与现有闭测不动，待后续统一上传；英／日只沿用此前审核记录，不声称新状态。

## 繁体中文本地优化稿（待后续统一上传）

2026-10-16 本轮继续主要语言，完成繁体中文zh-TW文案、竞品词表与四张手机图，留待后续与德／韩／法／西／巴西葡语统一上传。[zh-TW.json](zh-TW.json) 标题为 `Platon Sudoku：經典數獨`（18字符），短描述为 `離線數獨，無強制廣告。充足提示與慷慨每日獎勵：連續開啟7天最多41次，首次安裝共8次。看懂解題理由，候選筆記可自由編輯。`（60字符）；长描述1781字符。获客卖点前置，次要用词放在功能与常见问题中；按繁体资料写作，没有逐字翻译英语或只把简体字转换成繁体。

### 繁体中文实际用词与长尾覆盖

[词表JSON](zh-TW-keywords.json)／[CSV](zh-TW-keywords.csv)共154个词项，111个在六款说明正文中出现，文案精确覆盖132个。152项超过一个字符，但不代表152个独立长尾搜索；含单字锚点、嵌套短语、同义词和产品延伸，不做搜索量或排名推断。

样本沿用Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，不称为台湾下载排行榜。五款使用hl=zh_TW，Andoku下划线参数页面不可读取，改为可读取的hl=zh-TW繁体页面。Andoku搜索结果中的说明与实际打开页面不同，只统计实际打开的526字符正文，没有合并两份或把较新搜索片段加入计数。缓存及地区差异如实保留，语言参数也不能证明内容台湾独占。

统计只取「關於這個遊戲」到「更新日期」之间说明，含公开短描述，不计标题、标签、评价、截图、关联应用和外链网站。正文URL／邮件文字原样保留，未访问其目标。NFC、空白统一、拉丁字母忽略大小写后连续子串计数；中文不做分词，同义词及简繁写法不合并。嵌套词可重叠，「行／列」还可能命中「行動／進行」等词，作为单字锚点记录，不能当作几何术语出现率或独立搜索需求。完整竞品正文不另存。

| 实际表达 | 出现应用数／6 | 当前安排 |
| --- | --- | --- |
| 經典數獨 | 4 | 标题与开头 |
| 數獨遊戲 | 3 | 品类说明 |
| 數獨益智遊戲 | 5 | 后段常见问题 |
| 數獨謎題 | 5 | 题库 |
| 數獨初學者 | 3 | 难度说明 |
| 簡單數獨／困難數獨 | 各3 | 五档难度 |
| 中等數獨／專家數獨 | 各2 | 五档难度 |
| 離線 | 3 | 主卖点及边界 |
| 智慧提示系統／智能提示 | 各1 | 同义提示表达 |
| 數獨技巧 | 3 | 逐步解法 |
| 筆記 | 3 | 自动候选 |
| 註記／註釋／備註 | 各1 | 后段笔记用途 |
| 筆記模式／記事模式／鉛筆模式 | 各1 | 相关工具描述 |
| 自動儲存／自動保存 | 各2 | 保存与继续 |
| 統計資料／統計資訊／統計數據 | 各1 | 真实记录功能 |
| 深色模式 | 2 | 主题选择 |
| 黑夜模式 | 1 | 保留生硬但相关写法 |

相关真实表达不因语言不够漂亮而删去，保留智慧提示／智能提示、笔记同义词、不同统计与保存说法，以及复盘／重播／回放等。零样本命中的无强制广告、慷慨奖励、候选数、免注册等如实标为产品延伸，不冒充竞品高频词。數學益智遊戲、腦力遊戲、腦力數獨只表达休闲类型偏好；記憶力只用于笔记不用全记住的语境，不承诺认知改善。

22项只留研究记录：19项涉及每日专用题、排行榜、云同步、六种变体、无限撤销／独立重做、记忆力改善或护眼效果，当前不作产品承诺。「數獨日報」确实出现，但不能把每日提示奖励写成每日新题服务。另三项sedoku／sudoko／Soduku为实际错拼，沿用前轮方法保留来源和次数，不在商店正文堆成错拼清单，不断言这些词没有搜索量。

术语对照[台灣數獨發展協會网站所收录的數獨樂園](https://www.sudoku.org.tw/sumain.htm)及其[直观解题原始说明](https://www.sudoku.org.tw/sudokuSlove.htm)，不计入六应用分母。两页为历史术语参考，不作为当代市场流量证据，也不照搬其解题器保证或主观方法评语。规则写清「橫列、直行、九宮格」，候选用「候選數／候選數字」，主提示用「智慧提示」，并保留相关智能提示用词。实际应用五档为簡單、中等、困難、專家、極限。此为资料及语义核对，不称独立母语者或外聘专家审核。

### 繁体真实截图与奖励核对

[素材清单](zh-TW-assets.json)及[四图总览](../../../.local/google-play/listing/zh-TW/screenshots/phone/composed/overview.png)顺序为：无强制广告 → 充足每日提示 → 解释理由 → 可编辑自动候选。沿用此前授权的官方adb方法，在独立临时API35模拟器安装现有1.0.16（19）APK，通过可见设置选择「繁體中文」并操作真实棋局，拍摄三张1080×1920原图。没有改源码、重建APK或操作实体设备及已有模拟器数据。

四张最终图为1080×1920、24-bit RGB PNG；只裁Android系统栏（上63像素，应用区1794像素）、等比缩放并加界面外说明，繁体标题使用已核对可用的Heiti TC字体。第二／四图复用真实候选棋局，不冒充应用奖励页；保留应用中的真实技术名和界面文字，提示图完整显示「唯一候選數 (Naked Single)」，不重绘UI，不使用AI位图。

长文与图中奖励一致：首次5+首日3=8；连续七天打开3/3/5/5/5/10/10最多41；漏一天重计周期，不扣已获额度；99余额上限、溢出不补发；三道不同新题首次完成+1；自愿有效广告+5并说明联网／地区／库存条件。完全无广告及无限提示限定可选Lifetime Premium一次性购买，无订阅；自动候选免费不限次，不宣传999闭测测试额度。

本轮只制作本地资料，不打开或操作Play Console，不上传、保存后台或提交／重启审核，不更改包、签名、地区、测试者、加入链接或轨道。现有闭测配置不动；英／日审核只沿用此前实际观察记录，不声称新状态。其他语言文案和图片保留原样，zh-TW成品留待统一上传。

验证通过：18／60／1781字符限制、154项六来源重算、独立覆盖计数、132覆盖／19功能效果排除／三错拼清单排除、JSON／CSV一致、四图规格／非空UI／文字像素边界／alt text、Heiti TC可用性及最终总览目视核对、Python语法和git diff --check。115份既有商店JSON／PNG及另核对的58份既有修改文件校验和未变（集合可重叠），临时模拟器已关闭。

## 巴西葡萄牙语本地优化稿（待后续统一上传）

2026-10-16 按用户指定完成巴西葡萄牙语pt-BR的文案、词表与四张手机图，留待后续与德／韩／法／西语统一上传。[pt-BR.json](pt-BR.json) 标题为 `Platon Sudoku: Jogo clássico`（28字符），短描述为 `Sudoku offline. Sem anúncios forçados. Dicas e recompensas diárias generosas.`（77字符），长描述3988字符。无强制广告和慷慨提示奖励前置，次要同义词和相关生硬表达放在后段功能及常见问题中。

### 葡语竞品实际用词与长尾覆盖

[词表JSON](pt-BR-keywords.json)／[CSV](pt-BR-keywords.csv)共131个词项，97个在样本实际出现，当前文案精确覆盖114个；92项含空格。含单词锚点、短语、词形与产品延伸，不把全部131项当作独立长尾查询或已验证流量词。

六款沿用Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation。Easybrain／Brainium／Guru／GamoVation使用hl=pt_BR页面；Oakever／Andoku的pt_BR页面读取失败，因此明确采用其hl=pt公开葡语正文补充。JSON每个来源均标注语言参数，不能称作六款均已验证为巴西专属文案，也不是按巴西下载排名选取。另用巴西游戏站Puzzled和Sudoku Brasil核对本地术语；网站不计入六应用分母。

范围仅为「Sobre este jogo」到「Atualizado em」之间说明，含页面提供的公开短描述，不计标题、标签、评价、截图、关联应用或链接网站。正文内原有URL／邮件文字仍属采样文本，未读取其目标页面。NFC、大小写、空白、弯直撇号及连接号统一，用Unicode字母／数字边界匹配连续完整表达；重音、单复数、同义词、offline／off-line等保持独立。嵌套匹配可重叠，缓存、地区和两种参数的混合样本影响解释。次数不是搜索量、排名、转化或收录保证，完整竞品正文不另存。

| 实际表达 | 出现应用数／6 | 当前安排 |
| --- | --- | --- |
| sudoku clássico | 3 | 主定位与开头 |
| sudoku em português | 1 | 后段本地语言说明 |
| sudoku grátis | 2 | 免费基础权益 |
| quebra-cabeças de sudoku | 2 | 题库与后段品类 |
| jogos numéricos | 1 | 后段同义表达 |
| enigmas de sudoku／puzzles sudoku | 各1 | 保留竞品相关写法 |
| iniciantes | 5 | 难度段落 |
| níveis de dificuldade | 5 | 实际五档标签 |
| offline | 2 | 短描述与离线能力 |
| off-line | 1 | 保留另一连接号写法 |
| dicas | 5 | 核心提示卖点 |
| dicas inteligentes | 2 | 分步逻辑提示 |
| técnicas de resolução／técnicas de solução | 各1 | 同义解法说明 |
| anotações／notas | 各4 | 可编辑候选工具 |
| preenchimento automático de anotações | 1 | 免费自动候选 |
| salvamento automático／salva automaticamente | 各2 | 保存与继续 |
| auto-save | 1 | 保留实际借词 |
| estatísticas | 5 | 真实统计功能 |

保留dicas／dica、anotações／notas／observações、quebra-cabeça／quebra-cabeças、jogo numérico／jogos numéricos、offline／off-line、técnicas de resolução／técnicas de solução等。产品延伸如sem anúncios forçados、recompensas diárias、candidatos rápidos、sem conta、sem cadastro的样本零命中如实记录，不冒充高频词。没有因为表达生硬而排除真实相关功能；memória仅说明不用记住全部候选，exercício mental／treino cerebral／jogo mental仅是休闲类型偏好，不承诺认知或健康改善。

17项只留研究记录：desafios diários、sudoku diário、quebra-cabeças diários、ranking、pontuações globais、sincronização na nuvem、Killer／Letras／X／Hyper／Percent／Color变体、三种无限撤销／重做说法、saúde mental、solucionador de sudoku。原因分别是没有确认专用每日题、排行榜、云同步、变体、无限撤销／独立重做、健康效果或任意外部题目求解器；每日提示奖励不能改称每日新题。

专业语义对照[Puzzled巴西规则](https://puzzled.com.br/articles/como-jogar-sudoku)、[候选及两种single](https://puzzled.com.br/articles/sudoku-candidatos-e-singles)与[Sudoku Brasil](https://sudokubrasil.com.br/)。使用grade、tabuleiro、casas／células、linha、coluna、bloco、anotações／candidatos；主提示用dicas。没有照搬按已给数数量概括难度或认知改善宣传。五档按实际Português (Brasil)界面为Fácil、Médio、Difícil、Especialista、Extremo。资料对照与语义审校不称独立母语者审核。

### 巴西葡语真实截图与权益核对

[素材清单](pt-BR-assets.json)及[四图总览](../../../.local/google-play/listing/pt-BR/screenshots/phone/composed/overview.png)顺序：无强制广告 → 慷慨每日提示 → 讲清理由 → 可编辑自动候选。沿用此前授权的官方adb方法，在独立临时API35模拟器安装现有APK，核对1.0.16（19），通过可见设置选择Português (Brasil)并操作真实棋局，拍摄三张1080×1920原图。没有改源码、重建APK或操作实体设备及既有模拟器数据。

最终四图为1080×1920、24-bit RGB PNG，只裁Android系统栏（上63像素、应用区1794像素）、等比缩放并加界面外说明。奖励与候选两图复用同一真实候选棋局，奖励说明不冒充应用奖励页；保留实际技术标题、省略号和界面文案，不重绘UI，不用AI位图。

奖励逐项对照现有规则：初次5+首日3=8；七天连续打开3/3/5/5/5/10/10最多41；漏一天重置周期但不扣已领余额；上限99、溢出不保留或补发；三道不同新题首次完成+1；自愿有效广告+5及地区／库存／联网条件。无限提示及完全无广告限定可选一次性Lifetime Premium，无订阅。自动笔记免费无限，不宣传闭测999测试额度。第二张图明确每日打开、99上限和漏日重置。

本轮仅本地制作，不打开或操作Play Console，不上传、保存后台或提交／重启审核，不改任何应用包、签名、地区、测试者、加入链接或轨道。现有闭测配置保持原状；英／日只沿用此前实际核对记录，不声称新审核状态。其他语言文案和图片保持原样，pt-BR成品留待统一上传。

验证通过：28／77／3988字符限制、131项六来源重算、独立覆盖计数、114覆盖／17排除、CSV与JSON一致、四图规格／非空UI／文字边界／alt text及总览目视核对、Python语法和git diff --check。104份既有商店JSON／PNG及另核对的58份既有修改文件校验和未变（集合可重叠）。临时模拟器已关闭。

## 西班牙语本地优化稿（待后续统一上传）

2026-10-16 本轮继续主要语言，完成西班牙语（西班牙，es-ES）文案、词表和四张手机图，留待与德／韩／法语统一上传。[es-ES.json](es-ES.json) 标题为 `Platon Sudoku: Puzles clásicos`（30字符），短描述为 `Sin anuncios forzados. Muchas pistas: hasta 41 en 7 días seguidos. Sin conexión.`（80字符）；长描述3993字符。前置无强制广告、慷慨提示奖励及核心离线，相关同义词和次要词放在功能说明及后段常见问题。es-419及其他语言本轮不改。

### 西语实际用词与长尾覆盖

[完整词表 JSON](es-ES-keywords.json)／[CSV](es-ES-keywords.csv) 共128项，99项在六款竞品说明中出现，文案精确覆盖106项；88项含空格。词项包含单词锚点、短语、词形变体及真实产品延伸，不全部视为独立长尾查询。样本沿用Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，六款的Google Play链接及逐项次数都在JSON中；不是按西班牙下载排名或搜索量选样。

Google Play页面使用hl=es，不能据此证明某段文案仅在西班牙展示；本轮以此研究西语措辞，准备es-ES本地稿。只取「Acerca del juego」到「Última actualización」间说明，含公开短描述，不计标题、标签、评价、截图、关联应用和外链。NFC、大小写、空白、弯直撇号及连接号统一后，以Unicode字母／数字边界匹配完整连续表达。保留重音、单复数和不同写法，嵌套词项可能重叠，页面缓存和地区也可能影响结果；出现率不代表搜索量、排名或收录保证。

| 实际表达 | 出现应用数／6 | 文案安排 |
| --- | --- | --- |
| sudoku clásico | 3 | 开头品类 |
| juego de sudoku | 3 | 后段常见问题 |
| rompecabezas sudoku | 3 | 后段品类说明 |
| puzles de sudoku | 2 | 保留与rompecabezas同义表达 |
| sudoku fácil／medio／difícil／experto | 各2 | 五档难度 |
| niveles de dificultad | 5 | 难度段落 |
| sin conexión | 1 | 短描述和离线说明 |
| sudoku fuera de línea／offline | 各1 | 保留生硬译法及英语借词 |
| pistas | 3 | 主要提示卖点 |
| sugerencias inteligentes | 1 | 分步逻辑提示 |
| técnicas de resolución／técnicas de solución | 各1 | 同义解法说明 |
| notas | 6 | 笔记与候选 |
| modo lápiz／modo de notas | 各1 | 候选工具 |
| llenado automático de notas | 1 | 免费自动候选 |
| guardado automático | 4 | 保存及继续 |
| estadísticas | 5 | 真实统计 |

竞品的pistas／sugerencias、puzle／puzles／rompecabezas、sudoku／sudokus、sin conexión／fuera de línea／offline、modo oscuro／tema oscuro均保留，较生硬的相关表达没有因为语言不够漂亮而删去。产品延伸如sin anuncios forzados、recompensas diarias、candidatos rápidos、sin cuenta等在样本零命中时如实标注。memoria只描述候选不用全记住，entrenamiento mental与juegos mentales仅是休闲游戏类型偏好，不承诺改善健康或记忆。

22项没有放进公开文案，仍完整留在研究表：17项涉及未确认的每日专用题目、排行榜、云同步、Killer／Letter／X／Hyper变体、无限撤销／独立重做、健康效果、网页客户端或任意外部题目求解器。另五项sodoku、soduku、suduku、sedoku、sudoko确实出现在Oakever正文，保留出现次数及来源。基于[Google元数据政策](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en)对重复关键词和词表的要求，本轮判断将这组连续错拼保留在研究表，避免在商店正文堆成错拼清单；不是因正常同义词生硬而排除，也不声称这些词无搜索量、Google必然自动纠错或一定导致拒审。

语言核对参考发行商[Easybrain西语规则与技巧](https://sudoku.com/es/reglas-del-sudoku/)、[初学者规则](https://sudoku.com/es/como-jugar/reglas-de-sudoku-para-principiantes/)和独立游戏站[Sudoku.com.es规则](https://sudoku.com.es/reglas-de-sudoku/)，这些网站不计入六应用分母。不沿用网站中按已给数字数量推断难度的泛化说法。使用casillas／celdas、fila、columna、bloque、notas／candidatos等实际术语；pistas为主，sugerencias作补充。难度按实际应用界面核对为Fácil、Medio、Difícil、Experto、Extremo。此为资料对照和语义审校，不称为独立母语者审核。

### 西语真实截图及奖励边界

[素材清单](es-ES-assets.json)和[四图总览](../../../.local/google-play/listing/es-ES/screenshots/phone/composed/overview.png)顺序为：无强制广告 → 充足每日提示 → 解释理由 → 可编辑自动候选。沿用此前已授权的adb真实截图方法，在独立临时API35模拟器安装现有APK，核对1.0.16（19），通过可见设置切换Español并操作实际棋局，拍摄三张真实1080×1920原图。没有改源码或重建APK，没有操作实体设备及已有模拟器数据。

四张最终图为1080×1920、24-bit RGB PNG；只裁Android系统栏（上63像素，应用区1794像素）、等比缩放，在界面外添加西语说明。奖励与自动候选两图复用真实候选棋局，不冒充奖励页面；提示图保留实际应用技术名及省略号，不重绘任何UI文字或数字。没有使用AI位图。

奖励逐项对照现有规则：初次5+首日3=8，七天连续打开3/3/5/5/5/10/10合计最多41，漏一天重置系列但保留余额，余额上限99、溢出不补发，三道不同新题首次完成+1，自愿有效广告+5并说明联网／地区／库存条件。完全无广告与无限提示限定可选Lifetime Premium一次性购买，无订阅；自动笔记免费无限，不宣传闭测999测试额度。截图明确每日打开、99上限及漏日重置条件。

本轮只制作本地材料，没有打开或改动Play Console、上传、保存后台或提交／重启审核；现有闭测、包、签名、地区、测试者和加入链接不动。英／日审核只沿用此前最后核对记录，没有新的状态声明。其他语言资料保留原状，西语与德／韩／法语待后续统一上传。

验证通过：30／80／3993字符限制、128行JSON／CSV一致、106覆盖及22项有理由的排除、六来源出现次数重算、四图规格／非空UI／文字像素边界／alt text、总览目视核对、Python语法及git diff --check。93份已有JSON和PNG校验和未变。临时模拟器已关闭；现有release元数据哈希对应AAB，截图APK哈希与安装版本另记素材清单。

## 法语本地优化稿（待后续统一上传）

2026-10-16 用户指定下一轮先做法语，文案、关键词与四张手机图已整理，暂存本地，待后续与德语、韩语统一上传。[fr-FR.json](fr-FR.json) 标题为 `Platon Sudoku : Jeu classique`（29字符），短描述为 `Sudoku hors ligne. Sans pub imposée. Jusqu’à 41 indices en 7 jours consécutifs.`（79字符）。长描述3996字符，开头突出无强制广告及充足每日提示奖励，后段覆盖相关表达与常见问题。

### 法语实际用词与长尾覆盖

[完整词表 JSON](fr-FR-keywords.json)／[CSV](fr-FR-keywords.csv) 共88个词项，56个在七款法语商店说明中出现，当前稿精确覆盖82个；63项含空格。词项包括单词锚点、短语、变体和产品延伸，不能全部当作已验证的长尾搜索查询。样本为 Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，以及补充样本1bsyl；用于描述分析，不声称按法国下载排名选取。

统计只取「À propos de ce jeu」到「Date de mise à jour」之间说明，含公开短描述，不计标题、标签、评价、截图和链接网站。NFC、大小写、空白、弯直撇号及连接号统一，按Unicode字母／数字边界匹配连续完整表达；重音保留，单复数、词形和同义词不合并。嵌套词项可能重叠；出现应用数不是搜索量、排名、转化或收录保证。样本采集跨10月15／16日，页面可能缓存或受地区影响，完整竞品正文不另存。

| 实际表达 | 出现应用数／7 | 当前安排 |
| --- | --- | --- |
| sudoku classique | 4 | 开头品类 |
| sudoku gratuit | 3 | 后段基础免费权益 |
| jeu de sudoku | 3 | 后段常见问题 |
| puzzle sudoku／puzzles sudoku | 各3 | 保留竞品写法，后段覆盖 |
| grilles de sudoku | 2 | 题库说明 |
| niveaux de difficulté | 5 | 五档难度 |
| hors ligne | 4 | 短描述及离线段落 |
| indices | 5 | 核心提示卖点 |
| indices intelligents | 1 | 分步逻辑解释 |
| pas à pas／techniques de résolution | 各1 | 解法说明 |
| notes | 6 | 候选与笔记 |
| mode notes／mode crayon | 各1 | 同义操作解释 |
| calcul automatique des candidats | 1 | 免费可编辑自动候选 |
| sauvegarde automatique | 4 | 保存与继续 |
| statistiques | 5 | 真实统计功能 |

相关表达即使较生硬也保留，例如puzzle Sudoku／puzzles Sudoku、mode notes／mode crayon、sans connexion Internet／sans Internet／sans Wi-Fi、mode sombre／thème sombre。产品特有的sans pub imposée、récompenses quotidiennes等在样本零命中，明确标作真实产品延伸，不冒充竞品高频词。entraînement cérébral仅为游戏类型偏好，mémoire仅说明候选无需全记住，不宣称改善认知或记忆。

六项未写入公开文案：défis quotidiens、classements、cloud、synchronisation、annulations illimitées、rétablissement。原因是当前发行构建没有确认对应每日挑战、排行榜、云同步、无限撤销权益或独立重做；每日奖励不是每日题目，普通撤销仍介绍。这些词保留在研究表并注明原因，没有因语言生硬而删除相关真实功能。

术语对照发行商[Easybrain法语规则](https://sudoku.com/fr/regles-du-sudoku/)及[SudokuFR法语规则](https://sudokufr.fr/regles-du-sudoku/)，不计入七应用统计。grille、ligne、colonne、bloc 3×3、candidats用于规则和候选，indices用于应用提示、conseils用于一般指导。五档按实际法语界面核对为Facile、Moyen、Difficile、Expert、Extrême。文案按法语资料及产品事实审校，不称为独立母语者审核，也不是逐字翻译英语。

### 法语截图与权益核对

[素材清单](fr-FR-assets.json)记录四图顺序：无强制广告 → 慷慨每日提示 → 讲清理由 → 可编辑自动候选。[总览](../../../.local/google-play/listing/fr-FR/screenshots/phone/composed/overview.png)。本轮没有现成法语原图，用户明确允许官方adb；在独立临时API35模拟器安装现有测试APK，核对版本1.0.16（19），通过实际设置选择Français并操作真实棋局，拍摄三张1080×1920原图。实体设备、现有模拟器数据和应用源码不改，不重建APK。

四张版式图为1080×1920、24-bit RGB PNG。只裁Android系统栏（上63像素、应用区域1794像素）、等比缩放并在界面外添加说明。第二／四张复用真实候选棋局，奖励说明不冒充奖励页。提示图保留应用中的「Singleton Nu (Naked …)」与原有省略号，不重绘UI或法语文字，不使用AI位图。

奖励按既有规则：新安装5+首日3=8；七天连续打开3/3/5/5/5/10/10，最多41；漏一天重置系列但保留已获余额；上限99、溢出不补发；三道不同新题首次完成+1；自愿有效广告+5并说明库存／地区／联网条件。完全无广告及无限提示限定可选Lifetime Premium一次性购买，无订阅；免费自动候选不限使用，不宣传闭测999额度。截图上的七日条件、余额上限和断签重置与长文一致。

本轮仅本地制作，没有打开或改动Play Console、保存后台、提交或重启审核，也未改应用包、签名、测试者、加入链接或轨道。英语／日语审核沿用之前最后实际核对记录，不声称有新审核结果；其他语言资料和现有闭测配置保持原状。

## 韩语本地优化稿（待后续统一上传）

2026-10-15 用户要求继续下一个语言，按此前逐语言顺序处理已有韩语翻译。[ko-KR.json](ko-KR.json) 已就地更新，标题保留 `Platon Sudoku: 클래식 스도쿠`；短描述为 `오프라인 스도쿠. 강제 광고 없음. 단계별 풀이 힌트와 매일 받는 넉넉한 힌트 보상. 7일 연속 최대 41회.`（61字符）。长文先说明无自动强制广告和提示奖励，再覆盖难度、离线、解法、候选、保存、复盘与购买。德语和韩语均留在本地，供后续统一上传；本轮没有打开 Play Console、保存后台或送审。

### 韩语实际用词与长尾覆盖

[完整词表 JSON](ko-KR-keywords.json)／[CSV](ko-KR-keywords.csv) 包含110个词项，80个在八款应用的韩语短／长描述中观察到，当前稿精确覆盖101个。八款为此前一致的 Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，加上韩国发行商 Mobirix 的《스도쿠 월드》和 Logic Wiz。该样本用于分析，不声称按韩国下载排名选取。词项含单词锚点、复合表达、变体与产品特有延伸，不把110项全部称为独立长尾查询；75项含空格，但含空格也不等于已验证搜索查询。组合搜索意图另列，未取得搜索量。

统计时间为2026-10-15：NFC规范化，统一空白，拉丁字母忽略大小写，然后按连续子串计数。韩语助词和复合词不做形态分析，嵌套词项可能重叠；分写／连写不合并。只取「게임 소개」到「업데이트 날짜」间的说明，含页面提供的短描述，不计标题、标签、评价、截图和链接网站。Mobirix该段没有「스도쿠」，不能把标题补进分母计数。页面缓存与地区可能影响结果，词频不代表搜索量、排名或转化。完整竞品正文不另存副本。

| 韩语实际表达 | 出现应用数／8 | 当前稿安排 |
| --- | --- | --- |
| 스도쿠 퍼즐 | 5 | 品类及免费基础权益 |
| 스도쿠 퍼즐 게임 | 4 | 后段常见问题 |
| 스도쿠 게임 | 5 | 后段类型偏好 |
| 숫자 퍼즐 게임 | 4 | 规则与逻辑玩法 |
| 클래식 스도쿠 | 3 | 标题与开头 |
| 오프라인 스도쿠 | 2 | 离线段落标题 |
| 스도쿠 초보자 | 2 | 实际五档难度 |
| 쉬운 스도쿠／어려운 스도쿠 | 各1 | 难度标题 |
| 전문가 스도쿠 | 3 | 高档难度描述 |
| 스마트 힌트 | 2 | 讲解理由的提示 |
| 후보 메모／자동 후보 계산 | 各1 | 可编辑自动候选 |
| 메모 모드／연필 메모 | 各1 | 候选笔记用途 |
| 자동 저장 | 3 | 与자동저장分别保留 |
| 실행 취소 | 4 | 与되돌리기同义说明 |
| 통계 기능 | 1 | 游戏记录 |
| 수도쿠 | 1 | 后段保留实际出现的另一拼写，不声称它是规范拼写或高搜索量 |

按用户要求，相关且真实的竞品词项不因表达不够优美而删去。메모／노트、자동 저장／자동저장、다크 모드／다크모드等变体放在功能说明及常见问题，不单独堆成关键词表。강제 광고、힌트 보상、출석 보상等属于产品真实卖点延伸，样本零命中如实标记。킬러 스도쿠用完整表达统计，避免把시간 킬러里的킬러误当成Killer Sudoku。

排除九项：두뇌 개발、타임어택、멀티플레이、리더보드、클라우드 동기화、킬러 스도쿠、직소、수제 퍼즐、다시 실행。原因分别为没有依据的认知开发效果、未验证的专用玩法／功能、与本地存储不符、未提供的变体、不能把生成题库说成手工题，以及只确认撤销而未确认独立重做；并非因表达生硬而排除。두뇌 게임／두뇌게임／두뇌 훈련／두뇌 트레이닝仅描述游戏类型偏好，기억력只用于候选无需记忆保存的语境，不承诺记忆力改善。

专业术语与语义对照 [Easybrain韩语游戏页](https://sudoku.com/ko)和韩国游戏站[딴판的规则与操作指南](https://ttanpan.com/guide/sudoku)；两站不混入八应用计数。候选使用후보 숫자／후보 메모，提示使用힌트，出席／每日奖励明确为每天打开应用且无需登录，不把连续七日写成连续赢七局。五档名称按实际韩语资源核对为쉬움、보통、어려움、전문가、극한。此为资料对照与语义审校，不虚称已有独立母语者或外聘专家审核。

### 韩语截图与权益边界

[素材清单及alt text](ko-KR-assets.json)记录四图顺序：无强制广告 → 每日充足提示 → 解释理由 → 可编辑候选。[总览](../../../.local/google-play/listing/ko-KR/screenshots/phone/composed/overview.png)。命令 `python3 tools/store-listing/build_english_assets.py --locale ko-KR` 使用现有三张真实韩语1.0.16（19）Android截图生成四张1080×1920、24-bit RGB PNG；奖励与候选两图复用一个真实游戏画面，奖励说明位于界面外，不冒充奖励页。仅裁系统栏、等比缩放，不重绘数字或操作。说明使用韩文字体；提示源图中技术名的英文括号及应用自身省略号保持真实。

主卖点用넉넉한 힌트 보상和实际数量表达，不直译成관대한 보상。初次5+3=8；七天连续打开按3、3、5、5、5、10、10合计最多41；余额上限99，溢出不补发，漏一天重置周期但保留已有额度；三道不同新题首次完成+1；自愿有效广告+5并说明可用性。完全无广告和无限提示明确限定Lifetime Premium任意一次性购买；基础游戏及自动候选免费，不宣传闭测999额度。

本轮仅制作韩语资料与必要的素材工具支持；英语、日语、德语文案和PNG保持原状，没有后台新状态查询或操作，没有修改应用功能、奖励参数、包、轨道、测试者、加入链接、签名或地区。现有闭测配置不动；英／日审核结果仍按此前实际核对记录判断，不把本轮本地制作算作新审核结果。

## 德语本地优化稿（待后续统一上传）

2026-10-15 用户要求先提交日语，再继续下一个主要语言。本轮选择已有商店翻译的德语，采用与英语、日语相同的竞品统计、长尾覆盖、真实界面配图与核对方法。[de-DE.json](de-DE.json) 已就地更新；后台德语没有填写、保存或送审，留待后续统一上传。标题保留 `Platon Sudoku: Klassisch`，短描述为 `Sudoku offline. Keine Zwangswerbung. Bis zu 41 Hinweise für 7 Tage in Folge.`（76 字符）。

[德语词表 JSON](de-DE-keywords.json)／[CSV](de-DE-keywords.csv) 共 86 个词项，65 个在六款竞品的德语短／长描述中精确出现，当前稿覆盖 80 个。样本为 Easybrain、Oakever、Brainium、Andoku、Guru、GamoVation，与英文样本保持一致。六项排除为 Killer Sudoku、Jigsaw、Cloud、tägliche Herausforderungen，以及尚未建立宣传依据的两种无限撤销表述；仍正常描述撤销功能。词项包含单词锚点、复合词、多词表达与产品特有延伸，不能把全部 86 项称为独立长尾查询。组合搜索意图另列，搜索量未取得。

统计于 2026-10-15：NFC 统一、忽略大小写、统一空格和连接号，以 Unicode 字母／数字作为词边界；单复数、变格、复合词、分写和同义词不合并。比如 werbefrei 与 werbefreies 不互相冒充精确命中。范围仅为「Über dieses Spiel」到「Aktualisiert am」间的说明，包含公开短描述；不计标题、标签、评价、截图或链接网站。页面可能缓存或受地区影响，出现率不是搜索量、排名或转化效果。

| 德语实际表达 | 出现应用数／6 | 当前稿安排 |
| --- | --- | --- |
| für Anfänger | 5 | 难度段落 |
| Schwierigkeitsstufen | 5 | 实际五档标签 |
| Sudoku-Rätsel | 3 | 经典题库与免费权益 |
| Zahlenrätsel | 3 | 离线休息场景 |
| für Anfänger und Fortgeschrittene | 2 | 难度标题 |
| Sudoku Puzzle Spiel | 1 | 后段品类说明 |
| Sudoku kostenlos spielen | 1 | 长文的免费基础游戏范围 |
| offline spielen | 1 | 离线能力及联网边界 |
| keine Zwangswerbung | 1 | 开头卖点，短描述同义表达 |
| Notizfunktion／Notizmodus | 各 1 | 可编辑自动候选 |
| Kandidatenberechnung | 1 | 自动候选计算 |
| Autosave | 1 | 与自动保存并列覆盖 |
| Statistik-Funktion | 1 | 游戏统计 |
| werbefrei | 1 | 明确限定任意 Lifetime Premium 买断 |

按用户要求保留相关真实表达及不够优美的写法，次要词放后段，不仅直译英文。术语对照 [Easybrain 德语笔记指南](https://sudoku.com/de/sudoku-regeln/notizen-in-sudoku/)及 [Sudoku.de](https://www.sudoku.de/sudoku_anleitung.php) 的 Sudoku Anleitung、Sudoku Tipps、Sudoku-Regeln；两站不混入六应用分母。Andoku 的实际德语说明亦用于候选与逻辑提示核查。无强制广告用 keine Zwangswerbung／ohne Werbeunterbrechungen，完全无广告 werbefrei／ohne Werbung 只放在 Premium 条件下。Gehirntraining、Gehirnjogging 仅描述游戏类型偏好，Gedächtnis 仅说明笔记不必靠记忆保存候选，不承诺认知改善。资料对照与语义审校不虚称独立母语者审核。

奖励与英文／日语保持同义：新安装5+首日3=8、连续七天最多41、余额99、漏一天重启但保留余额、三道不同新题首次完成+1、自愿有效奖励广告+5。没有把闭测999额度写入常规商店权益，也没有把奖励广告宣称为必定可用。四张图及 alt text 见 [德语素材清单](de-DE-assets.json)，顺序为无强制广告 → 每日充足提示 → 分步理由 → 可编辑候选；[总览](../../../.local/google-play/listing/de-DE/screenshots/phone/composed/overview.png)。由现有三张真实德语1.0.16（19）图生成，奖励和候选图复用一个真实游戏画面，未混用英文／日语 UI。原提示截图的次标题存在应用本身省略号，本轮保持真实画面，不通过重绘或改代码修饰。

命令 `python3 tools/store-listing/build_english_assets.py --locale de-DE` 生成四张1080×1920、24-bit RGB PNG与文案副本、词表CSV；本轮未重新生成其他语言素材。没有修改应用功能、界面、奖励参数或闭测配置。

## 日语优化稿（已提交审核）

2026-10-15 用户批准首先提交。日语短描述、长描述与四图已上传保存，逐字核对字段并确认四图顺序。Publishing overview 新增仅三项 ja-JP 商店变更。后台要求取消并重启已有英语审核；第一次 Restart review 被自动审批拦截后，用户明确回复「同意重启，一起送审」，随后成功执行。页面最终显示英语与日语共六项 Changes in review，快速检查已完成，正式审核尚未通过或生效。[合并送审凭证](../../../.local/google-play/listing/ja-JP/review-submission.jpg)。未修改英语内容，未提交德语／韩语。只读复核闭测仍 Active、1 track，12名测试者连续加入12天；Production Inactive。[闭测凭证](../../../.local/google-play/listing/ja-JP/closed-test-status.jpg)。

此前本地制作记录：日语当前稿已更新到 [ja-JP.json](ja-JP.json)。标题保留 `Platon Sudoku: 数独・ナンプレ`。短描述为 `強制広告なしの数独・ナンプレ。オフラインでじっくり。理由がわかるヒントと毎日のヒント報酬。7日連続で最大41回分。`。前面集中说明无强制广告与提示奖励，后面覆盖同义词、功能与常见问题。旧稿的「初級から極級」已按实际日语 UI 修正为「かんたん」至「エクストリーム」五档。

### 日语关键词及语言核对

[完整词表 JSON](ja-JP-keywords.json) 和 [可筛选 CSV](ja-JP-keywords.csv) 共 76 个词项，65 个在八款样本的日语短／长描述中出现；当前稿精确覆盖 71 个。八款为 Easybrain、Oakever、Brainium、Guru、Andoku、GamoVation，以及日本发行商 TRIPS、Cross Field。保留单词锚点、复合表达、不同写法和产品特有延伸，不将 76 项全称为独立长尾查询。查询组合另列为待验证的搜索意图示例，未取得搜索量数据。

统计日期为 2026-10-15。NFC 统一后按连续子串计数；日语不采用英文空格分词，同一段可命中嵌套词项。同义词与不同写法分别计数。仅使用「このゲームについて」至「最終更新日」之间的说明，含公开短描述；标题、标签、评价、截图和链接网站不计入八应用分母。缓存和地区差异可能影响页面。出现应用数不是搜索量、排名或转化效果，不以关键词覆盖保证收录。

| 竞品实际表达 | 出现应用数／8 | 当前稿安排 |
| --- | --- | --- |
| ナンプレパズル | 4 | 经典规则说明 |
| 数独パズル | 3 | 经典规则说明 |
| ナンプレゲーム | 2 | 开头说明品类与每日习惯 |
| ロジックパズル | 2 | 规则说明 |
| オフラインでプレイ | 2 | 离线段落标题 |
| 初心者から上級者まで | 2 | 五档难度 |
| 簡単なナンプレ／難しいナンプレ | 各 1 | 难度段落标题 |
| ナンプレの解き方 | 1 | 提示与学习段落 |
| 自動メモ | 1 | 自动候选功能 |
| 自動セーブ | 1 | 与自動保存一并保留 |
| ログイン不要 | 1 | 与アカウント登録不要一并保留 |
| ナンバープレース／ナンバープレイス | 各 1 | 后段常见问题保留两种写法 |
| 強制広告 | 1 | 前段突出，限定为无自动广告 |

按用户后续要求，获客与真实相关词覆盖优先，不因某个竞品表达不够优美就删去。上述较次要同义词放在后面的说明中，避免挤掉前面的核心卖点，也不单独堆成词表。「記憶力」保留在不依赖记忆、使用候选笔记的语境，不声称提升认知能力。排除的五项为デイリーチャレンジ、ランキング、ジグソー、キラー数独、認知症予防；不能把未验证的功能或健康效果写成当前承诺。[Google 元数据规则](https://support.google.com/googleplay/android-developer/answer/9898842?hl=ja)亦要求实际功能准确，并避免词语列表和过量重复。

语言与数独术语对照了[ニコリ](https://www.nikoli.co.jp/ja/puzzles/sudoku/)的规则／解き方，以及[ナンプレ館](https://www.puzzle.co.jp/)的解法／手筋解説。两站用于术语核查，不混入八应用计数。奖励不直译 generous，而用「毎日もらえる」「たっぷりのヒント」和实际数量说明；不把无需账号的每日打开写成必须登录。已对照应用日语标签和商业规则逐段检查含义；这是资料对照与语义审校，不虚称已有独立母语者或外聘专业人士审核。

### 日语手机图

[素材与 alt text](ja-JP-assets.json) 按无强制广告 → 每日提示奖励 → 理由讲解 → 可编辑自动候选排序，共四张 1080×1920、24-bit RGB PNG。[总览](../../../.local/google-play/listing/ja-JP/screenshots/phone/composed/overview.png)。生成命令为 `python3 tools/store-listing/build_english_assets.py --locale ja-JP`；不传参数仍为英语流程，本轮只运行日语命令。

使用现有三张 1.0.16（19）真实日语 Android 截图，奖励与自动候选两图复用同一真实游戏界面，不冒充奖励页。只裁系统栏、等比缩放及添加界面外说明，日语标题使用日文字体。奖励图写清七天连续最多 41 回分、初次共 8 回分、余额上限 99 及中断重置周期。现有本地日语原始素材只有三张，本轮交付四张完整日语版式图；未用英文复盘／多选画面凑六张，也未改动应用 UI 或现有测试设备。

上述日语本地制作阶段，英文、德语、韩语文案及其 PNG 校验和保持不变。随后用户批准的送审及德语制作状态见本页前两节。各阶段均未更改应用包、轨道、测试者、加入链接、签名或地区。

## 本轮仅优化英语（已提交审核）

2026-10-15 用户批准上传并提交审核后，英语短描述、长描述和六张手机图已保存并发送。Publishing overview 显示 Changes in review，快速检查已完成；仅三项 en-GB Store listings 变更，尚未审核通过或生效。[送审凭证](../../../.local/google-play/listing/en-GB/review-submission.jpg)。

2026-10-15 随后复核：重新加载已保存的英语页面，新短描述仍为 79 字符，促销关键词提示已消失，Save as draft 为禁用状态，未产生新改动。无强制广告与慷慨提示奖励均保留。旧版 `free auto notes` 最可能触发促销词检查，编辑时提示未即时刷新是推断，后台没有给出具体命中词。本轮不改文案、不撤回或重复提交审核。[无警告凭证](../../../.local/google-play/listing/en-GB/short-description-check.jpg)。

用户确认先完成英语的定位、相关长尾搜索词覆盖和截图，之后再逐语言处理。2026-10-15 的英文候选已就地更新在 `en-GB.json`；其他三语文件和素材未改。后台此前发布的四语资料仍按 [执行追踪](../aso-tracker.md) 判断，不能把本地候选算作已发布。本轮没有修改应用功能、奖励参数、官网、发行轨道或测试配置。闭测状态核对为 Active、1 track，12 名测试者已连续加入 12 天；Production 为 Inactive。

英文短描述为 `Sudoku offline. No forced ads. Step-by-step hints. Generous daily hint rewards.`（79 字符）。长描述先说明无强制广告与慷慨提示奖励，写清首次安装 5 次加首日 3 次、七天连续打开最多 41 次、余额上限 99、漏一天重启周期及自愿广告 +5，再覆盖经典玩法、离线、难度、解法学习、候选和复盘。完全无广告和无限提示只在可选 Lifetime Premium 的限定下表达；不使用闭测 999 次额度宣传公众权益。

### 英文关键词清单

[完整统计 JSON](en-GB-keywords.json) 与 [可筛选 CSV](en-GB-keywords.csv) 包含 75 个词项，其中 67 个是多词短语；词项包括品类长尾、玩法和辅助功能词，不将全部词项称为独立搜索词。六款样本为 Easybrain、Oakever、Brainium、Andoku、Guru 和 GamoVation 的 Google Play 英文短描述及长描述，采集于 2026-10-15。各来源链接、逐应用次数、Platon 覆盖次数及纳入／排除原因保存在同一当前文件。

当前英文标题、短描述和长描述精确覆盖 63 个词项（其中完全无广告只在 Premium 限定下表达）。其余词项排除未提供的功能、无依据的认知效果或不自然的搜索语序；不为凑满清单写出虚假承诺。标题／短描述／长描述字符数为 30／79／3935。

统计按忽略大小写的连续完整短语匹配，只统一空格和连接号；单复数、语序和同义词不合并。竞品名称、截图、标签、评价及链接网页不计入统计。页面可能为缓存且受地区影响；出现率不是搜索量、排名、竞争度或转化效果。零命中的短语标记为延伸候选，不声称来自竞品原文。Platon 覆盖检查使用标题、短描述和长描述。

| 连续短语 | 出现应用数／6 | 英文候选中的安排 |
| --- | --- | --- |
| classic sudoku | 6 | 标题含 Sudoku／Classic，长描述自然覆盖完整短语 |
| sudoku puzzle game | 5 | 开头说明品类 |
| number game | 5 | 无强制广告段落 |
| difficulty levels | 6 | 五档难度 |
| free sudoku | 3 | 长描述的基础游戏权益，不放进短描述 |
| play sudoku offline | 2 | 离线游玩场景 |
| without an internet connection | 2 | 核心游戏离线范围 |
| no wifi | 1 | 核心游戏限定的段落标题 |
| hard sudoku | 3 | 难度段落 |
| expert sudoku | 1 | 难度段落 |
| sudoku for beginners | 1 | 难度段落 |
| learn sudoku | 1 | 解法学习段落 |
| solving techniques | 1 | 提示能力范围 |
| auto-fill notes | 1 | 可编辑自动候选 |
| dark mode | 2 | 主题与舒适体验 |
| daily sudoku | 4 | 从现有题库建立日常游玩习惯，不承诺每日新题 |
| no forced ads | 0 | Platon 的真实卖点延伸，非竞品命中词 |
| step-by-step hints | 0 | 短描述和提示段落，非竞品命中词 |
| daily hint rewards | 0 | 短描述和奖励段落，非竞品命中词 |

同一词根的自然语序优先，不为覆盖 `sudoku free` 等倒装组合写不自然的句子。Killer、Jigsaw、云同步、扫描导入、排行榜及每日独立挑战不作为当前功能宣传；不写记忆力提升或健康效果。`brain training games` 仅描述玩家的游戏偏好，不承诺认知改善。`ad-free`／`no ads` 仅在 Premium 条件下覆盖。

### 英文手机图

[素材清单与 alt text](en-GB-assets.json) 是本轮六图顺序的依据。运行 `python3 tools/store-listing/build_english_assets.py` 可从现有真实 Android 截图生成英文版式、24-bit RGB PNG、总览与文案副本，并刷新关键词覆盖和 CSV。输出目录为 `.local/google-play/listing/en-GB/screenshots/phone/composed/`；源截图不覆盖，属于当前素材的必要输入，不新增实验历史存档。

顺序：无强制广告 → 每日提示奖励 → 分步逻辑提示 → 可编辑自动候选 → 单局复盘 → 候选批量工具。前三张使用 1.0.16（19）的真实界面；复盘与多选沿用此前已发布的真实截图，未重新确认其准确构建号，不能声称六张全部重新拍摄或来自同一构建。奖励信息是界面外的宣传说明，不伪装为奖励页 UI。源界面不重绘、不改数字、不拼造操作；仅裁去各截图实际的系统栏、等比缩放并增加不超过画面 20% 的说明。总览仅供检查，不上传为单张截图。

本轮目标是覆盖相关搜索意图并提高页面可理解性。Google Play 商店发现与 Google 网页搜索分别评估；收录、展示和排名不由填词保证。当前闭测资料不能充当公开自然获客基线。本轮已按该范围提交英语短描述、长描述和六张手机图，保留标题、其他语言、其他设备组、图标、包名、签名及现有 Alpha 连续测试。下一步依据实际审核结果更新生效状态；不自动安排监控。

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
