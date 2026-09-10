# Hard Sudoku Pro：广告、购买、恢复购买与权益接口设计

日期：2026-09-10  
状态：7B-1 广告与隐私适配器已接入；当前开发构建使用 Google 测试广告标识，正式 AdMob 标识、两平台真机地区/同意/填充验收及商业化页面仍待发布前完成。

## 1. 目标与范围

商业化代码必须保持核心游戏离线可用，并允许以后替换广告或商店供应商。页面、游戏协调器、奖励领域和 SQLite 不得直接依赖广告 SDK、StoreKit 或 Google Play Billing。

本设计覆盖广告展示、Premium 非消耗型购买、恢复购买、平台交易更新、离线权益缓存和本地奖励入账。首发不实现订阅，也不启用任何自动广告或非激励广告。

2026-09-10 冻结以下接入边界：

- iOS 与 Android 精确固定 `react-native-google-mobile-ads` 16.4.0，由其接入 Google Mobile Ads SDK（iOS 13.5.0、Android 25.4.0）和 Google UMP（iOS 3.1.0、Android 4.0.0）；关闭 mediation/bidding，不接入其他广告网络。升级须重新通过 RN 0.87 双平台构建和隐私清单检查，不能使用浮动版本。
- 首发只使用用户明确选择的标准激励广告；不使用普通插屏、激励插屏、横幅、原生或开屏广告。
- 购买使用 React Native 0.87 自带 Codegen/TurboModule 建立统一原生模块契约：iOS 由 Objective-C++ Codegen 薄壳调用 Swift StoreKit 2 服务，Google Play 发行版由 Kotlin 直接调用 Google Play Billing；两个平台适配器实现 `PurchaseGateway`，不引入 `react-native-iap`、其他跨平台购买库、额外桥接运行时、RevenueCat 或自建购买验证服务；其他 Android 商店不属于首发范围。
- Google-only 是降低首发实现和运维复杂度的选择。激励广告变现面向中国大陆以外的首发市场；中国大陆不请求广告，也不因此限制离线游戏。发布前仍须按各目标国家实测可用性、填充、隐私同意和商店披露，不在当前版本预埋第二家 SDK。
- 用于获取用户的付费广告推广与应用内激励广告变现是两个独立决策。上线后根据实际留存、Premium 转化、广告收益和获客回收数据，再选择一个推广市场及预算；客户端和首发 SDK 接入不得预设或硬编码该市场。

## 2. 分层

```text
UI / OfflineGameCoordinator
            │
            ▼
 CommercialController
   ├── AdGateway                 SDK 无关端口
   ├── PurchaseGateway           SDK 无关端口
   ├── CommercialStore           SQLite 与奖励事务
   ├── CommercialPlaybackObserver 游戏计时边界
   └── commercial policy         纯业务规则
            │
            ▼
 iOS Objective-C++/Swift / Android Kotlin
       Codegen TurboModule adapters
```

- `AdGateway` 只加载、展示并规范化广告结果，不发放额度。
- `PurchaseGateway` 只提供商品、购买、恢复、权益刷新和已验证交易，不写本地数据库。
- `CommercialController` 是 UI 的唯一商业化入口，负责串联外部结果、本地事务和可订阅状态。
- `CommercialStore` 由 `UserRepository` 实现，继续负责幂等奖励、钱包和权益持久化。
- `CommercialPlaybackObserver` 在广告开始前暂停游戏；广告 SDK 不直接调用游戏协调器。

公共契约位于 `src/application/commercial/contracts.ts`。具体 SDK 适配器未来放在 `src/infrastructure/ads/` 与 `src/infrastructure/purchases/`。

## 3. 广告规则

公共契约暂时保留普通插屏方法作为 SDK 无关扩展边界，但首发产品策略禁止调用，真实适配器也不配置普通插屏广告位。广告位只使用稳定业务代码，不向 UI 暴露 SDK 的 ad unit 或原生对象。

激励广告必须满足：

- 只有 SDK 的有效奖励回调能产生 `rewarded`，播放结束或关闭不能代替奖励事件。
- 应用在展示前生成独立 `requestId`；适配器必须把同一次展示的重复奖励回调归并到同一个 `rewardEventId`。
- 控制器收到 `rewarded` 后才调用 `redeemRewardedAdCredit()`；SDK 适配器不能直接修改钱包。
- Premium 或目标库存已满时不请求广告。
- 失败、无填充、离线、隐私状态不允许或 SDK 不可用时立即返回，不阻塞核心游戏。
- 广告奖励和随后辅助功能的消费是两个独立事务。
- 免费用户点击快速铅笔或智能提示但对应额度为 `0` 时，可进入解释页并逐次选择“观看广告，所选资源 `+1`”；不得先自动展示广告，也不得把广告完成与原操作自动连成不可取消的流程。
- 首页只提供明确标注的额度补给入口，允许用户选择一种资源并主动储备；入口展示前必须准确说明“观看广告”和固定的 `+1` 奖励。
- “点击广告”只能指点击应用自己的领取入口并选择观看。不得因点击广告素材、跳转广告主、安装应用或购买商品而奖励，也不得使用“点广告支持我们”等诱导文案。
- 用户关闭、跳过或拒绝广告后可以继续手动游戏；未收到有效奖励回调时不加额度。

Premium 不请求任何广告。开始游戏、继续游戏、游戏进行中、完成页及其他页面均不得自动展示广告；`game_completion` 不是首发获批广告位。

### 3.1 双平台与隐私边界

该交互在 App Store 与 Google Play 均可采用：用户逐次明确选择、事先看到动作和奖励、可关闭且不因拒绝而失去核心游戏，符合标准激励广告的预期形态。实现时还必须满足：

- 两个平台均在 UMP 完成当次 consent 状态更新且 `canRequestAds()` 允许后才请求广告，并在需要时提供隐私选项入口。面向 EEA、英国和瑞士时使用 Google 认证的 CMP/UMP 流程。
- 首发 iOS 不请求 App Tracking Transparency（ATT），不添加 `NSUserTrackingUsageDescription`，不读取 IDFA，也不启用需要跨 App/网站跟踪的个性化广告路径；所有广告请求显式采用非个性化/受限广告配置。UMP 仍按地区完成同意状态更新和隐私选项，不把 `canRequestAds()` 误解为 ATT 授权。未来若要请求 ATT 或启用跟踪，必须另行产品与隐私评审。
- Android 完成 Google Play Data safety、广告声明和适用年龄/家庭政策配置。广告关闭、无填充或隐私拒绝不得阻塞离线数独。
- “中国大陆不请求广告”按商店市场而非设备物理位置定义：iOS 每次准备广告前读取 StoreKit 2 `Storefront.current.countryCode`（ISO 3166-1 alpha-3，`CHN`），Android 在已连接的 Billing Client 上调用 `getBillingConfigAsync()` 并读取 `BillingConfig.countryCode`（ISO 3166-1 alpha-2，`CN`）。不得用 UI 语言、系统 Locale、时区、SIM 或 IP 猜测；结果为中国大陆、读取失败、空值或未知时均不初始化/预加载/展示广告，并隐藏领取入口。结果不持久化为用户画像；商店地区变化后重新判定。该边界判断的是首发商店市场，不声称识别用户实时物理位置。
- 首发上线前以两平台真机和各目标地区测试广告加载、关闭、奖励回调、无填充、断网、同意拒绝与隐私选项回访；不能仅以模拟器或测试广告位作为发行依据。

评审依据：Google 的[激励广告政策](https://support.google.com/admob/answer/7313578)、[AdMob 实现指南](https://support.google.com/admob/answer/2936217)、[Android UMP 指南](https://developers.google.com/admob/android/privacy)、[iOS UMP 指南](https://developers.google.com/admob/ios/privacy)、[iOS IDFA/ATT 指南](https://developers.google.com/admob/ios/privacy/idfa)、Android [`BillingConfig`](https://developer.android.com/reference/com/android/billingclient/api/BillingConfig)，Apple [`Storefront`](https://developer.apple.com/documentation/storekit/storefront)，以及 Apple [App Review Guidelines 2.5.18、3.2.2](https://developer.apple.com/app-store/review/guidelines/) 和 Google Play [Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753)。

## 4. 购买与恢复

商店层返回 `VerifiedTransaction`，不能用一个未经检查的购买成功回调代表有效权益。首发采用纯平台验证，交易应用顺序固定为：

```text
平台检查成功
→ SQLite 保存权益
→ 首次购买时事务化补足两项库存至 99
→ 发布权益和钱包快照
→ finish / acknowledge 平台交易
```

本地保存失败时不得完成平台交易，以便平台稍后重新投递。购买、恢复和启动时交易监听都进入同一交易应用管线：

- 显式首次购买可以触发一次性启动库存补足。
- 恢复购买和重复交易更新只更新权益，不再次补足库存。
- SQLite 中的 `premium_starting_inventory_granted` 和交易事件标识继续提供最终幂等保护。
- `pending`、取消、不可用和失败是不同结果。
- 已验证撤销交易将本地权益更新为免费。

首期产品 ID 使用当前开发基线 `premium`，只代表一次性非消耗型 Premium；不预建订阅状态。

直接使用两家商店原生 API 与当前单商品、永久权益和离线优先边界相符：StoreKit 2 提供签名交易与当前权益，Google Play Billing 提供永久非消耗型一次性商品。平台适配器仍须保持在基础设施层，不能把 StoreKit 或 Billing 类型泄漏到页面、控制器或 SQLite。依据见 Apple [StoreKit 2](https://developer.apple.com/storekit/) 与 Google Play [One-time products](https://developer.android.com/google/play/billing/one-time-products)。

### 4.1 原生 TurboModule 接入决策

购买层不使用 `react-native-iap`。在现有 React Native Codegen 配置中增加购买模块契约；iOS 延续仓库现有模式，以 Objective-C++ 实现生成的 TurboModule 接口并把商店操作委托给 Swift StoreKit 2 服务，Android 以 Kotlin 实现生成接口。它是 React Native 自带 TurboModule，不依赖 `react-native-nitro-modules`，也不新增另一套桥接框架。

- TypeScript/Codegen 契约只表达初始化、商品查询、购买、恢复、权益刷新、交易事件和完成交易所需的可序列化字段；不得把 StoreKit、Billing Client 对象或平台枚举泄漏给 UI、控制器和 SQLite。`transactionId` 保留作稳定交易身份和业务幂等键，独立的 `completionCredential` 是只供平台适配器 finish/acknowledge 使用的不透明字符串：Android 必须映射为 `Purchase.purchaseToken`，iOS 映射为已验证交易的完成凭据。应用层不得解析或持久化该凭据。
- iOS 直接使用操作系统内置 StoreKit 2：查询 `Product`、发起购买、只接收 `.verified` 交易、读取 `Transaction.currentEntitlements`、监听 `Transaction.updates`，并仅在用户主动恢复购买时触发 `AppStore.sync()`。
- Android 直接依赖 Google 官方 Play Billing Library 9.1.0：建立 `BillingClient`、查询一次性商品、启动购买、接收购买更新、通过 `queryPurchasesAsync()` 刷新权益，并在本地权益成功持久化后用 `completionCredential` 所承载的 purchase token acknowledge。真实模块接入时必须在原生构建文件中精确固定 `com.android.billingclient:billing:9.1.0`，升级须重新评审 API 变化并通过购买回归。
- 原生模块只负责平台会话、校验和结果归一化；购买后的权益、库存补足、幂等事务和离线缓存仍由 `CommercialController`、`PurchaseGateway` 与 `CommercialStore` 现有边界负责。两端不得各自复制产品规则。
- 模块初始化失败、商店断开或查询失败必须归一化为不可用结果并允许重连；交易监听随 production runtime 建立和释放，不能阻塞 UI 线程或核心离线游戏。

2026-09-10 的依赖兼容性验证结论是：项目固定 `react-native-nitro-modules` 0.37.1，而当日 `react-native-iap` 16.5.1 声明 `react-native-nitro-modules` peer 为 `^0.36.5`，两个范围不相交。不得使用 legacy peer、package override、Nitro 降级或私有 fork 绕过检查；未来即使上游版本恢复兼容，也不会自动改变本决策，必须重新评审后才能替换原生适配器。上游声明见 [`react-native-iap` package metadata](https://github.com/hyodotdev/openiap/blob/main/libraries/react-native-iap/package.json)。

### 4.2 纯平台验证边界

首发不建设购买验证服务端，也不接入 RevenueCat。`VerifiedTransaction.verification = 'platform_verified'` 在两个平台上的证据强度不同，适配器与验收记录不得把二者描述成相同的密码学保证：

- iOS 只接受 StoreKit 2 `VerificationResult.verified`，并校验应用、`premium` 商品、交易环境、撤销状态和交易身份；购买、恢复、启动时的 `Transaction.currentEntitlements` 及 `Transaction.updates` 进入同一适配管线。Apple 对 StoreKit 2 交易进行 JWS 签名并由 StoreKit 验证，见[交易验证说明](https://developer.apple.com/documentation/storekit/transaction)。
- Google Play Android 只接受 Billing Client 状态为 `PURCHASED` 的 `premium`，把 purchase token 作为不透明 `completionCredential` 传到完成边界，并通过成功的 `queryPurchasesAsync()` 重新检查当前权益；`PENDING` 不授予 Premium。本地权益和首次补给成功持久化后才调用 `acknowledgePurchase()`，且须在平台期限内完成确认。不得以可能缺失或不稳定的 order ID 代替 purchase token。
- Android 客户端检查不是 Google Play Developer API 的服务端验真。Google 官方建议把 purchase token 发送到安全服务端验证；首发基于单一低复杂度永久商品、无账号和离线优先边界，明确接受较弱的抗伪造/重放能力，见 Google 的[购买验证建议](https://developer.android.com/google/play/billing/developer-payload)与[Billing 接入流程](https://developer.android.com/google/play/billing/integrate)。
- 不向开发者自有服务或 RevenueCat 发送收据、purchase token、设备或匿名客户标识。隐私政策和商店披露仍须如实说明 Apple/Google 商店处理以及应用本地保存的 Premium 状态；最终披露以实际 SDK 数据清单为准。
- 已经成功验证并缓存的 Premium 可离线继续使用。退款或撤销只要求在下一次成功平台刷新后生效，不承诺实时撤权；平台不可用、超时、离线或响应损坏时不得把缓存 Premium 降级为免费。
- 无应用账号时，iOS 与 Android 的购买不跨平台共享；恢复购买只依赖当前平台的商店账号。

首发接受的剩余风险包括：修改客户端或本地数据库绕过 Premium、Android 客户端状态被篡改、退款设备在再次成功联网刷新前继续使用缓存权益。若上线后出现明显伪造或退款滥用，或者产品增加订阅、应用账号、跨平台权益、服务端客服操作，再重新评审轻量服务端验证；RevenueCat 不作为默认升级路径。

### 4.3 权威刷新结果

购买适配器必须把以下结果明确传给应用层，不能用空交易数组同时表示“没有购买”和“无法查询”：

- `active(transaction)`：平台确认当前 `premium` 有效，写入或刷新 Premium 缓存。
- `revoked(transaction)`：平台明确返回退款或撤销，关闭 Premium。
- `not_entitled`：平台查询成功并权威确认当前商店账号没有 `premium`，关闭先前缓存权益。
- `unavailable(reason)`：离线、超时、商店不可用或响应无法验证，保留最后一次有效缓存，不改变权益。

`EntitlementRefreshResult` 已包含独立的 `not_entitled`，并携带平台与权威验证时间；控制器收到后写入 inactive 权益并关闭缓存 Premium，不伪造交易，也不调用 finish/acknowledge。`unavailable` 与 `failed` 仍保留最后一次有效缓存。

## 5. 权益状态

`EntitlementSnapshot` 区分 `unknown`、`free` 和 `premium`，同时记录来源、刷新状态和最后验证时间：

- 启动先读取 SQLite；缓存的永久 Premium 可立即离线生效。
- 平台刷新失败或不可用不能把缓存 Premium 降级为免费。
- 只有平台明确返回撤销，或一次成功的权威刷新返回 `not_entitled`，才能关闭已有权益；查询不可用不能降级缓存 Premium。
- 游戏完成奖励继续在 SQLite 结算事务内读取权益，不依赖 React 状态或协调器中的缓存布尔值。

## 6. 生命周期与当前生产行为

`ProductionRuntime` 创建并初始化 `CommercialController`，关闭 runtime 时同时释放交易监听和网关。SDK 尚未接入期间使用 `NoopAdGateway` 和 `NoopPurchaseGateway`：

- 不联网，不展示假广告，不产生假奖励或假 Premium。
- 商品、购买、恢复和广告明确返回不可用。
- 商业化初始化失败不得破坏核心离线游戏。

现有 `GameAccessAdapter` 暂时作为阶段 4 兼容层保留。本阶段不继续扩大它，也不把开始、继续或完成游戏固化成广告位；接入真实 SDK 时，只能由额度耗尽说明页或首页额度补给入口调用 `CommercialController` 的激励广告流程。

## 7. SDK 适配器验收要求

真实适配器接入前后必须覆盖：

- 激励回调前关闭不入账，有效奖励重复回调只入账一次。
- 两种资源不会串账，满库存不展示激励广告。
- 额度未耗尽时点击快速铅笔或智能提示直接执行原操作，不出现广告；额度为 `0` 时先展示明确的可拒绝领取说明，不自动播放。
- 首页补给和额度耗尽入口均逐次明确显示所选资源及 `+1`，点击广告素材、跳转、安装或购买不触发入账。
- 开始、继续、进行中和完成后均无自动广告；普通插屏、激励插屏、横幅、原生和开屏格式在首发不可达。
- Premium 不请求普通或激励广告。
- 首购补足一次，恢复、重启和重复投递不补足。
- 购买后当前 UI 与游戏完成结算立即识别 Premium。
- 离线启动保留已验证 Premium；网络失败不撤销缓存权益。
- 已验证退款或撤销关闭权益。
- 成功刷新后的 `not_entitled` 关闭缓存权益；相同场景返回 `unavailable` 时保留缓存权益。
- iOS 拒绝未通过 StoreKit 2 验证的交易；Android 拒绝 `PENDING`、错误商品、缺失 token 和未被成功平台查询确认的交易。
- 购买验证链不发起对自有服务或 RevenueCat 的网络请求；Android acknowledge 只在本地权益与首次补给成功持久化后执行。
- 本地持久化失败时不完成或确认平台交易。
- iOS 与 Android 真机分别覆盖购买、pending、取消、恢复、退款、断网和商店账号边界。
- iOS 与 Android 真机分别覆盖 UMP 允许/拒绝/再次管理、广告关闭、无填充、断网、重复奖励回调及商店地区为中国大陆/其他/不可用；iOS 验证不出现 ATT 请求且不读取 IDFA。
