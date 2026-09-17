# 阶段 7B：双平台商业化验收

日期：2026-09-10  
候选提交：验收签署时填写  
状态：本地配置、自动化回归和 iOS 本地商品读取已通过；商店后台、签名上传、沙盒账号和真机矩阵尚未签署。

## 1. 判定规则

本文件区分三类证据，不能互相替代：

- `AUTO`：Jest、TypeScript、原生构建和静态发行门禁。
- `LOCAL`：Xcode StoreKit 配置或平台模拟器上的开发环境测试。
- `STORE/DEVICE`：App Store Connect Sandbox/TestFlight、Google Play 内部测试轨道及 iOS/Android 真机。

只有所有必需的 `STORE/DEVICE` 项都记录设备、商店账号类型、构建号、结果和证据后，7B-5 才能标记完成。模拟器不能签署 VoiceOver、TalkBack、真实 UMP/广告填充或商店端退款/撤销。

运行本地门禁：

```sh
npm run commercial:acceptance
```

配置正式 AdMob ID 和 Play 上传密钥后运行严格门禁：

```sh
npm run commercial:release:check
```

## 2. 发行配置

### iOS

- Bundle ID：`com.jackli717.sudoku`
- Premium 产品 ID：`premium`
- 类型：Non-Consumable
- 本地 StoreKit 文件：`ios/HardSudokuPro/Products.storekit`
- Debug scheme 已选择该文件；当前美国区本地测试价格为 `$9.99`，不代表 App Store Connect 已配置。
- App Store Connect 中的正式商品必须使用同一产品 ID，并至少配置 English、Deutsch、日本語、简体中文名称与说明；Google Play Console 也须配置对应一次性商品。两家商店的正式价格待上架前决定，不能从当前测试价推定。
- Sandbox 需准备至少两个专用账号：一个用于全新购买/退款，另一个用于已购恢复/重装。TestFlight 构建始终使用 Sandbox 购买环境。

### Android

- Application ID：`com.jackli717.sudoku`
- Premium 产品 ID：`premium`
- 类型：一次性非消耗型商品
- Release 不再使用仓库内 debug key。将 `android/keystore.properties.example` 复制为被忽略的 `android/keystore.properties`，或通过同名环境变量提供上传签名；`bundleRelease` 会在缺少配置或密钥文件时失败。
- 内部测试轨道与许可测试账号是两项独立配置。测试账号既要加入轨道测试者并完成 opt-in，也要加入 Play Console 的 License testing，避免产生真实扣款。

### 当前硬阻断

- `app.json` 仍是 Google 官方测试 AdMob app ID；正式 AdMob app ID 与两个正式激励广告单元尚未提供。
- iOS 运行日志报告缺少 Google Mobile Ads 所需的 `SKAdNetworkItems`；正式列表尚未写入 `app.json`。
- 仓库没有 Play 上传密钥；密钥和密码不得提交 Git。
- 当前浏览器的 App Store Connect 会话认证失败，无法核对应用、商品、Sandbox 测试员或 TestFlight 构建。
- 当前浏览器登录的 Google 账号尚未创建或加入 Play Console 开发者账号，无法创建内部测试轨道、许可测试员或商品。
- 两家商店后台的正式价格尚未决定或配置；客户端不能代替商店定价。
- 尚未上传 TestFlight 或 Play 内部测试构建，因此商店侧购买、恢复、退款、撤销与重装不可签署。

## 3. 购买与权益矩阵

每个平台都执行下表；证据至少包含录屏、交易/订单编号的脱敏尾段、构建号和权益/余额结果。

| 场景 | 预期 | iOS | Android |
| --- | --- | --- | --- |
| 实时价格 | 来自商店且与后台一致；查询失败不显示假价格 | CONFIG（$9.99 本地配置）；页面读取及 STORE 待签 | PENDING |
| 首次购买 | 先持久化 Premium 和两项 99，再 finish/acknowledge | AUTO；LOCAL 确认待完成 | AUTO |
| 取消 | 状态为已取消，权益和余额不变，可继续游戏 | PENDING | PENDING |
| Pending 后成功 | Pending 时不授予；转为 purchased 后只授予一次 | PENDING | PENDING |
| Pending 后失败 | 不授予权益，可继续离线游戏 | PENDING | PENDING |
| 恢复购买 | 恢复 Premium，不重复补足 99 | PENDING | PENDING |
| 重复回调 | 同一交易只应用一次，完成调用可重试 | AUTO | AUTO |
| 退款/撤销 | 下一次成功权威刷新后关闭 Premium | PENDING | PENDING |
| 重装 | 同一商店账号可恢复；本地余额按产品规则处理 | PENDING | PENDING |
| 已购离线启动 | 使用已验证缓存，不等待商店 | AUTO | AUTO |
| 免费离线启动 | 商店不可用但核心游戏立即可玩 | AUTO | AUTO |

iOS 本地测试通过 Xcode 的 StoreKit Transaction Manager 分别注入购买失败、Pending/Ask to Buy、退款和撤销。随后必须禁用本地 StoreKit 文件，用 Sandbox/TestFlight 对真实 App Store Connect 商品再跑一次购买、恢复、重装和退款。

Android 使用许可测试账号的 `Test instrument, always approves/declines` 与两种 `Slow test card` 覆盖成功、失败及 Pending。非消耗品重复购买前，在 Play Console 订单中执行 refund and revoke，再确认启动刷新撤权。

## 4. 广告与隐私矩阵

每个测试都从首页补给或对应资源耗尽说明面板逐次主动发起；不得从启动、继续、游戏中、完成页或复盘自动出现广告。

| 场景 | 预期 | iOS | Android |
| --- | --- | --- | --- |
| UMP 同意 | `canRequestAds` 后才请求；只显示标准激励广告 | PENDING | PENDING |
| UMP 拒绝 | 不阻塞游戏；允许的受限请求遵循 SDK 返回状态 | PENDING | PENDING |
| 隐私选项回访 | 需要时可从隐私页重新打开 | PENDING | PENDING |
| ATT | 不出现 ATT 弹窗，不声明 tracking usage | AUTO；DEVICE 待签 | 不适用 |
| 关闭/跳过 | 未收到奖励回调则不加额度 | AUTO | AUTO |
| 无填充 | 显示不可用状态并立即返回游戏 | AUTO；DEVICE 待签 | AUTO；DEVICE 待签 |
| 离线 | 不加载、不入账、不阻塞游戏 | AUTO；DEVICE 待签 | AUTO；DEVICE 待签 |
| 重复奖励回调 | 同一次展示仅对所选资源 `+1` | AUTO | AUTO |
| 中国大陆商店区 | 不初始化或请求广告，领取入口隐藏 | PENDING | PENDING |
| Premium | 不请求广告 | AUTO | AUTO |

## 5. 四语言、屏幕阅读器与资源耗尽

在 iOS VoiceOver 和 Android TalkBack 各跑四种语言。系统字体使用最大可访问字号，并至少覆盖一次横竖屏切换（如平台支持）、深色模式和减少动态效果。

| 编号 | 语言 | 入口与状态 | 屏幕阅读器重点 | iOS | Android |
| --- | --- | --- | --- | --- | --- |
| C1 | English | Premium、restore、首页补给、耗尽面板 | 价格、处理中、成功/失败、返回顺序 | PENDING | PENDING |
| C2 | Deutsch | 同上；检查最长按钮和正文 | 不截断、不重叠、状态只朗读一次 | PENDING | PENDING |
| C3 | 日本語 | 同上 | 商品、资源类型和 `+1` 含义明确 | PENDING | PENDING |
| C4 | 简体中文 | 同上 | 隐私选项、无填充、离线提示可理解 | PENDING | PENDING |

长时间资源耗尽体验每个平台至少持续 30 分钟，并完成 20 次“耗尽 → 打开说明 → 取消或观看 → 返回游戏”的交替操作：

- 快速候选和智能提示交替选择，确认从不串账，每次最多 `+1`。
- 至少 5 次主动取消、3 次断网、3 次无填充或测试错误、1 次重复奖励回调。
- 广告、购买、恢复和复盘页面始终互斥；返回后棋盘、计时、焦点和未完成操作保持正确。
- 所有失败路径均可立即继续手动游戏，不形成循环弹窗或强制等待。
- 记录开始/结束电量、内存告警、崩溃、ANR、卡死、重复弹窗及最后两项余额。

## 6. 证据模板

```text
平台/设备/系统：
安装来源：Xcode Local StoreKit | Sandbox | TestFlight | Play Internal
App 提交与构建号：
语言/屏幕阅读器/字体：
商店账号类型（不得记录邮箱）：
场景：
结果：PASS | FAIL | BLOCKED
购买或奖励前后权益与余额：
截图/录屏/脱敏日志：
问题与复测提交：
验收人/时间：
```

## 7. 本轮执行记录

2026-09-10 的本地候选检查：

- `npm run commercial:acceptance`：通过；5 个 Jest 套件共 41 项测试通过，TypeScript 通过，Android Release APK 与 iOS Release Simulator 构建通过。
- Xcode 26.6 / iPhone 17 Pro / iOS 26.5 Simulator：当时的 Debug scheme 正确加载 `Products.storekit`，Premium 页面读取旧本地测试价 `$4.99`，购买按钮拉起“仅供测试、不会收费”的 StoreKit 确认页。当前配置已改为 `$9.99`，设备复验仍待执行。尚未在确认页完成交易，因此购买后的权益、余额与 finish 顺序仍以 AUTO 证据为准。
- 2026-09-13 / iPhone 15 / iOS 17.5 Simulator：重新构建后确认了 Lifetime 页布局；React Native CLI 启动会话没有取到本地 StoreKit 商品。开发版因此使用明确标注、不可购买的 US$9.99 测试展示价；商店返回 `$9.99` 的真实页面路径仍须在 Xcode StoreKit 测试会话中复验。
- iOS 首页与 Premium 页的辅助功能树暴露了入口、标题、价格、余额和按钮状态；这不是 VoiceOver 真机签署。
- iOS 17.5 模拟器与 Android `emulator-5554` 可用；真机、Sandbox/TestFlight、Play Internal、VoiceOver/TalkBack 和 30 分钟资源耗尽流程尚未执行。
- 严格发行门禁预期保持阻断，直至正式 AdMob ID、激励广告单元、iOS `SKAdNetworkItems` 和 Play 上传签名齐备。

## 8. 签署条件

- `npm run commercial:release:check` 通过，iOS Release archive 与已签名 Android AAB 来自同一候选提交。
- TestFlight 与 Play 内部测试轨道均安装成功，实时价格与后台一致。
- 第 3、4、5 节所有必需项为 `PASS`，且证据对应同一候选构建。
- 没有 P0/P1 缺陷；所有 P2 均有首发前处理决定。
- 验收后删除或妥善隔离测试交易资料，恢复设备网络、语言、字体和辅助功能设置。

## 9. 官方依据

- Apple：[Setting up StoreKit Testing in Xcode](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode)、[Testing In-App Purchases with sandbox](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)、[Testing at all stages](https://developer.apple.com/documentation/storekit/testing-at-all-stages-of-development-with-xcode-and-the-sandbox)
- Google：[Test your Google Play Billing integration](https://developer.android.com/google/play/billing/test)、[Set up an internal test](https://support.google.com/googleplay/android-developer/answer/9845334)、[License testing](https://support.google.com/googleplay/android-developer/answer/6062777)
