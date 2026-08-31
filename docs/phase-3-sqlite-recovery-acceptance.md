# 阶段 3：SQLite 与恢复能力验收记录

日期：2026-09-01

## 交付范围

阶段 3 已建立独立于页面的 SQLite 数据层与持久化应用服务：

- 固定 MIT 许可的 `react-native-nitro-sqlite` 9.7.0 和
  `react-native-nitro-modules` 0.37.1；领域层不导入 SQLite 或 React Native。
- Android Gradle 与 iOS Resources 均打包生产 `content-v4/content.sqlite`。自有
  `ContentDatabase` TurboModule 在后台校验固定 SHA-256，将资源先复制到临时文件、
  校验后再替换为版本化目标 `content-v4.sqlite`，中断时不会留下可被误用的半文件。
- 内容连接启用 `query_only`，启动时执行 `quick_check`，核对 schema/content 版本、
  题量和每行内容版本；查询层提供按 ID 与 Level 1–5 稳定顺序读取，已对真实 10,000
  题库验证 Level 1 的 500 题查询。
- `user.sqlite` 迁移至 v2，保留 v1 历史并增加 active move、完整提示 move 字段、动作
  幂等收据和恢复事件结构。每个 migration 独立事务；失败回滚且不删除原数据库。
- `GameState`、active `GameMove[]`、提示步骤和撤销快照有显式序列化与恢复校验；损坏
  JSON 返回 `user_corrupt` 恢复错误，原记录保持不变。
- 仓储覆盖会话、操作历史、设置、尝试统计、两种额度钱包/流水、首次完成奖励和购买
  权益缓存。内容版本改变时返回 `content_changed`，不使用新题库答案继续旧会话。
- `PersistentGameService` 串行执行领域命令，并且只在 SQLite commit 成功后发布新的
  内存状态；被拒绝命令不写库，写库失败时内存仍保持上一个已提交 revision。

## 事务与幂等保证

每个有效命令必须带稳定 `eventId`，并在一个事务内完成：

1. 以旧 revision 乐观更新会话快照；
2. 同步 active move 历史和完整撤销数据；
3. 若命令消耗快速铅笔或智能提示，原子扣减钱包并写入流水；
4. 若进入完成、失败或放弃，写入 attempt 和统计进度；
5. 首次完成时，在同一事务写完成标记、连续完成状态、额度奖励和奖励流水；
6. 最后写入 `game_action_receipts`。

相同 `eventId` 重试直接读取已提交结果，不重复扣费、发奖或增加完成次数。普通用户
奖励在事务内按 20 点上限裁剪，流水记录实际入账金额。

## 故障与恢复验收

真实 Node SQLite 集成测试覆盖以下边界：

- v1→v2 migration 中途抛错后 `user_version` 仍为 1，v2 DDL 没有部分残留；
- 快速铅笔在写额度流水时故障，会话 revision 与钱包一起回滚，随后用同一事件安全重试；
- 应用服务保存失败时不发布新的内存状态；
- 智能提示展示扣费、提示应用、完整 undo snapshot 经过“新仓储实例”恢复后仍可整体撤销；
- 完成动作、attempt、首次完成标记、完美奖励、钱包与流水同事务提交；重复完成事件
  不重复发奖或累计统计；
- 结构损坏的 state JSON 被识别且不自动清除；题库版本变化时旧会话被隔离。

这些故障点对应在输入、提示和奖励提交期间终止进程时 SQLite 的事务边界。阶段 4 接入
正式棋盘 UI 后仍需在 iOS/Android 真机用系统强制终止方式复跑相同用户路径；该真机 UI
回归不改变阶段 3 已冻结的数据协议。

## 自动化与原生构建

- `npm run check`：格式、ESLint、TypeScript、schema、C++ 提示核心与全部 Jest 测试。
- `__tests__/sqlite-data.test.ts`：9 项 SQLite migration、事务、恢复、内容查询和故障注入测试。
- `ANDROID_HOME=/Users/lixiaohu/Library/Android/sdk ./gradlew :app:assembleDebug`：通过；
  arm64-v8a、armeabi-v7a、x86、x86_64 均构建，APK 含 `assets/content.sqlite`。
- `xcodebuild ... -sdk iphonesimulator ... build`：通过；arm64 与 x86_64 Simulator
  构建，App bundle 中的 `content.sqlite` SHA-256 与生产产物一致。

生产内容库固定 SHA-256 为
`9ddc17c8195a4342e9e5ae11cb02906103d4df55476fbf5c1441a2c4f16e849a`。
