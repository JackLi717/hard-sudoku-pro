# 阶段 1：原生提示桥接验收记录

日期：2026-09-01

## 已完成

- RN 0.87 Codegen 契约固定为 `HintEngine.nextStep` 和 `HintEngine.cancel`。
- TypeScript 请求在进入原生层前验证；原生结果解析后再次验证 `HintStep v1`、当前盘面和候选动作。
- `givenCells` 跨桥传递，使 Avoidable Rectangle 在 App 运行时具备完整证明输入。
- iOS Objective-C++ TurboModule 使用专用串行 GCD 队列；Android Kotlin TurboModule 使用专用单线程执行器和最小 JNI 入口，均不在 UI 线程运行引擎。
- 两个平台共用 `hsp::hint_core::nextStepJson`，状态、原因、证据和动作只维护一份映射。
- AbortSignal 会调用原生取消；运行中和排队中的 Android 请求、运行中的 iOS 请求均通过原子标志取消，不返回部分步骤。
- 畸形请求、非法盘面、已完成、无支持步骤、取消和原生异常均有明确边界。

## 自动化证据

- `npm run hint:core:check`：核心单元测试、100 题 6,161 步回放、1,000 个固定随机合法状态和 39 个检测器独立覆盖通过。
- 生产内容 v4：10,000 题、641,053 个逻辑步骤回放通过，全部 39 个检测器覆盖。
- Jest：原生请求编码、结构化返回复验、AbortSignal 取消、畸形 JSON/步骤隔离通过。
- Android：`app:assembleDebug` 通过，覆盖 arm64-v8a、armeabi-v7a、x86 和 x86_64；APK 中 JNI 入口与 C++ 核心完成链接。
- iOS：Debug Simulator 构建通过，覆盖 arm64 和 x86_64；产物包含 `HintEngineModule`、Codegen `NativeHintEngineSpecJSI` 和共用 C++ 桥接符号。
- iOS 模拟器端到端冒烟通过：JS 请求经 Objective-C++/C++ 返回 `step:fullHouse`。
- Android API 34 模拟器端到端冒烟通过：JS 请求经 Kotlin/JNI/C++ 返回 `step:fullHouse`；React Native 核心 TurboModule 与 HintEngine 同时正常注册。
- 核心回放 P95：Level 1 0.119 ms、Level 2 0.982 ms、Level 3 9.276 ms、Level 4 13.507 ms、Level 5 31.665 ms，均低于 100/300 ms 目标。

## 发布前人工签收

当前开发环境没有连接 iOS 或 Android 真机，因此以下硬件验收不能由本次自动化构建替代：

1. 最低目标 iPhone 与 Android 设备各连续请求 1,000 次，确认动画/触控无卡顿。
2. 在 Level 5 搜索期间连续取消 100 次，确认无迟到步骤、崩溃或请求泄漏。
3. 记录两平台普通/高级提示端到端 P50/P95/P99 和峰值内存。
4. 验证切后台、恢复、快速重复点击和销毁 React 实例时的请求清理。

完成以上签收后，阶段 1 可从“功能与自动化完成”更新为“发布验收全部完成”。
