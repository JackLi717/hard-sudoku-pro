# 产品分析接入与日常操作

更新：2026-10-09。适用范围为本仓库当前 Android 实现；此前上传 Play 的包不会自动获得这些能力。产品口径继续以[设计与上线前标准](../product-analytics-launch-standard.md)为准。

## 当前接入

已接入 Firebase Analytics、Crashlytics Android/NDK，以及 React Native JS 固定错误分类。核心游戏不等待分析初始化；分析失败不回滚业务事务。2026-10-10 起源码改为新安装默认开启使用分析及故障诊断，无首次分析询问或设置开关；此前已保存的关闭选择继续保留。隐私页统一以英文简短说明 Google 平台处理游戏使用、崩溃及必要技术信息，用于改善体验。

| 环境       | Firebase                                                                                                  | GA4 属性  | 构建选择                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| 正式、闭测 | [platon-sudoku-production](https://console.firebase.google.com/project/platon-sudoku-production/overview) | 558049080 | 所有 Android Release；事件保留 production/closed_beta 标记 |
| 开发调试   | [platon-sudoku-test](https://console.firebase.google.com/project/platon-sudoku-test/overview)             | 558112180 | Debug                                                      |

两个项目均为 Spark，未绑定账单账户。没有启用 BigQuery 导出、Functions、Firestore、自建后台或 Remote Config。GA4 账号为 Default Account for Firebase（411231811），可选账号数据共享关闭。两个属性已保存 UTC 时区、14 个月事件保留期。商店及 AdMob 收入仍以相应平台报表为准。

下载的 `android/firebase/{production,test}/google-services.json` 是客户端项目配置；构建时复制到被忽略的 `android/app/src/{debug,release}`。缺失配置或开发调试与正式配置的项目相同会阻止 Release 打包。2026-10-09 按产品负责人决定，闭测与公开发行共用正式项目，不再随闭测临时 Premium 开关切换 Firebase 项目。闭测 Premium 的购买转化不能用于正式收入判断。iOS 当前没有接入此 SDK，首次 Android 发行之外不适用；iOS 发行前必须单独实施及验收。

## 实际采集范围

事件契约位于 `src/application/analytics/contracts.ts`，共 37 个自定义事件。GA4 的自动事件另计，手动页面事件统一关闭原生自动页面重复跟踪。

| 范围             | 实现                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 启动、活跃、首局 | `app_ready` 耗时桶、UTC 活跃日、首局操作等待桶、首局有效游玩与完成；已有安装和关闭后重新开启不伪装新增               |
| 游戏             | 新局/重玩/重试、恢复、明确终态、有效游玩日、难度、提示/错误/撤销数；前台交互计时，操作及毫秒摘要按增量发送           |
| 提示、快速候选   | 请求、计算结果与耗时、展示及实际消费、解释/应用/关闭；快速候选生成、重新生成、取消和失败                             |
| 奖励、广告       | 每日及三格补给、实际广告奖励入账；应发和实发分开，有效零到账保留；入口曝光、点击、加载、展示、奖励回调、结束阶段分开 |
| 商业             | 商品加载、购买流程结果、恢复、权益及来源变化；不手动记收入，交易凭证和订单 ID 不上传                                 |
| 辅助功能         | 页面、复盘步数与前台时长桶、课程/技巧及访问原因、练习结果、说明查看、分享调用/失败、支持页及有限偏好变化             |
| 诊断             | 固定操作分类，每类每分钟最多一次；JS 仅保留 bundle 数字行列；不传自定义错误原文、用户文本或局面                      |

本地局 ID 仅用于首局、终态去重及当前摘要恢复，不发送 Google。事件最多 25 个白名单参数；只接受有限代码和有界数字。没有事件历史补传队列。诊断自动上传保持关闭，仅在以后启动且用户此前已允许诊断时发送待发报告；关闭或首次开启会丢弃此前无授权报告。已经到达 Google 的数据不会因本地关闭自动删除。

时长口径：`game_activity_summary.elapsed_ms` 是有效前台片段增量；`game_ended.duration_bucket` 是产品对局计时器的整局区间，两者不可相加。复盘时长是前台查看区间，自动播放步数不属于游戏玩家操作。摘要最多约一分钟才发送，午夜附近的报表日期可能偏移一个摘要周期；有效游玩日标记独立按 UTC 重置。

局终态去重保存最近 64 局，适用于正常当前结果路径；分析是尽力采集，不能充当钱包账本。安装时的本地初始钱包创建发生在采集初始化之前，不补传该奖励；当前余额按区间观察。新旧安装区分使用本地首次建库日期和对局统计，无法保证重装或延迟许可的真实安装年龄。

## 控制台字段

两个属性各登记 30 个事件维度、8 个事件指标，保留免费额度余量。平台、App 版本、系统、国家等复用 GA4 自带字段。

维度：`build_environment`、`difficulty`、`result`、`observation`、`install_age`、`entry`、`stage`、`app_language`、`entitlement`、`entitlement_source`、`duration_bucket`、`action`、`reason`、`technique`、`reward_source`、`balance_bucket`、`puzzle_kind`、`first_game`、`auto_finish`、`wait_bucket`、`cycle_day`、`new_acquisition`、`device_class`、`operation`、`span_bucket`、`access_reason`、`product`、`preference`、`value`、`lesson`。

指标：`elapsed_ms` 为毫秒；`actions`、`undos`、`hints`、`quick_pencils`、`mistakes`、`requested`、`credited` 为次数或数量。求和前必须限定事件类型，奖励数量还要限定来源；不能把提示消费标记和奖励到账数量混合。

自定义定义需要平台处理后才可在正常报告中使用。DebugView 接收、定义创建、正常报告产生数据是三个独立检查。

## 六组报告的使用口径

[正式监测报表](https://analytics.google.com/analytics/web/?authuser=0&hl=en-GB#/analysis/a411231811p558049080/edit/c1QRBk3bSqupfegI1Tp-3w) 为日常入口。前六个页签是基础事件表，各自有事件筛选、闭测与正式环境筛选、Event count 和 Total users；游戏、奖励、商业及质量页另有细分维度和相关数量指标。默认查看最近完整 28 天，质量问题先看最近 24 小时及 App 版本。商店闭测与公开发行均看正式项目、Android，默认合看 `build_environment` 为 `closed_beta` 或 `production`；需要时按该字段分开。开发调试看测试项目。不要把 28 日用户数标成 30 日 MAU。

另已保存 `07 First game funnel`：闭合漏斗，按开局、首次操作、首局有效游玩、首局完成依次匹配，允许阶段间出现其他事件；三个全局筛选为闭测或正式构建、新观测、首局 1。`08 SDK daily retention` 为 Daily/Standard、首次 SDK 触达 → Any event、Active users 的平台活跃参考，不是有效游戏留存。查看 D30 必须将日期范围扩至至少 31 天，并只使用成熟日期用户组。正式属性还没有处理后的 `first_game_engaged`，cohort 事件选择器显示 No results found，因此尚不能配置该事件起始及 `game_engaged` 返回的有效游玩 cohort；事件可选后再建立并核对分母。所有新报表仍需正常处理后的数据验收。

| 报告       | 行/筛选及核心指标                                                                                                                           | 分母与限制                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 产品总览   | `app_active_day` 用户、`game_engaged` 用户、`game_ended result=completed` 用户；商店新增、净收入和 AdMob 收入另开平台                       | GA 用户是已授权观测安装，不能等同全部玩家；活跃与有效游玩分开                                            |
| 新用户     | `observation=new`：首局 `game_started first_game=1` → `game_first_action` → `first_game_engaged` → `first_game_completed`；按难度、语言分组 | 顺序用户漏斗，各阶段显示用户数；D1/D7/D30 仅用日期已成熟、相同起始用户组，不能用当日新用户数除返访用户数 |
| 游戏与提示 | `game_ended` 按难度/结果/时长；片段摘要求和；提示按 `stage/result/action/technique`                                                         | 终态完成数 / 全部明确终态数为终态完成占比；未完成的开放局另计，不能用同日开局作分母                      |
| 奖励与广告 | `reward_granted` 按来源/周期天，比较 requested/credited；广告按入口/阶段/结果，外加 AdMob 填充及收入                                        | 有效回调、实际入账和曝光分别统计；三格补给前两格允许应发 0；奖励每日规则按本地日期                       |
| Premium    | Premium 页面 → 购买开始 → 流程结果 → 真实新权益；恢复单列；按权益来源区分闭测/审核/正式商店                                                 | 新购看 `entitlement_changed new_acquisition=1` 并限定真实商店来源，恢复不当新购；收入以 Play 财务为准    |
| 质量       | `operation_failed` 按操作/版本/设备；启动/提示耗时桶；Crashlytics + Play Android vitals                                                     | JS 非致命诊断中的 `javascript_fatal` 标记不等同 Crashlytics 原生 fatal；性能桶不是精确 P95               |

SDK 留存/GA4 cohort 只能作为安装活跃参考。严格的 Dn 有效游戏留存须使用 D0 有效游玩用户组与第 n 个 UTC 日期的 `game_engaged` 用户交集，分母只包含到达该日期的 D0 用户。免费探索无法表达特定查询或数据不足时显示“暂不可计算”，不能拿 `install_age=n` 当天用户数冒充完整留存率。

## 日常检查与免费替代

发布后每天查看新崩溃、ANR、存档/提示失败、权益与奖励异常及事件消失；每周查看新增、首局、有效游玩、难度与提示；每月结合 Play、AdMob 收入与长期留存。样本不足 100 只描述分子/分母，不自动做百分比波动预警。

两个 Firebase 项目均已为当前项目负责人账号开启新 fatal、non-fatal、ANR 的邮件通知；trending 保留邮件，regressed 保留邮件和控制台通知。fatal/ANR 突增告警保留默认的至少 25 用户、1% 阈值及邮件/控制台通知。配置已保存，实际告警投递仍待受控报告验证；Play vitals 通知另行在发布检查中核对。业务指标无法用免费自动通知表达时，人工检查上述报告。当前未创建定时机器人、账号系统或付费监控。

免费限制及处理：没有远程真实奖励账本，用本地事务与受控测试验证；没有分享安装归因，只记录分享动作并看商店来源；没有精确任意百分位，使用耗时桶；长期离线可能丢失或改变报告日期，保留限制说明；未批准 BigQuery，因此不提供无限关联或原始事件仓库。D30 数据按实际日期积累，不是上线前要伪造的验收值。

本轮未额外引入 Performance Monitoring SDK：启动、提示和有效前台片段已有直接计时，应用也没有需要监测的自有 HTTP 后台。原生启动、ANR 和渲染质量先使用 Play vitals；当前计时不覆盖所有原生帧，也不表示已经验证任意精确百分位。需要更细性能定位时，再单独验证 RN 适配、采集范围与许可控制。

## 验证与发布门槛

测试项目 DebugView 已实际收到 `app_ready`，并核对耗时参数；该结果不替代所有业务事件及正常报告验收。跨进程固定诊断测试已通过；2026-10-11 正式项目已实际接收商品加载非致命报告，完整定位验收见下。

已完成 Android Debug 原生构建、测试环境 Release 打包、R8 映射及 NDK 符号上传任务。专用模拟器原生测试已验证默认无 Firebase 初始化、独立开关、持久化和 Debug 项目隔离。自动检查覆盖关闭不补传、终态去重、UTC D1/D7/D30 标签、后台/自动收尾排除、跨日与恢复、并发许可、参数过滤及许可保存失败。

| 检查                                                | 当前结果                                                                                                                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 相关 Jest                                           | 11 个套件、218 项分批通过；与原生构建并行时课程套件 3 项超过默认 5 秒，停止构建后用命令行 30 秒上限单独复核该套件 72 项全部通过，未改测试源码门槛                                                     |
| TypeScript、修改代码 ESLint/Prettier、diff 空白检查 | 通过                                                                                                                                                                                                  |
| Android 原生许可测试                                | 专用 API 35 模拟器通过                                                                                                                                                                                |
| 测试 Release                                        | arm64 AAB、内嵌 R8 映射、独立 source map 已核对，Firebase app ID 指向测试项目；映射及 NDK 符号上传任务成功                                                                                            |
| Analytics 云端                                      | 测试项目 DebugView 收到 `app_ready` 及耗时参数；全业务事件顺序和普通报告仍待验收                                                                                                                      |
| Crashlytics 云端                                    | 2026-10-11 正式项目可见 1.0.11（13）商品加载非致命报告，首次问题邮件已收到；旧报告无 Billing 代码及可用堆栈，完整原生／JS／C++ 定位仍待验收                                                           |
| 全量 Jest                                           | 尚未全绿；复核仍失败的 4 个既有套件为 `release-scope`、`launch-copy-terminology`、`product-experience`、`game-response-performance`，涉及旧源码断言、既有文案及预发布课程开放预期，本轮未扩大范围修改 |

当前接入不能直接表述为“全部上线验收通过”。仍须按设计清单完成目标商店 Release 真机网络/断网/重启路径、广告及购买沙盒全分支、原生/JS/C++ 受控故障定位、正常处理后报表和通知投递。网站及 Play 披露的本次更新见下方发布记录。iOS 本轮不适用且未实现。

构建时保存与同一 AAB 对应的文件，避免后续覆盖造成无法定位：`android/app/build/outputs/mapping/release/mapping.txt`、`android/app/build/generated/sourcemaps/react/release/index.android.bundle.map`、实际发布 ABI 的未剥离本机库。JS 行列可使用 `metro-symbolicate` 读取同构建 source map；SDK 不会自动还原本次自定义 JS 数字帧。NDK 每次发布都显式运行 `:app:uploadCrashlyticsSymbolFileRelease`；仅打开配置不代表已上传或已证明可定位。[官方 NDK 集成说明](https://firebase.google.com/docs/crashlytics/android/get-started-ndk)

示例测试构建：

```sh
cd android
HSP_CLOSED_BETA_PREMIUM=1 ./gradlew :app:bundleRelease :app:uploadCrashlyticsSymbolFileRelease
```

公开发布构建去掉闭测环境变量并构建所有发行 ABI；不得把本次 arm64 测试产物直接上传为正式包。2026-10-08 的测试产物未上传 Play；2026-10-09 的商店闭测构建及网站发布记录见下。

## 2026-10-09 共享监测与闭测发布

产品负责人批准闭测与正式共用正式 Firebase 项目，保留 `build_environment`，Debug 仍使用独立测试项目。正式 GA4 探索的 01–07 页签已保存 `^(production|closed_beta)$` 环境筛选；08 为该项目的 SDK 日留存参考。闭测临时 Premium 保持启用，其购买转化不代表正式商业表现。

商店包为 `1.0.7` / version code `9`，使用 `HSP_CLOSED_BETA_PREMIUM=1 HSP_VERSION_CODE=9 HSP_VERSION_NAME=1.0.7` 构建全部四个 ABI。Release 打包、R8 映射上传及 NDK 符号上传任务成功；AAB 签名验证通过，内嵌映射与本地文件一致，含 40 个 native debug symbol 元数据文件。已核对包内 Firebase app ID 为正式项目且不含测试 app ID，Debug/Release 生成资源分别指向 test/production，独立 JS source map 已生成。AAB SHA-256：`c1caba00aa623487e03b9dc18d4b66d9ad08115786f36fe79cad2c91566f67f4`。符号上传首次遇到 HTTP 503，重试清理并重新生成临时符号输出后成功；这不代表运行时 Crashlytics 云端接收已验收。

隐私政策已通过 Cloudflare Pages 部署 `adb483e4` 发布到既有地址，增加独立且默认关闭的使用分析及崩溃诊断说明。部署核对保留线上首页、样式、app-ads.txt 和 Bottle Harmony 政策。Play Data safety 新增可选、非瞬时、用于分析的崩溃日志收集，并为可选购买历史增加分析用途；原有 AdMob 数据类型及共享用途保留。声明已与闭测新版一起提交；Publishing overview 确认两项均位于 `Changes in review`。

Play Closed testing — Alpha 已上传 `1.0.7 closed beta - Product analytics`（9）并提交 100% rollout。发布预览为 `Ready to release`，支持设备与 1.0.6 相同；ReTrace mapping 和 native debug symbols 均显示已附带。Publishing overview 确认 `Changes in review`，快速检查仍在运行；Managed publishing 关闭，审核批准后自动向现有闭测测试者发布，未改变测试名单或地区。测试者必须更新并主动开启对应选项才会采集；原有 1.0.6 不含本次分析能力。当前记录不表示审核通过或测试者已收到新版。

本次共享配置调整复核：分析服务、游戏观察器与许可三个 Jest 套件共 10 项通过；四 ABI Release、上传任务、签名、资源及内嵌映射检查通过，文档格式和 diff 空白检查通过。运行时 Crashlytics 云端接收及普通分析报告仍按上方门槛验收。

## 2026-10-10 默认采集与简短披露

本次范围为取消首次分析弹窗与设置开关、新安装默认开启、保留既有关闭值，以及应用内隐私和网站政策源码同步。没有改变广告 UMP、事件指标、Firebase 项目、商店轨道或设备适配。原生无自动 Firebase provider，首次安装待本地偏好可靠加载后才启用，读取失败不直接配置采集；重启继续使用已保存的内部采集状态，不把默认值记录为用户明确同意。

使用事件名称白名单，参数在分析服务及原生桥接出口再次过滤；自定义错误仍只发送固定分类和数字 JS 程序位置。该过滤不等同于保证 Google SDK 自动字段和崩溃堆栈绝不包含个人信息。隐私页不逐项列业务指标，保留 Google 平台、改进体验用途、安装标识/设备信息、卸载不删除历史报告和联系渠道的必要说明。所有应用语言统一显示 `src/ui/screens/privacy-copy.ts` 中的单份英文隐私内容，包括阿拉伯语下仍从左至右阅读；删除旧隐私翻译，其他页面继续本地化。

发布准备时已核对 Alpha 的 1.0.10（12）为 Available to selected testers。英文线上政策已通过 Cloudflare Pages 部署 `69b062c8` 更新，规范化 Cloudflare 邮箱保护后与提交源码一致；首页、样式、app-ads.txt 和 Bottle Harmony 政策的线上哈希均保持原样。Play Data safety 已将崩溃日志更新为必需采集，其他既有 AdMob 数据类型、共享用途和购买历史选择保持不变，已与新版一起送审。面向全球发行前仍须核对适用地区是否需要事先同意，不以“不请求通讯录权限”或“卸载即可”替代该项核对。

本次源码复核：分析设置、分析服务、游戏观察器及商业页面 4 个 Jest 套件共 27 项通过，包含全部 24 种应用语言下的相同英文隐私正文和阅读方向；TypeScript、变更文件 ESLint、本地化完整性（41,740 条翻译）与 diff 空白检查通过。未重做商店安装或运行时云端接收验收。

源码提交为 `7b72bf2`。签名 AAB `1.0.11`（13）使用闭测 Premium、四 ABI 和正式 Firebase 构建，上传证书与此前版本一致；R8 映射与包内映射相同，内嵌 40 份原生调试符号，独立 JS source map 非空，包内题库与当前生成基线一致。AAB SHA-256：`efd27ed4999884eeccafad23e275ea08f50ac888029ba7fb23ff9a0b568d0e22`。首次构建因启动 PNG 压缩超时失败，重试使用 Java 17，并仅对本次命令关闭 PNG crunch；未修改图片或项目构建配置。

重试的 `bundleRelease` 与 `uploadCrashlyticsSymbolFileRelease` 完成，Gradle 返回 BUILD SUCCESSFUL；Firebase 映射及原生符号上传任务成功，38 个 64 位原生库的 ELF 加载段均满足 16KB 对齐。符号上传成功不代表运行时故障报告的云端接收已验收，该项仍按上方门槛验证。

Play 已上传 `1.0.11 closed beta - Analytics and privacy`（13），发布预览 Ready to release，手机 12,345、平板 6,783、TV 3,065、Chromebook 77 均未减少，全部设备类别的排除数为 0。现有 Closed testing — Alpha 100% rollout 与 Data safety 两项变更已统一提交，Publishing overview 显示 Changes in review，快速检查运行中；Managed publishing 关闭，审核通过后自动向原测试者发布。没有修改名单、加入链接、国家或设备类别开关；当前状态不代表新版已获批或测试者已收到更新。

## 2026-10-11 商品加载问题与全球定价

正式 Crashlytics [问题 8cd2e42e4c175b65376209478e4b1e73](https://console.firebase.google.com/project/platon-sudoku-production/crashlytics/app/android:com.platongames.sudoku/issues/8cd2e42e4c175b65376209478e4b1e73?time=last-seven-days)在最近七天显示 6 次非致命事件、4 个 SDK 用户，均为 1.0.11（13）。`IllegalStateException: Sudoku operation: product_load` 是应用创建的固定分类，不代表应用崩溃或已发起付款。旧报告没有原始 Billing 代码、商品未返回状态及可用堆栈，不能把全部历史事件归因于同一原因。Crash-free、Crashes、ANR 卡片显示无数据，不能解释为零故障。

Play 实查发现 `premium/standard` 仍仅澳大利亚可用，与全球发行策略不符；Alpha 本身已覆盖 178 个国家／地区。经产品负责人确认，已保存全部商品可配置地区及新地区可用，以 US$9.99 为基准采用 Google 自动换算的本地价格（澳 A$13.99、德 €10.99、英 £8.99、日 ¥1,740、印 ₹1,150）。Google 后台显示保存成功。配置可用不等于所有地区都能实际结账，仍受 Google Play 当地服务、账号与付款条件影响。

Alpha 保持 Active，1.0.11（13）为 Available to selected testers，既有 Google Group、加入链接和临时 Premium 保留。Production 仍未开放；后台显示 12 名测试者已连续加入 8 天。许可测试仅选中 `Platon Sudoku internal` 的 1 个邮箱账号，`RESPOND_NORMALLY`，没有选中闭测 Google Group。普通闭测资格不自动免付款；非许可账号进入购买可能真实收费，见 [Play Billing 测试说明](https://developer.android.com/google/play/billing/test)。

本次源码补充固定白名单诊断：入口、连接／查询／选 offer 阶段、Billing 返回码、未返回商品状态、尝试次数及构建环境；保留原始错误代码穿过初始化边界，附数字 JS 帧，不发送原始错误文本、账号、订单或 purchase token。Crashlytics 自定义键按每次异常设置，避免上一次操作的字段污染下一次报告。关闭采集与限频机制保留。

闭测临时 Premium 启动及已有权益的 Premium 页面不再自动查询商品价格，保留永久权益同步与恢复。普通免费构建只有点击购买才调用 Google Play 结账；`PURCHASED` 经当前权益刷新确认且本地保存后才 acknowledge，`PENDING` 不授予权益。该流水线保持原样。本次另启用 Billing 官方自动服务重连，并修正离线错误分类。

相关 Jest 7 套件 71 项、TypeScript、修改代码 ESLint 与 diff 检查通过；Android codegen、Debug/Release Kotlin 编译通过。修复源码为 `4637b4e`。已连接并授权 TCL T517D（Android 15），手机现有 Play 安装版本为 1.0.11（13），Play 登录账号与现有许可测试名单一致。当时购买验收尚未开始；后续本地 Release 15 的许可测试结果见下，不能将模拟器结论等同于手机 Play 安装验收。

Alpha 签名 1.0.12（14）已构建成功，闭测临时 Premium 开启，四 ABI、38 个 64 位库的 16KB 对齐、40 份内嵌原生符号、包内 R8 映射、独立 JS source map、当前题库一致性与上传证书检查通过，Firebase R8／NDK 符号上传任务成功。AAB SHA-256：`e0a3fbc4c4861c5bfef761ebb45dd14bd2e2b8d273f9c2c360539e68711a6eed`。内部购买测试版使用独立 version code 15，关闭构建中的临时 Premium；Alpha 包单独保留，不复用该测试包。发布／购买验收状态以下续记为准。

Alpha 14 已以 `1.0.12 closed beta - Billing diagnostics`、100% rollout 送审。Publishing overview 已确认 **Changes in review**，快速检查运行中，Managed publishing 保持关闭；审核通过后自动发给原测试者，尚不能表述为已送达手机。发布预览所有设备类别零排除，手机 12,345、平板 6,783、TV 3,065、Chromebook 77 不变；这不新增未验收设备类别的支持承诺。未修改 Alpha 名单、Google Group、加入链接、国家配置或设备类别开关。送审前 Dashboard 仍显示 12 名测试者连续加入 8 天。

后续按产品负责人补充指示，所有测试者继续使用原封闭测试，**不发布内部测试轨道、不要求为购买验收切换加入资格**。version code 15（`1.0.12-internal`）仅作为购买验收包；本机构建通过，临时 Premium 关闭，R8 映射上传成功。其原生二进制逐个比对与 Alpha 14 相同，沿用已上传的原生符号。AAB SHA-256：`6733af86be0a1fdd7ffbfb3da00f82918d4e3acb553ee5966bf6e4b479c5a34f`。Play 中只保存 `Local purchase validation - unpublished (15)` 草稿，没有发布内部轨道。

手机已有 Google Play 签名应用，电脑上传密钥签名 APK 不能原位覆盖。尝试从 Play 草稿下载 Google 签名 APK 时，Chrome 下载失败并显示 `ERR_BLOCKED_BY_CLIENT`；未绕过浏览器保护，也未卸载手机应用或清除数据。改用专用 Google Play API 35 模拟器 `HSP_Test_Phone_API_35`：将同一 Release 15 APK 仅重新签为既有测试密钥，成功原位更新模拟器中的开发包，无需 Metro 或发布轨道。Google 官方支持许可测试账号侧载相同包名、不同测试签名的应用，见[购买测试说明](https://developer.android.com/google/play/billing/test)。产品负责人随后手动登录现有许可账号，实际购买验收结果见下。澳大利亚原本就在商品可用地区，因此仅澳洲的旧配置不能解释澳洲用户的历史加载失败，仍需新诊断或可复现的 Billing 返回码确认。

### 本地 Google Play 许可购买验收

2026-10-11 在上述 API 35 模拟器执行同一 Release 15 的 Google Play 许可测试，没有使用模拟购买网关；测试版关闭临时 Premium。结账页明确显示 `This is a test order, you will not be charged.`，只使用 Google 测试卡，没有真实扣款。后台商品为 `premium/standard`、一次性 Lifetime Premium、澳大利亚账单地区，订单收入 AUD 0.00。

| 路径               | 实际结果                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 商品与价格         | Premium 页加载 `$13.99`，购买按钮可用；Google 结账及后台确认 AUD 13.99                                                                                   |
| 用户取消           | 返回 `Purchase cancelled. Nothing changed.`，未授予 Premium                                                                                              |
| 即时拒付           | `Test card, always declines` 在 Google 显示拒付；应用未授予 Premium，仍可重试                                                                            |
| 待付款             | 慢速批准测试卡下单后显示 pending，仍为免费权益，没有提前解锁                                                                                             |
| 待付款转成功       | Play 历史显示 06:39:45 UTC Pending、06:40:47 UTC Processed；应用停止后重新打开，从商店读到永久 Premium                                                   |
| 即时成功与重新购买 | 撤销后改用 `Test card, always approves`，Google 显示 Payment successful，应用直接显示 Premium is active；第二笔测试订单 06:48 UTC 为 Processed           |
| 已购买页面与恢复   | 显示 `Premium is active`，不再显示购买按钮；设置中恢复显示 `Your store purchase was restored.`                                                           |
| 退款与撤销         | 对该免费测试订单执行退款并勾选 Remove entitlement；后台 06:46:46 UTC 为 Refunded。恢复提示未找到购买，应用重启同步后显示免费购买页和 A$13.99，可再次购买 |

第一笔订单成功超过三分钟后仍为 Processed，直到上述手动退款；没有出现未确认测试订单的自动退款。Console 本页未直接显示 acknowledge 字段，不将该现象写成直接读取到该字段。

本次发现两项边界：Google 即时拒付在应用中仍显示通用“商店不可用”文案，权益处理正确但提示不够准确；退款撤销后，主动恢复返回未找到购买时，当前页面仍暂存 Premium，重启启动同步才回收。未在本次验收中修改这两个既有行为。尚未验证清空数据／重装恢复、真实银行卡扣款、其他国家结账，以及手机上由 Play 分发签名的购买版本；不能据此标记全部购买分支或全球结账已通过。澳大利亚历史加载失败仍缺少旧 Billing 代码，当前成功不能反推旧事件根因。

同日已重新核对原 Alpha：`1.0.12 closed beta - Billing diagnostics` 为 **Available to selected testers**，显示 **Released on 11 Oct 17:32**；轨道 Active、178 个国家／地区。审核已通过，商店更新向原测试者开放，但不代表所有手机已经完成更新。Release 15 仍只作本地购买验收，内部草稿没有发布，临时 Premium 与原测试名单不变。
