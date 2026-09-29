# Google Play 上架与封闭测试执行清单

更新日期：2026-09-28

## 当前状态与使用方式

- [x] Google Play Console 开发者账号已注册，US$25 注册费已支付（开发者本人确认）。
- [x] 在 Play Console 核对账号类型确为个人，以及首页仍有哪些验证任务。账号列表显示为 Personal account。
- [x] 迁移应用标识：iOS 和 Android 均改为 `com.platongames.sudoku`。旧 Google Play 应用 `com.jackli717.sudoku` 的商店草稿保持原样、未送审；新包名需要新的 Play 应用记录。应用工程已切换，新 Play 应用已建立。

按下面四步推进。每完成一项，就在本文件勾选，并在需要时记下 Play Console 页面、测试账号或设备上的验证结果。可以现在准备测试者名单、说明和反馈表；**正式公开招募并承诺安装与 Premium 回报**须等第 3 步的试跑门槛通过。商店展示视频不是启动封闭测试的前置条件。

## 第 1 步：账号、商家资料与收款

- [ ] 完成 Play Console 要求的个人身份、联系邮箱和电话验证；若首页要求 Android 真机验证，也完成该项。账号资料页中的联系邮箱、电话和开发者公开联系邮箱目前均显示已验证；法定姓名与地址已存在于付款资料关联的身份档案中，个人身份验证是否另有待办尚未确认。
- [ ] 确认个人账号销售应用内 Premium 时，商店将显示的法定姓名和完整地址；核对所填资料并接受公开范围。
- [ ] 创建或核对销售应用内商品所需的商家付款资料，确认国家、法定姓名、地址和支持联系方式准确。
- [ ] 按 Play Console 提示补齐税务及收款资料，添加并验证同一国家的收款银行账户。
- [ ] 记录商家资料、银行验证的实际状态和任何待处理提示。

**完成标准：** 身份与联系方式没有阻断项，Premium 所需商家资料可用，收款验证没有未处理的发布风险。银行卡不是上传首个内部测试包的前置条件，因此它的验证等待时间可以与第 2、3 步并行。

## 第 2 步：游戏和封闭测试所需的商店基础资料

- [x] 在 Play Console 建立游戏，核对名称 `Platon Sudoku`、默认语言 English (United Kingdom)、免费应用和 `com.platongames.sudoku` 包名。新 Play 应用已建立；旧应用 `com.jackli717.sudoku` 保持未送审。
- [x] 完成新 Play 应用的隐私政策、广告、政府应用、金融功能、健康声明、目标受众、数据安全及内容分级任务。IARC 问卷已按开发者确认保存并分享；目标受众为 13 岁以上、不面向儿童。登录审核信息仍需按应用当前构建核验 Premium 审核访问码；不要臆造或复制过期代码。
- [x] 为新 Play 应用准备并保存商店名称与 en-GB 描述。商店文案副本保存在 `.local/google-play/listing/en-GB/store-listing-copy.md`，新 listing 的 App name 为 Platon Sudoku。
- [x] 上传新 listing 图标（512×512）、宣传横图（1024×500）、2 张手机截图（1440×2560，9:16）、5 张 7 英寸级平板截图（1080×1920）和 4 张 10 英寸平板截图（1440×2560），并将 AI 编辑的宣传横图按要求标记。平板截图按主页、对局笔记、XYZ-Wing 提示、复杂中盘 Replay 分析排序；7 英寸组另含 Swordfish 讲解。素材和策略归档在 `.local/google-play/listing/en-GB/`；商店 listing 已保存为草稿，尚未送审。
- [ ] 按新版截图计划重新拍摄并替换旧包截图：手机竖屏 5 张；7 英寸及 10 英寸平板各 4 张竖屏、4 张横屏。拍摄顺序与完成状态见 `.local/google-play/listing/en-GB/screenshot-plan.md`。目前新包仅完成手机「普通对局与笔记」图，Play Console 草稿尚未替换。
- [x] 将商店类别设为 Game → Puzzle。
- [ ] 核验并保存公开商店联系信息。邮箱栏当前显示了预填值，需由开发者确认这是适合公开展示的支持邮箱，必要时替换；电话和网站可选。当前未保存，暂停等待开发者核验/录入。
- [ ] 确定首批测试国家或地区，检查测试者使用的 Google Play 账号可以加入该地区的测试。
- [ ] 可选：制作商店预览视频。视频可以在封闭测试期间完善；不因视频尚未完成而推迟内部试跑。

**完成标准：** Play Console 显示封闭测试所需的应用设置已完成，商店资料真实、可供测试者辨认和安装。内部测试可以在完整应用设置前开始；封闭测试需先完成应用设置。

## 第 3 步：Premium 配置与小范围安装试跑

- [ ] 核对 Android 上传签名与 AAB，先上传内部测试版本，验证 Play 安装和更新流程。
- [ ] 在 Play Console 创建并启用一次性非消耗型应用内商品，产品 ID 与应用一致，为 `premium`；核对商品名称、说明、价格和销售地区。`premium` 是商品 ID，不需要另注册开发者账号。
- [ ] 在 **Settings → License testing** 配置购买许可测试账号；同时确保这些账号有资格安装相应测试轨道的版本。
- [ ] 用许可测试账号在真实 Android 设备检查购买、取消或失败、恢复购买、重装后恢复及权益变化；核对测试交易不会意外向测试者收费。
- [ ] 检查激励广告、同意流程及隐私说明与当前候选包一致；未完成的商业功能不能以可用状态展示或写入招募承诺。
- [ ] 让约 5 名可信测试者完成“加入 → 安装 → 更新 → 开局 → 退出并继续 → 提示 → 反馈”试跑；至少使用一台非开发者设备。
- [ ] 核实项目计划承诺的 Google Play Lifetime Premium 单次兑换码及兑换/恢复路径确实可执行；若尚不能验证，先修改招募承诺，再发招募帖。
- [ ] 修复安装、数据丢失、错误提示、购买和隐私方面的阻断问题，记录试跑结果与已知问题。

**完成标准：** 非开发者可通过 Play 正常安装、更新并反馈；Premium 与核心流程在目标构建上得到实际验证；对外承诺与可交付内容一致。只有这一关通过，才扩大正式招募。

## 第 4 步：正式招募、封闭测试与生产申请

- [ ] 准备测试加入链接、简短报名表、结束问卷、已知问题清单和唯一反馈渠道。
- [ ] 招募文案明确 Beta 状态、测试任务、可能重置的进度，以及经验证的 Premium 回报条件；不展示不可用价格，也不以奖励换评分或好评。
- [ ] 按 [Android 首发计划](android-launch-plan.md)邀请 25–30 人，争取 18 人实际安装；跟踪至少 12 人连续加入封闭测试满 14 天及其真实参与情况。
- [ ] 测试期间收集安装、提示、复盘、购买和隐私反馈，修复阻断问题并通过封闭测试轨道更新。可同时完善商店视频和更多展示素材。
- [ ] 达到 Google Play 要求后，在 Play Console 申请生产访问权限；通过审核且首发候选包、商店信息和商业流程复核完成后，再决定正式公开发布。

**完成标准：** 封闭测试达标并获得生产访问权限；首发候选构建和商店资料与实际体验一致。连续加入 14 天是申请门槛，不保证自动获批。

## Google 官方依据

- [个人账号的封闭测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [设置内部测试与封闭测试](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [商店素材要求与可选预览视频](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [开发者身份与公开资料](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [商家收款验证](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en)
- [创建应用内商品](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)；[配置购买许可测试](https://support.google.com/googleplay/android-developer/answer/6062777?hl=en)

Google Play 的菜单和政策可能变化。实际操作时以当前 Play Console 的必填任务和官方帮助为准，并将变化回写本清单。
