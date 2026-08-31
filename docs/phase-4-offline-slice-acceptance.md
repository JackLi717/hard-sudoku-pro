# 阶段 4：离线可玩纵向切片验收记录

日期：2026-09-01

## 交付范围

阶段 4 已将生产题库、游戏领域、C++ 提示引擎和 SQLite 持久化接入首个 React Native
可玩切片：

- 首页显示继续入口、Level 1–5、各等级完成数、最小统计和当前智能提示额度；分配器优先
  选择同等级未首次完成的题目。
- 全局只允许一局未完成游戏。已有游戏时开始新局必须确认；确认后先事务化记录放弃，
  再创建新会话，取消不会修改旧局。
- 受控 9×9 棋盘区分给定数、玩家数和错误数，并提供当前格、同行/同列/同宫、相同数字
  和提示目标高亮；候选数固定显示在格内九个位置。
- 数字键盘显示剩余数，固定工具栏覆盖撤销、擦除、快速铅笔、铅笔和智能提示；两份草稿、
  当前来源、铅笔模式和完整撤销历史都通过阶段 3 数据协议保存。
- 快速铅笔首次生成、同盘面恢复、盘面改变后的重新生成确认和额度扣减已接入；智能提示
  完成 prepare → C++ `nextStep` → reveal → apply/dismiss，并在提示打开时锁定棋盘。
- 返回首页、显式暂停和 App 进入后台都会先保存并停止计时；暂停遮罩隐藏棋盘，只提供继续
  和放弃。
- 完成/失败页面显示时间、错误、提示使用和首次完成奖励，并支持失败重试、同等级下一题和
  返回难度选择。统计、进度、奖励和额度在 SQLite commit 后才发布到 UI。
- `GameAccessAdapter` 隔离 Premium 与开始/继续广告机会；阶段 4 使用不联网、不阻断游戏的
  `OfflineTestAccessAdapter`，阶段 7 可替换而不改游戏流程。

当前 UI 使用原创的暖中性色与绿色视觉系统、系统字体及文字/Unicode 工具标记，不包含参考
产品图标或视觉资产。深浅色、四语文案、正式图标和完整无障碍审计属于阶段 6。

## 自动化验收

`__tests__/offline-game-coordinator.test.ts` 使用真实内存 SQLite 覆盖：

1. 从 Level 选择开始游戏，选择格与填数逐步提交，并在完成时结算统计；
2. 返回首页暂停后，用新协调器实例恢复，再验证新局替换必须确认且放弃统计即时刷新；
3. 快速铅笔扣费、智能提示展示扣费、提示应用完成、首次奖励和最终钱包余额；
4. 完成后选择同等级下一道尚未首次完成的题；
5. 系统中断暂停、用户显式继续，以及持久化操作进行期间收到中断后的排队暂停。

全量 Jest 为 8 个 suite、53 个 test；格式、ESLint、TypeScript、schema 和 C++ 提示核心均
由 `npm run check` 统一执行。

## 原生与运行时验收

- Android `:app:assembleDebug` 通过，包含 arm64-v8a、armeabi-v7a、x86 和 x86_64。
- iOS Simulator Debug 通过，App 可执行文件同时包含 arm64 与 x86_64；App bundle 包含生产
  `content.sqlite`。
- Android 与 iOS 的离线 production Metro bundle 均成功生成，不依赖远端资源。
- iOS 26.5 的 iPhone 17 Pro 模拟器完成真实安装和启动。首页从 App 数据容器读取到
  `content-v4.sqlite` 的 10,000 道题，`user.sqlite` 自动迁移到 v2，初始额度为快速铅笔 3、
  智能提示 5。

当前主机没有连接 Android 或 iOS 真机，因此开发计划中的“双真机断网完整游玩、退出恢复并
完成结算”仍是阶段 4 的最终人工门槛；代码、模拟器和事务集成验收已经完成，但在该门槛补测
前不把阶段 4 标记为最终完成。

## 依赖风险复核

`npm audit --omit=dev --audit-level=high` 当前报告 8 个 high 和 2 个 moderate：high 来自 React
Native/Metro 的 `image-size` 构建工具链，moderate 来自 Nitro SQLite 间接包含但本应用未使用的
TypeORM。自动修复会强制降级已冻结的 React Native 或 Nitro SQLite，属于破坏性变更，因此
阶段 4 不执行 `npm audit fix --force`；发行候选版本前继续跟踪上游修复并重新审计。
