# Google Play 上架与封闭测试执行清单

更新日期：2026-10-01

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
- [x] 完成新 Play 应用的隐私政策、广告、政府应用、金融功能、健康声明、目标受众、数据安全及内容分级任务。IARC 问卷已按开发者确认保存并分享；目标受众为 13 岁以上、不面向儿童。广告 ID 声明已依当前 Android release 合并清单所含 `AD_ID` 权限选择 Yes，用途勾选 Advertising or marketing，并随 2026-09-30 的更新发布。Premium 审核访问说明中的代码与当前源码一致，源码有效期至 2027-03-31，实际候选包仍需在设备上验证。
- [x] 为新 Play 应用准备并保存商店名称与 en-GB 描述。商店文案副本保存在 `.local/google-play/listing/en-GB/store-listing-copy.md`，新 listing 的 App name 为 Platon Sudoku。
- [x] 新 listing 图标（512×512）、宣传横图（1024×500）及手机、平板截图已上传，并将 AI 编辑的宣传横图按要求标记。素材和策略保存在 `.local/google-play/listing/en-GB/`；当前截图数量和顺序见下一项。2026-10-01 已可打开 Google Play 商店页，Play Console 显示上一轮更新已发布。
- [x] 新包截图已拍摄并上传至 Play Console 默认 en-GB 商店资料：手机竖屏 5 张；7 英寸及 10 英寸平板各 4 张竖屏、4 张横屏。2026-09-30 在素材编辑页核对了 5/8、8/8、8/8 数量和对应文件名，并按 `.local/google-play/listing/en-GB/screenshot-plan.md` 的顺序排好；Play Console 显示“Your changes have been saved”。
- [x] 将商店类别设为 Game → Puzzle。
- [x] 核验公开商店联系信息。开发者确认保留 `admin@readytradie.com`；Play Console 已显示该邮箱，电话留空，Website 已发布为 `https://readytradie.com`。Alpha 测试反馈邮箱也已保存为此地址。
- [x] Alpha 封闭测试已扩至全部可选国家/地区，包含 `Rest of world`。2026-10-01 上传 1.0.3 前再次核对：轨道为 `Active`，范围为 `178 countries/regions`，1.0.2 为 `Available to selected testers`，发布总览无未发布变更，先前地区扩展已发布。测试者来源保持 `platon-sudoku-beta-testers@googlegroups.com`；须以同一 Google 账号先加入群组、再完成 Play opt-in。此前 Dashboard 显示 0 名测试者已 opt-in，群组人数不能代替此数字。
- [x] 2026-10-01 已构建签名并上传 Android 1.0.2（version code 3）封闭测试 AAB，Alpha 发布名为 `1.0.2 closed beta - screen adaptation`，已提交 Google，Publishing overview 显示 `Changes in review`；自动快速检查仍在运行，通过后进入审核，批准后自动发布。新版尚不能表述为测试者已收到更新。新版包含手机和平板横竖屏适配、棋盘和数字键/工具栏固定显示、首次点击响应及进出游戏布局稳定修复。此包保留 Google 测试激励广告和测试期间无限免费智能提示，快速候选维持原规则；正式公开发布前须关闭 `BETA_UNLIMITED_SMART_HINTS`、替换测试广告单元并重新构建。发布预览无错误，仅提示未上传混淆映射文件，当前构建未启用 R8/ProGuard；设备支持范围与上一版相同。
- [x] 本版校验：签名 AAB 构建和校验通过；Prettier、ESLint（0 错误，5 项警告）、TypeScript、SQLite schema 通过，Jest 103 个套件、3,842 项测试通过（17 项既有跳过）。默认未优化 C++ 校验的逻辑测试通过，但高难度 P95 为 373 毫秒，超过 300 毫秒门槛；使用与 Android Release 相同的 `-O2` 编译优化、保留测试断言后，核心全部校验及 13 项 Hint Lab 策略测试通过，高难度 P95 为 44 毫秒。性能门槛和测试脚本未修改。
- [x] 2026-10-01 已将当前 Android 1.0.3（version code 5）签名 AAB 上传并提交至 Alpha，发布名为 `1.0.3 closed beta - appearance and controls`，100% 测试轨道 rollout。最终发布仅包含代码 5；代码 4 未送审、未发布。发布总览已确认 `Changes in review`，平台快速检查仍在运行，通过后进入审核；Managed publishing 关闭，批准后自动发布。现阶段测试者仍需等待新版获批。此次包含竖屏布局、操作与外观设置、深色灰底及更清晰的宫格分区，并修正中文完成状态文案中的旧术语。闭测无限智能提示策略保持不变，Android Release 包含此前已配置的正式 AdMob 与区域隐私消息接入。
- [x] 1.0.3 验证：Release AAB 构建、上传签名、正式包名、版本号及四种 ABI 核对通过；TypeScript、SQLite schema、ESLint（0 错误、5 项既有警告）、修改文件 Prettier 与 `git diff --check` 通过。完整 Jest 首轮 101 个套件通过，另两套件因 4 项默认 5 秒超时与 1 项中文旧术语断言失败；修正文案后，用命令行 30 秒等待上限单独复核这两套件，28 项全部通过。合并结果为 103 个套件、3,943 项通过，17 项既有跳过；测试源码与性能门槛未修改。最终预览无错误，仅缺少混淆映射文件警告，当前未启用 R8/ProGuard。竖屏要求新增 `android.hardware.screen.portrait`：与已发布代码 3 相比，26 款设备不再支持（6 平板、3 TV、17 车载），手机范围未减少。
- [x] 2026-09-30 提交的 Alpha 新版、五国地区、测试群组、商店资料与应用声明等更新已发布。2026-10-01 上传 1.0.2 前，核对 Alpha 的 `1.0.1 closed beta - unlimited hints` 为 `Available to selected testers`，发布总览无未发布变更；测试报名页显示 `Become a tester`，商店页显示安装入口。入口开放不等于非开发者真机安装和更新已验证，这项设备验收仍待完成。
- [ ] 开发者确认首轮五国封闭测试优先面向 Android 手机和平板，同时愿意在不增加明显工作时获得其他平台用户。Advanced settings → Form factors 已将 Google Play Games on PC 退出参与，页面显示可重新 Opt-in；PC 版本仍需验证键鼠、窗口尺寸和商业流程后再开启。ChromeOS 桌面和 Android XR 仍显示 Active、共用手机发布轨道，兼容设备可能看到手机版本；没有为这两类设备另建版本或截图。当前管理页面只有切换独立轨道，且 Google 明示切换后在独立轨道有版本前仍继续由手机轨道提供安装，因此未做无效变更。
- [ ] 可选：制作商店预览视频。视频可以在封闭测试期间完善；不因视频尚未完成而推迟内部试跑。

**完成标准：** Play Console 显示封闭测试所需的应用设置已完成，商店资料真实、可供测试者辨认和安装。内部测试可以在完整应用设置前开始；封闭测试需先完成应用设置。

## 第 3 步：Premium 配置与小范围安装试跑

- [ ] 核对 Android 上传签名与 AAB，验证 Play 安装和更新流程。内部测试版本 `1.0 internal test` 已于 2026-09-29 发布，AAB version code 1、target SDK 36；连接的模拟器显示该包由 `com.android.vending` 安装，version code 1。非开发者真机安装和更新尚未验证。
- [x] Pre-launch report 设置已指定 English (Australia) 和 English (United Kingdom) 作为自动测试语言；登录测试资料沿用 App content 中已填写的 Premium 审核访问说明。2026-09-30 配置时尚无可评估报告；本次未核实最新报告结果，仍须查看稳定性、性能、无障碍和隐私检查。
- [x] 在 Play Console 创建并启用一次性商品 `premium`，购买选项 ID `standard`、类型 Buy，名称 `Lifetime Premium`；目前仅澳大利亚可购买，标价 A$9.99。五国封闭测试中的其他四国先验证免费核心流程，不承诺可购买 Premium；真机购买与恢复仍须单独验证。
- [x] 在 **Settings → License testing** 选择 `Platon Sudoku internal` 名单并保存；该名单的 1 个账号也在内部测试轨道。后续新增购买测试者时，再核对其轨道资格。
- [ ] 用许可测试账号在真实 Android 设备检查购买、取消或失败、恢复购买、重装后恢复及权益变化；核对测试交易不会意外向测试者收费。
- [ ] 检查激励广告、同意流程及隐私说明与当前候选包一致；未完成的商业功能不能以可用状态展示或写入招募承诺。
- [x] 公开隐私政策中的占位邮箱已改为 `admin@readytradie.com`，长期网址为 `https://readytradie.com/platon-sudoku/privacy/`。2026-09-30 提交的商店资料更新已发布；2026-10-01 上传 1.0.2 前在 Play Console 核对上一轮更新无未发布变更。旧 Sites 页面暂未删除；源码及部署说明见 `site/README.md`。
- [ ] 让约 5 名可信测试者完成“加入 → 安装 → 更新 → 开局 → 退出并继续 → 提示 → 反馈”试跑；至少使用一台非开发者设备。
- [ ] 核实项目计划承诺的 Google Play Lifetime Premium 单次兑换码及兑换/恢复路径确实可执行；若尚不能验证，先修改招募承诺，再发招募帖。
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
- [ ] 收到小额存款后由用户按实际金额完成银行验证；公开上架后完成 AdMob 应用关联与就绪审核。将新配置通过新的 Play 测试构建送审前，用注册测试设备验证广告关闭、有效奖励、同意拒绝和隐私选项回访。当前闭测无限智能提示策略保持不变。

## Google 官方依据

- [个人账号的封闭测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [设置内部测试与封闭测试](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [商店素材要求与可选预览视频](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [开发者身份与公开资料](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [商家收款验证](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en)
- [验证 Google 小额银行存款](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en)
- [创建应用内商品](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)；[配置购买许可测试](https://support.google.com/googleplay/android-developer/answer/6062777?hl=en)

Google Play 的菜单和政策可能变化。实际操作时以当前 Play Console 的必填任务和官方帮助为准，并将变化回写本清单。
