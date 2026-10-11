# Google Play 上架与封闭测试执行清单

> 2026-10-11：按用户确认，在原 Rewards 页广告按钮位置增加闭测 Premium 的可选 Google 测试广告（`c5c1ec8`），不新增 Premium 页入口、不增加点数或记录正式广告收益；免费用户正式 Reward +5 保持不变。签名 **1.0.14（17）** 已提交原 **Closed testing — Alpha** 审核，发布名 `1.0.14 closed beta - Test ad preview`、100% rollout，预览 **Ready to release**、原设备零排除。用户明确批准重启审核后，复核 Publishing overview 为 **Changes in review**，Alpha 为 **In review**；1.0.13 显示 **Superseded by another release**，新版包含其购买修复。Google 快速检查运行中，Managed publishing 关闭，检查及审核通过后自动开放；当前仍不能认定测试者已收到新版。现有闭测保持 Active，未暂停或发布内部测试。原 Google Group、加入链接和 178 个国家／地区已只读复核保留。114 项相关 Jest、TypeScript、修改源码 ESLint、24 语种完整性以及 Release 构建通过；签名、四 ABI、16KB、映射／符号上传及当前题库一致性通过。AAB SHA-256：`b973b2750451f5a5767c2987de5e96f497eb359c0b98b5319ad849e47d4ea7a9`。专用 Google Play API 35 模拟器覆盖安装本地调试签名的 Release 副本，确认版本 17，原临时 Premium 保留，Google `Test Ad` 正常播放、关闭返回、未增加点数提示和再次播放／关闭通过；钱包不变另由持久化层自动测试验证。正式 AAB 上传签名保持不变，连接真机未安装或清除数据。此本地验收不能代替 Play 获批后的商店更新和真机验收。

> 2026-10-11 18:21：拒付提示与退款后即时权益刷新修复（`424b3b4`）已以 **1.0.13（16）**、`1.0.13 closed beta - Purchase fixes`、100% rollout 提交原 **Closed testing — Alpha**，Publishing overview 为 **Changes in review**，快速检查运行中，Managed publishing 关闭；批准后自动开放，目前尚不能认定手机已更新。Google Play 许可测试复测澳洲价格、取消、即时拒付、待付款转拒付／成功、即时成功、启动和主动恢复，以及 Premium 页和设置页退款后无需重启的权益回收；测试卡不扣费。86 项相关 Jest、TypeScript、ESLint、24 语种完整性及 Android 原生 4 项测试通过。签名、四 ABI、16KB、映射／符号上传与题库一致性通过，Play 预览零设备排除。无永久购买时也实测确认临时 Premium 保留，原名单、测试群、加入链接、国家配置和连续闭测保留；未发布内部测试。待付款期间恢复的既有通用提示及其余未验收范围见[运行记录](product-analytics-runbook.md#1013-拒付提示与退款刷新修复)。

> 2026-10-11：商品加载诊断、Billing 自动重连及闭测跳过不必要价格查询的修复（`4637b4e`）已发布至原 **Closed testing — Alpha**。签名 **1.0.12（14）** 于 17:32 显示 **Available to selected testers**，临时 Premium 开启，原名单、加入链接、设备覆盖及闭测保留；送审前 Dashboard 为 **12 名测试者连续加入 8 天**。签名、四 ABI、16KB 对齐、映射／符号及题库通过检查，71 项相关 Jest、TypeScript 与 ESLint 通过。全球商品配置已保存 US$9.99 基准与本地自动换算价格。关闭临时 Premium 的本地 Release 15 已在登录许可账号的 Google Play 模拟器验证澳洲 A$13.99 价格、取消、拒付、待付款不解锁、即时成功解锁、完成后启动恢复、主动恢复，以及测试订单退款撤销后重启回收权益；拒付文案和恢复后的即时回收仍有边界，详见运行记录。内部轨道只有未发布草稿，没有要求测试者换组；手机商店更新和其余验收边界见[运行记录](product-analytics-runbook.md#2026-10-11-商品加载问题与全球定价)。

> 2026-10-10：默认分析采集、取消首次分析弹窗与设置开关、统一英文隐私页已提交 Git（`7b72bf2`）。签名 **1.0.11（version code 13）** 已上传原 **Closed testing — Alpha**，发布名 `1.0.11 closed beta - Analytics and privacy`，100% rollout，并与 Data safety 更新一起提交审核。Publishing overview 显示 **Changes in review**，快速检查运行中，Managed publishing 保持关闭，批准后自动向原测试者发布。上传签名不变、原设备零排除，四 ABI、38 个 64 位库的 16KB 对齐、内嵌映射／符号、正式 Firebase、当前题库及闭测 Premium 均已核对。相关 Jest 4 套件／27 项、TypeScript、ESLint 和本地化完整性通过。英文线上隐私政策已发布；名单、国家、加入链接和设备类别开关未变。送审前已确认 1.0.10 为 Available to selected testers；本次未重新核对 Dashboard 连续加入计数，不能将下方历史数字视为今日实时数据。详情见[监测运行记录](product-analytics-runbook.md#2026-10-10-默认采集与简短披露)。

> 2026-10-09：按用户授权，24 语种及阿拉伯语 RTL 适配已提交 Git（`c183b19`），签名 **1.0.10（version code 12）** 已上传原 **Closed testing — Alpha** 并提交审核，发布名 `1.0.10 closed beta - 24 languages`、100% rollout。Publishing overview 确认 **Changes in review**，Google 快速检查运行中；Managed publishing 保持关闭，审核批准后自动向现有测试者发布，目前不能表述为测试者已收到新版。原有设备零排除，签名、四 ABI、38 个 64 位原生库的 16KB 对齐、映射／符号、题库一致性及闭测 Premium 检查通过；全量 Jest 126 套件／4,723 项及 Android 原生 4 项测试通过。名单、国家、加入链接和设备类别开关未变；Dashboard 为 **12 名测试者连续加入 6 天**，正式生产申请仍未开放。此前 1.0.9 已于 9 Oct 12:48 向测试者发布。语言复核范围见[语言扩展记录](../localization-expansion.md)。

> 本次设备扩展仅发行到 Google Play。新功能沿用现有应用 `com.platongames.sudoku` 和 **Closed testing — Alpha** 更新，保留签名、测试者名单、Google Group、加入链接及现有设备覆盖，不暂停测试或要求测试者退出重加。用户反馈已测试约七天；实际连续天数以 Console 为准。Google 的门槛是至少 12 名测试者连续加入满 14 天，官方鼓励闭测期间更新应用；版本更新本身不重启连续加入天数。Apple App Store 配置不作为本次发行门槛。[官方测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

> 2026-10-09：设备扩展版本 **1.0.8（version code 10）已上传并向原 Closed testing — Alpha 轨道提交审核**，发布名 `1.0.8 closed beta - Device adaptation`，100% rollout，保留闭测临时 Premium。Publishing overview 显示 **Changes in review**，快速检查运行中，Managed publishing 仍关闭；检查和审核通过后自动向原测试者发布，当前不表示测试者已收到新版。提交前后 Dashboard 均为 **12 名测试者连续加入 5 天**，没有重建或暂停测试。发布预览：原设备 0 排除，手机 12,345 不变，平板新增 9，Chromebook 77 不变，Wearable 仍为 0。TV／PC 商店开放尚待专项验收，不由包兼容数量推定已上线。AAB／APK、四 ABI、16KB 对齐、签名、内嵌映射／符号和题库一致性检查通过。旧浏览器连接问题已恢复，不再阻断提交；详细适配状态见[设备扩展方案](../device-expansion-plan.md)。

> 2026-10-09：Android 1.0.7（version code 9）已上传 Closed testing — Alpha，发布名 `1.0.7 closed beta - Product analytics`，100% rollout。闭测与正式共用 production Firebase，Debug 独立使用 test；七张业务报表默认合看闭测与正式。四 ABI、签名、正式 Firebase app ID、R8 映射及 NDK 符号检查通过；Play 预览 Ready to release，设备覆盖与上一版相同。在线隐私政策已发布，Data safety 与新版一并提交；Publishing overview 确认 Changes in review，快速检查运行中，Managed publishing 关闭，批准后自动向现有测试者发布。目前不表示审核通过或测试者已收到新版。运行时故障云端定位等剩余验收见[操作文档](product-analytics-runbook.md)。

> 2026-10-08：免费产品分析纳入公开发行前标准，完整要求见[产品分析设计与上线前标准](../product-analytics-launch-standard.md)。Android 已接入 Analytics、Crashlytics/NDK 和 JS 诊断，正式/测试项目均已创建；构建与自动检查结果、未完成的真机及控制台门槛见[接入与操作文档](product-analytics-runbook.md)。此前已上传闭测包不包含本轮新增能力。

> 2026-10-05：已从 `03fe7cd` 构建并签名 Android 1.0.6（version code 8），上传到 Closed testing — Alpha，发布名为 `1.0.6 closed beta - Finish and Replay`，测试轨道 rollout 为 100%。Publishing overview 已确认 `Changes in review`，快速检查仍在运行；Managed publishing 关闭，审核批准后自动发布，目前不能表述为测试者已收到新版。包内启用闭测临时 Premium，包含当前教学内容、收尾提示与 200ms/格节奏、复盘历史修复和提示交互调整。AAB 签名、内嵌混淆映射及内容资源检查通过，Play 发布预览显示 Ready to release，支持设备范围与上一版相同。此前“尚未上传发布”的日期记录仅描述当时状态。

> 2026-10-04：新奖励规则与闭测临时 Premium 已接入源码，规则唯一依据见[商业方案](../premium-reward-design.md)。设置中的七日奖励页已实现；尚未上传发布，旧日期验收仅代表旧构建。

> 2026-10-03 文档更新：奖励与测试策略以[商业方案](../premium-reward-design.md)为准，新策略已接入当前源码，尚未发布。下方带日期的勾选项保留真实配置与上传记录，不表示当前源码或未来免费规则；本轮没有操作 Play Console、AdMob、商品、名单、构建或公开帖子。

## 新商业策略待实施事项

- [ ] 确认初始赠送、连续周期／数量、自然日、提示上限、既有完成奖励和完成页广告去留、普通测试者策略；不把讨论例子冻结成决定。
- [ ] 目标构建实现所有人快速候选免费无限、每日按七天循环领取提示、保留自愿广告提示 +5、Premium 永久无限提示和无广告。
- [ ] 核对广告 SDK 与后台配置、播放前显示和实际发奖都兑现 +5；既有下方“1 Credit”仅是历史配置，本轮未修改。
- [ ] 完成[新奖励验收](../reward-model-acceptance.md)，免费路径与许可账号 Premium 专项分开；旧闭测无限及 20 次补贴不能代替新策略验收。
- [ ] 目标构建可用后更新四语商店、奖励说明和测试说明；免费快速候选不作为购买专属。已对外承诺的测试者 Premium 回报保留，新批次默认临时 Premium。
- [ ] 暂缓奖励推荐、归因、自建后台和远程配置；免费产品分析按[上线前标准](../product-analytics-launch-standard.md)独立完成接入与验收，不改变福利规则。

## 公开发行前产品分析验收

- [ ] Firebase 保持 Spark 且不绑定账单账户；闭测与正式共用项目并保留环境标记，开发调试独立。
- [ ] 游戏激活与留存、难度、提示、奖励、广告、购买以及公开辅助模块的必做事件通过目标 Release 路径验收。
- [ ] 收集默认关闭与用户选择、关闭后的处理、离线回退、敏感字段和商店隐私披露一致。
- [ ] JS、Android 原生与 C++ 故障实际可定位；映射、符号和关键业务错误分类验证通过。
- [ ] 六组免费报表与适用原生异常通知可用，复杂分析采用明确的免费替代，不虚构指标。
- [ ] 按[完整检查表](../product-analytics-launch-standard.md#上线前验收清单)核对全部适用必做项、尽量完成项及当前验收结论；未接入不能勾选通过，不要求上线前已有真实 D30 或营业收入。

更新日期：2026-10-08

## 当前状态与使用方式

- [x] Google Play Console 开发者账号已注册，US$25 注册费已支付（开发者本人确认）。
- [x] 在 Play Console 核对账号类型确为个人，以及首页仍有哪些验证任务。账号列表显示为 Personal account。
- [x] 公开开发者名称已由 `Planton Games` 改为 `Platon Games`。2026-10-01 核对 Play Console 和 Google Play 商店页均已显示 `Platon Games`。
- [x] 迁移应用标识：iOS 和 Android 均改为 `com.platongames.sudoku`。新 Play 应用已建立；旧应用 `com.jackli717.sudoku` 已在 Play Console 中删除，恢复期限至 2026-10-07。

按下面四步推进。每完成一项，就在本文件勾选，并在需要时记下 Play Console 页面、测试账号或设备上的验证结果。可以现在准备测试者名单、说明和反馈表；**正式公开招募并承诺安装与 Premium 回报**须等第 3 步的试跑门槛通过。商店展示视频不是启动封闭测试的前置条件。

## 第 1 步：账号、商家资料与收款

- [x] Play Console 联系邮箱、电话和开发者公开联系邮箱均显示已验证；账号通知显示身份已于 2026-09-10 验证成功。Android 开发者验证页显示新包名已注册。
- [x] 已按个人账号身份提交商家资料；Google 政策说明启用销售后，商店会显示法定姓名和完整地址。
- [x] 商家付款资料已建立，国家为澳大利亚、类型为 Individual，法定姓名和地址显示已验证。公开商家客服邮箱已改为 `admin@readytradie.com` 并显示保存成功；Business name 使用个人姓名，未使用可能注销的公司名。
- [ ] 补齐收款与税务待办：澳大利亚税务资料显示 Accepted（2026-09-29 提交）；美国、台湾税务资料显示 No tax info on file，需在适用时核对。澳元收款银行账户已添加，状态为 Verification pending。待 Google 的小额存款出现在银行交易记录后，由账户持有人在 Play Console 输入该笔交易的准确金额完成验证；不要输入账户余额或猜测金额。
- [x] 已记录商家资料与银行当前状态；银行验证仍待账户持有人完成。

**完成标准：** 身份与联系方式没有阻断项，Premium 所需商家资料可用，收款验证没有未处理的发布风险。银行卡不是上传首个内部测试包的前置条件，因此它的验证等待时间可以与第 2、3 步并行。

## 第 2 步：游戏和封闭测试所需的商店基础资料

- [x] 在 Play Console 建立游戏，核对名称 `Platon Sudoku`、默认语言 English (United Kingdom)、免费应用和 `com.platongames.sudoku` 包名。旧应用 `com.jackli717.sudoku` 已删除。
- [x] 完成新 Play 应用的隐私政策、广告、政府应用、金融功能、健康声明、目标受众、数据安全及内容分级任务。IARC 问卷已按开发者确认保存并分享；目标受众为 13 岁以上、不面向儿童。广告 ID 声明已依当前 Android release 合并清单所含 `AD_ID` 权限选择 Yes，用途勾选 Advertising or marketing，并随 2026-09-30 的更新发布。Premium 审核访问说明中的代码与当前源码一致，源码有效期至 2027-03-31，实际候选包仍需在设备上验证；审核访问仅用于审核，不代表普通测试者默认 Premium。
- [x] 为新 Play 应用准备并保存商店名称与 en-GB 描述。商店文案副本保存在 `.local/google-play/listing/en-GB/store-listing-copy.md`，新 listing 的 App name 为 Platon Sudoku。
- [x] 新 listing 图标（512×512）、宣传横图（1024×500）及手机、平板截图已上传，并将 AI 编辑的宣传横图按要求标记。素材和策略保存在 `.local/google-play/listing/en-GB/`；当前截图数量和顺序见下一项。2026-10-01 已可打开 Google Play 商店页，Play Console 显示上一轮更新已发布。
- [x] 新包截图已拍摄并上传至 Play Console 默认 en-GB 商店资料：手机竖屏 5 张；7 英寸及 10 英寸平板各 4 张竖屏、4 张横屏。2026-09-30 在素材编辑页核对了 5/8、8/8、8/8 数量和对应文件名，并按 `.local/google-play/listing/en-GB/screenshot-plan.md` 的顺序排好；Play Console 显示“Your changes have been saved”。
- [x] 将商店类别设为 Game → Puzzle。
- [x] 核验公开商店联系信息。开发者确认保留 `admin@readytradie.com`；Play Console 已显示该邮箱，电话留空，Website 已发布为 `https://readytradie.com`。Alpha 测试反馈邮箱也已保存为此地址。
- [x] Alpha 封闭测试已扩至全部可选国家/地区，包含 `Rest of world`。2026-10-01 上传 1.0.3 前再次核对：轨道为 `Active`，范围为 `178 countries/regions`，1.0.2 为 `Available to selected testers`，发布总览无未发布变更，先前地区扩展已发布。测试者来源保持 `platon-sudoku-beta-testers@googlegroups.com`；须以同一 Google 账号先加入群组、再完成 Play opt-in。此前 Dashboard 显示 0 名测试者已 opt-in，群组人数不能代替此数字。
- [x] 2026-10-01 已构建签名并上传 Android 1.0.2（version code 3）封闭测试 AAB，Alpha 发布名为 `1.0.2 closed beta - screen adaptation`，已提交 Google，Publishing overview 显示 `Changes in review`；自动快速检查仍在运行，通过后进入审核，批准后自动发布。新版尚不能表述为测试者已收到更新。新版包含手机和平板横竖屏适配、棋盘和数字键/工具栏固定显示、首次点击响应及进出游戏布局稳定修复。此包保留 Google 测试激励广告和测试期间无限免费智能提示，快速候选维持原规则；当时计划在公开发布前关闭 `BETA_UNLIMITED_SMART_HINTS`、替换测试广告单元并重新构建；当前源码采用闭测临时 Premium。发布预览无错误，仅提示未上传混淆映射文件，当前构建未启用 R8/ProGuard；设备支持范围与上一版相同。
- [x] 本版校验：签名 AAB 构建和校验通过；Prettier、ESLint（0 错误，5 项警告）、TypeScript、SQLite schema 通过，Jest 103 个套件、3,842 项测试通过（17 项既有跳过）。默认未优化 C++ 校验的逻辑测试通过，但高难度 P95 为 373 毫秒，超过 300 毫秒门槛；使用与 Android Release 相同的 `-O2` 编译优化、保留测试断言后，核心全部校验及 13 项 Hint Lab 策略测试通过，高难度 P95 为 44 毫秒。性能门槛和测试脚本未修改。
- [x] 2026-10-01 已将当前 Android 1.0.3（version code 5）签名 AAB 上传并提交至 Alpha，发布名为 `1.0.3 closed beta - appearance and controls`，100% 测试轨道 rollout。最终发布仅包含代码 5；代码 4 未送审、未发布。发布总览已确认 `Changes in review`，平台快速检查仍在运行，通过后进入审核；Managed publishing 关闭，批准后自动发布。现阶段测试者仍需等待新版获批。此次包含竖屏布局、操作与外观设置、深色灰底及更清晰的宫格分区，并修正中文完成状态文案中的旧术语。该上传包沿用当时闭测无限智能提示，Android Release 包含此前已配置的正式 AdMob 与区域隐私消息接入；当前源码闭测策略为临时 Premium。
- [x] 1.0.3 验证：Release AAB 构建、上传签名、正式包名、版本号及四种 ABI 核对通过；TypeScript、SQLite schema、ESLint（0 错误、5 项既有警告）、修改文件 Prettier 与 `git diff --check` 通过。完整 Jest 首轮 101 个套件通过，另两套件因 4 项默认 5 秒超时与 1 项中文旧术语断言失败；修正文案后，用命令行 30 秒等待上限单独复核这两套件，28 项全部通过。合并结果为 103 个套件、3,943 项通过，17 项既有跳过；测试源码与性能门槛未修改。最终预览无错误，仅缺少混淆映射文件警告，当前未启用 R8/ProGuard。竖屏要求新增 `android.hardware.screen.portrait`：与已发布代码 3 相比，26 款设备不再支持（6 平板、3 TV、17 车载），手机范围未减少。
- [x] 2026-09-30 提交的 Alpha 新版、五国地区、测试群组、商店资料与应用声明等更新已发布。2026-10-01 上传 1.0.2 前，核对 Alpha 的 `1.0.1 closed beta - unlimited hints` 为 `Available to selected testers`，发布总览无未发布变更；测试报名页显示 `Become a tester`，商店页显示安装入口。入口开放不等于非开发者真机安装和更新已验证，这项设备验收仍待完成。
- [ ] 开发者确认首轮五国封闭测试优先面向 Android 手机和平板，同时愿意在不增加明显工作时获得其他平台用户。Advanced settings → Form factors 已将 Google Play Games on PC 退出参与，页面显示可重新 Opt-in；PC 版本仍需验证键鼠、窗口尺寸和商业流程后再开启。ChromeOS 桌面和 Android XR 仍显示 Active、共用手机发布轨道，兼容设备可能看到手机版本；没有为这两类设备另建版本或截图。当前管理页面只有切换独立轨道，且 Google 明示切换后在独立轨道有版本前仍继续由手机轨道提供安装，因此未做无效变更。
- [x] Android Release 默认启用 R8 代码压缩、优化与混淆。使用 `proguard-android-optimize.txt`，仅补充提示引擎 JNI 名称和旧版 Room/WorkManager 反射构造方法的保留规则。`bundleRelease` 会拒绝关闭混淆的配置，并检查 AAB 内非空的 `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`；AGP 自动将映射随 AAB 上传，避免漏传。对应本地文件为 `android/app/build/outputs/mapping/release/mapping.txt`，不提交生成文件。此设置用于新的本地构建；此前已送审的 1.0.3（代码 5）仍为未混淆构建，下次上传必须递增版本代码。
- [x] R8 验证：签名 Release AAB/APK 构建通过；包内映射与本地 `mapping.txt` 一致，R8 元数据确认压缩、优化、混淆均启用。关闭混淆和移除包内映射的负例均被构建检查拦截。Android API 35 模拟器实测六个提示引擎 JNI 入口通过；首次测试发现旧版 WorkManager/Room 反射构造方法被移除，补充最小保留规则后初始化通过。模拟器首次安装启动等待超时，复核冷启动成功（约 12 秒），JavaScript 与 NitroModules 加载成功，启动日志无 Java 崩溃或 JavaScript 错误。运行测试使用临时调试签名 APK 副本保留模拟器数据，正式 AAB 保持上传签名。
- [ ] 可选：制作商店预览视频。视频可以在封闭测试期间完善；不因视频尚未完成而推迟内部试跑。

**完成标准：** Play Console 显示封闭测试所需的应用设置已完成，商店资料真实、可供测试者辨认和安装。内部测试可以在完整应用设置前开始；封闭测试需先完成应用设置。

## 第 3 步：Premium 配置与小范围安装试跑

- [ ] 核对 Android 上传签名与 AAB，验证 Play 安装和更新流程。内部测试版本 `1.0 internal test` 已于 2026-09-29 发布，AAB version code 1、target SDK 36；连接的模拟器显示该包由 `com.android.vending` 安装，version code 1。非开发者真机安装和更新尚未验证。
- [x] Pre-launch report 设置已指定 English (Australia) 和 English (United Kingdom) 作为自动测试语言；登录测试资料沿用 App content 中已填写的 Premium 审核访问说明。2026-09-30 配置时尚无可评估报告；本次未核实最新报告结果，仍须查看稳定性、性能、无障碍和隐私检查。
- [x] 一次性商品 `premium`、购买选项 `standard`、Buy、`Lifetime Premium` 保持启用。2026-10-11 按产品负责人确认，已保存全部可配置国家／地区及新地区可用，以 US$9.99 统一基准由 Google 换算本地价格；美国 US$9.99、澳大利亚 A$13.99、德国 €10.99、英国 £8.99、日本 ¥1,740、印度 ₹1,150。先前仅澳大利亚可购买的配置已纠正；实际付款与恢复仍须真机验收。
- [x] 2026-10-11 只读复核 **Settings → License testing**：选择 `Platon Sudoku internal` 邮箱名单，1 个账号，`RESPOND_NORMALLY`；闭测 Google Group 未被选为许可测试名单。闭测资格不自动提供免费测试付款，新增购买测试者须同时核对轨道资格与许可测试资格。当前 Alpha 临时 Premium 隐藏购买按钮并保持免费访问。
- [ ] 用许可测试账号在真实 Android 设备检查购买、取消或失败、恢复购买、重装后恢复及权益变化；核对测试交易不会意外向测试者收费。
- [ ] 检查激励广告、同意流程及隐私说明与当前候选包一致；未完成的商业功能不能以可用状态展示或写入招募承诺。
- [x] 公开隐私政策中的占位邮箱已改为 `admin@readytradie.com`，长期网址为 `https://readytradie.com/platon-sudoku/privacy/`。2026-09-30 提交的商店资料更新已发布；2026-10-01 上传 1.0.2 前在 Play Console 核对上一轮更新无未发布变更。旧 Sites 页面暂未删除；源码及部署说明见 `site/README.md`。
- [ ] 让约 5 名可信测试者完成“加入 → 安装 → 更新 → 开局 → 退出并继续 → 提示 → 反馈”试跑；至少使用一台非开发者设备。
- [ ] 核实已承诺创始测试者的 Google Play Lifetime Premium 兑换／恢复路径；保留已有承诺，新批次是否承诺永久码须确认，未验证前不增加承诺。
- [ ] 修复安装、数据丢失、错误提示、购买和隐私方面的阻断问题，记录试跑结果与已知问题。

**完成标准：** 非开发者可通过 Play 正常安装、更新并反馈；Premium 与核心流程在目标构建上得到实际验证；对外承诺与可交付内容一致。只有这一关通过，才扩大正式招募。

## 第 4 步：正式招募、封闭测试与生产申请

- [x] Reddit 账号 `u/Hot-Beginning1311` 已设置为 Platon Sudoku 开发者资料，并在 [r/droidapptesters 发布封闭测试招募帖](https://www.reddit.com/r/droidapptesters/comments/1wts7uz/australia_android_sudoku_players_wanted_for_an/)。2026-10-01 新增 [r/TestMyApp 招募帖](https://www.reddit.com/r/TestMyApp/comments/1wuhrn1/android_testers_wanted_for_platon_sudoku_logical/)，使用 Android 标签、不列国家，在简短介绍后立即展示加入步骤：[Google Group](https://groups.google.com/g/platon-sudoku-beta-testers) → [Play opt-in](https://play.google.com/apps/testing/com.platongames.sudoku) → [商店安装](https://play.google.com/store/apps/details?id=com.platongames.sudoku)。三个步骤须使用同一 Google 账号，不要求购买或评分；Play 入口已开放，不再使用“链接仍待审核”的文案。旧帖和简介尚未核对是否仍保留旧文案。Google Group 隐藏于公开搜索、知道链接者可自行加入、仅成员可看内容、仅管理员可发帖和查看成员名单。加入群组本身不计入已完成 Play opt-in 的人数。
- [ ] 准备测试加入链接、简短报名表、结束问卷、已知问题清单和唯一反馈渠道。
- [ ] 招募文案明确 Beta 状态、测试任务、可能重置的进度，以及经验证的 Premium 回报条件；不展示不可用价格，也不以奖励换评分或好评。
- [ ] 按 [Android 首发计划](android-launch-plan.md)邀请 25–30 人，争取 18 人实际安装；跟踪至少 12 人连续加入封闭测试满 14 天及其真实参与情况。
- [ ] 测试期间收集安装、提示、复盘、购买和隐私反馈，修复阻断问题并通过封闭测试轨道更新。可同时完善商店视频和更多展示素材。
- [ ] 达到 Google Play 要求后，在 Play Console 申请生产访问权限；通过审核且首发候选包、商店信息和商业流程复核完成后，再决定正式公开发布。

**完成标准：** 封闭测试达标并获得生产访问权限；首发候选构建和商店资料与实际体验一致。连续加入 14 天是申请门槛，不保证自动获批。

## AdMob 正式广告准备

- 2026-10-11 复核：已送审 Alpha 1.0.13（16）的 AAB（SHA-256 `0011c6d472592a51fa6ace02b4c029d23f19a3bb28f7450a041c68239be09966`）包含正式 Android App ID 和正式激励广告单元，与 AdMob 后台现有 Rewarded 单元一致。Android Release 已接入正式广告，Debug 仍用 Google 测试单元；广告网关 13 项 Jest 测试通过。正式广告配置本身无需更改；随后获批的闭测 Premium 测试广告功能另见顶部新版记录。AdMob 账号已批准，但本应用仍为 `Requires review`，未关联商店；以准确 Play URL 查询仍返回 `Can’t find your app?`。Google 要求 Android 应用公开可用后才能关联商店并完成应用就绪审核，当前闭测不能据此保证完整正式投放。模拟器自动属于测试设备，即使使用正式广告位也可显示测试广告；不能用模拟器的测试标记判断 Release 仍接测试单元。连接真机为 Play 安装的 1.0.11（13），模拟器为本地安装的 1.0.13（16）；本轮未安装、更新或清除设备数据。保留闭测临时 Premium、现有免广告规则和测试名单。依据：[商店关联要求](https://support.google.com/admob/answer/10037806?hl=en)、[应用就绪审核](https://support.google.com/admob/answer/10564477?hl=en)、[测试广告与模拟器](https://developers.google.com/admob/android/test-ads)。

- [x] 2026-09-30 在 AdMob 建立 Android 应用 `Platon Sudoku`，暂按未公开上架登记。AdMob App ID：`ca-app-pub-2934412621511527~2448169476`。
- [x] 建立可选激励广告位 `Platon Sudoku optional reward`，奖励为 1 Credit；广告位 ID：`ca-app-pub-2934412621511527/1028110741`。2026-10-01 已复核后台单元为 Rewarded、无 mediation，并将 Android 正式 App ID 和广告位接入本地代码；Android Release 使用正式单元，Debug 和尚未配置正式 AdMob 的 iOS 使用测试单元。现有 Play 1.0.2 测试包仍是旧配置；新配置已随 1.0.3（代码 5）封闭测试包送审，尚待发布及真机验收。
- [x] 2026-10-01 已发布英文欧洲法规同意消息 `Platon Sudoku — European consent`，后台状态为 Published；面向 Platon Sudoku 的欧洲经济区、英国和瑞士用户，保留“Do not consent”和“Manage options”，隐私 URL 为 `https://readytradie.com/platon-sudoku/privacy/`。发布可能需要最多一小时生效；真实设备 UMP 同意、拒绝与回访尚待验收。
- [x] 2026-10-01 按用户最新选择发布英文美国州消息 `Platon Sudoku — US state privacy`，后台状态为 Published；适用于 Platon Sudoku 的“当前及未来所有受支持美国州”，保留 Google 的允许/退出数据出售或共享选择。欧洲消息与美国州消息按各自适用地区显示，不添加全世界强制同意门槛。发布可能需要最多一小时生效，实际地区展示与隐私回访仍待设备验收。
- [x] Android 继续使用非个性化广告及默认 Google 限制数据处理（RDP）：原生启动时，在默认 SharedPreferences 写入整数 `gad_rdp=1`，早于 React Native 启动与任何广告请求；不按商店国家推断用户所在美国州。发布 Google 通用隐私消息只配置同意收集，不自动改变客户端的广告请求类型；本次没有启用个性化广告或关闭 RDP。此前以通用模板措辞为由暂缓发布的决定已被用户最新的发布要求取代。
- [x] AdMob 已关联既有的 Google Individual 付款资料 `LI, XIAOHU`（ID 末尾 `4340`）；按本人最新选择保留可收信的墨尔本地址，未修改共用付款资料。2026-10-01 用户告知账号已获批准；应用就绪审核是独立流程，不能由账号批准推定应用 Ready。
- [ ] 2026-10-01 后台新增 `Payments issue`，经用户授权只读核查，原因为银行账户待验证。验证页要求查找“2026-09-29 左右、低于 A$0.35”的 Google 小额存款；用户的 NAB 账户尚未收到。Google 官方说明通常 1–5 个工作日到账，超过 10 个工作日仍未收到时再核对银行资料并联系银行；本次未填写金额或提交验证，也未修改银行资料。广告收益仍为 A$0、付款门槛 A$100，小额验证存款不属于广告收益付款。
- [ ] 2026-10-01 用完整 Play 安装 URL 查询仍显示 `Can’t find your app?`，应用保持 `Requires review / Limited ad serving`，未与 Google Play 关联。现有测试者安装链接可用，但不代表应用已公开；Google 要求 Android 应用公开可用后才能关联 AdMob。公开上架后关联、完成应用就绪审核。
- [x] 2026-09-30 以 Cloudflare Pages 的 `platon-games-site` 接管 `readytradie.com` 和 `www.readytradie.com`。首页、隐私页和根目录 `app-ads.txt` 均返回 HTTP 200；文件内容为本 AdMob 账号提供的发布者记录，响应类型为纯文本。Play Console Website 已发布为 `https://readytradie.com`。站点源码、更新命令及 DNS 注意事项见 `site/README.md`；AdMob 抓取与应用验证仍待完成。
- [x] 2026-10-01 独立 HTTP 复核 `https://readytradie.com/app-ads.txt`：HTTP 200、`text/plain; charset=utf-8`，内容与 `pub-2934412621511527` 的授权记录一致；AdMob 应用验证尚未完成，不能用公开文件可访问代替 Google 抓取验证。
- [x] 2026-10-01 本地 Android Release AAB 构建成功，合并 Manifest 中正式 App ID 正确；广告网关与商业流程的 3 个 Jest 套件共 37 项通过，TypeScript、变更文件 ESLint、Prettier 和本地静态配置检查通过。双平台公开发行门禁仍因 iOS 测试标识、SKAdNetwork 和 Android Beta 无限提示开关而阻断。
- [x] Android RDP 最终代码的 Debug APK 与 Release AAB 重新构建通过。在 `HSP_Test_Phone_API_35` 的临时只读副本（`emulator-5556`）安装并启动 Debug 包，实际默认 SharedPreferences 中的整数 `gad_rdp` 为 `1`；原 AVD 与已运行的 `emulator-5554` 未改动。该检查验证原生配置写入，不代替真实地区的 UMP、填充或奖励验收。
- [ ] 收到小额存款后由用户按实际金额完成银行验证；公开上架后完成 AdMob 应用关联与就绪审核。将新配置通过新的 Play 测试构建送审前，用注册测试设备验证广告关闭、有效奖励、同意拒绝和隐私选项回访。该条记录对应当时闭测无限提示；当前源码采用临时 Premium；已有 20 次补贴余额保留。

## Google 官方依据

- [个人账号的封闭测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [设置内部测试与封闭测试](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [商店素材要求与可选预览视频](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [开发者身份与公开资料](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [商家收款验证](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en)
- [验证 Google 小额银行存款](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en)
- [创建应用内商品](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)；[配置购买许可测试](https://support.google.com/googleplay/android-developer/answer/6062777?hl=en)

Google Play 的菜单和政策可能变化。实际操作时以当前 Play Console 的必填任务和官方帮助为准，并将变化回写本清单。

- [x] 2026-10-09 按最新方向决定，手机／平板／折叠屏竖屏、Android TV 横屏、PC 按窗口。已补拍并上传新版英文手机及 7/10 英寸平板首页；平板横屏展示已移除。新增 TV 3 张真实游戏／提示截图及同源金属 Home 图标横幅；PC/Desktop 各 4 张真实 Android 大窗口截图（不代表 Windows/Chromebook 实机验收）。上传原件和横幅 SVG 均保留在 `.local/google-play/listing/en-GB/`。1.0.9（11）签名 APK/AAB 已构建，方向测试 4 项及相关 Jest 16 项通过；原位升级保留测试对局。本次截图草稿保存后 Console 连续闭测计数仍为 12 人／5 天，原 Alpha Active；PC/TV 尚未 Opt-in。

- [x] 用户确认在不重新计算闭测时间的条件下继续；已核对官方规则和 Console，并统一提交 1.0.9（11）及七项图片／横幅变更。Publishing overview 显示 Changes in review，Google 快速检查运行中；只重启版本审核，原 Alpha 闭测保持运行，名单、地区、加入链接与签名不变。
