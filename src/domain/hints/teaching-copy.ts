/** One current teaching vocabulary shared by game, saved replay and paths. */
export const teachingEnglish = {
  factTrue: '{candidates} is true',
  factFalse: '{candidates} is false',
  snapshot:
    'Use the verified candidates shown here. Earlier valid removals remain in effect.',
  aicSnapshot:
    'Focus on {regions}. A solid link means one of its two candidate ends must be true in that region; a dashed link means both ends cannot be true. Follow the links by alternating false and true.',
  forcingChainSnapshot:
    'Keep the target candidate {targets} in view. Test both possible states of {candidates}: true and false. Together they cover every possibility. If both branches reach the same result, that result is forced.',
  legacy:
    'This record does not contain enough verified evidence for a step-by-step diagram. The original result is shown below.',
  cell: '{cells} can contain only {digits}.',
  positions:
    'In {regions}, {digits} can go only in {cells}. The digit must appear once in this region.',
  locked:
    'All positions in {source} lie in {cover}. Since {source} must contain {digits}, the intersection supplies it. Other cells in {cover} cannot contain {digits}.',
  naked:
    '{count} cells in {regions} share the complete candidate set {digits}. They must use these {count} different digits. Other cells in this region cannot use any of them.',
  hidden:
    'In {regions}, all positions for {digits} are confined to these {count} cells. These digits need all of those cells, so other digits cannot remain there.',
  fish: 'Each of the {count} base regions ({source}) needs one {digits}. All their positions lie in the {count} cover regions ({cover}). No cover can take two, so every cover is occupied by the fish. Remove {digits} outside the bases in these covers.',
  jellyfishPremise:
    'A Sudoku region must contain {digits} exactly once. Each selected base region ({source}) still needs it, so each must eventually choose one of its circled candidates.',
  jellyfishPattern:
    'All circled candidates in the four bases lie in the same four cover regions ({cover}). Pale yellow marks the bases; blue marks the covers. Together they form the Jellyfish.',
  jellyfishTarget:
    'Choose any {digits} in a cover but outside the four bases. We will test {selected}; every other target can be tested in the same way.',
  jellyfishAssume:
    'Suppose {selected} is {digits}. It occupies {cover}, so cross out the other {digits} candidates there: {crossed}.',
  jellyfishForce:
    '{base} now has only {selected} for {digits}. Select it and cross out the other {digits} candidates in its base and cover: {crossed}.',
  jellyfishNoPlace:
    '{base} still needs {digits}, but all its candidates have been crossed out. This contradicts the Sudoku rule that the region must contain {digits}.',
  jellyfishTooFewCovers:
    '{baseCount} unresolved bases still need one {digits} each, but their candidates occupy only {coverCount} available covers. They cannot all be placed without sharing a cover, so the assumption is impossible.',
  jellyfishResult:
    'The arbitrary choice {selected} creates a contradiction, so it cannot be {digits}. Every target lies in a cover outside the bases and has the same proof; remove {targets}.',
  fins: 'The fish body is {cells}. The extra candidates (fins) are {fins}, all in {regions}. {missing}',
  missing: 'The missing corner {cells} has no candidate; it is not a premise.',
  finTrue:
    'If any fin is {digits}, every target sees it in the fin box and cannot be {digits}.',
  finFalse:
    'If all fins are false, the two base regions must place {digits} in the two cover regions. Each cover is occupied. The targets lie in a cover outside the bases, so they cannot be {digits}.',
  sashimiPair:
    'In {regions}, {digits} has exactly two positions: {candidates}. One must be true. Check them one at a time.',
  sashimiDirect:
    'Case 1: set {selected}. Cross out the other position {opposite}. {selected} also sees every target, so cross out {targets}.',
  sashimiFin:
    'Case 2: set {selected}. Cross out {opposite} and {corner}. In {regions}, the only remaining positions for {digits} are the fins {fins}, so at least one fin is true. Every target sees all fins, so cross out {targets}.',
  sashimiResult:
    'Both cases cross out {targets}. These candidates are therefore impossible and can be removed.',
  wing: 'The pivot is {cells}. Its complete candidates are {digits}; the two wings are {wings}. Examine every possible pivot value.',
  assume: 'Branch {branch}: suppose {candidates} is true.',
  assumeFalse: 'Branch {branch}: suppose {candidates} is false.',
  weak: '{from} is true. Remove {candidates}.',
  forcingChainWeak: '{from} is true. Remove {candidates} from {regions}.',
  strong:
    '{from} is false. Together these two sides contain every remaining option in {regions}. Therefore {candidates} must be true.',
  cellStrong:
    '{from} is false. {regions} now has only {candidates} left, so it must be true.',
  single:
    'After the preceding exclusions, {candidates} is the only remaining option in {regions}. It is forced under this assumption.',
  wingResult:
    'In every branch, {digits} is true in at least one of {cells}. Every target sees all these possible locations, so it cannot be {digits}.',
  wWing:
    'The two wings {cells} have the same two candidates {digits}. The connecting digit has exactly two positions: {candidates}. If the outer digit were false in both wings, both wings would take the connecting digit and exclude both positions of that strong pair.',
  reset:
    'Withdraw this assumption and its consequences. Return to the unchanged candidate snapshot before examining the next possibility.',
  conflict:
    'This assumption leaves no possible value or position in {regions}: {candidates}. A Sudoku cell and each missing digit in a region must have an option. The assumption is impossible.',
  opposite: 'Assuming {assumption} creates a contradiction, so {result}.',
  aicContradictionResult:
    'The deduction contradicts “{assumption}”, so {result}.',
  common:
    'Every possible branch reaches the same fact: {candidates}. After withdrawing all assumptions, this fact remains certain.',
  endpoints:
    'If the first side is false, the last side is true. Thus at least one endpoint side contains the digit. Every target sees every candidate in both endpoint groups, so remove the targets.',
  xChainIndirect:
    '{from} is false, so {candidates} is forced in {regions}. Every target sees {candidates}, so cross out {targets}.',
  xChainDirect:
    'Case 2: set {selected}. Every target sees it, so cross out {targets}.',
  xChainResult:
    'Both cases cross out {targets}. These candidates can therefore be removed.',
  xyChainStart: 'Case 1: set {selected}. Cross out conflicting candidates.',
  xyChainHop: 'Set {selected}. Cross out conflicting candidates.',
  xyChainEnd: 'Set {selected}. Cross out the targets.',
  xyChainDirect: 'Case 2: set {selected}. Cross out conflicting candidates.',
  xyChainResult: 'Both cases cross out {targets}. Remove them.',
  groupedAicStart: 'Case 1: {from} is false, so {selected} is true.',
  groupedAicWeak: '{selected} is true, so cross out {crossed}.',
  groupedAicStrong: '{from} is false, so {selected} is true.',
  groupedAicEnd: '{selected} is true, so cross out the targets.',
  groupedAicDirect: 'Case 2: {selected} is true. Cross out the targets.',
  groupedAicResult: 'Both cases cross out {targets}. Remove them.',
  groups:
    'Braces identify a group: at least one candidate in it is true, without choosing a particular cell. Solid links cover all positions in a region; dashed links connect mutually exclusive groups. This detector supports a single-digit grouped chain.',
  colors:
    'Component {component}: A = {a}; B = {b}. Linked candidates alternate. Either every A is true and every B false, or the reverse. Colors are possibilities, not filled answers.',
  colorConflict:
    '{a} and {b} have the same color and see each other. That color cannot be true; all candidates of that color are false.',
  colorTrap:
    'Each target sees an A and a B in this component. Whichever color is true excludes the target.',
  multi:
    '{a} and {b} belong to different components and conflict. Their colors cannot both be true, so at least one opposite color must be true. Each target sees both opposite colors.',
  colorPropagation:
    'If {a} is true, remove {b}. That color is false, forcing its opposite color {candidates}.',
  remote:
    'Every marked cell has exactly {digits}. Connected peer cells must take opposite values. The two colors record these opposite states throughout the component; they are not an arbitrary list of chain cells. Each target sees both states.',
  uniqueness:
    'This argument assumes the puzzle has exactly one solution. These four cells occupy two rows, two columns and two boxes. Swapping the two digits would preserve every region.',
  swap: 'Possible rectangle filling {branch}: {candidates}. Swapping all four entries gives the other filling. These are hypothetical values only.',
  unique:
    'Type 1: three corners have only {digits}. If the fourth also took one of these digits, the rectangle could be swapped. The fourth must use another digit.',
  hiddenRectangle:
    'The floor {cells} has only {digits}. The roof strong pair {candidates} forces its digit into one roof corner. Putting the other pair digit in the remaining roof corner would make the whole rectangle swappable, so remove it from both roof corners.',
  avoidable:
    'The three displayed values were entered during solving, not given clues. Completing the rectangle with {candidates} would allow all four values to swap. A given clue could not be swapped; that is why clue identity is required.',
  bug: 'All other unsolved cells have exactly two candidates. Every missing digit occurs twice in every region, except {candidates}, which occurs three times in each of its row, column and box. Removing it would leave the ambiguous BUG state; under the unique-solution assumption it must be true.',
  count: 'In {regions}, {digits} occurs at {cells}: {count} positions.',
  result:
    'The verified result is {candidates}. All temporary assumptions have been withdrawn.',
} as const;
export type TeachingCopy = { [K in keyof typeof teachingEnglish]: string };

export const teachingChinese: TeachingCopy = {
  factTrue: '{candidates} 成立',
  factFalse: '{candidates} 不成立',
  snapshot: '以下使用已验证的真实候选。之前有效的候选删除仍然成立。',
  aicSnapshot:
    '先看高亮的{regions}。实线表示该区域内链的两端至少一端成立；虚线表示两端不能同时成立。沿着连线交替读“不成立、成立”。',
  forcingChainSnapshot:
    '先关注目标候选 {targets}。分别检查 {candidates} 成立和不成立。这两个分支覆盖全部可能；如果两边都删除同一候选，就能确定该候选可以删除。',
  legacy:
    '这条记录缺少足够的已验证证据，无法展示可靠的逐步图解。下方保留原始结论。',
  cell: '{cells} 只能填 {digits}。',
  positions:
    '在{regions}中，{digits} 只能出现在 {cells}。这个区域必须出现一次该数字。',
  locked:
    '{source}的所有落点都位于{cover}内。{source}必须有一个 {digits}，因此交叉处会占用它，{cover}的其他格不能再填 {digits}。',
  naked:
    '{regions}中的 {count} 格，其完整候选并集是 {digits}。这 {count} 格必须用掉这 {count} 个不同数字，因此该区域其他格不能再用其中任何一个。',
  hidden:
    '在{regions}中，{digits} 的所有落点都限制在这 {count} 格。这些数字需要占满这些格，所以格内其他数字可以删除。',
  fish: '{count} 个基础区域（{source}）各需一个 {digits}，所有落点都在 {count} 个覆盖区域（{cover}）内。每个覆盖区域不能出现两个，所以每个都会被鱼形占用。可删除覆盖区域内、基础区域外的 {digits}。',
  jellyfishPremise:
    '数独的每个区域都必须恰好出现一次 {digits}。选出的四个基础区域（{source}）目前都还缺 {digits}，所以每个区域最终都必须从圈出的候选中选一个。',
  jellyfishPattern:
    '四个基础区域中圈出的全部候选，都只位于同样四个覆盖区域（{cover}）内。浅黄色背景表示基线，蓝色背景表示覆盖线，两者共同构成 Jellyfish。',
  jellyfishTarget:
    '任意选择一个位于覆盖区域内、四个基础区域外的候选 {digits}。下面检查 {selected}；其他目标可以使用完全相同的证明。',
  jellyfishAssume:
    '假设 {selected}＝{digits}。它占用了{cover}，所以同时划掉该区域内其他候选 {digits}：{crossed}。',
  jellyfishForce:
    '{base}现在只剩 {selected} 可以填 {digits}。选定它，同时划掉其基础区域和覆盖区域内其他候选 {digits}：{crossed}。',
  jellyfishNoPlace:
    '{base}仍然必须有一个 {digits}，但它的所有候选都已被划掉。这与该区域必须出现 {digits} 的数独规则矛盾。',
  jellyfishTooFewCovers:
    '还有 {baseCount} 个基础区域各需一个 {digits}，它们却只剩 {coverCount} 个覆盖区域可用。若不让两个 {digits} 共用一个覆盖区域就无法放完，因此当前假设不成立。',
  jellyfishResult:
    '任意选取的 {selected} 会产生矛盾，所以它不能是 {digits}。其他目标同样位于覆盖区域内、基础区域外，证明完全相同；划掉 {targets}。',
  fins: '鱼身是 {cells}。额外候选（鳍）是 {fins}，全部位于{regions}。{missing}',
  missing: '缺角 {cells} 没有该候选，不把它当作证据。',
  finTrue:
    '如果任何一个鳍填 {digits}，所有目标都在鳍宫内看见它，因此不能填 {digits}。',
  finFalse:
    '如果所有鳍都不成立，两条基础区域必须把 {digits} 分别放入两条覆盖区域，每条覆盖区域都会被占用。目标位于覆盖区域内、基础区域外，因此不能填 {digits}。',
  sashimiPair:
    '在{regions}中，{digits} 只有两个位置：{candidates}。其中必有一个成立。下面逐个检查。',
  sashimiDirect:
    '第一种：选定 {selected}。先划掉另一个位置 {opposite}；{selected} 也能直接看见所有目标，因此同时划掉 {targets}。',
  sashimiFin:
    '第二种：选定 {selected}。先划掉 {opposite} 和 {corner}。此时{regions}中，{digits} 只剩鳍 {fins} 可以成立，所以至少一个鳍成立。所有目标都能看见全部鳍，因此划掉 {targets}。',
  sashimiResult:
    '两种情况都会划掉 {targets}。因此这些候选不可能成立，可以删除。',
  wing: '枢轴是 {cells}，完整候选为 {digits}，两翼是 {wings}。分别检查枢轴的每一种取值。',
  assume: '分支 {branch}：假设 {candidates} 成立。',
  assumeFalse: '分支 {branch}：假设 {candidates} 不成立。',
  weak: '{from} 已经成立，排除 {candidates}。',
  forcingChainWeak: '{from} 已经成立，排除{regions}中的 {candidates}。',
  strong:
    '{from} 不成立。这两端合起来包含{regions}中的全部剩余选项，因此 {candidates} 被迫成立。',
  cellStrong:
    '{from} 不成立。{regions} 现在只剩 {candidates}，因此它必须成立。',
  single:
    '经过前面的排除，{regions}只剩 {candidates} 一个选项。在当前假设下，它被迫成立。',
  wingResult:
    '每个分支都会让 {cells} 中至少一处填 {digits}。每个目标都能看见所有这些可能落点，因此不能填 {digits}。',
  wWing:
    '两翼 {cells} 的候选完全相同，都是 {digits}。连接数字只有两个落点：{candidates}。如果两翼的外侧数字都不成立，两翼就都要填连接数字，从而排除这个强对的全部落点。',
  reset: '撤回这个假设和由它产生的结果。恢复原候选快照，再检查下一种可能。',
  conflict:
    '这个假设让{regions}没有可用的数字或落点：{candidates}。每格、每个区域中缺少的数字都必须有选项，因此假设不可能成立。',
  opposite: '假设{assumption}会产生矛盾，所以{result}。',
  aicContradictionResult: '推导结果与“{assumption}”矛盾，所以{result}。',
  common:
    '所有可能分支都得到同一事实：{candidates}。撤回全部假设后，这一事实仍然必然成立。',
  endpoints:
    '如果首端不成立，末端就必须成立，所以两端至少有一端包含该数字。每个目标都能看见两端组内的全部候选，因此可以直接排除。',
  xChainIndirect:
    '{from} 不成立，所以{regions}只剩 {candidates}。所有目标都能看见 {candidates}，因此划掉 {targets}。',
  xChainDirect:
    '第二种：选定 {selected}。所有目标都能看见它，因此直接划掉 {targets}。',
  xChainResult: '两种情况都会划掉 {targets}。因此这些候选可以删除。',
  xyChainStart: '第一种：选定 {selected}，冲突候选同时划掉。',
  xyChainHop: '确定 {selected}，冲突候选同时划掉。',
  xyChainEnd: '确定 {selected}，目标候选划掉。',
  xyChainDirect: '第二种：选定 {selected}，冲突候选同时划掉。',
  xyChainResult: '两种情况都会划掉 {targets}，可以删除。',
  groupedAicStart: '第一种：{from} 不成立，{selected} 成立。',
  groupedAicWeak: '{selected} 成立，划掉 {crossed}。',
  groupedAicStrong: '{from} 不成立，{selected} 成立。',
  groupedAicEnd: '{selected} 成立，目标候选划掉。',
  groupedAicDirect: '第二种：{selected} 成立，目标候选划掉。',
  groupedAicResult: '两种情况都划掉 {targets}，可以删除。',
  groups:
    '大括号表示候选组：组内至少一个候选成立，但尚未确定是哪格。实线两端覆盖区域内全部落点；虚线连接互斥的两组。当前检测器支持单数字分组链。',
  colors:
    '分量 {component}：A = {a}；B = {b}。连接的候选交替取相反状态。要么全部 A 成立、全部 B 不成立，要么反过来。颜色表示可能状态，不是已经填入的答案。',
  colorConflict:
    '{a} 和 {b} 同色且互相可见。这种颜色不可能成立，因此该颜色的全部候选都可删除。',
  colorTrap:
    '每个目标都能看见这个分量中的一个 A 和一个 B。无论哪种颜色成立，都能排除目标。',
  multi:
    '{a} 与 {b} 属于不同分量且互相冲突，所以两种颜色不能同时成立，至少一种反色必须成立。每个目标都能看见这两种反色。',
  colorPropagation:
    '如果 {a} 成立，就排除 {b}。后者的颜色不成立，其反色 {candidates} 被迫成立。',
  remote:
    '每个标记格的候选都恰好是 {digits}。相连且互相可见的格必须取相反值。两种颜色记录整个连通结构的相反状态，并不是任意排列的格子链。每个目标都能看见这两种状态。',
  uniqueness:
    '本推理以题目恰好有一个解为前提。这四格跨两行、两列、两个宫，交换两种数字不会改变任何区域的数字组成。',
  swap: '矩形填法 {branch}：{candidates}。四格全部交换后得到另一种填法。这些数字都只是推演。',
  unique:
    'Type 1：三个角只有 {digits}。如果第四角也选其中之一，整个矩形就可以交换，因此第四角必须使用其他数字。',
  hiddenRectangle:
    '底部 {cells} 只有 {digits}。顶部强对 {candidates} 迫使其中一格填连接数字。如果顶部另一格再填另一个成对数字，整个矩形就可交换，所以两处顶部都要删除另一个数字。',
  avoidable:
    '图中的三个已填数字是解题时填入的，不是题目给定。如果用 {candidates} 补齐矩形，四格就可以整体交换。给定数字不可交换，因此这里必须确认给定格身份。',
  bug: '其余未填格都恰好有两个候选。每个区域的每个缺失数字都出现两次，只有 {candidates} 在其行、列、宫各出现三次。删除它会留下可产生多解的 BUG 状态；在唯一解前提下，它必须成立。',
  count: '在{regions}中，{digits} 的落点是 {cells}，共 {count} 处。',
  result: '已验证的结论是 {candidates}。所有临时假设均已撤回。',
};
export const teachingJapanese: TeachingCopy = {
  factTrue: '{candidates} は真',
  factFalse: '{candidates} は偽',
  snapshot:
    '表示されている検証済み候補を使います。以前の正しい候補削除も有効です。',
  aicSnapshot:
    '{regions} に注目します。実線は領域内の両端のどちらかが必ず真、破線は両端が同時に真になれないことを示します。偽と真を交互にたどります。',
  forcingChainSnapshot:
    '対象候補 {targets} に注目します。{candidates} が真の場合と偽の場合を調べます。この2分岐ですべての可能性を網羅し、両方で同じ候補を削除できれば、その削除が確定します。',
  legacy:
    'この記録には信頼できる段階図に必要な検証済み証拠がありません。元の結論を下に表示します。',
  cell: '{cells} に入るのは {digits} だけです。',
  positions:
    '{regions} で {digits} を置けるのは {cells} だけです。この領域にはその数字が1回必要です。',
  locked:
    '{source} の全候補位置が {cover} 内にあります。{source} に必要な {digits} は交差部分に入るため、{cover} の他のマスには入れません。',
  naked:
    '{regions} の {count} マスの候補全体は {digits} です。これらのマスが {count} 個の異なる数字をすべて使うため、同じ領域の他のマスから削除できます。',
  hidden:
    '{regions} で {digits} の全候補位置はこの {count} マスだけです。これらの数字が全マスを使うため、マス内の他の候補を削除できます。',
  fish: '{count} 個の基底領域（{source}）にはそれぞれ {digits} が1つ必要です。全候補は {count} 個の被覆領域（{cover}）にあります。重複はできないため各被覆領域が1つずつ使われ、基底領域の外側から {digits} を削除できます。',
  jellyfishPremise:
    '数独の各領域には {digits} がちょうど1つ必要です。選んだ4つの基底領域（{source}）にはまだ {digits} がないため、それぞれ丸印の候補から1つを選ぶ必要があります。',
  jellyfishPattern:
    '4つの基底領域にある丸印の候補は、同じ4つの被覆領域（{cover}）だけにあります。淡い黄色の背景が基底、青い背景が被覆を示し、合わせて Jellyfish になります。',
  jellyfishTarget:
    '被覆領域内かつ4つの基底領域外にある {digits} を1つ選びます。{selected} を調べます。他の対象も同じ方法で確認できます。',
  jellyfishAssume:
    '{selected} が {digits} と仮定します。{cover} が使われるため、そこにある他の {digits}、{crossed} を消します。',
  jellyfishForce:
    '{base} で {digits} は {selected} だけになりました。これを選び、同じ基底と被覆の他の {digits}、{crossed} を消します。',
  jellyfishNoPlace:
    '{base} には {digits} が必要ですが、候補がすべて消えました。各領域に {digits} が必要という数独の規則に矛盾します。',
  jellyfishTooFewCovers:
    '未確定の {baseCount} 個の基底にはそれぞれ {digits} が必要ですが、使える被覆は {coverCount} 個だけです。同じ被覆を共有せずに置けないため、仮定は不可能です。',
  jellyfishResult:
    '任意に選んだ {selected} は矛盾を生むため {digits} ではありません。他の対象も被覆内・基底外にあり、同じ証明が使えます。{targets} を削除します。',
  fins: '魚の本体は {cells}。追加候補（フィン）は {fins} で、すべて {regions} 内です。{missing}',
  missing:
    '欠けた角 {cells} には候補がありません。証拠の候補としては扱いません。',
  finTrue:
    'どのフィンが {digits} になっても、対象は同じボックスからそれを見ているため {digits} にはなれません。',
  finFalse:
    '全フィンが偽なら、2つの基底領域は {digits} を2つの被覆領域に分けて置きます。各被覆領域が使われるため、基底の外にある対象は {digits} にはなれません。',
  sashimiPair:
    '{regions} で {digits} を置けるのは {candidates} の2か所だけです。どちらか一方は必ず真です。順番に確認します。',
  sashimiDirect:
    'ケース1：{selected} を選びます。もう一方の {opposite} を消します。{selected} はすべての対象も見ているので、{targets} も消せます。',
  sashimiFin:
    'ケース2：{selected} を選び、{opposite} と {corner} を消します。すると {regions} で {digits} を置けるのはフィン {fins} だけになり、少なくとも1つのフィンが真です。すべての対象は全フィンを見ているため、{targets} を消せます。',
  sashimiResult:
    'どちらのケースでも {targets} が消えます。したがって、これらの候補は不可能で削除できます。',
  wing: 'ピボットは {cells}、全候補は {digits}、両ウイングは {wings} です。ピボットの全選択肢を調べます。',
  assume: '分岐 {branch}：{candidates} が真と仮定します。',
  assumeFalse: '分岐 {branch}：{candidates} が偽と仮定します。',
  weak: '{from} は真です。{candidates} を除外します。',
  forcingChainWeak:
    '{from} は真です。{regions} から {candidates} を除外します。',
  strong:
    '{from} は偽です。両側で {regions} の全選択肢を覆うため、{candidates} が真になります。',
  cellStrong:
    '{from} は偽です。{regions} に残るのは {candidates} だけなので、これは真です。',
  single:
    'これまでの除外後、{regions} に残る選択肢は {candidates} だけです。この仮定の下で確定します。',
  wingResult:
    'どの分岐でも {cells} の少なくとも1か所が {digits} です。対象はその全位置を見ているため {digits} にはなれません。',
  wWing:
    '両ウイング {cells} の候補は同じ {digits} です。接続数字の位置は {candidates} の2つだけ。外側の数字が両ウイングで偽なら、両方が接続数字になり、強リンクの全位置を除外してしまいます。',
  reset:
    '仮定とその結果を取り消します。変わっていない元の候補に戻り、次の可能性を調べます。',
  conflict:
    'この仮定では {regions} の選択肢 {candidates} がすべてなくなります。マスと領域の不足数字には必ず選択肢が必要なので、この仮定は不可能です。',
  opposite: '{assumption} と仮定すると矛盾するため、{result} です。',
  aicContradictionResult:
    '推論結果は「{assumption}」と矛盾するため、{result} です。',
  common:
    '全分岐で同じ事実 {candidates} に達しました。すべての仮定を取り消しても、この事実は確実です。',
  endpoints:
    '始点側が偽なら終点側が真です。少なくとも一方の端点グループに数字が入ります。各対象は両端グループの全候補を見ているため、対象を除外できます。',
  xChainIndirect:
    '{from} が偽なので、{regions} では {candidates} が確定します。すべての対象は {candidates} を見ているため、{targets} を消します。',
  xChainDirect:
    'ケース2：{selected} を選びます。すべての対象はこれを見ているため、{targets} を直接消します。',
  xChainResult:
    'どちらのケースでも {targets} が消えます。したがって、これらの候補を削除できます。',
  xyChainStart: 'ケース1：{selected} を選び、競合候補を同時に消します。',
  xyChainHop: '{selected} を確定し、競合候補を同時に消します。',
  xyChainEnd: '{selected} を確定し、対象候補を消します。',
  xyChainDirect: 'ケース2：{selected} を選び、競合候補を同時に消します。',
  xyChainResult: 'どちらのケースでも {targets} が消えるため、削除できます。',
  groupedAicStart: 'ケース1：{from} が偽なので、{selected} が真です。',
  groupedAicWeak: '{selected} が真なので、{crossed} を消します。',
  groupedAicStrong: '{from} が偽なので、{selected} が真です。',
  groupedAicEnd: '{selected} が真なので、対象候補を消します。',
  groupedAicDirect: 'ケース2：{selected} が真です。対象候補を消します。',
  groupedAicResult: 'どちらのケースでも {targets} が消えるため、削除できます。',
  groups:
    '波括弧は候補グループです。少なくとも1つが真ですが、マスは未確定です。実線の両側は領域の全位置を覆い、破線は両立しないグループを結びます。現在は単一数字のグループ連鎖を検出します。',
  colors:
    '成分 {component}：A = {a}、B = {b}。リンクで状態が交互になります。全Aが真で全Bが偽、またはその逆です。色は可能な状態であり、確定数字ではありません。',
  colorConflict:
    '{a} と {b} は同色で互いに見えます。この色は真になれないため、この色の全候補は偽です。',
  colorTrap:
    '各対象はこの成分のAとBの両方を見ています。どちらが真でも対象を除外します。',
  multi:
    '異なる成分の {a} と {b} が競合します。両色が同時に真にはなれないため、少なくとも一方の反対色が真です。対象は両方の反対色を見ています。',
  colorPropagation:
    '{a} が真なら {b} を除外します。後者の色が偽になり、その反対色 {candidates} が真になります。',
  remote:
    '全マーク付きマスの候補は正確に {digits} です。互いに見える接続マスは反対値を取ります。2色は成分全体の反対状態を表し、任意に並べたマスの連鎖ではありません。対象は両状態を見ています。',
  uniqueness:
    'この推理は解がちょうど1つという前提を使います。4マスは2行・2列・2ボックスにまたがり、2数字を交換しても各領域の数字構成が保たれます。',
  swap: '長方形の配置 {branch}：{candidates}。4マスすべてを交換するともう一方の配置になります。仮の数字です。',
  unique:
    'Type 1：3つの角の候補は {digits} だけです。4つ目も同じ数字を取ると交換可能になるため、4つ目には別の数字が必要です。',
  hiddenRectangle:
    '床側 {cells} の候補は {digits} だけです。屋根側の強リンク {candidates} が一方を確定します。他方にもう一つの数字を置くと長方形全体が交換可能になるため、両屋根からその数字を削除します。',
  avoidable:
    '表示された3数字は解く途中の入力であり、与えられた数字ではありません。{candidates} で長方形を完成すると4数字を交換できます。与えられた数字は交換できないため、その区別が必要です。',
  bug: '他の全未確定マスは2候補です。各領域の不足数字は2か所ずつに現れ、{candidates} だけがその行・列・ボックスで3か所ずつに現れます。それを削除すると曖昧なBUG状態になるため、一意解の前提では真です。',
  count: '{regions} の {digits} の位置は {cells}、計 {count} か所です。',
  result:
    '検証済みの結論は {candidates} です。一時的な仮定はすべて取り消しました。',
};
export const teachingGerman: TeachingCopy = {
  factTrue: '{candidates} ist wahr',
  factFalse: '{candidates} ist falsch',
  snapshot:
    'Wir verwenden die gezeigten, geprüften Kandidaten. Frühere gültige Streichungen bleiben bestehen.',
  aicSnapshot:
    'Betrachte {regions}. Eine durchgezogene Verbindung bedeutet, dass eines ihrer beiden Kandidatenenden in diesem Bereich wahr sein muss; eine gestrichelte Verbindung bedeutet, dass nicht beide wahr sein können. Folge den Verbindungen abwechselnd als falsch und wahr.',
  forcingChainSnapshot:
    'Behalte den Zielkandidaten {targets} im Blick. Prüfe beide Zustände von {candidates}: wahr und falsch. Zusammen decken sie alle Möglichkeiten ab. Entfernen beide Zweige denselben Kandidaten, ist diese Entfernung sicher.',
  legacy:
    'Dieser Eintrag enthält nicht genug geprüfte Belege für eine schrittweise Darstellung. Darunter steht das ursprüngliche Ergebnis.',
  cell: 'In {cells} sind nur {digits} möglich.',
  positions:
    'In {regions} kann {digits} nur in {cells} stehen. Die Ziffer muss in diesem Bereich einmal vorkommen.',
  locked:
    'Alle Positionen aus {source} liegen in {cover}. Da {source} eine {digits} braucht, liegt sie im Schnitt. Andere Zellen in {cover} können keine {digits} enthalten.',
  naked:
    'Die vollständige Kandidatenmenge der {count} Zellen in {regions} ist {digits}. Diese Zellen brauchen alle {count} verschiedenen Ziffern. Andere Zellen desselben Bereichs können keine davon verwenden.',
  hidden:
    'In {regions} liegen alle Positionen für {digits} in diesen {count} Zellen. Die Ziffern brauchen alle diese Zellen; andere Kandidaten darin können entfallen.',
  fish: 'Jeder der {count} Basisbereiche ({source}) braucht eine {digits}. Alle Positionen liegen in {count} Deckbereichen ({cover}). Keiner darf zwei aufnehmen, also wird jeder einmal belegt. Außerhalb der Basisbereiche entfällt {digits} in den Deckbereichen.',
  jellyfishPremise:
    'Jeder Sudoku-Bereich muss {digits} genau einmal enthalten. Die vier gewählten Basisbereiche ({source}) brauchen die Ziffer noch und müssen jeweils einen eingekreisten Kandidaten wählen.',
  jellyfishPattern:
    'Alle eingekreisten Kandidaten der vier Basen liegen in denselben vier Deckbereichen ({cover}). Hellgelber Hintergrund markiert die Basen, blauer die Deckbereiche; zusammen bilden sie den Jellyfish.',
  jellyfishTarget:
    'Wähle eine beliebige {digits} in einem Deckbereich außerhalb der vier Basen. Wir prüfen {selected}; jedes andere Ziel lässt sich genauso prüfen.',
  jellyfishAssume:
    'Nehmen wir an, {selected} ist {digits}. Damit ist {cover} belegt; die anderen Kandidaten dort werden gestrichen: {crossed}.',
  jellyfishForce:
    'In {base} bleibt für {digits} nur {selected}. Setze ihn und streiche die übrigen Kandidaten in seiner Basis und seinem Deckbereich: {crossed}.',
  jellyfishNoPlace:
    '{base} braucht weiterhin {digits}, aber alle Kandidaten sind gestrichen. Das widerspricht der Sudoku-Regel, dass der Bereich {digits} enthalten muss.',
  jellyfishTooFewCovers:
    '{baseCount} ungelöste Basen brauchen je eine {digits}, ihre Kandidaten liegen aber nur noch in {coverCount} verfügbaren Deckbereichen. Ohne einen Deckbereich doppelt zu belegen ist das unmöglich.',
  jellyfishResult:
    'Die beliebige Wahl {selected} erzeugt einen Widerspruch und kann keine {digits} sein. Für alle Ziele in einem Deckbereich außerhalb der Basen gilt derselbe Beweis; entferne {targets}.',
  fins: 'Der Fischkörper ist {cells}. Die zusätzlichen Kandidaten (Flossen) sind {fins}, alle in {regions}. {missing}',
  missing:
    'An der fehlenden Ecke {cells} gibt es keinen Kandidaten. Sie zählt nicht als Beleg.',
  finTrue:
    'Ist irgendeine Flosse {digits}, sieht jedes Ziel sie im Flossenblock und kann keine {digits} sein.',
  finFalse:
    'Sind alle Flossen falsch, müssen die beiden Basisbereiche {digits} auf die zwei Deckbereiche verteilen. Jeder Deckbereich wird belegt. Die Ziele liegen dort außerhalb der Basisbereiche und können keine {digits} sein.',
  sashimiPair:
    'In {regions} hat {digits} genau zwei Positionen: {candidates}. Eine davon muss wahr sein. Wir prüfen beide nacheinander.',
  sashimiDirect:
    'Fall 1: Setze {selected}. Streiche die andere Position {opposite}. {selected} sieht außerdem alle Ziele, daher werden auch {targets} gestrichen.',
  sashimiFin:
    'Fall 2: Setze {selected}. Streiche {opposite} und {corner}. In {regions} bleiben für {digits} nur die Flossen {fins}; mindestens eine Flosse ist wahr. Jedes Ziel sieht alle Flossen, daher werden {targets} gestrichen.',
  sashimiResult:
    'In beiden Fällen werden {targets} gestrichen. Diese Kandidaten sind daher unmöglich und können entfernt werden.',
  wing: 'Der Drehpunkt ist {cells} mit den vollständigen Kandidaten {digits}. Die Flügel sind {wings}. Wir prüfen jeden möglichen Wert des Drehpunkts.',
  assume: 'Zweig {branch}: Nehmen wir an, {candidates} ist wahr.',
  assumeFalse: 'Zweig {branch}: Nehmen wir an, {candidates} ist falsch.',
  weak: '{from} ist wahr. Entferne {candidates}.',
  forcingChainWeak: '{from} ist wahr. Entferne {candidates} aus {regions}.',
  strong:
    '{from} ist falsch. Beide Seiten umfassen zusammen alle übrigen Möglichkeiten in {regions}. Deshalb muss {candidates} wahr sein.',
  cellStrong:
    '{from} ist falsch. In {regions} bleibt nur {candidates}. Deshalb muss es wahr sein.',
  single:
    'Nach den vorherigen Ausschlüssen bleibt in {regions} nur {candidates}. Unter dieser Annahme ist das erzwungen.',
  wingResult:
    'In jedem Zweig steht {digits} an mindestens einer Position in {cells}. Jedes Ziel sieht alle diese möglichen Positionen und kann daher keine {digits} sein.',
  wWing:
    'Die Flügel {cells} haben dieselben Kandidaten {digits}. Die verbindende Ziffer hat genau zwei Positionen: {candidates}. Wäre die äußere Ziffer in beiden Flügeln falsch, müssten beide die verbindende Ziffer tragen und beide Positionen des starken Paars ausschließen.',
  reset:
    'Wir nehmen diese Annahme und ihre Folgen zurück. Vor der nächsten Möglichkeit gilt wieder der unveränderte Kandidatenstand.',
  conflict:
    'Diese Annahme lässt in {regions} keine Möglichkeit mehr: {candidates}. Jede Zelle und jede fehlende Ziffer eines Bereichs braucht eine Möglichkeit. Die Annahme ist unmöglich.',
  opposite:
    'Die Annahme {assumption} führt zum Widerspruch. Daher gilt {result}.',
  aicContradictionResult:
    'Die Folgerung widerspricht „{assumption}“. Daher gilt {result}.',
  common:
    'Alle möglichen Zweige ergeben dieselbe Tatsache: {candidates}. Auch nach Rücknahme aller Annahmen bleibt sie sicher.',
  endpoints:
    'Ist die erste Seite falsch, ist die letzte wahr. Mindestens eine Endgruppe enthält also die Ziffer. Jedes Ziel sieht alle Kandidaten beider Endgruppen und kann entfernt werden.',
  xChainIndirect:
    '{from} ist falsch, daher wird {candidates} in {regions} erzwungen. Jedes Ziel sieht {candidates}, also wird {targets} gestrichen.',
  xChainDirect:
    'Fall 2: Wir setzen {selected}. Jedes Ziel sieht diesen Kandidaten, also wird {targets} direkt gestrichen.',
  xChainResult:
    'In beiden Fällen wird {targets} gestrichen. Diese Kandidaten können daher entfernt werden.',
  xyChainStart: 'Fall 1: Wir setzen {selected} und streichen alle Konflikte.',
  xyChainHop: 'Wir setzen {selected} und streichen alle Konflikte.',
  xyChainEnd: 'Wir setzen {selected} und streichen die Ziele.',
  xyChainDirect: 'Fall 2: Wir setzen {selected} und streichen alle Konflikte.',
  xyChainResult:
    'In beiden Fällen wird {targets} gestrichen und kann entfernt werden.',
  groupedAicStart: 'Fall 1: {from} ist falsch, daher ist {selected} wahr.',
  groupedAicWeak: '{selected} ist wahr, daher streichen wir {crossed}.',
  groupedAicStrong: '{from} ist falsch, daher ist {selected} wahr.',
  groupedAicEnd: '{selected} ist wahr, daher streichen wir die Ziele.',
  groupedAicDirect: 'Fall 2: {selected} ist wahr. Wir streichen die Ziele.',
  groupedAicResult:
    'In beiden Fällen wird {targets} gestrichen und kann entfernt werden.',
  groups:
    'Geschweifte Klammern kennzeichnen eine Gruppe: Mindestens ein Kandidat darin ist wahr, ohne eine Zelle festzulegen. Durchgezogene Verbindungen decken alle Positionen eines Bereichs ab; gestrichelte verbinden unvereinbare Gruppen. Der Detektor unterstützt gruppierte Ketten einer einzelnen Ziffer.',
  colors:
    'Komponente {component}: A = {a}; B = {b}. Verbundene Kandidaten wechseln ihren Zustand. Entweder sind alle A wahr und alle B falsch oder umgekehrt. Farben sind Möglichkeiten, keine eingetragenen Antworten.',
  colorConflict:
    '{a} und {b} haben dieselbe Farbe und sehen einander. Diese Farbe kann nicht wahr sein; alle ihre Kandidaten sind falsch.',
  colorTrap:
    'Jedes Ziel sieht ein A und ein B dieser Komponente. Welche Farbe auch wahr ist, sie schließt das Ziel aus.',
  multi:
    '{a} und {b} gehören zu verschiedenen Komponenten und widersprechen einander. Ihre Farben können nicht beide wahr sein. Mindestens eine Gegenfarbe ist wahr. Jedes Ziel sieht beide Gegenfarben.',
  colorPropagation:
    'Ist {a} wahr, entfällt {b}. Dessen Farbe ist falsch und die Gegenfarbe {candidates} wird wahr.',
  remote:
    'Jede markierte Zelle hat genau {digits}. Verbundene Zellen, die einander sehen, müssen entgegengesetzte Werte annehmen. Die zwei Farben zeigen diese Zustände in der ganzen Komponente, keine beliebig sortierte Zellkette. Jedes Ziel sieht beide Zustände.',
  uniqueness:
    'Diese Argumentation setzt genau eine Lösung voraus. Die vier Zellen liegen in zwei Zeilen, zwei Spalten und zwei Blöcken. Ein Tausch der beiden Ziffern erhält jeden Bereich.',
  swap: 'Rechteckbelegung {branch}: {candidates}. Ein Tausch aller vier Einträge ergibt die andere Belegung. Die Werte sind nur hypothetisch.',
  unique:
    'Typ 1: Drei Ecken haben nur {digits}. Nähme die vierte auch eine dieser Ziffern, wäre das Rechteck austauschbar. Sie muss eine andere Ziffer verwenden.',
  hiddenRectangle:
    'Der Boden {cells} hat nur {digits}. Das starke Paar auf dem Dach {candidates} erzwingt seine Ziffer in einer Dachecke. Die andere Paarziffer in der übrigen Dachecke würde das ganze Rechteck austauschbar machen; sie entfällt daher in beiden Dachecken.',
  avoidable:
    'Die drei gezeigten Werte wurden beim Lösen eingetragen und sind keine Vorgaben. Mit {candidates} wäre das Rechteck vollständig austauschbar. Vorgaben dürfen nicht getauscht werden; deshalb ist diese Unterscheidung erforderlich.',
  bug: 'Alle anderen ungelösten Zellen haben genau zwei Kandidaten. Jede fehlende Ziffer kommt in jedem Bereich zweimal vor, außer {candidates}: dreimal in seiner Zeile, Spalte und seinem Block. Eine Streichung ließe den mehrdeutigen BUG-Zustand zurück. Unter der Voraussetzung einer einzigen Lösung muss der Kandidat wahr sein.',
  count: 'In {regions} steht {digits} an {cells}: {count} Positionen.',
  result:
    'Das geprüfte Ergebnis ist {candidates}. Alle vorläufigen Annahmen sind zurückgenommen.',
};
