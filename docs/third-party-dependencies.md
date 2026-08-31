# Hard Sudoku Pro：第三方依赖基线

## 1. 规则

依赖必须固定在 `package-lock.json`，引入前检查维护状态、许可证、iOS/Android 支持和 React Native 0.87 新架构兼容性。GPL 等强 copyleft 组件不能链接进计划闭源发布的 App；独立构建工具可以使用，但必须保留许可证并与 App 产物隔离。

## 2. 当前 App 运行时依赖

| 依赖 | 固定版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| React | 19.2.3 | MIT | UI 基础 |
| React Native | 0.87.1 | MIT | iOS/Android 应用框架 |
| React Native Safe Area Context | 5.9.1 | MIT | 安全区域 |
| React Native New App Screen | 0.87.1 | MIT | 模板占位页，建立正式 App 根组件后移除 |
| React Native Nitro Modules | 0.37.1 | MIT | Nitro SQLite 的 JSI/New Architecture 运行时 |
| React Native Nitro SQLite | 9.7.0 | MIT | `content.sqlite` 只读查询与 `user.sqlite` 异步事务 |

当前开发依赖主要为 React Native 官方 CLI、Babel、ESLint、Jest、Prettier 和 TypeScript；除 TypeScript 为 Apache-2.0 外，直接开发依赖均声明为 MIT。具体传递版本以锁文件为准。

## 3. 构建期工具

| 依赖 | 版本 | 许可证 | 边界 |
| --- | --- | --- | --- |
| HoDoKu2 | 2.4.3 build 116 | GPL-3.0 | 仅在 `tools/puzzle-generator` 离线生成、评级和审计；不得进入移动 App |

HoDoKu2 也可在开发机或 CI 中作为阶段1离线提示 oracle。内部测试不会改变发行边界：任何分发给测试用户或商店用户的 App 包均不得包含、链接或运行该 JAR。当前运行时采用原创 C++ 核心，因此不依赖 HoDoKu2 商业授权；只有未来改变边界、计划分发或链接其代码时才必须重新完成授权评估。

`native/hsp-hint-core` 当前只使用 C++ 标准库，不含第三方运行时代码。参考 MIT 算法实现时仍须记录固定版本、来源、许可证和实际复用范围。

## 4. 尚未引入的候选项

- `jkomoros/sudoku`：Apache-2.0；已因技巧覆盖不足、随机选择和复合步骤语义被阶段1否决。
- `@sudoku-tools/classic9` 0.5.0：MIT；已因100题回放出现14个候选矛盾被阶段1否决。
- `kyoyama-kazusa/Sudoku`：MIT；技巧完整，但当前没有适合 React Native iOS/Android 的稳定官方分发和绑定方式，仅可作为算法参考。
- SQLite 驱动：阶段3已完成验证并固定，见当前 App 运行时依赖。
- 广告、隐私同意和购买 SDK：阶段7决定。

候选项不等于已批准依赖，不能因为出现在文档中就直接加入项目。

完整证据和后续选型门槛见 `docs/phase-1-hint-engine-evaluation.md`。

## 5. 已知审计事项

阶段0执行 `npm audit --omit=dev` 时，npm 对 React Native 0.87/Metro 工具链报告9项 high、0项 critical。报告的具体可利用问题包括 `image-size` 在解析特制 ICNS/JXL/HEIF 文件时可能无限循环；当前路径发生在本地打包工具，不是 App 接收远程图片的运行时代码。

npm 当前给出的自动修复建议是把 React Native 降级到 0.84.1，属于破坏性框架变更，不能自动执行。该事项进入问题台账，需跟踪 React Native/Metro 的正式修复版本或经过验证的安全覆盖方案。发行候选版本不能保留未评估的 high/critical 运行时风险。
