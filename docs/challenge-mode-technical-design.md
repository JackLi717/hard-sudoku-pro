# 技巧挑战模式技术方案

记录日期：2026-10-02。状态：待评审技术设计，未实现。用户行为以 [产品定义](challenge-mode-product.md) 为准，正确性以 [选题与判题机制](challenge-mode-validation-policy.md) 为准。

目标是建立内容驱动的挑战系统：新增一集由设计输入、生成和验证完成，客户端不需要为每个题目新增代码或页面分支。

## 已有能力与缺口

以下为本次源码核对结果，不代表挑战功能已经具备：

| 能力 | 现有依据 | 可复用部分与缺口 |
| --- | --- | --- |
| 数独值与候选契约 | src/domain/sudoku/contracts.ts | Board、CandidateGrid、CandidateRef、RegionRef 可复用；挑战需完整快照身份 |
| 技巧检测 | native/hsp-hint-core/include/hsp/hint_core/engine.hpp | 支持 allDirect 机会搜索；需按挑战范围处理完整性与状态转换 |
| 结构化证明 | src/domain/hints/contracts.ts | HintStep 有前提、结果、分页证明和部分 teaching 数据；不是玩家依据校验器 |
| 移动端机会枚举 | src/native/NativeHintEngine.ts 及 native/hsp-hint-core/src/bridge.cpp | enumerateSteps 返回 steps、snapshotKey、complete；首期桥接的完整性诊断还需适配 |
| 操作解释 | src/domain/technique-recognition/native-analyzer.ts | explainOpportunityEffects 可找候选解释；不能直接用作挑战通关结论 |
| 真实局面生成和验证 | native/hsp-hint-core/tests/lab_corpus_builder.cpp、lab_fixture_validation.hpp | 有原题、回放和低级规则检查基础；尚无挑战状态图与设计输入编译器 |
| 按技巧检索 | tools/puzzle-generator/scripts/query_puzzles_by_technique.py | 查询评级路径来源；不能证明目标中间局面或综合路径可用 |
| 棋盘表现 | src/ui/components/SudokuBoard.tsx | 已支持值、候选、区域和推理标记；需挑战专用的依据与结论交互适配 |
| 对局保存 | src/application/game/persistent-game-service.ts、src/data/user/user-repository.ts | 可复用事务与恢复模式；GameState 的完整盘完成、钱包和统计不适合直接承载挑战 |
| Premium 和激励广告 | src/application/commercial/contracts.ts、controller.ts | 权益及 SDK 可复用；现有奖励只支持辅助额度，没有挑战集资格 |

当前技巧目录实际有 40 项；旧文档中的 39 项历史描述不作为新增技巧或挑战覆盖结论。首期适配仍仅围绕经批准的六种技巧及必要基础步骤。

原生 enumerateSteps 当前固定进行 Level 1～5 的 allDirect 扩展搜索，并返回整体 complete。explainOpportunityEffects 还会解释部分排除与一跳填数；其类型不携带玩家选中的结构证据。完整返回某个匹配与验证玩家完成目标是两件不同的事。

挑战适配建议按任务允许技巧执行或筛选搜索，并返回对应技巧的完整性诊断及证据数据。现有整体 complete 不能区分无关高级技巧截断与本关范围内截断；契约原型需解决这一差异，而不是忽略 false 或把所有截断都归为玩家错误。新接口继续复用同一检测器，不改变普通提示目录或排序。

## 用户流程对应的工程交付

| 用户行为 | 系统必须完成 | 当前还缺什么 |
| --- | --- | --- |
| 选择一集 | 同时判断前集通过、发布状态和访问资格 | 挑战目录、进阶投影与访问仓储 |
| 观看广告或直接进入 | 绑定目标集，持久化资格后加载 | 集奖励类型、事件幂等和资格事务 |
| 查看任务和候选 | 精确加载合法起点，免费显示规范候选 | 挑战内容格式与棋盘状态适配 |
| 选择依据和结论 | 维护两组独立草稿，不修改真实盘面 | 证据模型与挑战提交交互 |
| 确认提交 | 校验完整快照、结构、结果和任务范围 | 专用证据校验器、证书和响应契约 |
| 接受一步或调整草稿 | 原子应用正确步骤，错误保持原状 | 挑战领域转换、撤销和保存 |
| 连续完成综合推理 | 跟踪技巧覆盖和真实依赖 | 综合目标自动机、状态图及编译检查 |
| 通过并进入下一集 | 保存关、集通过事实并重新判断访问 | 通过事务及进阶与广告的解耦 |
| 暂停、退出和重试 | 取消旧请求、恢复证据、保留解析与访问事实 | 尝试持久化、恢复检查与故障反馈 |

## 模块边界

建议实现五个协作模块：

| 模块 | 输入与输出 | 禁止承担的职责 |
| --- | --- | --- |
| ChallengeContentRepository | 读取发布目录、任务、快照、状态图和解析 | 不保存用户进度，不连接题库服务器 |
| ChallengeDomain | 管理尝试、草稿、提交、目标进度和撤销 | 不接入广告、SQLite 或 React Native |
| ChallengeSubmissionValidator | 冻结快照与提交，返回判题证书 | 不按最终答案猜证明，不修改用户状态 |
| ChallengeController 与 ChallengeProgressRepository | 调度校验、事务保存、恢复、进阶和访问 | 不自行重新定义判题规则 |
| 挑战界面与棋盘适配器 | 展示状态并发送命令 | 不直接执行 SQL、原生检测或通过判定 |

内容编译器和独立检查器属于 tools/puzzle-generator 的构建流程，调用共享 C++ 逻辑；HoDoKu2 不进入 App。六种技巧的证据适配器和原子候选转换应能在构建检查与移动端调用，不能分别写成含义不同的算法。

优先新增独立的挑战领域模型与控制器，复用棋盘呈现和通用数独操作。不要为了复用 GameState 而伪造整盘完成、发放普通奖励或在普通游戏控制器中铺设每关特殊分支。

## 学习练习和挑战的共享边界

用户已确认三功能结构，免费讲解和五题练习包规则见 [讲解与练习设计](technique-learning-practice-design.md)。新增 LessonDefinition、PracticeExerciseDefinition、PracticePackDefinition 及专用控制器，复用技巧目录、快照、证明播放器、结构校验和候选转换。

帮助策略、通过判定、用户记录和访问资格按模式独立。练习可以显示解析，不能因共享组件使活动挑战获得答案；观看或练习完成不能推进挑战目标。

内容编译输入增加 content_usage 与原题来源族身份，跨讲解、练习、挑战拒绝相同来源及其等价变换或其他回放阶段。内容池可以共用只读数据库，但读取边界必须校验用途；跨功能导航只传技巧或目标内容稳定 ID 等导航信息，不能携带另一题 values、候选、证明答案或完成状态。共享的棋盘与校验器必须是受控组件或无会话状态的服务，各模式创建独立会话并以内容身份验证持久化数据。

建议新增 practice_pack_unlock 广告用途，奖励绑定固定 pack_id、technique_code 与五个 exercise_id。它与 challenge_set_unlock 的 set_id 分开持久化，同一个奖励事件只处理一次；不能依赖页面当前选中项决定迟到回调的目标。

当前还缺少课程播放器的正式适配、按技巧练习目录、练习会话、五题包编译检查与包访问仓储。这些是新增工程交付，不代表现有学堂或广告奖励已经支持。每种已发布技巧三至五题免费、扩展包恰为五题的检查在内容构建阶段完成。

## 内容契约

以下为逻辑字段，不是已提交的 schema 或 Codegen 接口：

| 类型 | 必要字段 |
| --- | --- |
| ChallengeSetDefinition | set_id、display_order、prerequisite_set_id、五个专项 level_id、一个综合 level_id、本地化标题 |
| ChallengeLevelDefinition | level_id、kind、起点 snapshot_id、task_policy、allowed_techniques、goal_spec、evidence_policy、transition_graph_id、解析引用 |
| ChallengeSnapshot | 原题 givens、当前 values、candidate_masks、source_puzzle_id、起点回放引用、content_digest、snapshot_key |
| TaskPolicy | 单次填数或完整原子排除、目标技巧是否公开、允许的结构证据和操作范围 |
| GoalSpec | 必要核心技巧种类、有效步骤下限、结果目标、跨步骤依赖要求 |
| VerifiedTransitionGraph | 状态、允许的完整原子边、证明变体、目标进度转换、终止节点、检查范围和完成标记 |

原题给定、回放后的已填值、玩家本次填值身份分开。起点的已填值在本关中锁定，但不能全部伪装成原题给定；唯一性技巧尤其需要真实给定身份。

沿用现有单元格 0～80、数字 1～9、81 项九位候选掩码和空位序列化边界。稳定技巧代码继续引用现有 TechniqueCode，不另建中文名称到算法的映射。

snapshot_key 规范化包含给定身份、values、candidate_masks 和内容身份。候选排除可能完全不改变 values，因此不能只用 81 位 boardFingerprint 判断新旧状态。

task_policy 和 goal_spec 是可执行类型，不接收自由文本布尔表达式或任意脚本。解析与答案数据不提前暴露给活动挑战的视图模型，原题完整答案只服务构建验证。

## 提交和判题契约

ChallengeSubmission 建议包含 submission_id、attempt_id、level_id、revision、snapshot_key、evidence_selection、effects。依据选择与结论分别传递；不要求 technique_name。

建议校验接口返回以下状态：

| 结果 | 语义 | 状态影响 |
| --- | --- | --- |
| accepted | 有效依据支持完整原子结论 | 返回 VerifiedStep 和新快照，保存后应用 |
| rejected | 在完整验证范围内违反任务或证据规则 | 盘面不变，记一次错误提交 |
| stale | 内容、revision 或快照已改变 | 不计错，要求使用当前状态 |
| unavailable | 取消、超时、枚举不完整或系统故障 | 不计错，不改变盘面 |

VerifiedStep 包含前后 snapshot_key、规范化 effects、经证据筛选的技巧集合、机会身份、依赖来源及校验证书。同一结论的多个证明保留为替代解释，不重复生成多次动作。

空提交、越界、重复结果和已应用结果由格式层阻止，不产生推理错误次数。重复 submission_id 返回已有处理结果；同一草稿在系统失败后重试可复用 ID，修改草稿必须产生新 ID。

挑战首期不直接调用归因协议的 automaticTechnique 作为考核技巧。低成本排序是可能解释的默认选择，既不能替代结构证据，也不能累计掌握程度。

## 状态与命令

领域状态建议区分 ready、active、validating、paused、passed、solution_viewed、abandoned。错误提交后继续 active；技术失败也返回 active。读取解析终止当前活动尝试，重试建立新 attempt_id，并保留该关曾看解析的事实。

主要命令为 start_level、edit_draft、submit、undo_accepted_step、pause、resume、restart_level、end_and_view_solution。执行中禁止再次提交；后台、撤销、重试或切关撤销正在进行的校验。

异步结果只有 attempt_id、revision、snapshot_key 和请求身份全部匹配才可应用。校验在后台运行，界面不等待机会枚举才能处理返回、暂停或取消。

挑战 canonicalCandidates 由起点合法回放和接受的推理维护。显示候选、依据标记和提交草稿分别存储，不用普通游戏 quickCandidates 覆盖推理状态；免费恢复候选是恢复当前规范候选，而非从已填值重新计算全部候选。

填数产生的同侪候选清理属于免费确定性传播，不独立计为技巧步骤。传播不自动填入单数。已接受步骤的撤销恢复 values、候选、依赖图和当前目标进度；错误提交累计与曾看解析事实不随撤销消失。

## 数据和事务

发布内容位于现有只读 content.sqlite 的独立挑战表或等价构建资源，通过专用仓储读取；具体物理格式在内容大小原型后冻结。用户数据位于 user.sqlite 的独立挑战访问、进度、尝试和提交记录，页面不读写数据库。

每个 accepted 事务原子保存提交身份、证书、新快照、当前依赖与目标进度，以及产生的关通过或集通过事实。保存失败不展示通过，重试同一提交不能重复推进。

集通过和下一集进阶资格在同一事务写入。下一集的广告访问资格另存，不能把前一集通过误认为已领取广告奖励。

恢复先校验内容身份，再按接受的步骤重放。显示草稿可丢弃或另行恢复，不能把待验证草稿当作真实排除。缺少步骤或出现不合法快照时保留通过和访问事实，报告恢复故障并回到该关合法起点。

开发期更新当前 schema 与协议，不在本设计中分配新版本号或连续 migration。正式发行后的实现须先遵守 AGENTS.md 的兼容基线要求；相同稳定 ID 不能无说明地更换已发行关卡含义。

## 广告接入

建议新增 challenge_set_unlock 广告用途与集访问奖励类型，复用现有 AdGateway、Premium 查询、市场和隐私判断。不得使用 smartHint 或 quickPencil 的假奖励来代替集访问。

广告播放前再次核对进阶、当前访问、商业操作互斥和权益。请求绑定 set_id 与 request_id；有效 rewardEventId 到达后，先原子写入奖励事件及集资格，再导航。重复事件只处理一次；旧回调不能解锁用户后来选择的另一集。

已持久化奖励可以恢复或幂等重试。若进程在 SDK 回调到达后、首次持久化前终止，而 SDK 不重放回调，不能声称绝对可恢复；实现原型需验证平台回调边界并报告这个限制。

Premium 期间不请求广告，不扣普通钱包。集资格复用和 Premium 撤权语义按产品待决策项冻结后实现。

## 工程缺口和实施顺序

1. 冻结提交、证据、快照、目标和状态转换契约。
2. 实现六种技巧的证据校验与共享原子状态转换，覆盖有效替代证明。
3. 实现内容编译器、有限状态图和独立检查器，先用临时素材验证机制。
4. 实现挑战领域、接受事务、撤销、解析与杀进程恢复。
5. 实现集访问和广告奖励，保证资格与进阶相互独立。
6. 完成经批准的正式内容，再实现挑战入口、列表、棋盘提交和结果视图。

每步完成门槛见设计总览；前三步没有通过前不批量制作关卡。目标设备上的图大小、加载耗时、判题耗时、取消响应和内存预算需实测后确定，不引用现有提示的耗时作为挑战性能承诺。

验证至少覆盖原生证据正反例、领域状态、持久化故障注入、双平台桥接、商业互斥、候选污染和完整替代路径。现有 npm test、npm run lint 和 npm run hint:core:check 在对应实现时运行，本次只交付文档，不宣称这些实现检查已通过。
