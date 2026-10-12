# 产品分析接入与日常操作

更新：2026-10-12。适用范围为本仓库当前 Android 实现；此前上传 Play 的包不会自动获得这些能力。产品口径继续以[设计与上线前标准](../product-analytics-launch-standard.md)为准。

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

本地局 ID 仅用于首局、终态去重及当前摘要恢复，不发送 Google。事件最多 25 个白名单参数；只接受有限代码和有界数字。采集设置和本地观测状态已加载且允许分析后，SDK 配置期间最多暂存 64 条脱敏事件，仅在内存中按发生顺序发送；关闭、退出、初始化失败或超出上限即丢弃，不补传开启采集前的历史。没有完整观测开局的当前局或恢复局只记后续常规行为，不伪装完整首局，也不把下一局改称首局。诊断自动上传保持关闭，仅在以后启动且用户此前已允许诊断时发送待发报告；关闭或首次开启会丢弃此前无授权报告。已经到达 Google 的数据不会因本地关闭自动删除。

时长口径：`game_activity_summary.elapsed_ms` 是有效前台片段增量；`game_ended.duration_bucket` 是产品对局计时器的整局区间，两者不可相加。复盘时长是前台查看区间，自动播放步数不属于游戏玩家操作。摘要最多约一分钟才发送，午夜附近的报表日期可能偏移一个摘要周期；有效游玩日标记独立按 UTC 重置。

局终态去重保存最近 64 局，适用于正常当前结果路径；分析是尽力采集，不能充当钱包账本。安装时的本地初始钱包创建发生在采集初始化之前，不补传该奖励；当前余额按区间观察。新旧安装区分使用本地首次建库日期和对局统计，无法保证重装或延迟许可的真实安装年龄。

## 控制台字段

两个属性各登记 30 个事件维度、8 个事件指标，保留免费额度余量。平台、App 版本、系统、国家等复用 GA4 自带字段。

维度：`build_environment`、`difficulty`、`result`、`observation`、`install_age`、`entry`、`stage`、`app_language`、`entitlement`、`entitlement_source`、`duration_bucket`、`action`、`reason`、`technique`、`reward_source`、`balance_bucket`、`puzzle_kind`、`first_game`、`auto_finish`、`wait_bucket`、`cycle_day`、`new_acquisition`、`device_class`、`operation`、`span_bucket`、`access_reason`、`product`、`preference`、`value`、`lesson`。

指标：`elapsed_ms` 为毫秒；`actions`、`undos`、`hints`、`quick_pencils`、`mistakes`、`requested`、`credited` 为次数或数量。求和前必须限定事件类型，奖励数量还要限定来源；不能把提示消费标记和奖励到账数量混合。

自定义定义需要平台处理后才可在正常报告中使用。DebugView 接收、定义创建、正常报告产生数据是三个独立检查。

`difficulty` 的发送值为 `level_1`…`level_5`，分别对应应用难度 1…5；`first_game` 为 `yes` / `no`。统一在参数契约边界编码，重复脱敏不会改变分类；`actions`、`elapsed_ms` 等指标仍为数值。不要发送数值或纯数字字符串作为这两个分类维度：[Google 说明](https://support.google.com/analytics/answer/14239696?hl=en)指出，应用的整数事件参数不能按事件范围自定义维度解析。已有 `difficulty` / `first_game` 事件维度登记保持不变，历史缺失值不能通过更改报表补回。

## 六组报告的使用口径

[正式监测报表](https://analytics.google.com/analytics/web/?authuser=0&hl=en-GB#/analysis/a411231811p558049080/edit/c1QRBk3bSqupfegI1Tp-3w) 为日常入口。前六个页签是基础事件表，各自有事件筛选、闭测与正式环境筛选、Event count 和 Total users；游戏、奖励、商业及质量页另有细分维度和相关数量指标。默认查看最近完整 28 天，质量问题先看最近 24 小时及 App 版本。商店闭测与公开发行均看正式项目、Android，默认合看 `build_environment` 为 `closed_beta` 或 `production`；需要时按该字段分开。开发调试看测试项目。不要把 28 日用户数标成 30 日 MAU。

另已保存 `07 First game funnel`：闭合漏斗，按开局、首次操作、首局有效游玩、首局完成依次匹配，允许阶段间出现其他事件；三个全局筛选为闭测或正式构建、新观测、首局 `yes`。`08 SDK daily retention` 为 Daily/Standard、首次 SDK 触达 → Any event、Active users 的平台活跃参考，不是有效游戏留存。查看 D30 必须将日期范围扩至至少 31 天，并只使用成熟日期用户组。创建这些报告时，正式属性的 cohort 事件选择器对 `first_game_engaged` 显示 No results found，未配置该事件起始及 `game_engaged` 返回的有效游玩 cohort；事件可选后再建立并核对分母。所有新报表仍需正常处理后的数据验收。

| 报告       | 行/筛选及核心指标                                                                                                                           | 分母与限制                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 产品总览   | `app_active_day` 用户、`game_engaged` 用户、`game_ended result=completed` 用户；商店新增、净收入和 AdMob 收入另开平台                       | GA 用户是已授权观测安装，不能等同全部玩家；活跃与有效游玩分开                                            |
| 新用户     | `observation=new`：首局 `game_started first_game=yes` → `game_first_action` → `first_game_engaged` → `first_game_completed`；按难度、语言分组 | 顺序用户漏斗，各阶段显示用户数；D1/D7/D30 仅用日期已成熟、相同起始用户组，不能用当日新用户数除返访用户数 |
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

### 2026-10-12 首局修复验证（未发布）

本轮修改两个分类字段、首局观测资格和 SDK 初始化缓冲。正式报表 `02 New player milestones`、`07 First game funnel` 已保存 `First game exactly matches yes`，保留 `Observation=new` 和 `Build environment=production|closed_beta`；`03 Game and hints` 的 Difficulty 行维度正确，无需重建登记。

相关 Jest 5 套件 / 65 项通过，覆盖真实游戏引擎填写 51 个空格、有效前台 60 秒、完整四步顺序、SDK 延迟、开启前操作、恢复局、已有用户、失败 / 关闭 / 缓冲上限、初始化中进程退出的未发送状态，以及跨重启去重。TypeScript、修改范围 ESLint / Prettier、diff 空白检查通过。Android Debug 和 androidTest 构建通过，未修改版本号、上传或发布。

一次性 API 35 模拟器运行 `telemetryProbe=funnel` 原生测试 1 项通过。该测试重放真实 TS 游戏引擎 → observer → native gateway 回归所产出的脱敏事件，不是人工操作整局的 UI 验收。测试强制 Debug 构建及 `platon-sudoku-test`，通过实际 Firebase SDK 上传；云端 DebugView 收到四阶段各 1 次，逐项核对 `difficulty=level_3`、`first_game=yes`，并确认 `observation=new`、`build_environment=development`。未向正式项目注入测试事件，未清空原模拟器或实体手机。

导出可供该原生探针使用的事件契约：

```sh
HSP_ANALYTICS_PROBE_OUTPUT=/private/tmp/hsp-first-game-events.json npm test -- --runInBand --no-watchman __tests__/analytics-first-game-funnel.test.ts
```

将输出 JSON 的 Base64 作为 instrumentation 参数 `funnelEvents`，仅在一次性测试设备运行 `ProductTelemetryTest` 的 `telemetryProbe=funnel`。DebugView 验证不等于正常处理后探索验收；本轮未发布，正式报表仍需未来获准发布的修复版产生新数据，历史 `(not set)` 无法补回。

### 其他业务与发布验收

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
HSP_CLOSED_BETA_TEST=1 ./gradlew :app:bundleRelease :app:uploadCrashlyticsSymbolFileRelease
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

### 1.0.13 拒付提示与退款刷新修复

按产品负责人授权，仅修复上述两项边界，源码提交 `424b3b4`。购买回调的支付未完成与明确余额不足使用付款检查提示，不把所有 Billing code 3 都判为银行卡拒付；连接和商品查询错误继续沿用原分类。参考 [Google Billing 错误说明](https://developer.android.com/google/play/billing/errors)。恢复未找到购买时，再取得商店的明确 `not_entitled` 结果后回收永久权益；离线、失败和待付款均不能撤销缓存权益，临时闭测 Premium 仍由原开关保留。

相关 Jest 6 套件／86 项、TypeScript、修改范围 ESLint、本地化完整性（24 语种、41,760 项）及 Android 原生 4 项测试通过。新增覆盖退款后即时回收、闭测覆盖保留、离线／失败／待付款保护、恢复期间状态变化及并发锁。未把此前无关全量测试失败计入本次通过结论。

同一 API 35 Google Play 模拟器安装关闭临时 Premium 的本地 Release 16（1.0.13），沿用已登录许可账号和原数据，无需加入内部测试。Google 结账明确为不扣费测试订单。实测取消后无权益；即时拒付后显示 `Payment was not completed. Check the message and payment method in Google Play, then try again.`，可重试且不解锁；澳洲商品和结账均为 A$13.99。对旧有效测试订单于 07:04:05 UTC 退款并移除权益，应用始终停留在 Premium 页，点击恢复立即显示免费购买页，无需重启。

慢速拒付测试经过 Pending 后，后台最终为 Cancelled，应用恢复查询未找到购买且保持免费。待付款期间主动恢复仍使用既有通用商店不可用提示（原生返回 unavailable/pending），没有提前授予或错误回收权益；该文案不属于本次两项修复，保留为后续提示优化项。

待付款转成功订单历史为 07:10:33 UTC Pending、07:11:35 UTC Processed；应用在待付款阶段停止，完成后启动自动恢复永久 Premium。主动恢复显示购买已恢复，已购页无购买按钮。随后 07:14:24 UTC 撤销该测试订单，保持设置页前台点击恢复，再打开 Premium 页立即为免费状态，第二入口也无需重启。即时批准测试卡重新下单后直接激活 Premium，未使用模拟网关。

Alpha 1.0.13（16）单独以 `HSP_CLOSED_BETA_PREMIUM=1` 构建，正式 Firebase、原上传证书和 JAR 签名验证通过；四 ABI、38 个 64 位原生库的 16KB 对齐、APK zipalign、40 份内嵌原生符号、R8 映射、JS source map、当前题库一致性均通过。Gradle bundle／APK 及 Crashlytics R8／NDK 符号上传成功。AAB SHA-256：`0011c6d472592a51fa6ace02b4c029d23f19a3bb28f7450a041c68239be09966`。

最后一笔即时成功测试订单已退款并移除权益，购买验收包恢复后确认为免费。随后仅在同一专用模拟器覆盖安装 Alpha 16 的调试重签验收副本，保留数据；ADB 确认 version code 16／1.0.13。没有永久购买时显示 `Closed-test Premium`，再次主动恢复虽提示未找到商店购买，闭测临时权益仍保持开启且不显示购买按钮。未卸载／清空实体手机，未修改测试者资格，也没有发布内部测试。

本次不覆盖真实银行卡扣款、其他国家实际结账、清空数据／重装恢复和实体手机的 Play 分发签名购买；离线／失败时保留权益已由自动化测试覆盖，没有将其写成断网设备实测。历史澳大利亚加载失败仍缺少旧 Billing 代码，当前购买成功不能反推旧问题根因。

Play 发布预览为 `Ready to release`，16（1.0.13）、100% rollout，所有设备类别零新增排除：手机 12,345、平板 6,783、TV 3,065、Chromebook 77 不变。仅更新原 Alpha 的安装包和本次修复说明，未修改国家、设备类别开关、测试群或加入链接；兼容数量不代表增加新的设备验收承诺。

2026-10-11 18:21（Australia/Melbourne）已将 `1.0.13 closed beta - Purchase fixes` 提交现有 Alpha，Publishing overview 明确显示 **Changes in review**，快速检查运行中，Managed publishing 保持关闭，批准后自动向原测试者开放。当前不能表述为已审核通过或已送达手机；原 1.0.12 的闭测继续可用。内部轨道未发布，原 Google Group、加入链接、178 个国家／地区及名单均未变。


## 2026-10-12 Billing 功能检查与环境诊断（未发布）

本轮边界：按用户授权，只修复 Android 商品查询功能检查、Premium 页错误提示及必要的环境诊断，补测试并验证商品加载和已购权益恢复；不增加版本号、不上传 Play、不发布、不改变商品、价格、地区或测试者配置。保留此前尚未发布的分析埋点修复及其他工作区变更。

正式 GA4 截至 10 月 11 日的 28 天 `product_load_result`：1.0.11 失败 24／成功 13，1.0.12-internal 失败 7／成功 3，1.0.15 失败 7／成功 1；1.0.7 和 1.0.13 各成功 2，1.0.12／1.0.14 无查询事件。最新版七次失败均为 startup／query_product／feature_unsupported，交叉筛选均为 IN2025、Android 11；按发布版本代码映射可确定 Billing 返回 -2，无法从旧数据确定 Play 组件版本或是否为自动化测试。Crashlytics 最近七天的 11 次／6 个 SDK 用户均为 1.0.11，不能据此认定最新版无失败。

商品查询及购买前现在检查 `BillingClient.FeatureType.PRODUCT_DETAILS`。检查失败在 `check_feature` 阶段直接返回原 Billing 码，不查询商品、不自动重试；检查通过后的查询错误仍归 `query_product`，避免把后续 -2 错写为检查阶段不支持。已购查询、恢复及签名验证保持独立；商品失败清空过期价格，但不能撤销已购权益。Premium 页对 feature_unsupported 提示更新 Google Play 商店与 Google Play 服务后重试，仍可继续游戏及主动恢复；手动重试会重新检查功能。提示已补齐 24 语种。依据：[Billing 错误处理](https://developer.android.com/google/play/billing/errors)、[Test Lab 标记读取](https://firebase.google.com/docs/test-lab/android/android-studio#modify_instrumented_test_behavior_for_test_lab)。

Analytics 成功／失败事件及 JS 诊断入口已携带安全的功能／环境信息，沿用现有分析和诊断独立采集开关；2026-10-12 后续云端复核发现 Crashlytics 原生白名单尚未接入新增字段，详见下方复核记录，不能表述为全链路已完成。只查询 com.android.vending、com.google.android.gms 两个包，不读取账户、设备标识或任意已装应用；版本字段为十进制 versionCode 字符串，不能读取时为 missing／unknown。`standard` 仅表示没有 Firebase Test Lab 标记，不证明是真人。

正式属性 558049080 与测试属性 558112180 已各保存以下五个事件级自定义维度（总数均为 35），未改现有业务报表筛选：

| 维度 | 参数 |
| --- | --- |
| Billing response | billing_response |
| Product details support | product_details_support |
| Play Store version | play_store_version |
| Play services version | play_services_version |
| Test environment | test_environment |

新增维度不会回填历史记录；代码未发布前，线上旧版不产生新增环境字段。后续分析应同时按版本、入口、阶段、原因及 test_environment 查看，保留未标记／旧版记录，不把缺少 test_lab 标记当作真人证明。

验证：124 项相关 Jest、TypeScript、修改范围 ESLint、Prettier、24 语种／41,740 项本地化检查及 git diff --check 通过；Android Debug／Release 构建、10 项 JVM 测试及 5 项仪器测试通过。Release 本地构建禁用了 Crashlytics mapping／symbol 上传。专用 Google Play API 35 模拟器保留数据覆盖安装本地 Debug 1.0.15（18）：生产查询代码返回 $13.99；模拟不支持后，独立已购查询返回 OK。环境实际为 supported、Play Store versionCode 85343440、Play services versionCode 263332035、standard。未操作连接真机、未清空数据、未发起购买或退款。

此阶段验证边界：API 35 查询时账号有效 Premium 订单为 0，所以当时真实 Play 只验证商品和空已购查询；已有有效订单的启动恢复、主动恢复、价格查询失败不影响恢复／缓存权益，当时由自动化测试覆盖。后续 Android 11 实际购买及恢复结果见下。原 IN2025 环境、更新其 Play 组件后的恢复，以及新增字段的云端事件接收，仍未实测；不把 10 月 11 日的许可购买验收写成本轮结果。

### Android 11 模拟器补测

用户补充说明：历史商品仅开放澳大利亚、其他市场未开价格的问题已在上一版解决。本轮不再调整价格或地区，也不把该历史配置直接认定为最新版 `feature_unsupported` 的原因。

新增仅用于仪器测试的 `billingProbe=compatibility`，比较发布版原有的直接 ProductDetails 查询与修复后的功能检查／查询，并独立读取已购结果；只记录返回码、是否找到商品、价格、阶段和订单数量，不发起购买。该探针允许输出外部环境失败，因此仪器测试完成不等于商品查询成功，必须单独核对日志。

在原 API 35 模拟器实际比较：Billing 连接 0、原查询 0／找到 premium／$13.99、功能检查 0、修复查询 0／query_product／supported／$13.99、已购查询 0／Premium 数量 0。包含探针的仪器测试 6 项完成。

已安装官方 `system-images/android-30/google_apis_playstore/arm64-v8a` revision 10，创建独立 `HSP_Billing_API_30`（Pixel 4a 配置、Android 11／API 30、emulator-5556），安装同一本地 Debug 1.0.15（18）及测试 APK。镜像初始未登录 Google Play，实际 Billing 连接返回 3／BILLING_UNAVAILABLE，SDK 日志为 `In-app billing API version 3 is not supported on this device.`，尚未进入商品或功能查询；不能把这一结果归为原 IN2025 的 -2。初始环境为 Play Store versionCode 82302110、Play services versionCode 201817019、standard。四项逻辑／环境测试通过；登录后的真实结果见下。

用户反馈屏幕软键盘可输入、Mac 实体键盘不能输入。新 AVD 默认 `hw.keyboard=no`，按用户授权改为 `yes` 并冷启动，未清空数据；运行配置确认 `hw.keyboard=true`，Android 输入系统已识别启用的 qwerty2 字母键盘，系统配置为 `qwerty/v/v`。随后由 Android Studio Running Devices 启动同一 AVD 并开启 Hardware Input；用户已完成 Google 两步验证，Play 首页确认登录成功。实体键盘的用户实际输入尚未收到独立确认，不将账号登录完成等同于该项验收。

2026-10-12 12:29～12:30（Australia/Melbourne），在登录后的 Android 11 模拟器执行真实 Billing 对比及严格成功断言探针：

| 检查 | 实际结果 |
| --- | --- |
| Billing 初始化 | 0／OK |
| 原直接 ProductDetails 查询 | 0／OK，找到 premium，价格 $13.99，无 unfetched 状态 |
| PRODUCT_DETAILS 功能检查 | 0／OK |
| 修复后的商品查询 | 0／OK，query_product／supported，价格 $13.99 |
| 独立已购查询 | 0／OK，Premium 订单数量 0 |
| 模拟功能不支持后的独立已购查询 | 严格 live 探针通过，商品查询失败不会阻止实际已购查询 |

四项逻辑／环境检查、真实对比探针和严格 live 探针均通过。此时 Play Store versionCode 已为 85354820，Play services versionCode 已为 263737022，test_environment 为 standard；登录期间 Play 组件也已更新，未人为回退组件，因此不能隔离认定初始 code 3 是仅由未登录或仅由旧组件导致。

此阶段结论：已登录、已更新 Play 组件的 Android 11 模拟器没有复现 -2，且原查询同样成功；Android 11 本身不足以解释原 IN2025 失败。本次不确定原设备的 Play 组件、账号及测试环境，也未证明原设备问题已修复。12:29～12:30 查询时账号无有效 Premium 订单，真实已购验证仅覆盖空结果；后续实际订单验证见下。此阶段未发起购买／退款、未发布、未更改价格或地区。新增环境字段云端接收仍未验证。

### Android 11 不扣费许可订单与商品失败恢复验收

2026-10-12 按用户追加授权，仅在 `HSP_Billing_API_30` 使用已有许可账号进行实际购买与恢复。安装本地 Debug 1.0.15（18），`HSP_CLOSED_BETA_TEST=0`；未增加版本号、未上传／发布、未操作实体手机，也未改商品价格、地区或测试者配置。

12:40 左右，Google 结账页明确显示 `Test card, always approves` 和 `This is a test order, you will not be charged.`；商品为 Lifetime Premium，显示 $13.99，条款地区 Australia。用户确认后提交测试订单，Google 显示 Payment successful。后续“购买是否要求身份验证”的确认由用户亲自完成；自动审批曾拒绝代理点击最终 OK，没有绕过。应用随即显示 Premium is active，Premium 页主动恢复提示 Your store purchase was restored。

12:45 的严格原生 live 探针使用 `requireOwned=true`：真实 Play 查询找到 1 笔 premium，断言 PURCHASED、已 acknowledge、未暂停，并通过生产 `GooglePlayPurchaseVerifier` 的实际签名校验；模拟 PRODUCT_DETAILS 不支持后，独立的真实已购查询仍返回 OK。四项逻辑／环境检查及严格 live 探针通过，仪器报告为 6 项通过（兼容性探针在该模式下不执行）。

为排除沿用旧缓存，新增仅打包于 androidTest 的显式 opt-in 缓存验收工具：`resetPremiumCache=true` 仅将 `files/databases/user.sqlite` 的 premium 权益行 active 置 0；不删除数据库、不改其他进度或 Google 订单。`verifyPremiumCache=true` 要求该行 active 为 1。12:45:54 缓存重置后，以正常脚本启动应用，12:46:40 验证缓存已恢复为 active=1。

故障分支使用仓库外 `/tmp` 中的临时 Metro transformer，仅把 Android 购买网关的商品读取替换为 `billing_-2`／check_feature／unsupported；原生恢复、启动权益刷新、生产验签和本地权益持久化均沿用真实实现。通过本机 loopback 验收接收器记录三类安全标记，只含故障码、状态及交易数量，不传账户、订单 ID 或购买 token。该脚本从未写入应用源码或发布包。

| 时间（Australia/Melbourne） | 真实结果 |
| --- | --- |
| 12:49:05 | 再次断言本地 premium 缓存 inactive |
| 12:49:20.716 | 应用实际执行临时商品失败分支，billing_-2 |
| 12:49:20.893 | 同次启动的真实 Play 权益刷新返回 verified，1 笔交易 |
| 12:49:56.112 | 在设置页主动恢复，真实原生恢复返回 restored，1 笔交易；界面提示已恢复 |
| 恢复后 | Premium 页显示已激活；再次运行缓存校验，active=1 断言通过 |

正常与故障环境下的缓存重置／校验均通过。故障是有意注入，只证明该失败分支不会阻断真实已购恢复，不代表已复现 IN2025 的原始 -2 根因。验收结束后停止临时故障服务与标记接收器，恢复普通 Metro。保留这笔有效、不扣费的测试订单供后续验证，未执行退款或撤销；未覆盖真实银行卡、其他地区实际购买或原 IN2025 真机。新增环境字段的云端接收仍未验证。

### Firebase 购买与恢复云端复核（暂不发布）

2026-10-12 13:02～13:12（Australia/Melbourne）只核对上轮实际许可订单和临时商品故障的云端记录，未重复购买、退款、上传或发布。读取测试 GA4 属性 558112180 的实时事件明细／DebugView，以及 platon-sudoku-test 的 Crashlytics；不把 Debug 数据当作正式线上效果。本轮没有修改应用实现。

初次打开 DebugView 时为 0 台调试设备；原验收没有开启 adb 调试标记，因此初始空白不能判定未上传。随后界面实际出现原验收时间的历史事件，逐项读取如下；不声称现在开启调试能补造过去的购买。专用模拟器临时开启的 Firebase debug 标记及 verbose 日志已在核对后关闭。

| 本地事件时间 | 云端实际核对结果 |
| --- | --- |
| 12:44:06 | purchase_result，result=purchased；对应原 Google 许可订单完成后的回调 |
| 12:44:28、12:49:56 | restore_result 共 2 次；故障期间 12:49:56 的 result=restored 已逐项展开核对 |
| 12:44:05 | entitlement_changed：previous_entitlement=free、entitlement=premium、entitlement_source=store_verified；但 new_acquisition=0，见下方缺陷 |
| 12:49:20 | 注入故障的 product_load_result：failed、check_feature、feature_unsupported、billing_response=-2、product_details_support=unsupported |
| 12:46:19～20 | 正常 product_load_result：success、product_details_support=supported、play_store_version=85354820、play_services_version=263737022、test_environment=standard、build_environment=development；四个新增环境参数实际已到达 Analytics |
| 12:49:19 | Crashlytics 收到 1 条 product_load 非致命报告，版本 1.0.15（18）、Sdk_gphone_arm64、Android 11；billing_response=-2、entry=startup、reason=feature_unsupported、error_code=billing_-2 等到达，但 stage 和 product_details_support 缺失 |

发现两项需要在发布前修正的问题：

1. **Crashlytics 原生字段过滤遗漏。** ProductTelemetryModule.kt 的错误详情白名单没有 check_feature 阶段，也没有四个新环境字段。Analytics 路径不受此过滤影响，因此 Analytics 有字段并不代表 Crashlytics 也有。该轮故障注入只提供了 support，没有提供两个组件版本及 test_environment，故不能把这三个值在故障报告中的缺失全部归因于丢弃；但从原生白名单可确定即使 JS 传入它们也不会写入 Crashlytics。建议补齐受限分类和版本格式过滤，并覆盖真实原生过滤边界及云端故障报告。
2. **直接购买漏记新购。** 真实新购的权益事件被标成 new_acquisition=0；controller.purchasePremium 在 purchased 分支传 processTransaction(transaction, false)，只产生普通变化事件。HEAD 中也已有此逻辑，是本次核对发现的既有埋点缺陷，不能归为本轮 Billing 功能检查引入。建议依据已验证交易的新购标记修正直接购买路径，测试首次直接购买恰好一次新购、恢复与重复查询不记新购，以及重启去重。

相关 8 个 Jest 套件／115 项本轮复跑通过，包括购买控制器、购买网关、商业页面、商品诊断、分析服务和完整首局契约。全量 Jest 尝试仅完成首个 game-screen-preferences 套件后持续运行且没有继续输出，已中止；本轮没有完整全量通过结果，不把旧记录中四个失败套件当作本轮复测结论，也没有改动这些范围外测试。

未完成或证据不足：正式 Release／正式 Firebase 收到本次修复的事件、新增维度正常处理后的报表筛选与数值格式、完整故障环境字段到达 Crashlytics、修正后的直接购买新购标记、原 IN2025 环境及其 -2 根因、全部设备与网络分支、完整回归。Google 对新增自定义维度说明通常需 24～48 小时处理，DebugView 明细不能替代普通报表验收（https://support.google.com/analytics/answer/14240153?hl=en）。已更新 Play 组件的 Android 11 模拟器正常查询未复现 -2，仍不能推出原设备旧问题已消失，也不能保证没有任何新问题。

发布判断：购买／恢复功能证据积极，但诊断链路和新购统计尚有明确遗漏，暂不满足用户本次有条件发布的前提。本轮保持未发布；优先补齐两处遗漏、补测试并复核云端后，再按原 Closed testing — Alpha 更新流程评估发布，保留现有测试与分发配置。

### Crashlytics 环境字段与直接新购统计修复复验（暂不发布）

2026-10-12 后续按用户授权，仅修复上述两处遗漏及对应测试。Crashlytics 的事件详情过滤提取为 ProductDiagnosticDetails，补齐 check_feature、product_details_support、play_store_version、play_services_version、test_environment；分类值和版本格式仍严格受限，不上传任意错误文本、账户或交易凭据，也不复用上一条事件的诊断字段。直接购买将“记录新购”与“外部购买成功提示”分开，依据已验证交易的新购标记，在权益持久化成功后记录一次 new_acquisition=1；直接购买的现有成功 UI 保持不变。已有永久权益、恢复、重复查询及重启不重复计入新购。保存失败不计数、不确认订单；保存成功后的确认失败，重启重试也不重复计数。

本轮 9 个相关 Jest 套件／121 项测试、TypeScript、修改范围 ESLint、Prettier 通过；新增 6 项贯穿真实购买网关、控制器、SQLite 权益存储、Analytics 服务和原生事件序列化的回归测试，覆盖新购、false／缺省标记、恢复、重复处理、重启、保存失败和确认失败。Android Debug／测试 APK 构建及 10 项 JVM 测试通过。首轮安装因忘记沿用环境版本变量而被系统拒绝回退，随后的原生类缺失结果不作为代码回归；已按原 1.0.15（18）重建并保留数据覆盖安装，无版本递增。修复包的 4 项实际 Android 字段过滤测试和 6 项 Billing 测试通过；其中严格 live 查询实际返回 $13.99、已购订单 1 笔，签名验证、PURCHASED、已确认和未暂停断言通过。未发起新购买或退款。

云端仅使用 platon-sudoku-test／GA4 558112180，Android 11 专用模拟器 HSP_Billing_API_30。购买事件探针重放上述回归测试实际产生的原生 Analytics 合约输出，商店响应是 fixture；它证明修复逻辑与 Firebase 传输契约，不是第二笔 Google 许可订单。故障探针强制 unsupported，但两个 Play 组件版本与测试环境来自实际模拟器，调用实际 ProductTelemetry.error 及新原生过滤器。

| 本地事件时间 | 云端实际核对结果 |
| --- | --- |
| 13:26:23 | 受控 purchase_result=purchased；entitlement_changed 的 new_acquisition=1 恰好一次，重复刷新、恢复和重启产生的其他权益事件为 0 |
| 13:26:24 | 受控 product_load_result=failed，stage=check_feature，support=unsupported，Play Store=85354820，Play services=263737022，test_environment=standard；逐项展开读取 Analytics 参数 |
| 13:26:22 | Crashlytics 新 product_load 非致命报告，1.0.15（18）／Android 11／Sdk_gphone_arm64，Keys 实际包含 stage=check_feature、product_details_support=unsupported、play_store_version=85354820、play_services_version=263737022、test_environment=standard，以及旧错误码、阶段入口和 development 标记 |
| 13:28:21～22 | 修复包正常启动后的真实商品加载及权益刷新事件到达；该次权益刷新 new_acquisition=0 |
| 13:28:50 | 在修复版游戏设置页主动恢复原有 Google 许可订单，界面显示恢复成功；云端 restore_result 的 result=restored、entitlement=premium、entitlement_source=store_verified 已逐项读取。此后聚合的新购为 1 的事件仍只有 13:26:23 一次 |

Crashlytics 新报告：https://console.firebase.google.com/u/0/project/platon-sudoku-test/crashlytics/app/android:com.platongames.sudoku/issues/de75bf5251f6486c731b24e30f879f85?time=7d&sessionEventKey=6ACC454E0017000136D52A4DB1C52549_2274047669854691913 。本轮是受控非致命诊断，不代表原 IN2025 的旧故障被复现。截图和测试日志仅留临时目录，没有加入历史审计档案。

修复后的本地 Release 构建、R8 混淆及 lintVital 通过；命令显式排除了 uploadCrashlyticsMappingFileRelease、uploadCrashlyticsSymbolFileRelease，没有上传符号或分发包。最终 git diff --check 通过，模拟器 Firebase Analytics debug 属性已恢复 .none.、FA 日志恢复 INFO；原测试订单与应用数据保留。

仍未完成：修复后从 Google 结账开始的新许可订单与 new_acquisition=1 的完整实单联验；商店分发 Release／正式 Firebase 接收；普通报表处理后的维度筛选；原 IN2025／旧 Play 组件环境及其 -2 根因；全量 Jest 和全部设备／网络场景。本轮真实恢复已有本地权益，不代替此前“无本地缓存＋商品加载失败”的恢复场景重验；后者上轮通过，本轮字段与转化改动没有重做该整段 UI 故障注入。现有证据支持两处遗漏已修复，不足以承诺没有任何新问题或原设备问题已经消失。按用户最新指示继续不发布，不改动现有 Closed testing — Alpha、商品价格、地区、测试资格或真实订单。

### 修复后 Android 11 新许可订单与无缓存故障恢复实单联验

2026-10-12 14:04～14:15（Australia/Melbourne），用户授权继续不扣费新购、无本地缓存商品失败恢复及 Firebase 核对，继续不发布。专用 HSP_Billing_API_30／Android 11／emulator-5556 沿用修复后的 Debug 1.0.15（18），临时闭测 Premium 关闭；本轮未改应用实现、版本、价格、地区、分发轨道或测试资格。

永久非消耗品仍持有旧订单，必须先移除旧商店权益才能重新购买。自动审批首次拦截进入退款流程，用户随后明确授权退款并撤销 12:40 的不扣费测试订单；14:07:02 Play Console 确认为 Refunded、AUD 0.00，勾选了 Remove entitlement，原因 Other。14:07:39 实际 Billing 查询 code=0、premiumPurchases=0。只处理这一笔已授权的旧测试订单，没有处理其他订单。

14:09:15 在修复版点击购买；Google 结账由用户亲自完成，用户明确补充“是我点的购买”。代理没有观察到最终结账按钮被点击的过程，不能将其表述为代理完成。Play Console 实际核对到全新订单尾号 26105，创建时间 14:09:28、状态 Processed、商品明确标注 Test: Lifetime Premium、估算收入 AUD 0.00；页面 AUD 13.99 是测试商品标价。新订单与已退款旧订单不同，不能归为旧订单恢复。14:11:22 严格 live 原生探针 requireOwned=true 通过：1 笔真实已购，生产验签、PURCHASED、已确认及未暂停断言通过。

无缓存检查加强为 androidTest 中显式 removePremiumCache=true：只删除 purchase_entitlements 中 product_id=premium 的行，并断言查询行数为 0，不只是把 active 置 0；其他进度和商店订单保持不变。新增互斥参数检查，测试 APK 构建通过，移除和恢复后的 active=1 验证均在模拟器通过。

等待旧订单退款授权时先用旧订单验证过一次无缓存故障恢复，14:04:54 商品失败后真实刷新 verified／1 笔，14:06:17 手动恢复 restored／1 笔，14:06:30 缓存 active=1；相关 Analytics 和完整 Crashlytics 字段均实际到达。新购之后，对新订单重新完成以下整段验收：

| 本地时间 | 实际结果 |
| --- | --- |
| 14:11:56 | 本地 Premium 缓存行不存在，断言通过 |
| 14:12:18.353 | 实际执行临时商品元数据失败分支：billing_-2、check_feature、unsupported |
| 14:12:18.399 | 同次启动真实原生 refreshPremiumEntitlement 返回 verified／1 笔；沿用生产验签和保存实现 |
| 14:12:45.857 | 设置页主动恢复，真实原生 restorePremium 返回 restored／1 笔，页面显示 Your store purchase was restored |
| 14:13:16 | 权益缓存已重新创建且 active=1，实际 SQLite 断言通过 |
| 14:14:33 | 结束注入、恢复普通 Metro 并正常重启，云端权益刷新 new_acquisition=0 |

故障只存在于仓库外临时 Metro transformer：商品读取调用仍读取实际模拟器环境，然后强制抛出失败；真实已购查询、恢复、验签、确认和权益持久化均未替换。安全执行标记只含状态和交易数量，不含 token／订单 ID／账户。此处证明已购恢复独立于商品加载成功，不代表复现原 IN2025 的 -2 根因。最初两次连接／路径匹配未注入成功的启动没有算作故障通过，以明确的执行标记和云端失败事件作为判据。

云端使用测试 platon-sudoku-test／GA4 558112180，全部是本轮实际操作事件，无 fixture 重放：

- 14:09:31 purchase_result 的 result=purchased；14:09:30 新购 entitlement_changed 的 new_acquisition=1 恰好一次。
- 14:12:19 product_load_result：failed、check_feature、unsupported、play_store_version=85354820、play_services_version=263737022、test_environment=standard，逐项展开核对。
- 14:12:47 restore_result：restored、premium、store_verified，逐项展开核对。
- Crashlytics 14:12:18 非致命 product_load 报告包含全部上述环境字段、stage、旧错误码和 development 标记；它与历史报告归为同一 issue，已按事件时间核对最新记录，不能以 issue 总数替代验收。
- 完成故障恢复与正常重启后，8 个权益事件中仅 14:09:30 的一个 new_acquisition=1，其他 7 个均为 0，未出现恢复／重启重复计新购。

最新 Crashlytics 报告：https://console.firebase.google.com/u/0/project/platon-sudoku-test/crashlytics/app/android:com.platongames.sudoku/issues/bcdd08dc288972f27ab14caf50e38f1d?time=7d&sessionEventKey=6ACC500C03CD000145ED93C9B58B2780_2274059507878575647 。最终保留新不扣费许可订单有效；停止故障服务、移除临时注入脚本、恢复普通 Metro 和 Firebase debug／日志设置。git diff --check 通过。

本轮补齐了此前两项实单验证缺口；仍未验证商店分发 Release 与正式 Firebase、普通报表处理后的筛选、原 IN2025／旧组件环境、真实银行卡及其他地区、全量 Jest 与其他设备／网络分支。结论限定为当前已更新 Play 组件的 Android 11 专用模拟器：真实新购、准确计一次转化、无缓存商品失败时的真实恢复与完整诊断传输通过；不能承诺所有环境都没有问题。按用户指示继续不发布。


### 2026-10-12 Alpha 1.0.16（19）发布前回归与提审

用户授权先完成必要回归，通过后更新现有 Closed testing — Alpha，保留测试者和加入链接，不发布 Production。此次只构建和发布此前已批准的首局／难度、Billing 功能检查与错误提示、环境诊断及新购统计修复；没有新增应用功能、改商品价格／地区或重置新许可订单。继续在共享 main 工作区，无分支、提交或正式版发布。

回归结论：本次修复的发布阻断检查通过。全量测试不能写成“全部通过”：共发现 132 个 Jest 套件，分批执行后 129 个套件通过，`launch-copy-terminology` 有 1 项既有失败，2 个外部原生回放／语料套件因未提供可选环境而跳过，部分已通过套件中的可选原生用例也跳过。唯一失败命中 `rewards.testHints=闭测测试提示额度`；测试与文案文件均与 HEAD 相同，未修改断言或文案以制造全绿。该项是现有中文术语约束与闭测标签冲突，没有发现运行时或本次修复回归，作为非阻断已知项保留。最初两个全量 Node 进程以 139 退出，未作成功证据；后续分批并启用 `--expose-gc` 完成上述套件，命令行测试超时为 30 秒，未改测试源码门槛。

- Prettier、全仓 ESLint（0 errors，14 warnings）、24 语种／41,740 项翻译检查、TypeScript、SQLite schema 及 diff 空白检查通过。
- 课程页面 235 项通过；本次首局与新购贯通回归 11 项通过，包含在上述套件覆盖内。Android JVM 10 项、专用 Android 11 原生字段过滤与严格 live Billing 10 项通过；实际商品查询成功，已购订单签名、已确认状态与非暂停状态通过，不发起额外购买。
- 核心全部 40 项技巧正反例、100 题／6171 步回放、1000 个合法随机状态和 13 项 Python 检查通过。并行负载下的首轮 Level 5 P95 超标不作最终性能结论；无构建／Jest 重负载时单独复测，Level 5 P95 为 233.421ms，其余等级也通过。
- `:app:bundleRelease :app:assembleRelease :app:testDebugUnitTest :app:lintVitalRelease :app:uploadCrashlyticsSymbolFileRelease` 成功；R8 mapping／NDK symbol 上传任务完成。

发行构建使用 `HSP_VERSION_CODE=19 HSP_VERSION_NAME=1.0.16 HSP_CLOSED_BETA_TEST=1`，保留现有独立闭测提示次数，不授予临时 Premium。正式 Firebase 配置正确且不含测试 app ID；原上传证书、JAR 签名、四 ABI、38 个 64 位库的 16KB 对齐、40 份内嵌原生符号、AAB 内嵌与本地 R8 mapping 一致性、JS source map 和当前题库字节一致性均通过。AAB SHA-256：`ed1902a24075946da8d445e8566bb18e5605669ff555a90aa3695911decf1d22`。本次实际发行的 AAB、APK、mapping、source map 与未剥离库保存于本机 `.local/google-play/current-release/`，用于同构建问题定位，不建立实验历史归档。

实际 Release 验收仅在 HSP_Billing_API_30／Android 11：将原 Release APK 重签为既有模拟器测试证书并原位升级，逐项核对 APK payload 与原包相同，数据保留，无 Metro 依赖。不是 Play 分发签名安装。14:34～14:46（Australia/Melbourne）首页、已购页面、恢复、开局、提示请求／讲解／应用、撤销、手动输入、返回保存／继续及完整完成对局均正常，应用进程无 AndroidRuntime／ReactNativeJS error。完成结果为 Easy、5:18、0 失误、1 次提示；根据可见棋盘逐格输入，没有使用完成 fixture 或自动收尾。

正式 platon-sudoku-production／GA4 558049080 DebugView 实际收到：

| 当地时间 | 事件与核对结果 |
| --- | --- |
| 14:34:51 | product_load_result=success；supported、Play Store=85354820、Play services=263737022、standard、closed_beta |
| 14:34:51 | 启动 entitlement_changed，new_acquisition=0，没有将已有订单恢复重复记为新购 |
| 14:35:46 | restore_result=restored、premium、store_verified、closed_beta |
| 14:39:07 | game_started，difficulty=level_1、first_game=yes、observation=new、closed_beta |
| 14:41:46 | game_first_action 和 first_game_engaged，各一次；四个分类字段与开局相同 |
| 14:45:42 | first_game_completed 一次；四个分类字段与开局相同，game_ended 也到达 |

已重新读取正式探索报表的保存配置：02 和 07 保留 First game=yes、Observation=new、Build environment=production|closed_beta；07 四个步骤正确，03 保留 Difficulty 行维度。DebugView 事件不能当作普通探索报表的处理后数据；本轮关闭调试标记并结束调试进程，正常报表仍需获批后的非调试数据处理。此轮未重新下新许可订单或注入 Release 商品失败；相关真实新购、无缓存商品失败恢复和 Crashlytics 完整字段云端证据沿用上文同一修复实现的 Android 11 Debug 实单联验。

Play 现有 Alpha 发布预览 Ready to release，19（1.0.16），100% rollout。设备兼容与 18 完全相同：Phone 12,345、Tablet 6,783、TV 3,065、Chromebook 77，其他既有类别计数也不变，全部类别零新增排除；这不是新增设备支持或验收承诺。仅有 `Closed testing — Alpha / 1.0.16 closed beta - Billing and analytics fixes / Start full rollout` 一项变更提交审核。2026-10-12 14:48 前后后台确认 **Changes in review**，快速检查运行中、Managed publishing off；审核通过后自动向原测试者开放，目前不能称为已获批或用户已收到更新。现有 1.0.15 继续服务，未暂停 Alpha、发布内部轨道或 Production。

原 Google Group 为 `platon-sudoku-beta-testers@googlegroups.com`，加入链接为 `https://play.google.com/apps/testing/com.platongames.sudoku`，未修改测试群、名单、反馈地址、178 个国家／地区或资格。发布前 Dashboard 显示 12 名测试者连续加入 9 天。剩余验证边界：Play 分发签名的新版实际更新／正式普通报表与 Crashlytics 运行时、原 IN2025／旧 Play 组件根因、其他设备／网络／地区、真实银行卡扣费未在本轮验证。此次 Alpha 发布不等同于正式版全平台／全分支验收。
