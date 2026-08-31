# Hard Sudoku Pro：阶段0工程基线

## 1. 范围

阶段0只冻结跨模块契约、工程边界和自动检查，不实现棋盘玩法、SQLite 驱动、智能提示算法、广告或购买。产品行为以市场对齐基准和既有产品文档为准；未确定事项进入问题台账。

## 2. 模块边界

```text
React Native 页面与组件
        ↓ 只发送用户意图、渲染 ViewModel
应用服务 / 状态编排
        ↓
领域层 src/domain
        ├── sudoku：盘面、数字、候选数、指纹
        ├── game：会话、计时、撤销快照、游戏事件
        ├── hints：技巧目录和 HintStep v1
        └── content：题库记录契约
        ↓                       ↓
数据适配层                   原生提示适配层
content.sqlite / user.sqlite  Go/C++ → HintStep v1
```

依赖方向只能向下。领域层不能导入 React、React Native、SQLite、广告、购买或原生模块。页面不能执行 SQL、读取标准答案或直接调用求解器。

## 3. 核心表示

- 盘面固定为81个 `Digit | null`，格子索引固定为 `0–80`。
- 候选数使用9位整数掩码；第 `n-1` 位表示数字 `n`。
- 盘面指纹是81字符的规范化盘面本身，空格使用 `0`。它用于内容比较，不是安全哈希。
- `manualCandidates`、`quickCandidates` 和 `hintCandidates` 分开保存；`solverCandidates` 只在计算期间存在。
- 撤销记录保存操作前后完整领域快照。标准数独状态很小，首期优先保证恢复正确性，不采用复杂增量补丁。
- `HintStep v1` 只描述一个技巧的一个原子结果：一个确定填数，或一个及以上候选排除，不能混合两类结果。

## 4. 数据库边界

- `database/schema/content-v1.sql` 定义随 App 发布的只读题库。
- `database/schema/user-v1.sql` 定义可迁移的本地用户数据。
- 游戏完整状态和撤销快照以带版本的 JSON 保存，常用筛选和统计字段使用独立列。
- 同一时间最多存在一条 `active` 或 `paused` 会话，由数据库唯一索引保证。
- 完成记录、首次奖励和额度流水必须由数据层放在一个事务中执行。

当前 `content-v1` 是构建流程验证产物，其中仍保留 HoDoKu 原始技巧代码。正式 App 内容需要在生成阶段映射为 `src/domain/hints/techniques.ts` 定义的项目技巧代码；原始代码只进入构建审计报告。

## 5. 平台基线

- App 标识：`com.jackli717.sudoku`。
- iOS 最低版本沿用 React Native 当前基线 `15.1`。
- Android 最低版本沿用当前基线 API 24。
- JavaScript 工具链要求 Node `22.13.0` 或更新版本。
- React Native 0.87 的 iOS 工具链要求 Xcode `16.1` 或更新版本。
- 首期正式目标为 iPhone 和 Android 手机，只支持竖屏。
- App 显示名称为 `Hard Sudoku Pro`，英语为源语言。

## 6. 自动检查

每次合并至少运行：

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand --no-watchman
```

涉及 Android 原生配置时增加 `cd android && ./gradlew :app:assembleDebug`；涉及 iOS 原生配置时增加对应模拟器构建。数据库 schema 需要在临时 SQLite 数据库执行并通过 `integrity_check` 与 `foreign_key_check`。

## 7. 阶段0完成条件

- 市场对齐基准与问题台账已建立。
- App 标识、手机范围和竖屏约束在两个平台一致。
- 核心 TypeScript 契约可编译并有单元测试。
- 两个 SQLite schema 可以创建并通过完整性检查。
- 格式、Lint、TypeScript、Jest 和 Android Debug 构建通过。
- 阶段1所需的提示引擎未知项已经明确，没有隐藏在 UI 或数据层中。

当前机器选择的是 Node `22.12.0` 和 Xcode `15.4`。代码检查在现有 Node 上通过，但它低于正式工具链基线；CocoaPods 已明确拒绝在 Xcode 15.4 下生成 React Native 0.87 工程。升级环境并完成 iOS 模拟器构建前，阶段0不能标记为全部完成。
