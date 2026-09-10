# Hard Sudoku Pro：广告、购买、恢复购买与权益接口设计

日期：2026-09-10  
状态：SDK 无关基础接口已实现；真实广告与商店 SDK、商业化页面和最终插屏位置待阶段 7 接入与验收。

## 1. 目标与范围

商业化代码必须保持核心游戏离线可用，并允许以后替换广告或商店供应商。页面、游戏协调器、奖励领域和 SQLite 不得直接依赖广告 SDK、StoreKit 或 Google Play Billing。

本设计覆盖广告展示、Premium 非消耗型购买、恢复购买、平台交易更新、离线权益缓存和本地奖励入账。它不决定具体 SDK，不启用生产广告，不实现订阅，也不批准尚未通过产品评审的插屏位置。

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
 iOS / Android SDK adapters
```

- `AdGateway` 只加载、展示并规范化广告结果，不发放额度。
- `PurchaseGateway` 只提供商品、购买、恢复、权益刷新和已验证交易，不写本地数据库。
- `CommercialController` 是 UI 的唯一商业化入口，负责串联外部结果、本地事务和可订阅状态。
- `CommercialStore` 由 `UserRepository` 实现，继续负责幂等奖励、钱包和权益持久化。
- `CommercialPlaybackObserver` 在广告开始前暂停游戏；广告 SDK 不直接调用游戏协调器。

公共契约位于 `src/application/commercial/contracts.ts`。具体 SDK 适配器未来放在 `src/infrastructure/ads/` 与 `src/infrastructure/purchases/`。

## 3. 广告规则

普通插屏与激励广告使用不同方法和结果类型。广告位只使用稳定业务代码，不向 UI 暴露 SDK 的 ad unit 或原生对象。

激励广告必须满足：

- 只有 SDK 的有效奖励回调能产生 `rewarded`，播放结束或关闭不能代替奖励事件。
- 应用在展示前生成独立 `requestId`；适配器必须把同一次展示的重复奖励回调归并到同一个 `rewardEventId`。
- 控制器收到 `rewarded` 后才调用 `redeemRewardedAdCredit()`；SDK 适配器不能直接修改钱包。
- Premium 或目标库存已满时不请求广告。
- 失败、无填充、离线、隐私状态不允许或 SDK 不可用时立即返回，不阻塞核心游戏。
- 广告奖励和随后辅助功能的消费是两个独立事务。

普通插屏不产生额度，Premium 不请求任何广告。当前只保留 `game_completion` 作为可能的普通插屏业务位置；实际启用仍需完成产品与商店政策评审。

## 4. 购买与恢复

商店层返回 `VerifiedTransaction`，不能用一个未经验证的布尔值代表购买成功。交易应用顺序固定为：

```text
平台验证成功
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

## 5. 权益状态

`EntitlementSnapshot` 区分 `unknown`、`free` 和 `premium`，同时记录来源、刷新状态和最后验证时间：

- 启动先读取 SQLite；缓存的永久 Premium 可立即离线生效。
- 平台刷新失败或不可用不能把缓存 Premium 降级为免费。
- 只有经过平台验证的撤销交易才能关闭已有权益。
- 游戏完成奖励继续在 SQLite 结算事务内读取权益，不依赖 React 状态或协调器中的缓存布尔值。

## 6. 生命周期与当前生产行为

`ProductionRuntime` 创建并初始化 `CommercialController`，关闭 runtime 时同时释放交易监听和网关。SDK 尚未接入期间使用 `NoopAdGateway` 和 `NoopPurchaseGateway`：

- 不联网，不展示假广告，不产生假奖励或假 Premium。
- 商品、购买、恢复和广告明确返回不可用。
- 商业化初始化失败不得破坏核心离线游戏。

现有 `GameAccessAdapter` 暂时作为阶段 4 兼容层保留。本阶段不继续扩大它，也不把开始或继续游戏固化成最终广告位；接入真实 SDK 时，应由获批的 UI 业务位置调用 `CommercialController`。

## 7. SDK 适配器验收要求

真实适配器接入前后必须覆盖：

- 激励回调前关闭不入账，有效奖励重复回调只入账一次。
- 两种资源不会串账，满库存不展示激励广告。
- Premium 不请求普通或激励广告。
- 首购补足一次，恢复、重启和重复投递不补足。
- 购买后当前 UI 与游戏完成结算立即识别 Premium。
- 离线启动保留已验证 Premium；网络失败不撤销缓存权益。
- 已验证退款或撤销关闭权益。
- 本地持久化失败时不完成或确认平台交易。
- iOS 与 Android 真机分别覆盖购买、pending、取消、恢复、退款、断网和商店账号边界。
