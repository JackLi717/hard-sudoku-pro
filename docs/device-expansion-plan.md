# Google Play 设备扩展与现有闭测更新方案

日期：2026-10-09；车载支持决定更新：2026-10-16

本次发行仅面向 Google Play，扩大现有 Platon Sudoku Android 应用可分发、可正常使用的设备范围，排除手表。Apple App Store 发行已按用户最新决定延期；下方 Apple 设备评估仅保留为后续参考，不作为本次发行门槛。

本方案取代此前以网页版、通用桌面客户端和多家电视商店为核心的路线，原来的整体工期估算不再适用。已实施分设备方向策略、可缩放窗口、棋盘键盘操作和 TV 焦点基础，Android Debug、Release APK 与四 ABI AAB 已构建成功。商店设备开放及实机验收仍需逐项完成。

## 保持正在进行的封闭测试

用户确认封闭测试已进行约七天，要求新功能持续更新且不中断现有测试。本次采用同一应用 `com.platongames.sudoku`、同一 Closed testing — Alpha 轨道的版本更新；保留签名、测试者名单、Google Group 与加入链接，不暂停轨道、不另建应用或要求测试者退出重加。新版本使用高于线上版本的 version code，并核对设备覆盖不排除现有测试者。

Google 要求至少 12 名测试者连续加入满 14 天；官方鼓励在封闭测试期间根据反馈更新应用。单纯发布新版不改变测试者的加入状态，连续天数不按每个版本重新计算；退出后重加会影响该测试者的连续资格。实际累计进度及生产访问申请资格以 Play Console 为准。达到天数后仍需申请生产访问，不能自动视为已公开发行。[Google 封闭测试要求及更新建议](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)，[在现有轨道创建新版本](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en)

## 已确认的边界

- 本次分发渠道为 Google Play；Apple App Store 延后。
- 汽车相关平台暂不支持，包括 Android Auto、Android Automotive OS 和 Car ready mobile apps 计划；在用户明确重新决定前，不进行车载适配、启用或加入该计划。
- 手机、平板及折叠屏保持竖屏；Android TV/Google TV 固定横屏；电脑沿用可用窗口适配。此规则以用户最新决定为准，替代此前平板及展开折叠屏双方向计划。
- 电脑通过两家商店提供的相应运行与分发路径评估，优先复用现有移动应用。
- 电视评估 Android TV、Google TV 和 Apple TV；手表明确排除。
- 网页版、PWA、通用 Windows/Linux 客户端、Amazon Appstore、Samsung Tizen、LG webOS 和 Roku 商店不属于本次工作。

商店支持某类设备，不表示当前 App 已具备资格，也不表示打开一个后台开关即可正常使用。每类设备都需要核对应用资格、原生依赖、交互方式及实际商店安装结果。

## 设备覆盖路线（Apple 发行延期）

| 商店 | 设备 | 优先采用的路径 | 需要补齐的工作 |
| --- | --- | --- | --- |
| Google Play | Android 手机 | 现有 Android App | 小屏与大屏回归、最低系统及合并 Manifest 兼容性 |
| Google Play | Android 平板和折叠屏 | 现有 App 加设备适配 | 双方向、分屏、折叠内外屏切换、状态保存 |
| Google Play | 支持 Android 应用的 Chromebook | 现有 Android App | 硬件过滤、可缩放窗口、键鼠、原生库和商店安装 |
| Google Play | Windows PC | 优先评估 Google Play Games on PC 中的 Android 游戏路径 | 当前账号和游戏资格、原生库、输入、生命周期及所选发行级别要求 |
| Google Play | Android TV 和 Google TV | 增加 TV 适配及对应商店分发配置 | 遥控器焦点、非触摸操作、横向界面、启动入口及 TV 质量要求 |
| App Store | iPhone | 现有 iOS App | 竖屏、系统版本和屏幕尺寸回归 |
| App Store | iPad | 现有 iOS App | 双方向、分屏、动态窗口、外接输入和状态保持 |
| App Store | Apple silicon Mac | 优先验证现有 iPhone/iPad App 在 Mac 上运行 | Mac 可用性、鼠标键盘、窗口、原生依赖、购买恢复及实机验证 |
| App Store | Apple TV | 新增 tvOS 构建目标与必要的平台适配 | 原生依赖、遥控器焦点、存储、C++ 桥、购买与素材 |

Google 官方提供跨手机、平板、Chromebook 和 Windows PC 的游戏分发路径；应按当前游戏的兼容性、资格及控制台状态逐项核实。[Google Play Games on PC](https://developer.android.com/games/playgames/overview)

Apple 提供在 Apple silicon Mac 上分发 iPhone/iPad 应用的机制。先验证该机制可以减少新增 macOS 客户端的必要性，但不能由 iOS 构建成功直接推定 Mac 兼容。[Apple silicon Mac 可用性](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/)

Intel Mac 不能由 Apple silicon 的 iOS 应用运行机制覆盖；若最终需要覆盖这类 Mac，应单独评估 App Store 原生 macOS 构建的成本与依赖，不能默认承诺已支持所有 Mac。Windows 覆盖也限定为符合 Google Play Games on PC 条件的设备，不等于开发一个通用 Windows 客户端。

## 其他商店设备类别的处理

Apple Vision Pro 可先评估现有 iPhone/iPad 应用的兼容运行方式；Android XR 也有移动应用分发及专用轨道机制。先核对当前 App 的资格、二维窗口输入和依赖可用性，再决定是否进入实施批次，不默认开发沉浸式 XR 产品。[Vision Pro 可用性](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-apple-vision-pro)，[Google 设备专用轨道](https://support.google.com/googleplay/android-developer/answer/13295490?hl=en)

2026-10-16 用户决定：汽车相关平台暂不支持，包括 Android Auto、Android Automotive OS 和 Car ready mobile apps 计划。该决定取代此前将车载列为待资格核查项的安排；在用户明确重新决定前，不进行车载适配、不启用车载分发、不加入该计划，也不对外宣称车载支持。手表继续排除。

同日只读核查：Play Console 的 Form factors 列表未启用 Android Auto 或 Android Automotive OS；Android Automotive OS 仍出现在 Add form factor 菜单中。当前源码及本地保存的 1.0.16（code 19）Release 合并 Manifest 和 APK 均无车载支持声明。设备目录中的 Car 兼容数量不代表已启用车载分发或通过车载审核。

本次仅记录产品范围，不修改代码、Manifest、设备过滤或 Play Console 配置。现有 Closed testing — Alpha 保持运行，测试者名单、加入链接、国家／地区、包名、签名及现有设备覆盖保持不变；其他平台配置及 TV／电脑横屏布局保持不变。后续如收到 Car ready mobile apps 邀请或自动加入通知，先核对通知并向用户说明，再按用户授权处理。

## 当前工程的可复用基础和缺口

当前项目是 React Native 0.87.1 的 iOS/Android 应用。iOS 已声明 iPhone 与 iPad 设备族。2026-10-09 静态检查本地已有的 `android/app/build/outputs/bundle/release/app-release.aab`：arm64-v8a、armeabi-v7a、x86、x86_64 各含 19 个原生库，其中均包含 `libappmodules.so`、`libRNNitroSQLite.so` 和 `libNitroModules.so`。这证明该产物已有提示桥、SQLite 和 Nitro 的 x86_64 打包基础，不代表本轮重新构建了当前源码，也不代表 PC 运行或商店分发已通过。

布局层已有容器测量、宽度分档及多页横屏布局。已将 Android 的固定竖屏改为分设备方向策略，iPad 保持竖屏；仍需实际验证全部布局与对局状态。

C++20 提示引擎及题库可以沿用现有原生体系。本次不再引入 WebAssembly、浏览器 SQLite 或网页商业方案。新增设备仍须测试提示取消、复盘计算、离线保存及低性能设备响应。

电视是当前最大的工程缺口：现有 Nitro SQLite Podspec 未声明 tvOS，分享、截图和移动广告依赖也不能直接假定可用于 Apple TV。需要先验证 tvOS 可编译的依赖组合与存储实现，再决定电视构建组织方式。`react-native-tvos` 是独立分支，上游说明不能在同一项目同时使用它和标准 React Native，因此不直接替换当前移动依赖。[React Native TV 上游说明](https://github.com/react-native-tvos/react-native-tvos)

设备形态决定方向策略，实际应用窗口决定布局。平板分屏后变窄时，应使用紧凑布局，不因窗口变窄反复把设备重新锁成手机方向。

## 能否平滑复用现有程序

代码层面的结论是：手机、平板、折叠屏和商店体系内的电脑路径可以优先采用渐进适配；电视需要较多输入和平台工作，但无需另建一套游戏业务系统。以下工作量为静态评估的相对判断，不是实机兼容验收结果。

| 设备 | 复用判断 | 主要新增工作 |
| --- | --- | --- |
| 手机和平板 | 复用现有工程、页面和全部游戏核心；改动相对较小 | 分设备方向规则、窗口边界与正式页面回归 |
| 折叠屏 | 复用现有 Android 应用；改动小至中等 | 内外屏切换、方向策略和对局连续性 |
| Chromebook 与 Google Play Games on PC | 复用 Android 应用，已有 x86_64 原生库基础；改动预计中等 | 鼠标操作验证、窗口、触摸拖选替代路径、缺失硬件与服务处理 |
| Apple silicon Mac 上的 iPhone/iPad 应用 | 优先复用原 iOS 构建；改动预计小至中等，须实机确认 | 鼠标、长按和拖动、窗口、购买及原生依赖行为 |
| Android TV 和 Google TV | 游戏业务、算法和数据层可复用；交互改动较多 | 遥控器焦点、所有页面的非触摸操作、TV 分发配置 |
| Apple TV | 游戏核心可复用；原生依赖和输入改动最多 | tvOS 构建、SQLite 与文件适配、移动 SDK 替代或隔离、遥控器导航 |

支持复用的具体结构包括：`src/domain/game/engine.ts` 中的游戏规则；`src/application/app/offline-game-coordinator.ts` 中的应用协调与存储接口；平台无关的 C++ 提示引擎及 JSON 边界；`adaptive-layout.ts` 按窗口和父容器测量的布局。无需按每种设备复制题库、评分或提示算法。

当前棋盘格使用 `Pressable`，普通点击有复用基础；候选拖选与涂色还使用触摸事件，需验证鼠标或提供可操作路径。现已接入棋盘键盘事件与 TV 焦点基础，但完整遥控器流程仍需验收。游戏页还存在按 Android/iPad 身份选择横屏布局的分支，需要在电脑和 TV 窗口上核对。

Google Play Games on PC 的基本可玩要求允许通过输入兼容模式满足操作要求，因此应先用现有构建测试，再针对实际缺口添加输入能力。基础可玩与完整认证要求分别评估，不自动把跨设备同步等完整认证能力纳入本轮。[Google PC 入门与可玩要求](https://developer.android.com/games/playgames/start)

## 建议实施顺序

| 阶段 | 实施内容 | 可评审交付和完成条件 |
| --- | --- | --- |
| 1 商店与构建兼容性清点 | 核对 Play 设备目录、过滤原因、设备类别及 PC 资格；核对 App Store 的 iPad、Mac 等可用性；检查实际构建的依赖与架构 | 一份 Google Play 已支持、被排除及待验证设备清单；Apple 核查延期，不先批量开放未验收设备 |
| 2 手机平板折叠屏适配 | 实现已确认方向规则，检查全部正式页面、分屏与折叠连续性 | iOS/Android 可安装测试构建；手机竖屏不变；平板与折叠屏竖屏正常；窗口变化不丢对局 |
| 3 商店体系内的电脑适配 | Chromebook、Apple silicon Mac 优先；验证 Google Play Games on PC | 实际键鼠和窗口操作、开始继续、离线提示、复盘、购买恢复正常；对应商店测试安装可用 |
| 4 两家商店的电视适配 | Android TV/Google TV 与 Apple TV 分别验证原生依赖并补齐遥控器流程 | 实际遥控器能完成开局、笔记、提示、暂停继续、完成与复盘；对话框无焦点陷阱；具备可提交构建 |
| 5 分设备发布 | 在对应设备通过测试后开放该设备分发，补齐截图、说明与支持入口 | 商店实际可安装及更新；购买、奖励和隐私行为通过；对外支持范围与实际发布一致 |

建议先完成阶段 1 和 2，阶段 3 优先选择复用现有 Android 应用的路径；电视在依赖验证后实施，Apple 相关阶段延期。商店设置、测试轨道与构建要求按当时后台及官方规定执行，不引入额外内容版本、历史数据库或发布审计体系。

暂不沿用此前 8 至 16 周的估算。去除 Web 路线后，工作量取决于商店已有可用性、电脑兼容结果及 tvOS 依赖验证；完成阶段 1 后再对实际缺口估时。

## 各设备必须验证的能力

- 游戏：开始、继续、笔记、候选编辑、快速候选、提示、暂停、撤销、完成及复盘。
- 正式页面：课程、练习、统计、设置、奖励与购买页面，保持现有四语言和视觉规则。
- 连续性：横竖屏、分屏、缩放、折叠、前后台切换和重启，不丢盘面及已保存进度。
- 输入：移动触摸、电脑鼠标键盘、电视方向键与确认返回键；现有长按和批量选择需要提供可操作路径。
- 原生能力：SQLite、提示引擎、文件与分享、声音与震动，以及能力缺失时的合理处理。
- 商业能力：在实际设备和商店环境验证商品、价格、取消、恢复、奖励与隐私；不能由移动端结果推定所有设备通过。

Google 的 PC 兼容指南要求处理 PC 上不支持的硬件、权限和服务，并支持平台适用的界面行为；应检查合并 Manifest 及运行路径。[PC 兼容指南](https://developer.android.com/games/playgames/pc-compatibility)

Apple TV 需要 tvOS 构建，现有 iOS 应用不会仅因勾选分发设置就成为 Apple TV 应用。新增原生 macOS、tvOS、visionOS 平台有独立构建及 App Store Connect 配置要求。[Apple 添加平台说明](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-platforms/)

优先保持同一产品、同一题库和同一套业务规则。具体商店内的购买恢复及 Apple Universal Purchase 按对应平台规则核实；Google 与 Apple 之间的账号同步和购买互认仍不由本次设备扩展自动引入。

## 当前实施与验证状态

- Android 已按显示设备区分手机／平板／折叠屏竖屏、TV 横屏和桌面自由窗口，声明可缩放与不强制触摸屏；分屏窗口变窄不改变设备分类。
- 已接入棋盘硬件键盘：数字输入、方向键移动、删除、撤销、笔记、提示和暂停。保留系统组合键与无障碍路径，提示、暂停和弹窗期间不向棋盘输入。
- 已补充 TV 按钮焦点基础、返回主页以及 TV 禁用移动激励广告；已加入 Leanback 启动入口、原生品牌横幅和 TV 安全边距，最终 Release 已用遥控器验证开局、难度选择、棋盘移动、数字输入、暂停和继续；完整页面及商业流程仍待验收，不据此宣称已可在 TV 商店发行。
- Android Debug、Release APK 与四 ABI AAB 构建成功；四 ABI 都包含提示桥、SQLite 和 Nitro 原生库。Android 最新方向策略 4 项测试通过（移动竖屏、桌面自由窗口、TV 横屏、TV 优先级）。
- Jest 124 套件、4,295 项通过，2 套件及 17 项按现有配置跳过。格式检查、TypeScript、schema 检查通过；ESLint 0 错误、14 项既有警告。C++ 在 Release 优化编译下正确性及全部性能目标通过（最高难度 P95 98.9ms）；未优化主机测试的 P95 仍超目标，不将其记录为通过。最终相关 5 个 Jest 套件、195 项通过，新增 TV 弹窗回归覆盖背景不抢焦点与首次焦点落到 Easy。
- iOS/iPad 方向与键盘适配已做且 Simulator 构建成功；本次 Apple 发行延期，不再要求配置 iOS 正式广告或提交 Apple 审核。
- Play 当前已有 1.0.7（version code 9）闭测版本。用于本地验证的默认 code 5 构建不能上传覆盖；本次现有 Alpha 更新候选使用 1.0.8（code 10），保留闭测临时 Premium，最终 AAB 与 APK 均已构建成功；四 ABI 原生库、64 位 ELF 的 16KB 对齐、APK 页面对齐、签名、内嵌 R8 映射和原生符号检查通过，包内题库哈希与当前 content-v4 一致。本轮 1.0.8 已上传并向原 Alpha 轨道提交审核，100% rollout；后台显示 Changes in review，快速检查仍在运行，尚不能表述为测试者已收到新版。未暂停或更换现有测试。

此前在平板模拟器验证过 Release 横屏和旋转连续性；最新决定改为竖屏，原横屏截图不再用于平板商店展示。手机尺寸模拟切换后保持竖屏且对局连续。最终 TV Release 已验证遥控器开局、难度选择、棋盘移动、数字输入、暂停／继续、返回主页及保存对局入口。真实折叠屏、Chromebook／PC、TV 全部页面和适用商业流程仍需验收；PC／TV 专用商店分发不会因本次移动轨道送审自动视为完成。实际生产访问资格以 Console 连续测试计数和 Google 审核为准。

本次候选构建命令：`HSP_VERSION_CODE=10 HSP_VERSION_NAME=1.0.8 npm run android:bundle:closed-beta`。Google Play 公开发行配置可单独运行 `npm run commercial:release:check -- --platform android`，无需 iOS 广告配置；该公开发行检查不用于启用了临时 Premium 的闭测包。默认不带版本环境变量的本地构建仍是旧 code 5，不能用于此次上传。

发行提交状态：1.0.8（code 10）已上传并完成 Google 审核提交，发布名 `1.0.8 closed beta - Device adaptation`，只更新 Closed testing — Alpha，rollout 100%。Publishing overview 显示 Changes in review，快速检查运行中；Managed publishing 保持关闭，检查和审核通过后自动向原测试者发布。提交前后 Dashboard 均显示 **12 名测试者连续加入 5 天**，没有清零；用户所述“开始测试约七天”不能替代此达标计数。签名、名单、加入链接、国家／地区和现有设备覆盖保留。旧标签连接一度失效，已通过新的 Console 标签恢复，不再构成提交阻断。

Play 设备后台核对：Google Play Games on PC 已选择复用移动应用轨道、产物、测试者与国家／地区，测试轨道上传项已完成，但 Opt-in 仍未完成，不能宣称 PC 商店已开放。Android TV 已添加资料入口，保持复用移动轨道、产物、测试者和国家／地区；尚未 Opt-in，未申请 TV 审核。PC 也未 Opt-in，未添加 Wear OS 或车载平台。Android XR 在本轮前已显示 Active，这不代表专用 XR 体验已验收。

Play 的 1.0.8 发布预览显示 Ready to release。原支持设备没有被排除：手机 12,345 不变，平板 6,774 → 6,783，Chromebook 77 不变；Wearable 仍为 0。TV 的包兼容目录从 5 → 3,065，Car 从 10 → 27，XR 仍为 1；这些是包兼容数量，不等于对应专用商店分发已启用或完成验收。发布变更仅包含现有 Alpha 轨道的 1.0.8 全量更新，不包含名单、地区或设备类别开关变更。


用户最新方向决定已落实到后续更新候选 1.0.9（code 11）：手机、平板、折叠屏竖屏，TV 横屏，PC 按窗口；保留既有横屏布局。电视启动横幅改用首页 HomeBrandEmblem 的金属九宫格，商店横幅同源。APK/AAB、Android 方向测试 4 项及相关 Jest 3 套件 16 项通过；签名、四 ABI、16KB APK 对齐、闭测 Premium 和题库哈希检查通过。Android 15 独立平板模拟器（sw720dp）请求旋转后仍为 portrait，Android 14 TV 实际对局仍为 1920×1080 landscape，原对局在原位升级后保留。Apple 暂不发行，iPad 声明同步为竖屏，未在本轮重新构建 iOS。

商店素材补充：英文手机及 7/10 英寸平板首页均更新为金属图标版本；平板各保留 4 张竖屏；TV 3 张实际游戏/提示截图及 1280×720 金属横幅；PC 与 Desktop 各 4 张同源真实 Android 大窗口截图。所有上传原件及 banner SVG 保存在 `.local/google-play/listing/en-GB/`。电脑截图不代表 Windows/Chromebook 实机验收；TV 全部页面和商业流程仍待验证，因此本轮不作未经验证的 PC/TV 质量声明。保存截图草稿后 Dashboard 仍为 12 名测试者连续加入 5 天，未暂停或重建 Alpha。

1.0.9（11）已上传原 Alpha，Google 处理完成，发布预览 Ready to release，100% rollout。相对 1.0.8，各设备的 Devices no longer supported 均为 0：Phone 12,345、Tablet 6,783、TV 3,065、Chromebook 77；Wearable 0。截图资料的待送审清单仅有七项截图／banner 变更，没有修改商店文案、测试名单、地区或设备 Opt-in。Google 提示追加送审会重新开始版本审核并增加等待时间；这不是闭测的连续 opt-in 计数清零。

最终提交（2026-10-09，Melbourne）：用户明确同意在不重新计算测试时间的条件下继续。重新核对 Google 官方规则及 Dashboard 后，已将 1.0.9 与七项素材共八项变更统一提交；Publishing overview 显示 Changes in review，清单为 Alpha 1.0.9 全量更新和七项截图／TV banner，Google 快速检查运行中，通过后进入审核。此前 1.0.8 审核由平台重新开始，增加的仅是版本审核等待；Alpha 未暂停，名单、加入链接、地区和签名未变。提交后再次核对 Dashboard，仍为 12 名测试者连续加入 5 天，没有重新计时。
