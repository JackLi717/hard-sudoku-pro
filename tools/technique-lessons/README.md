# 技巧课程资源生成

本工具按课程清单导出精简的只读资源，调用现有 C++ 检查器从原题重新计解和回放，并用实际 TypeScript 课程读取器检查四语内容及完整讲解。运行时只读取生成结果，不加载 Hint Lab 全目录、HoDoKu、答案或验收数据。

当前清单为 Level 1–3 的 14 项技巧、35 种模式各选一道真实局面。正式讲解直接使用已验证的 Hint Lab 分步证明，不另写逐题介绍和回顾。练习题来源独立；工具通过不等于整个产品已经可发布。

## 输入和输出

| 文件 | 职责 |
| --- | --- |
| manifest.json | 技巧、模式、稳定讲解 ID 与精选例题引用 |
| source-fixtures.json | 从 Hint Lab 离线候选中选出的 35 个完整回放来源，仅供构建期原生验证 |
| content-allocations.json | 讲解、练习和挑战的完整来源分配清单；三池未来生产工具共同维护 |
| src/debug/generated/hint-lab-fixtures.json | 内部阅读预览的旧素材；正式构建使用上面的精选来源库 |
| src/data/lessons/generated/lesson-catalog.json | 生成的正式格式资源，只包含选定课程，不手工编辑 |

不同来源 ID 不代表不同题目。分配检查同时计算原题来源族和完整局面身份，包含当前值、候选与给定身份，对数字置换、旋转、镜像及另一回放阶段造成的跨池复用直接报错。来源等价检查不充分时拒绝导出。

## 课程清单

manifest.json 顶层只有 lessons 数组，每个正式模式成员只填写下列字段。棋盘、候选和证明由生成器读取与验证，不手工编辑。

| 字段 | 要求 |
| --- | --- |
| lesson_id | 稳定且唯一的模式讲解标识 |
| technique_code | 现有技巧代码，必须与所选证明一致，不另外重命名技巧 |
| pattern | 图文已有的 row、column、box 或 cell 模式；必须与例题的真实覆盖标签一致 |
| example_id | 候选素材的稳定 ID，每个导出课程选一个主例 |

内部预览沿用旧的前置技巧和四语文字契约，正式模式讲解不使用这些重复文字。技巧名称和模式名称由已有本地化文案提供，推理正文沿用生成证明和现有教学构建器。

## 生成和验证

准备好课程清单后，先从素材引用生成来源分配记录。该操作保留现有练习和挑战记录，重建本次课程记录；完整文本、跨池检查及原题证明验证通过后才写入指定分配文件，不安装课程资源。

```sh
npm run lessons:build -- --prepare-allocations tools/technique-lessons/content-allocations.json
```

然后按分配清单生成课程资源，并检查生成结果。

```sh
npm run lessons:build
npm run lessons:check
npm run lessons:test
```

需要内部原型时，通过 --manifest、--corpus、--allocations 和 --output 指定临时文件。--binary 可复用当前工作过程里已编译的原生检查器；默认在临时目录编译并清理，不保留检查历史或增加资源版本。

每次生成依次检查清单及来源、运行时格式与四语讲解、全目录跨池归属、原题唯一解及回放、原生重新生成的目标证明。已有 validation.passed、缓存覆盖标签或正确答案不能替代这些检查。任一失败时不覆盖当前输出；全部通过后以原子替换安装当前资源。

内容变更一并提交课程清单、工具生成的来源分配清单及课程资源。开发期直接更新当前基线，不添加历史课程库或实验版本。

## 运行时边界

LessonRepository 支持课程子集、按技巧筛选、按语言读取及未知课程返回空。目录摘要只提供课程介绍，详情提供教学说明和兼容共享播放器的不可变快照；不返回完整答案、Lab 来源元数据、其他池的内容或验收记录。

buildLessonPresentation 使用现有证明构建器的阅读语义，拒绝缺少结构化证明或只能生成占位页的资源。Jellyfish 的所有可选排除目标均经过四语讲解检查。

原题计解、合法回放和证明独立重算属于构建期检查。运行时做格式和表现准入，不声称重新证明原题唯一解。其他模式的来源记录参与隔离检查，其题目合法性仍由各自内容生产工具验证。

课程页面和独立学习存储已接入开发预览；开发设置入口现在读取 35 道正式讲解资源。正式首页入口仍未接入。App 当前静态引用的内部 Lab 是否进入 Release bundle，仍须在后续正式入口与资源构建阶段检查，不能只凭独立仓储断言已解决。

## 旧预览素材

设置的开发者工具中的“教学阅读预览”现读取正式的 35 道讲解资源。preview-manifest.json 仍保留隐性唯一数、水母及锁定候选数（指向）的旧阅读原型素材，供原有阅读与恢复测试使用；它不参与正式讲解目录。

```sh
npm run lessons:preview:build
npm run lessons:preview:check
```

预览引用变更时，先运行下面的完整验证命令重建预览分配，再生成预览资源。preview-allocations.json 仅为内部预览的构建检查输入；正式讲解、练习和挑战生产仍统一使用 content-allocations.json，不能用预览清单替代三池归属检查。

```sh
python3 tools/technique-lessons/build_lessons.py --manifest tools/technique-lessons/preview-manifest.json --corpus src/debug/generated/hint-lab-fixtures.json --allocations tools/technique-lessons/preview-allocations.json --prepare-allocations tools/technique-lessons/preview-allocations.json
```

预览资源位于 src/debug/generated/lesson-preview.json，由同一生成器导出，不手工编辑盘面、候选或证明。LessonScreen 与 LessonController 只依赖课程读取接口及学习存储接口，预览素材由独立 debug 外层注入。
