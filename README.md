# Hard Sudoku Pro

Hard Sudoku Pro 是一款使用 React Native 开发、面向 iPhone 和 Android 的数独应用。项目目前处于持续开发阶段，已经具备离线游戏、智能提示和基础产品界面，同时仍在完善产品架构及离线题库生产流程。

## 当前范围

- 基于 React Native 0.87.1 的 iOS 和 Android 应用。
- 首个版本支持英语、日语、德语和简体中文。
- 题库内容只读，仅随 App 版本发布而更新。
- 内置题库与用户进度分别存储。
- 基于解题技巧划分 Level 1 至 Level 5 五个难度等级。
- 使用 HoDoKu2 构建离线出题、求解和评级流水线。
- 提供一个由 100 道题组成、难度分布均衡的验证题集，用于验证内容流水线；它不是正式发布题库。
- 正式发布题库计划包含 10,000 至 30,000 道经过审核的离线题目，最终难度分布将在发布前确定。

产品和数据方面的决策记录在[产品与数据架构指南](docs/product-and-data-architecture.md)中。首发版本的界面、本地统计、广告、购买及辅助点数奖励定义在[游戏功能计划](docs/game-feature-plan.md)中。实现顺序、交付门槛和测试策略记录在[开发路线图](docs/development-roadmap.md)中，运行时算法的工作则详见 [C++ 提示引擎开发计划](docs/cpp-hint-engine-development-plan.md)。市场参考和尚未解决的决策分别记录在[市场基准分析](docs/market-benchmark.md)和[待决问题清单](docs/open-questions.md)中。跨模块契约和阶段零验收规则记录在[工程基线](docs/phase-0-engineering-baseline.md)中，依赖许可证与审计结论记录在[第三方依赖基线](docs/third-party-dependencies.md)中。

未来提示实验、玩家能力分析、数据驱动验证以及衍生游戏的非约束性构想，保存在[未来产品策略构想池](docs/future-product-strategy-ideas.md)中。这些构想不会改变当前的产品定义或开发路线图。

运行时智能提示采用原创、平台无关的 C++20 库，并通过轻量 React Native 适配层接入。候选方案的审计结果、已经实现的安全边界以及采用该方案的原因，记录在[提示引擎评估](docs/phase-1-hint-engine-evaluation.md)中。HoDoKu2 只作为离线判定基准使用，不是 App 的运行时依赖。

## 仓库结构

```text
android/                    Android 原生工程
ios/                        iOS 原生工程
__tests__/                  Jest 测试
database/schema/            带版本管理的 SQLite Schema 契约
docs/                       产品与架构决策文档
native/hsp-hint-core/       平台无关的 C++20 智能提示库
src/domain/                 与界面无关的游戏及提示契约
tools/puzzle-generator/     基于 HoDoKu2 的离线内容流水线
App.tsx                     React Native 根组件
```

HoDoKu2 仅用于构建阶段，不会链接到移动应用中，也不会随应用分发。候选题库通过审核后，App 将读取生成的 `content.sqlite` 数据库。

## 开发环境

环境要求：

- Node.js 22.13 或更高版本
- npm
- Ruby 3.1 或更高版本及 Bundler
- iOS 开发需要 Xcode 16.1 或更高版本
- Android 开发需要 Android Studio 和 JDK 21
- 支持 C++20 的编译器；独立构建核心库时可选用 CMake 3.22 或更高版本

安装依赖并启动 Metro：

```bash
npm install
npm start
```

在另一个终端运行应用：

```bash
npm run ios
npm run android
```

首次构建 iOS 应用前，需要安装 CocoaPods 依赖：

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## Android 模拟器构建与安装

先在 Android Studio 中选择 `Tools` → `Device Manager`，找到目标 AVD，然后点击右侧的 `▶` 启动模拟器。若模拟器系统反复无响应，可通过该 AVD 右侧的 `⋮` → `Cold Boot Now` 执行冷启动。

模拟器启动完成后，在项目根目录执行：

```bash
npm run android -- --active-arch-only
```

该命令会为当前模拟器架构构建 Debug APK、将其安装到已连接的 Android 模拟器，并启动应用。

如果 Metro 已经在另一个终端中运行，可避免重复启动 Metro：

```bash
npm run android -- --active-arch-only --no-packager
```

如果同时连接了多个设备或模拟器，可以交互选择目标设备：

```bash
npm run android -- --list-devices
```

## 质量检查

```bash
npm run check
npm run lint
npm test -- --runInBand --no-watchman
npm run hint:core:check
```

## 数独内容流水线

固定版本的 HoDoKu2 二进制文件、评级策略、许可证、构建脚本及生成的审核产物均位于 `tools/puzzle-generator/`。

创建一套新的、难度分布均衡的 100 道验证题集：

```bash
cd tools/puzzle-generator
python3 scripts/build_puzzles.py --per-level 20 --content-version 2
```

生成题目需要 Java 21 或更高版本。内容版本不可变：请使用新的版本号，不要覆盖已有发布版本。输出格式和验证规则详见[题库生成器指南](tools/puzzle-generator/README.md)。

## 项目状态

本仓库仍处于积极开发阶段。生成的 `content-v1` 数据库是一套等待人工审核的验证题集，并非最终生产题库。

仓库内置的 HoDoKu2 工具保留其上游 GPL-3.0 许可证和第三方声明。本仓库的其余部分尚未声明许可证。
