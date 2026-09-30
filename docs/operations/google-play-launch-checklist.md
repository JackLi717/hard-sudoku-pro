# Google Play 上架与封闭测试执行清单

更新日期：2026-09-30

## 当前状态与使用方式

- [x] Google Play Console 开发者账号已注册，US$25 注册费已支付（开发者本人确认）。
- [x] 在 Play Console 核对账号类型确为个人，以及首页仍有哪些验证任务。账号列表显示为 Personal account。
- [ ] 公开开发者名称已由 `Planton Games` 改为 `Platon Games` 并保存；2026-09-30 Play Console 显示新名称审核中，批准前仍显示旧名称。
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
- [x] 完成新 Play 应用的隐私政策、广告、政府应用、金融功能、健康声明、目标受众、数据安全及内容分级任务。IARC 问卷已按开发者确认保存并分享；目标受众为 13 岁以上、不面向儿童。广告 ID 声明已依当前 Android release 合并清单所含 `AD_ID` 权限选择 Yes，用途勾选 Advertising or marketing，并保存于 Publishing overview 待送审。Premium 审核访问说明中的代码与当前源码一致，源码有效期至 2027-03-31，实际候选包仍需在设备上验证。
- [x] 为新 Play 应用准备并保存商店名称与 en-GB 描述。商店文案副本保存在 `.local/google-play/listing/en-GB/store-listing-copy.md`，新 listing 的 App name 为 Platon Sudoku。
- [x] 上传新 listing 图标（512×512）、宣传横图（1024×500）、2 张手机截图（1440×2560，9:16）、5 张 7 英寸级平板截图（1080×1920）和 4 张 10 英寸平板截图（1440×2560），并将 AI 编辑的宣传横图按要求标记。平板截图按主页、对局笔记、XYZ-Wing 提示、复杂中盘 Replay 分析排序；7 英寸组另含 Swordfish 讲解。素材和策略归档在 `.local/google-play/listing/en-GB/`；商店 listing 已保存为草稿，尚未送审。
- [x] 新包截图已拍摄并上传至 Play Console 默认 en-GB 商店资料：手机竖屏 5 张；7 英寸及 10 英寸平板各 4 张竖屏、4 张横屏。2026-09-30 在素材编辑页核对了 5/8、8/8、8/8 数量和对应文件名，并按 `.local/google-play/listing/en-GB/screenshot-plan.md` 的顺序排好；Play Console 显示“Your changes have been saved”。
- [x] 将商店类别设为 Game → Puzzle。
- [x] 核验公开商店联系信息。开发者确认保留 `admin@readytradie.com`；Play Console 已显示该邮箱，电话留空，Website 已发布为 `https://readytradie.com`。Alpha 测试反馈邮箱也已保存为此地址。
- [ ] 首批 Alpha 封闭测试已按开发者确认扩至澳大利亚、新西兰、英国、美国、加拿大。2026-09-30 在 Play Console 的 Alpha → Countries/regions 核对五国均为 Targeted；地区变更已与新版一起送审，测试者须使用目标国家的 Google Play 账号。测试者来源已设为 `platon-sudoku-beta-testers@googlegroups.com` 并送审；群组目前只有创建者 1 人，尚需招募并验证实际加入及安装。
- [x] 2026-09-30 已构建并上传 Android 1.0.1（version code 2）封闭测试 AAB。Play Console 在 Alpha 轨道确认 `2 (1.0.1)`，`1.0.1 closed beta - unlimited hints` 及版本说明已送审。此包使用 Google 测试激励广告，免费智能提示在测试期间不限次数且不扣钱包；快速候选维持原规则。正式公开发布前须关闭 `BETA_UNLIMITED_SMART_HINTS`、替换测试广告单元并重新构建。
- [x] 开发者明确授权后，2026-09-30 将 Alpha 新版、五国地区、商店资料与应用声明等 13 项变更提交 Google。随后创建测试群组并将其设为 Alpha 测试者来源；Play Console 提示这会重启已有审核，开发者再次明确授权后提交。Publishing overview 显示群组与其余变更均处于 `Changes in review`。新版预览先前仅有两项警告：尚无封闭测试者；未上传混淆映射文件（当前构建未启用 R8/ProGuard）。Alpha 轨道此前显示新版 `In review`，旧版 `Superseded by another release`；当前尚未验证任何非开发者安装。
- [ ] 开发者确认首轮五国封闭测试优先面向 Android 手机和平板，同时愿意在不增加明显工作时获得其他平台用户。Advanced settings → Form factors 已将 Google Play Games on PC 退出参与，页面显示可重新 Opt-in；PC 版本仍需验证键鼠、窗口尺寸和商业流程后再开启。ChromeOS 桌面和 Android XR 仍显示 Active、共用手机发布轨道，兼容设备可能看到手机版本；没有为这两类设备另建版本或截图。当前管理页面只有切换独立轨道，且 Google 明示切换后在独立轨道有版本前仍继续由手机轨道提供安装，因此未做无效变更。
- [ ] 可选：制作商店预览视频。视频可以在封闭测试期间完善；不因视频尚未完成而推迟内部试跑。

**完成标准：** Play Console 显示封闭测试所需的应用设置已完成，商店资料真实、可供测试者辨认和安装。内部测试可以在完整应用设置前开始；封闭测试需先完成应用设置。

## 第 3 步：Premium 配置与小范围安装试跑

- [ ] 核对 Android 上传签名与 AAB，验证 Play 安装和更新流程。内部测试版本 `1.0 internal test` 已于 2026-09-29 发布，AAB version code 1、target SDK 36；连接的模拟器显示该包由 `com.android.vending` 安装，version code 1。非开发者真机安装和更新尚未验证。
- [x] Pre-launch report 设置已指定 English (Australia) 和 English (United Kingdom) 作为自动测试语言，Play Console 显示保存成功；登录测试资料沿用 App content 中已填写的 Premium 审核访问说明。当前报告总览仍提示上传构建生成报告，尚无可评估结果；封闭测试版本送审后再查看稳定性、性能、无障碍和隐私检查。
- [x] 在 Play Console 创建并启用一次性商品 `premium`，购买选项 ID `standard`、类型 Buy，名称 `Lifetime Premium`；目前仅澳大利亚可购买，标价 A$9.99。五国封闭测试中的其他四国先验证免费核心流程，不承诺可购买 Premium；真机购买与恢复仍须单独验证。
- [x] 在 **Settings → License testing** 选择 `Platon Sudoku internal` 名单并保存；该名单的 1 个账号也在内部测试轨道。后续新增购买测试者时，再核对其轨道资格。
- [ ] 用许可测试账号在真实 Android 设备检查购买、取消或失败、恢复购买、重装后恢复及权益变化；核对测试交易不会意外向测试者收费。
- [ ] 检查激励广告、同意流程及隐私说明与当前候选包一致；未完成的商业功能不能以可用状态展示或写入招募承诺。
- [x] 公开隐私政策中的占位邮箱已改为 `admin@readytradie.com`。2026-09-30 将长期版本部署至 `https://readytradie.com/platon-sudoku/privacy/`，旧 Sites 页面暂未删除。Play Console 的新隐私网址已通过快速检查并提交审核，Publishing overview 显示 `Changes in review`；审核完成前商店资料可能仍显示旧网址。源码及部署说明见 `site/README.md`。
- [ ] 让约 5 名可信测试者完成“加入 → 安装 → 更新 → 开局 → 退出并继续 → 提示 → 反馈”试跑；至少使用一台非开发者设备。
- [ ] 核实项目计划承诺的 Google Play Lifetime Premium 单次兑换码及兑换/恢复路径确实可执行；若尚不能验证，先修改招募承诺，再发招募帖。
- [ ] 修复安装、数据丢失、错误提示、购买和隐私方面的阻断问题，记录试跑结果与已知问题。

**完成标准：** 非开发者可通过 Play 正常安装、更新并反馈；Premium 与核心流程在目标构建上得到实际验证；对外承诺与可交付内容一致。只有这一关通过，才扩大正式招募。

## 第 4 步：正式招募、封闭测试与生产申请

- [x] Reddit 账号 `u/Hot-Beginning1311` 已设置为 Platon Sudoku 开发者资料，并在 [r/droidapptesters 发布封闭测试招募帖](https://www.reddit.com/r/droidapptesters/comments/1wts7uz/australia_android_sudoku_players_wanted_for_an/)。2026-09-30 已在帖子和简介加入 [Google Group 自助加入链接](https://groups.google.com/g/platon-sudoku-beta-testers)，说明五国资格、同一 Google Play 账号加入、官方 Play opt-in 链接仍待审核，且不要求购买或评分。Google Group 隐藏于公开搜索、知道链接者可自行加入、仅成员可看内容、仅管理员可发帖和查看成员名单。加入群组本身不计入已完成 Play opt-in 的人数。
- [ ] 准备测试加入链接、简短报名表、结束问卷、已知问题清单和唯一反馈渠道。
- [ ] 招募文案明确 Beta 状态、测试任务、可能重置的进度，以及经验证的 Premium 回报条件；不展示不可用价格，也不以奖励换评分或好评。
- [ ] 按 [Android 首发计划](android-launch-plan.md)邀请 25–30 人，争取 18 人实际安装；跟踪至少 12 人连续加入封闭测试满 14 天及其真实参与情况。
- [ ] 测试期间收集安装、提示、复盘、购买和隐私反馈，修复阻断问题并通过封闭测试轨道更新。可同时完善商店视频和更多展示素材。
- [ ] 达到 Google Play 要求后，在 Play Console 申请生产访问权限；通过审核且首发候选包、商店信息和商业流程复核完成后，再决定正式公开发布。

**完成标准：** 封闭测试达标并获得生产访问权限；首发候选构建和商店资料与实际体验一致。连续加入 14 天是申请门槛，不保证自动获批。

## AdMob 正式广告准备

- [x] 2026-09-30 在 AdMob 建立 Android 应用 `Platon Sudoku`，暂按未公开上架登记。AdMob App ID：`ca-app-pub-2934412621511527~2448169476`。
- [x] 建立可选激励广告位 `Platon Sudoku optional reward`，奖励为 1 Credit；广告位 ID：`ca-app-pub-2934412621511527/1028110741`。当前测试包仍使用 Google 测试 ID；正式广告 ID 尚未写入或上传安装包。
- [x] 在 AdMob 为应用填写 `https://readytradie.com/platon-sudoku/privacy/`，并保存英文欧洲法规同意消息草稿 `Platon Sudoku — European consent`。草稿面向该应用，在欧洲经济区、英国和瑞士提供明确的“Do not consent”选项；尚未发布，也未在现有测试包中验证。
- [x] 2026-09-30 保存英文美国州隐私消息草稿 `Platon Sudoku — US state privacy`，选择 Platon Sudoku 和“当前及未来支持的所有美国州”；状态为 Draft，未发布。正式广告构建前核对消息关于出售或共享数据的文案与实际数据处理、隐私政策一致。
- [x] AdMob 已关联既有的 Google Individual 付款资料 `LI, XIAOHU`（ID 末尾 `4340`）；按本人最新选择保留可收信的墨尔本地址，未修改共用付款资料。AdMob 首页显示“Your payment profile is complete”；账号审核仍在进行。
- [x] 2026-09-30 复核 AdMob 收款页：`AdSense (Australia)` 已关联，当前收益 A$0，付款门槛 A$100；验证页显示达到验证门槛后可能需要核验个人信息，当前没有可提交的身份验证步骤。账号审批仍待 Google 完成。
- [ ] AdMob 尚不能通过 `com.platongames.sudoku` 搜索到 Play 商店条目，应用未与 Google Play 关联。公开上架并可检索后重新关联、完成应用就绪审核。
- [x] 2026-09-30 以 Cloudflare Pages 的 `platon-games-site` 接管 `readytradie.com` 和 `www.readytradie.com`。首页、隐私页和根目录 `app-ads.txt` 均返回 HTTP 200；文件内容为本 AdMob 账号提供的发布者记录，响应类型为纯文本。Play Console Website 已发布为 `https://readytradie.com`。站点源码、更新命令及 DNS 注意事项见 `site/README.md`；AdMob 抓取与应用验证仍待完成。
- [ ] 在正式广告构建前，复核同意消息的文案、商家身份、AdMob 收款状态和隐私政策；发布消息，替换 Android 测试 App ID 与激励广告位 ID，并用真机验证广告、拒绝同意及恢复隐私选项的路径。

## Google 官方依据

- [个人账号的封闭测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [设置内部测试与封闭测试](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [商店素材要求与可选预览视频](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [开发者身份与公开资料](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [商家收款验证](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en)
- [验证 Google 小额银行存款](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en)
- [创建应用内商品](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)；[配置购买许可测试](https://support.google.com/googleplay/android-developer/answer/6062777?hl=en)

Google Play 的菜单和政策可能变化。实际操作时以当前 Play Console 的必填任务和官方帮助为准，并将变化回写本清单。
