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
  nakedTripleObserveTitle: 'Observe the triple',
  nakedTripleReserveTitle: 'Understand the reservation',
  nakedTripleExcludeTitle: 'Remove candidates',
  nakedTripleObserve:
    'Together, these three cells have only {digits} as candidates.',
  nakedTripleReserve:
    'Digits cannot repeat in {region}, so these three digits must each occupy one cell.',
  nakedTripleExclude:
    'Remove the marked {digits} candidates from other cells in {region}.',
  hiddenTripleObserveTitle: 'Observe the positions',
  hiddenTripleReserveTitle: 'Understand the reservation',
  hiddenTripleExcludeTitle: 'Remove candidates',
  hiddenTripleObserve:
    'In {region}, {digits} can appear only in these three cells.',
  hiddenTripleReserve:
    'These three digits must each occupy one cell. No other digits fit in these cells.',
  hiddenTripleExclude:
    'Remove the marked {digits} candidates from these three cells.',
  nakedQuadObserveTitle: 'Observe the quad',
  nakedQuadReserveTitle: 'Understand the reservation',
  nakedQuadExcludeTitle: 'Remove candidates',
  nakedQuadObserve:
    'Together, these four cells have only {digits} as candidates.',
  nakedQuadReserve:
    'Digits cannot repeat in {region}, so these four digits must each occupy one cell.',
  nakedQuadExclude:
    'Remove the marked {digits} candidates from other cells in {region}.',
  hiddenQuadObserveTitle: 'Observe the positions',
  hiddenQuadReserveTitle: 'Understand the reservation',
  hiddenQuadExcludeTitle: 'Remove candidates',
  hiddenQuadObserve:
    'In {region}, {digits} can appear only in these four cells.',
  hiddenQuadReserve:
    'These four digits must each occupy one cell. No other digits fit in these cells.',
  hiddenQuadExclude:
    'Remove the marked {digits} candidates from these four cells.',
  hiddenPairObserveTitle: 'Focus on the two cells',
  hiddenPairReserveTitle: 'Confirm the hidden pair',
  hiddenPairExcludeTitle: 'Remove the other candidates',
  hiddenPairObserve:
    'Start with the two highlighted cells. Both contain candidates {first} and {second}.',
  hiddenPairReserve:
    'In {region}, {first} and {second} appear only in these two highlighted cells. They must occupy one cell each, so these cells cannot contain other digits.',
  hiddenPairExclude:
    'Remove the marked {digits} candidates from these two cells.',
  nakedPairObserveTitle: 'Observe the pair',
  nakedPairReserveTitle: 'Understand the reservation',
  nakedPairExcludeTitle: 'Remove candidates',
  nakedPairObserve: 'These two cells contain only {first} and {second}.',
  nakedPairReserve:
    'Digits cannot repeat in {region}. One cell must be {first}, the other {second}.',
  nakedPairExclude:
    'Remove the marked {digits} candidates from other cells in {region}.',
  lockedTripleObserveTitle: 'Observe the triple',
  lockedTripleLockTitle: 'See the shared regions',
  lockedTripleExcludeTitle: 'Remove candidates',
  lockedTripleObserve:
    'These three cells can only use {digits}. Each digit must occupy one cell.',
  lockedTripleLock:
    'These three cells lie in both {line} and {box}, so all three digits are reserved in both regions.',
  lockedTripleExclude:
    'Remove the marked {digits} candidates from the other cells in {line} and {box}.',
  lockedPairObserveTitle: 'Find the pair',
  lockedPairLockTitle: 'See the shared regions',
  lockedPairExcludeTitle: 'Remove the targets',
  lockedPairObserve:
    'The two highlighted cells contain only {first} and {second}. They form a pair: one must be {first}, the other {second}.',
  lockedPairLock:
    'The pair lies in both {line} and {box}. These two cells reserve {first} and {second}, so no other cell in either region can use them.',
  lockedPairExclude:
    'Remove the marked {digits} candidates from the other cells in {line} and {box}.',
  singleRegionTitle: 'Check the row, column and box',
  singleDirect:
    '{cells}: filled digits in its row, column and box rule out {directRemoved}, leaving only candidate {remaining}.',
  singleCurrentCandidates:
    '{cells}: filled digits in its row, column and box rule out {directRemoved}. In your currently displayed candidates, {snapshotRemoved} is also absent, leaving only candidate {remaining}.',
  singleAppliedHints:
    '{cells}: filled digits in its row, column and box rule out {directRemoved}. The Hint you applied removed {snapshotRemoved}, leaving only candidate {remaining}.',
  singleConclusion: 'This cell must be {digits}.',
  singleCheckSummary: 'Ruled out: {removed}. Remaining: {remaining}.',
  hiddenSingleObserveTitle: 'Find {digit} in {region}',
  hiddenSingleObserve: 'Focus on {digit}. Where can it still go in {region}?',
  hiddenSingleExcludeTitle: 'Rule out the other positions',
  hiddenSingleExclude:
    '{blockingRegions} already contain {digit}. The crossed positions cannot contain {digit}, leaving only {cell} in {region}.',
  hiddenSingleCandidateExclude:
    'With the candidates shown, the crossed positions cannot contain {digit}. Only {cell} remains in {region}.',
  hiddenSingleApplyTitle: 'Place {digit}',
  hiddenSingleConclusion: '{cell} is the only place for {digit} in {region}.',
  fullHouse:
    '{regions} has only {cells} left empty. The missing digit is {digits}, so {cells} must be {digits}.',
  cell: '{cells} can contain only {digits}.',
  positions:
    'In {regions}, {digits} can go only in {cells}. The digit must appear once in this region.',
  locked:
    'All positions in {source} lie in {cover}. Since {source} must contain {digits}, the intersection supplies it. Other cells in {cover} cannot contain {digits}.',
  lockedConclusion:
    'The {digits} in {source} must lie in {cover}. Therefore the targets in {cover} but outside {source} cannot be {digits}: {targets}.',
  naked:
    '{count} cells in {regions} share the complete candidate set {digits}. They must use these {count} different digits. Other cells in this region cannot use any of them.',
  hidden:
    'In {regions}, all positions for {digits} are confined to these {count} cells. These digits need all of those cells, so other digits cannot remain there.',
  fish: 'Each of the {count} base regions ({source}) needs one {digits}. All their positions lie in the {count} cover regions ({cover}). No cover can take two, so every cover is occupied by the fish. Remove {digits} outside the bases in these covers.',
  xWingPremise:
    'Each base region ({source}) has exactly two positions for {digits}. The four circled candidates align in the same two cover regions ({cover}), forming an X-Wing.',
  xWingCase:
    'Case {branch}: {first} and {second} are true, placing one {digits} in each cover region. The other two corners ({crossed}) are false, and the targets ({targets}) are excluded in this case.',
  xWingResult:
    'In either complete pairing, the two {digits} placements from the base regions ({source}) occupy both cover regions ({cover}), one in each. Therefore remove {targets} outside the bases.',
  jellyfishPremise:
    'A Sudoku region must contain {digits} exactly once. Each selected base region ({source}) still needs it, so each must eventually choose one of its circled candidates.',
  jellyfishPattern:
    'All circled candidates in the four bases lie in the same four cover regions ({cover}). The “Base lines” legend marks the four base regions, and “Cover lines” marks the four cover regions. Together they form the Jellyfish.',
  jellyfishTarget:
    'Choose any {digits} in a cover but outside the four bases. We will test {selected}; every other target can be tested in the same way.',
  jellyfishAssume:
    'Suppose {selected}. It occupies {cover}, so cross out the other {digits} candidates there: {crossed}.',
  jellyfishForce:
    '{base} now has only {selected} for {digits}. Select it and cross out the other {digits} candidates in its base and cover: {crossed}.',
  jellyfishNoPlace:
    '{base} still needs {digits}, but all its candidates have been crossed out. This contradicts the Sudoku rule that the region must contain {digits}.',
  jellyfishBranchChoose:
    'Case {branch}: choose {selected}. Cross out the other {digits} candidates in its base and cover: {crossed}.',
  jellyfishBranchReset:
    'Case {branch} is impossible. Undo its temporary choices, return to the candidates after the target assumption, and check the next case.',
  jellyfishBranchesExhausted:
    'The {branchCount} cases shown cover every remaining way to place {digits} in the bases. Every case reaches a concrete region with no place for {digits}, so the original target assumption is impossible.',
  jellyfishResult:
    'The arbitrary choice {selected} creates a contradiction, so it cannot be {digits}. Every target lies in a cover outside the bases and has the same proof; remove {targets}.',
  sashimiAlternate:
    'Second case: the other position is true, excluding the two marked body candidates.',
  fishResult: 'Remove {digits} from the marked cells outside the fish body.',
  swordfishPatternTitle: 'Recognize the Swordfish',
  swordfishPattern:
    'The three base regions ({source}) all still need {digits}, and every remaining {digits} candidate in them lies in the same three cover regions ({cover}). This forms a Swordfish.',
  swordfishReasonTitle: 'See why the covers are occupied',
  swordfishReason:
    'Each base must place one {digits}, for three placements total. A cover cannot contain two of the same digit. Since every placement is confined to these three covers, the three placements must occupy one cover each.',
  swordfishResultTitle: 'Remove the targets',
  swordfishResult:
    'Therefore, {digits} in the three covers must be placed inside the base regions. Remove the marked candidates outside the bases: {targets}.',
  fins: 'The outlined candidates are fins, all in {regions}. {missing}',
  missing: 'The missing corner {cells} has no candidate; it is not a premise.',
  finCaseTitle: 'Assume fin {index} is true',
  finTrue:
    'If this fin is {digits}, the marked targets in its box cannot be {digits}.',
  finFalse:
    'If no fin is {digits}, the body forms an X-Wing and excludes the same targets.',
  sashimiPair:
    '{regions} has only two positions for {digits}; one must be true.',
  sashimiDirect:
    'First case: this position is true, excluding the marked candidates in its row or column.',
  sashimiFin:
    '{regions} now needs {digits} in at least one fin; all targets see every fin.',
  sashimiResult:
    'Both cases exclude the same targets. Remove the marked candidates.',
  wing: 'The pivot is {cells}. Its complete candidates are {digits}; the two wings are {wings}. Examine every possible pivot value.',
  xyWingIntroTitle: 'Find the pivot and wings',
  xyWingIntro:
    '{pivot} is the pivot with candidates {pivotDigits}. It sees the two wings: {wingA} with {wingADigits}, and {wingB} with {wingBDigits}.',
  xyWingStructureTitle: 'Find the shared target',
  xyWingStructure:
    'Both wings contain {targetDigit}. Every target ({targets}) sees both wings, so it is their shared target for candidate {targetDigit}.',
  xyWingCaseTitle: 'Case {branch}: {pivot} is {pivotDigit}',
  xyWingCase:
    'If {pivot}={pivotDigit}, {wing} cannot be {pivotDigit} and must be {targetDigit}.',
  xyWingTargetTitle: 'Case {branch}: remove target {targetDigit}',
  xyWingTarget:
    'Every target ({targets}) sees {wing}, which is {targetDigit} in this case. The target therefore cannot be {targetDigit}.',
  xyWingConclusionTitle: 'Combine the two cases',
  xyWingConclusion:
    'The pivot can only be {pivotDigits}. In either case one wing is {targetDigit}, so remove {targets}.',
  xyzWingIntroTitle: 'Find the pivot and wings',
  xyzWingIntro:
    '{pivot} is the three-candidate pivot {pivotDigits}. It sees the two wings: {wingA} with {wingADigits}, and {wingB} with {wingBDigits}. Together they form an XYZ-Wing.',
  xyzWingTargetTitle: 'Find the target shared by all three',
  xyzWingTarget:
    'The pivot and both wings contain {targetDigit}. Every target ({targets}) sees all three possible locations of {targetDigit}.',
  xyzWingCaseTitle: 'Case {branch}: {pivot} is {pivotDigit}',
  xyzWingCase:
    'If {pivot}={pivotDigit}, {wing} cannot be {pivotDigit} and must be {targetDigit}.',
  xyzWingPivotCaseTitle: 'Case 3: the pivot is {targetDigit}',
  xyzWingPivotCase:
    'If {pivot}={targetDigit}, the pivot itself already supplies {targetDigit}. This is the third and final pivot value.',
  xyzWingConclusionTitle: 'Combine the three cases',
  xyzWingConclusion:
    'For every possible pivot value, one of {sources} is {targetDigit}. Every target sees all three cells, so remove {targets}.',
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
  wWingWingsTitle: 'This is a W-Wing',
  wWingWings:
    'This pattern is a W-Wing. Start with {wingA} and {wingB}: both contain only {targetDigit} and {linkDigit}, so they are its two wings.',
  wWingLinkTitle: 'See the complete W-Wing',
  wWingLink:
    'Each wing sees one end of the {linkDigit} strong link. In {region}, {linkDigit} can go only in {linkA} and {linkB}, so one must be {linkDigit}. Every target ({targets}) sees both wings.',
  wWingCaseTitle: 'Case {branch}: {linkCell} is {linkDigit}',
  wWingCase:
    'If {linkCell}={linkDigit}, it rules out {linkDigit} from {wingCell}. That wing must be {targetDigit}. Since {targets} sees {wingCell}, it cannot be {targetDigit}.',
  wWingConclusionTitle: 'Combine the two cases',
  wWingConclusion:
    'The two cases cover the strong link, so at least one wing is {targetDigit}. Every target sees both wings; remove {targets}.',
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
    'Component {component} is one coloring component: round A = {a}; square B = {b}. A and B are opposite states. Either every A is true and every B false, or the reverse. These are possibilities, not filled answers.',
  colorConflict:
    '{a} and {b} have the same A/B state and see each other. That state cannot be true; all its candidates are false.',
  colorTrap:
    'Each target sees an A and a B in this component. Whichever state is true excludes the target.',
  simpleColorStartTitle: 'Find the first strong link',
  simpleColorStart:
    'In {region}, {digit} can go only in {first} or {second}. These candidates belong to the same coloring component and are marked round A and square B; A and B are opposite states.',
  simpleColorAlternateTitle: 'Follow the strong links',
  simpleColorAlternate:
    'Continue through every connected strong link for {digit}. Within this component, each link joins round A and square B, the two opposite states.',
  simpleColorNetworkTitle: 'Complete the color network',
  simpleColorNetwork:
    'These {count} candidates form one connected network. Every solid line is a strong link for {digit}.',
  simpleColorNetworkWithStates:
    'These {count} candidates form one connected network. Every strong link joins A to B, so all A candidates share one state and all B candidates share the other.',
  simpleColorStatesTitle: 'Understand the two states',
  simpleColorStates:
    'Either every A is true and every B false, or every B is true and every A false. We do not need to know which state wins.',
  simpleColorTrapTitle: 'Find a target that sees A and B',
  simpleColorTrap:
    '{targets} sees A at {a} and B at {b}. Whichever state is true, one of those two candidates excludes the target.',
  simpleColorTrapConclusionTitle: 'Remove the trapped candidate',
  simpleColorTrapConclusion:
    'Because every target sees both possible states, remove {targets}.',
  simpleColorWrapTitle: 'Find the same-state conflict',
  simpleColorWrap:
    '{a} and {b} are both in state {color} and see each other. They cannot both be {digit}, so state {color} is impossible.',
  simpleColorWrapInvalidTitle: 'State {color} is impossible',
  simpleColorWrapInvalid:
    'The conflict rules out the whole {color} state. Cross out every state-{color} candidate together: {targets}.',
  simpleColorWrapConclusionTitle: 'Remove the conflicting state',
  simpleColorWrapConclusion:
    'Remove the invalid state-{color} candidates: {targets}.',
  multi:
    '{a} and {b} belong to different components and conflict. Their states cannot both be true, so at least one opposite A/B state must be true. Each target sees both alternatives.',
  multiOverviewTitle: 'This is Multi Coloring',
  multiOverview:
    'Candidate {digit} forms two separate coloring components. Within each component, round A and square B are opposite states. Keep the target {targets} in view.',
  multiComponentTitle: 'Inspect component {component}',
  multiComponent:
    'Coloring component {component}: round A = {a}; square B = {b}. A and B are opposite states, and every strong link joins them within this component.',
  multiConflictTitle: 'Find a cross-component conflict',
  multiConflict:
    '{first} and {second} belong to different components but see each other in {region}. They cannot both be true.',
  multiOppositeTitle: 'At least one opposite state is true',
  multiOpposite:
    'Since the conflicting states cannot both be true, at least one opposite state—{firstOpposite} or {secondOpposite}—must be true.',
  multiTargetTitle: 'The target sees both alternatives',
  multiTarget:
    '{targets} sees {firstWitness} and {secondWitness}. Whichever opposite state is true excludes the target.',
  multiConclusionTitle: 'Remove the target candidate',
  multiConclusion: 'Remove {targets}.',
  colorPropagation:
    'If {a} is true, remove {b}. That state is false, forcing the opposite state {candidates}.',
  remote:
    'Every marked cell has exactly {digits}. Connected peer cells must take opposite values. Round A and square B record the two opposite states throughout this coloring component; they are not an arbitrary list of chain cells. Each target sees both states.',
  remoteOverviewTitle: 'This is a Remote Pair',
  remoteOverview:
    'The marked cells form one Remote Pair coloring component using {digits}. Round A and square B are its two opposite assignments. Keep the target {targets} in view.',
  remotePairCellsTitle: 'Confirm the matching bivalue cells',
  remotePairCells:
    'Every chain cell—{cells}—has exactly the same two candidates: {digits}.',
  remoteAlternateTitle: 'Follow the alternating chain',
  remoteAlternate:
    'Along the selected continuous path, connected cells see each other and must swap {digits}. Round A and square B therefore alternate as opposite states within the same component.',
  remoteCaseTitle: 'Case {case}: A is {firstDigit}, B is {secondDigit}',
  remoteCase:
    'A gives {firstWitness}; B gives {secondWitness}. The target {targets} sees both digits in this assignment.',
  remoteConclusionTitle: 'Remove the remote pair from the target',
  remoteConclusion:
    'Both possible assignments put one pair digit at each witness, so remove {targets}.',
  complexOverviewTitle: 'This is Complex Coloring',
  complexOverview:
    'Candidate {digit} forms {components} separate coloring components. Within each component, A and B are opposite states; conflicts link states across components. Keep the target state {targets} in view.',
  complexAssumeTitle: 'Assume the target state is true',
  complexAssume:
    'Temporarily assume {candidates} is true. Follow the conflicts between components.',
  complexPropagationTitle:
    'Propagation {step}/{total}: component {from} to {to}',
  complexPropagation:
    '{source} is true, so the visible peer {conflict} is false. The opposite A/B state {forced} in that group is therefore true.',
  complexContradictionTitle: 'The assumption forces its opposite',
  complexContradiction:
    'The assumption {assumption} eventually forces {opposite}, the opposite A/B state in the same group. Both states cannot be true, so the assumption is false.',
  complexConclusionTitle: 'Remove the impossible state',
  complexConclusion:
    'The starting state cannot be true. Remove its candidates: {targets}.',
  uniqueness:
    'This argument assumes the puzzle has exactly one solution. These four cells occupy two rows, two columns and two boxes. Swapping the two digits would preserve every region.',
  swap: 'Possible rectangle filling {branch}: {candidates}. Swapping all four entries gives the other filling. These are hypothetical values only.',
  unique:
    'Type 1: three corners have only {digits}. If the fourth also took one of these digits, the rectangle could be swapped. The fourth must use another digit.',
  uniqueRectangleType4Title: 'Find the strong link',
  uniqueRectangleType4:
    'The exact bivalue corners {bivalueCells} contain only {pairDigits}. In {strongRegion}, {strongDigit} has only two positions: {strongCandidates}. Exactly one extra-candidate corner must contain {strongDigit}. Candidate {otherDigit} can appear at {otherCandidates}, so it is not restricted to those two corners and the digits are not symmetric.',
  uniqueRectangleType4CaseTitle: 'Case {case}: assume {assumption}',
  uniqueRectangleType4Case:
    'Assume {assumption}. The strong link forces {forcedExtra}={strongDigit}. The other two sides then fix the exact bivalue corners as {bivalueValues}. The rectangle now has the swappable filling {arrangement}; exchanging {pairDigits} gives {swappedArrangement}, a second solution. Therefore the assumption is false.',
  uniqueRectangleType4ConclusionTitle: 'Remove the other rectangle digit',
  uniqueRectangleType4Conclusion:
    'Either extra-candidate corner taking {otherDigit} creates the same swappable rectangle, so remove {targets}. Keep {strongDigit}: {strongRegion} requires one of {extraCells} to contain it.',
  hiddenRectangleTitle: 'Follow the two strong links',
  hiddenRectangle:
    '{anchor} is an exact bivalue corner containing only {pairDigits}. At its diagonal corner {target}, candidate {strongDigit} forms one strong link in {targetRow} and another in {targetColumn}. Both strong links pass through {target}.',
  hiddenRectangleCaseTitle: 'Assume {assumption}',
  hiddenRectangleCase:
    'If {assumption}, {target} cannot contain {strongDigit}. The two strong links force {rowForced} and {columnForced} to {strongDigit}, while the exact bivalue corner {anchor} becomes {otherDigit}. The rectangle then has the swappable filling {arrangement}; exchanging {pairDigits} gives {swappedArrangement}, a second solution. Therefore the assumption is false.',
  hiddenRectangleConclusionTitle: 'Remove the diagonal candidate',
  hiddenRectangleConclusion:
    'Remove {targets}. Candidate {otherDigit} at {target} would create the two-solution rectangle shown above.',
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
  nakedTripleObserveTitle: '观察三数组',
  nakedTripleReserveTitle: '理解占位',
  nakedTripleExcludeTitle: '展示排除',
  nakedTripleObserve: '这三格的候选合起来只有{digits}。',
  nakedTripleReserve: '{region}内数字不能重复，这三个数字必然各占一格。',
  nakedTripleExclude: '所以，可以删除{region}其他格中标出的{digits}候选。',
  hiddenTripleObserveTitle: '观察位置',
  hiddenTripleReserveTitle: '理解占位',
  hiddenTripleExcludeTitle: '展示排除',
  hiddenTripleObserve: '{region}里，{digits}只能出现在这三格。',
  hiddenTripleReserve: '这三个数字必须各占一格，这三格不能再填其他数字。',
  hiddenTripleExclude: '所以，可以删除这三格中标出的{digits}候选。',
  nakedQuadObserveTitle: '观察四数组',
  nakedQuadReserveTitle: '理解占位',
  nakedQuadExcludeTitle: '展示排除',
  nakedQuadObserve: '这四格的候选合起来只有{digits}。',
  nakedQuadReserve: '{region}内数字不能重复，这四个数字必然各占一格。',
  nakedQuadExclude: '所以，可以删除{region}其他格中标出的{digits}候选。',
  hiddenQuadObserveTitle: '观察位置',
  hiddenQuadReserveTitle: '理解占位',
  hiddenQuadExcludeTitle: '展示排除',
  hiddenQuadObserve: '{region}里，{digits}只能出现在这四格。',
  hiddenQuadReserve: '这四个数字必须各占一格，这四格不能再填其他数字。',
  hiddenQuadExclude: '所以，可以删除这四格中标出的{digits}候选。',
  hiddenPairObserveTitle: '先看两格',
  hiddenPairReserveTitle: '确认隐性数对',
  hiddenPairExcludeTitle: '删除其他候选',
  hiddenPairObserve: '先看高亮的两格：两格中都有候选{first}和{second}。',
  hiddenPairReserve:
    '在{region}中，{first}和{second}只出现在高亮的这两格，因此它们必须各占一格，这两格不能再填其他数字。',
  hiddenPairExclude: '所以，可以删除这两格中标出的{digits}候选。',
  nakedPairObserveTitle: '观察数对',
  nakedPairReserveTitle: '理解占位',
  nakedPairExcludeTitle: '展示排除',
  nakedPairObserve: '这两格都只有{first}和{second}。',
  nakedPairReserve:
    '{region}内数字不能重复，必然一格填{first}，另一格填{second}。',
  nakedPairExclude: '所以，可以删除{region}其他格中标出的{digits}候选。',
  lockedTripleObserveTitle: '观察三数组',
  lockedTripleLockTitle: '理解锁定',
  lockedTripleExcludeTitle: '展示排除',
  lockedTripleObserve: '这三格只能用{digits}，三个数字必然各占一格。',
  lockedTripleLock:
    '这三格同时位于{line}和{box}，所以两个区域里的{digits}都被这三格占住了。',
  lockedTripleExclude:
    '因此，可以从{line}和{box}内的其他格删除标出的{digits}候选。',
  lockedPairObserveTitle: '找到数对',
  lockedPairLockTitle: '查看共同区域',
  lockedPairExcludeTitle: '删除目标候选',
  lockedPairObserve:
    '高亮的两格都只有{first}和{second}，它们组成数对：一格填{first}，另一格填{second}。',
  lockedPairLock:
    '这个数对同时位于{line}和{box}。两格已经占用{first}和{second}，所以这两个区域的其他格不能再填它们。',
  lockedPairExclude: '删除{line}和{box}其他格中标出的{digits}候选。',
  singleRegionTitle: '观察行、列、宫',
  singleDirect:
    '{cells} 的同行、同列和同宫中的已填数字排除了 {directRemoved}，所以只剩候选 {remaining}。',
  singleCurrentCandidates:
    '{cells} 的同行、同列和同宫中的已填数字排除了 {directRemoved}；按照你当前显示的候选，{snapshotRemoved} 也已排除，所以只剩候选 {remaining}。',
  singleAppliedHints:
    '{cells} 的同行、同列和同宫中的已填数字排除了 {directRemoved}；你已经应用的提示又排除了 {snapshotRemoved}，所以只剩候选 {remaining}。',
  singleConclusion: '这里只能填 {digits}。',
  singleCheckSummary: '已排除：{removed}。剩余：{remaining}。',
  hiddenSingleObserveTitle: '在{region}找{digit}',
  hiddenSingleObserve: '只看数字{digit}：它在{region}还能放在哪一格？',
  hiddenSingleExcludeTitle: '排除其他位置',
  hiddenSingleExclude:
    '{blockingRegions}中已经有{digit}，叉号位置不能再填{digit}。{region}只剩{cell}。',
  hiddenSingleCandidateExclude:
    '按照当前显示的候选，叉号位置不能填{digit}。{region}只剩{cell}。',
  hiddenSingleApplyTitle: '填入{digit}',
  hiddenSingleConclusion: '{region}中只有{cell}可以填{digit}。',
  fullHouse:
    '{regions}只剩{cells}未填；这个区域还缺数字{digits}，所以{cells}必须填{digits}。',
  cell: '{cells} 只能填 {digits}。',
  positions:
    '在{regions}中，{digits} 只能出现在 {cells}。这个区域必须出现一次该数字。',
  locked:
    '{source}的所有落点都位于{cover}内。{source}必须有一个 {digits}，因此交叉处会占用它，{cover}的其他格不能再填 {digits}。',
  lockedConclusion:
    '{source}内的{digits}必在{cover}，所以{cover}内但在{source}外的目标{targets}不能是{digits}。',
  naked:
    '{regions}中的 {count} 格，其完整候选并集是 {digits}。这 {count} 格必须用掉这 {count} 个不同数字，因此该区域其他格不能再用其中任何一个。',
  hidden:
    '在{regions}中，{digits} 的所有落点都限制在这 {count} 格。这些数字需要占满这些格，所以格内其他数字可以删除。',
  fish: '{count} 个基础区域（{source}）各需一个 {digits}，所有落点都在 {count} 个覆盖区域（{cover}）内。每个覆盖区域不能出现两个，所以每个都会被鱼形占用。可删除覆盖区域内、基础区域外的 {digits}。',
  xWingPremise:
    '两个基础区域（{source}）中，{digits} 都恰好只有两个位置；四个圈出的候选同时落在相同两条覆盖区域（{cover}），组成 X-Wing。',
  xWingCase:
    '情形 {branch}：{first} 和 {second} 为真，分别在两条覆盖区域中填入一个 {digits}；另两个角（{crossed}）为假，目标（{targets}）在本情形下也被排除。',
  xWingResult:
    '无论采用哪种完整配对，两个基础区域（{source}）中的两个 {digits} 都会分别占满两条覆盖区域（{cover}），每条恰好一个。因此删除基础区域外的 {targets}。',
  jellyfishPremise:
    '数独的每个区域都必须恰好出现一次 {digits}。选出的四个基础区域（{source}）目前都还缺 {digits}，所以每个区域最终都必须从圈出的候选中选一个。',
  jellyfishPattern:
    '四个基础区域中圈出的全部候选，都只位于同样四个覆盖区域（{cover}）内。图例中的“基线”标出四个基础区域，“覆盖线”标出四个覆盖区域。两者共同构成 Jellyfish。',
  jellyfishTarget:
    '任意选择一个位于覆盖区域内、四个基础区域外的候选 {digits}。下面检查 {selected}；其他目标可以使用完全相同的证明。',
  jellyfishAssume:
    '假设 {selected}。它占用了{cover}，所以同时划掉该区域内其他候选 {digits}：{crossed}。',
  jellyfishForce:
    '{base}现在只剩 {selected} 可以填 {digits}。选定它，同时划掉其基础区域和覆盖区域内其他候选 {digits}：{crossed}。',
  jellyfishNoPlace:
    '{base}仍然必须有一个 {digits}，但它的所有候选都已被划掉。这与该区域必须出现 {digits} 的数独规则矛盾。',
  jellyfishBranchChoose:
    '第 {branch} 种：选定 {selected}，同时划掉其基础区域和覆盖区域内其他候选 {digits}：{crossed}。',
  jellyfishBranchReset:
    '第 {branch} 种不成立。撤回这一分支的临时选择，回到目标假设后的候选状态，再检查下一种。',
  jellyfishBranchesExhausted:
    '上面的 {branchCount} 种情况覆盖了基础区域中 {digits} 的全部剩余放法。每种都会明确导致一个区域没有位置可填 {digits}，所以最初选择的目标不可能成立。',
  jellyfishResult:
    '任意选取的 {selected} 会产生矛盾，所以它不能是 {digits}。其他目标同样位于覆盖区域内、基础区域外，证明完全相同；划掉 {targets}。',
  sashimiAlternate: '第二种：另一个位置成立，先排除标出的两个鱼身候选。',
  fishResult: '划掉鱼身之外标出的候选 {digits}。',
  swordfishPatternTitle: '识别三阶鱼',
  swordfishPattern:
    '三个基础区域（{source}）都还缺少 {digits}，并且其中 {digits} 的所有候选位置都只落在三条覆盖区域（{cover}）内。这构成一个 Swordfish。',
  swordfishReasonTitle: '推导覆盖区域的占位',
  swordfishReason:
    '三个基础区域各需要一个 {digits}，因此一共必须放入三个 {digits}。同一条覆盖区域不能出现两个相同数字，而所有位置又只在这三条覆盖区域内，所以三个 {digits} 必须分别占用三条覆盖区域。',
  swordfishResultTitle: '删除目标候选',
  swordfishResult:
    '因此，三条覆盖区域中的 {digits} 都必须落在三个基础区域内。删除覆盖区域内、基础区域外标出的候选：{targets}。',
  fins: '描边标出的是鱼鳍，都在{regions}内。{missing}',
  missing: '缺角 {cells} 没有该候选，不把它当作证据。',
  finCaseTitle: '假设鳍 {index} 成立',
  finTrue: '如果这个鳍是 {digits}，同宫标出的目标就不能是 {digits}。',
  finFalse: '如果所有鳍都不是 {digits}，鱼身形成 X-Wing，同样排除这些目标。',
  sashimiPair: '{regions}只有两个位置能填 {digits}，必有一个成立。',
  sashimiDirect: '第一种：这个位置成立，排除同行或同列标出的候选。',
  sashimiFin: '{regions}只能在鳍中填 {digits}；目标看见所有鳍，因此也被排除。',
  sashimiResult: '两种情况都排除相同的目标，划掉这些候选。',
  wing: '枢轴是 {cells}，完整候选为 {digits}，两翼是 {wings}。分别检查枢轴的每一种取值。',
  xyWingIntroTitle: '找到枢轴与两翼',
  xyWingIntro:
    '{pivot} 是枢轴，候选为 {pivotDigits}；它分别看见候选为 {wingADigits} 的 {wingA} 和候选为 {wingBDigits} 的 {wingB} 两个翼。',
  xyWingStructureTitle: '找到共同目标',
  xyWingStructure:
    '两个翼都包含 {targetDigit}。{targets} 同时看见两个翼，因此它是候选 {targetDigit} 的共同目标。',
  xyWingCaseTitle: '情况 {branch}：{pivot} 是 {pivotDigit}',
  xyWingCase:
    '如果 {pivot}={pivotDigit}，{wing} 就不能是 {pivotDigit}，只能是 {targetDigit}。',
  xyWingTargetTitle: '情况 {branch}：排除目标 {targetDigit}',
  xyWingTarget:
    '在这种情况下，{wing} 是 {targetDigit}。{targets} 看见 {wing}，所以不能是 {targetDigit}。',
  xyWingConclusionTitle: '合并两种情况',
  xyWingConclusion:
    '枢轴只可能是 {pivotDigits}。无论是哪一种，两翼中至少一格是 {targetDigit}，所以删除 {targets}。',
  xyzWingIntroTitle: '找到枢轴与两翼',
  xyzWingIntro:
    '{pivot} 是包含三个候选 {pivotDigits} 的枢轴；它分别看见候选为 {wingADigits} 的 {wingA} 和候选为 {wingBDigits} 的 {wingB}。这三格组成 XYZ-Wing。',
  xyzWingTargetTitle: '找到三格共同目标',
  xyzWingTarget:
    '枢轴和两个翼都包含 {targetDigit}。目标 {targets} 同时看见 {targetDigit} 的这三个可能位置。',
  xyzWingCaseTitle: '情况 {branch}：{pivot} 是 {pivotDigit}',
  xyzWingCase:
    '如果 {pivot}={pivotDigit}，{wing} 就不能是 {pivotDigit}，只能是 {targetDigit}。',
  xyzWingPivotCaseTitle: '情况 3：枢轴是 {targetDigit}',
  xyzWingPivotCase:
    '如果 {pivot}={targetDigit}，枢轴自身已经提供了 {targetDigit}。这是枢轴最后一种可能取值。',
  xyzWingConclusionTitle: '合并三种情况',
  xyzWingConclusion:
    '无论枢轴取哪个候选，{sources} 中都至少一格是 {targetDigit}。目标同时看见这三格，所以删除 {targets}。',
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
  wWingWingsTitle: '这是一个 W-Wing',
  wWingWings:
    '这是一个 W-Wing。先看 {wingA} 和 {wingB}：它们都只有 {targetDigit}、{linkDigit}，是这个结构的两翼。',
  wWingLinkTitle: '查看完整 W-Wing',
  wWingLink:
    '两翼分别看见 {linkDigit} 强链的一端。在{region}中，{linkDigit} 只可能出现在 {linkA} 和 {linkB}，所以其中必有一个是 {linkDigit}。目标 {targets} 同时看见两翼。',
  wWingCaseTitle: '情况 {branch}：{linkCell} 是 {linkDigit}',
  wWingCase:
    '如果 {linkCell}={linkDigit}，它会排除 {wingCell} 的 {linkDigit}，于是这个翼只能是 {targetDigit}。{targets} 看见 {wingCell}，所以不能是 {targetDigit}。',
  wWingConclusionTitle: '合并两种情况',
  wWingConclusion:
    '这两种情况覆盖了强链的全部可能，因此两翼至少一格是 {targetDigit}。每个目标都同时看见两翼，所以删除 {targets}。',
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
    '第 {component} 组是一个染色分量：圆形 A = {a}；方形 B = {b}。A 与 B 代表相反状态。要么全部 A 成立、全部 B 不成立，要么反过来。这只是可能状态，不是已经填入的答案。',
  colorConflict:
    '{a} 和 {b} 属于同一 A/B 状态且互相可见。该状态不可能成立，因此其中的全部候选都可删除。',
  colorTrap:
    '每个目标都能看见这个组中的一个 A 和一个 B。无论哪种状态成立，都能排除目标。',
  simpleColorStartTitle: '找到第一条强链',
  simpleColorStart:
    '在{region}中，{digit} 只可能出现在 {first} 或 {second}，其中必有一个成立。这两个候选属于同一染色分量，分别标为圆形 A 和方形 B；A 与 B 代表相反状态。',
  simpleColorAlternateTitle: '沿强链交替染色',
  simpleColorAlternate:
    '继续寻找相连的 {digit} 强链。在同一染色分量内，每条强链都连接圆形 A 和方形 B 这两种相反状态。',
  simpleColorNetworkTitle: '完成染色网络',
  simpleColorNetwork:
    '这 {count} 个候选组成一个连通网络。每条实线都是 {digit} 的强链。',
  simpleColorNetworkWithStates:
    '这 {count} 个候选组成一个连通网络。每条强链连接 A 与 B，因此所有 A 候选状态相同，所有 B 候选状态相反。',
  simpleColorStatesTitle: '理解两种状态',
  simpleColorStates:
    '要么全部 A 成立、全部 B 不成立；要么全部 B 成立、全部 A 不成立。我们不需要预先判断哪一种成立。',
  simpleColorTrapTitle: '找到同时看见 A 和 B 的目标',
  simpleColorTrap:
    '{targets} 看见 A 状态的 {a}，也看见 B 状态的 {b}。无论哪种状态成立，其中一个候选都会排除目标。',
  simpleColorTrapConclusionTitle: '删除被夹击的候选',
  simpleColorTrapConclusion:
    '每个目标都同时看见两种可能状态，所以删除 {targets}。',
  simpleColorWrapTitle: '找到同状态冲突',
  simpleColorWrap:
    '{a} 和 {b} 都属于 {color} 状态且互相可见，不可能同时为 {digit}，所以 {color} 状态不可能成立。',
  simpleColorWrapInvalidTitle: '{color} 状态整体不成立',
  simpleColorWrapInvalid:
    '这个冲突否定的是整个 {color} 状态。同步划掉全部 {color} 状态候选：{targets}。',
  simpleColorWrapConclusionTitle: '删除冲突状态',
  simpleColorWrapConclusion:
    '删除已经判定不成立的 {color} 状态候选：{targets}。',
  multi:
    '{a} 与 {b} 属于不同组且互相冲突，所以这两个状态不能同时成立，至少一个组内的另一状态必须成立。每个目标都能看见这两种可能。',
  multiOverviewTitle: '这是一个多重染色',
  multiOverview:
    '候选 {digit} 形成两个互不连接的染色分量。每个分量内的圆形 A 与方形 B 代表相反状态。先保持目标 {targets} 清晰可见。',
  multiComponentTitle: '查看分量 {component}',
  multiComponent:
    '第 {component} 个染色分量：圆形 A 是 {a}，方形 B 是 {b}。A 与 B 代表相反状态，该分量内的每条强链都连接两者。',
  multiConflictTitle: '找到跨分量冲突',
  multiConflict:
    '{first} 与 {second} 来自不同分量，却在{region}中互相可见，因此不能同时成立。',
  multiOppositeTitle: '至少一种相反状态成立',
  multiOpposite:
    '冲突的两种状态不能同时成立，所以它们至少有一种不成立；对应组内的另一状态 {firstOpposite} 或 {secondOpposite} 至少有一种成立。',
  multiTargetTitle: '目标看见两种可能状态',
  multiTarget:
    '{targets} 同时看见 {firstWitness} 和 {secondWitness}。无论哪一种相反状态成立，都会排除目标。',
  multiConclusionTitle: '删除目标候选',
  multiConclusion: '删除 {targets}。',
  colorPropagation:
    '如果 {a} 成立，就排除 {b}。后者的状态不成立，其组内相反状态 {candidates} 被迫成立。',
  remote:
    '每个标记格的候选都恰好是 {digits}。相连且互相可见的格必须取相反值。圆形 A 和方形 B 记录同一染色分量内的两种相反状态，并不是任意排列的格子链。每个目标都能看见这两种状态。',
  remoteOverviewTitle: '这是一个远程数对',
  remoteOverview:
    '这些标记格用 {digits} 构成一个远程数对染色分量，圆形 A 与方形 B 代表两种相反取值。先保持目标 {targets} 清晰可见。',
  remotePairCellsTitle: '确认相同的双值数对',
  remotePairCells:
    '链上的每一格——{cells}——都恰好只有相同的两个候选：{digits}。',
  remoteAlternateTitle: '沿连续路径交替取值',
  remoteAlternate:
    '在选定的连续路径上，相邻格互相可见，因此必须交换 {digits}；圆形 A 和方形 B 作为同一染色分量内的相反状态随路径交替。',
  remoteCaseTitle: '情况 {case}：A 是 {firstDigit}，B 是 {secondDigit}',
  remoteCase:
    '圆形 A 给出 {firstWitness}，方形 B 给出 {secondWitness}。在这种取值下，目标 {targets} 同时看见两个数字。',
  remoteConclusionTitle: '从目标删除远程数对',
  remoteConclusion:
    '两种可能的取值都会让两个见证格分别占用数对中的一个数字，因此删除 {targets}。',
  complexOverviewTitle: '这是一个复杂染色',
  complexOverview:
    '候选 {digit} 形成 {components} 个独立染色分量。每个分量内的 A 与 B 代表相反状态，分量之间再由冲突连成推理链。先保持目标状态 {targets} 清晰可见。',
  complexAssumeTitle: '假设目标状态成立',
  complexAssume: '暂时假设 {candidates} 成立，然后沿分量之间的冲突继续传播。',
  complexPropagationTitle: '传播 {step}/{total}：分量 {from} → 分量 {to}',
  complexPropagation:
    '{source} 成立，所以与它互相可见的 {conflict} 不成立；该组的相反 A/B 状态 {forced} 被迫成立。',
  complexContradictionTitle: '假设推出了相反状态',
  complexContradiction:
    '从假设 {assumption} 出发，最终又推出同一组的相反 A/B 状态 {opposite} 成立。同一组的两种状态不能同时成立，因此最初假设错误。',
  complexConclusionTitle: '删除不可能的状态',
  complexConclusion: '起始状态不可能成立，删除其中的候选：{targets}。',
  uniqueness:
    '本推理以题目恰好有一个解为前提。这四格跨两行、两列、两个宫，交换两种数字不会改变任何区域的数字组成。',
  swap: '矩形填法 {branch}：{candidates}。四格全部交换后得到另一种填法。这些数字都只是推演。',
  unique:
    'Type 1：三个角只有 {digits}。如果第四角也选其中之一，整个矩形就可以交换，因此第四角必须使用其他数字。',
  uniqueRectangleType4Title: '找到强链',
  uniqueRectangleType4:
    '严格双值角 {bivalueCells} 只含 {pairDigits}。在{strongRegion}中，数字 {strongDigit} 只剩 {strongCandidates} 两个位置，因此两个含额外候选的角中有且只有一格是 {strongDigit}。候选 {otherDigit} 还可以出现在 {otherCandidates}，并未被限制在这两格，所以两个数字并不对称。',
  uniqueRectangleType4CaseTitle: '情况 {case}：假设 {assumption}',
  uniqueRectangleType4Case:
    '假设 {assumption} 成立。强链迫使 {forcedExtra}={strongDigit}，矩形另外两条边随后把严格双值角固定为 {bivalueValues}。此时矩形填法是 {arrangement}；交换 {pairDigits} 后得到 {swappedArrangement}，形成第二个解。因此该假设不成立。',
  uniqueRectangleType4ConclusionTitle: '删除另一个矩形数字',
  uniqueRectangleType4Conclusion:
    '两个含额外候选的角只要任意一格取 {otherDigit}，都会形成上述可交换矩形，因此删除 {targets}。保留 {strongDigit}：{strongRegion}要求 {extraCells} 中必须有一格是它。',
  hiddenRectangleTitle: '沿两条强链推理',
  hiddenRectangle:
    '{anchor} 是只含 {pairDigits} 的严格双值角。它的对角格是 {target}；候选 {strongDigit} 在{targetRow}形成一条强链，在{targetColumn}又形成一条强链，两条强链都经过 {target}。',
  hiddenRectangleCaseTitle: '假设 {assumption}',
  hiddenRectangleCase:
    '若 {assumption}，{target} 就不能取 {strongDigit}。两条强链分别迫使 {rowForced} 和 {columnForced} 取 {strongDigit}，严格双值角 {anchor} 则只能取 {otherDigit}。此时矩形填法是 {arrangement}；交换 {pairDigits} 后得到 {swappedArrangement}，形成第二个解。因此该假设不成立。',
  hiddenRectangleConclusionTitle: '删除对角格候选',
  hiddenRectangleConclusion:
    '删除 {targets}。如果 {target} 取 {otherDigit}，就会形成上面展示的双解矩形。',
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
  nakedTripleObserveTitle: 'トリプルを確認',
  nakedTripleReserveTitle: '占有を理解',
  nakedTripleExcludeTitle: '候補を除外',
  nakedTripleObserve: 'この3マスの候補を合わせると、{digits}だけです。',
  nakedTripleReserve:
    '{region}では数字を重複できないため、この3数字が1マスずつを占めます。',
  nakedTripleExclude:
    '{region}の他のマスから、強調された候補{digits}を除外できます。',
  hiddenTripleObserveTitle: '位置を確認',
  hiddenTripleReserveTitle: '占有を理解',
  hiddenTripleExcludeTitle: '候補を除外',
  hiddenTripleObserve: '{region}では、{digits}が入るのはこの3マスだけです。',
  hiddenTripleReserve:
    'この3数字が1マスずつを占めるため、この3マスに他の数字は入りません。',
  hiddenTripleExclude: 'この3マスから、強調された候補{digits}を除外できます。',
  nakedQuadObserveTitle: 'クアッドを確認',
  nakedQuadReserveTitle: '占有を理解',
  nakedQuadExcludeTitle: '候補を除外',
  nakedQuadObserve: 'この4マスの候補を合わせると、{digits}だけです。',
  nakedQuadReserve:
    '{region}では数字を重複できないため、この4数字が1マスずつを占めます。',
  nakedQuadExclude:
    '{region}の他のマスから、強調された候補{digits}を除外できます。',
  hiddenQuadObserveTitle: '位置を確認',
  hiddenQuadReserveTitle: '占有を理解',
  hiddenQuadExcludeTitle: '候補を除外',
  hiddenQuadObserve: '{region}では、{digits}が入るのはこの4マスだけです。',
  hiddenQuadReserve:
    'この4数字が1マスずつを占めるため、この4マスに他の数字は入りません。',
  hiddenQuadExclude: 'この4マスから、強調された候補{digits}を除外できます。',
  hiddenPairObserveTitle: '2マスに注目',
  hiddenPairReserveTitle: '隠れペアを確認',
  hiddenPairExcludeTitle: '他の候補を除外',
  hiddenPairObserve:
    'まず強調された2マスに注目します。どちらにも候補{first}と{second}があります。',
  hiddenPairReserve:
    '{region}では、{first}と{second}が入るのは強調されたこの2マスだけです。各数字が1マスずつを占めるため、他の数字は入りません。',
  hiddenPairExclude: 'この2マスから、強調された候補{digits}を除外できます。',
  nakedPairObserveTitle: 'ペアを確認',
  nakedPairReserveTitle: '占有を理解',
  nakedPairExcludeTitle: '候補を除外',
  nakedPairObserve: 'この2マスの候補は{first}と{second}だけです。',
  nakedPairReserve:
    '{region}では数字を重複できません。一方が{first}、もう一方が{second}です。',
  nakedPairExclude:
    '{region}の他のマスから、強調された候補{digits}を除外できます。',
  lockedTripleObserveTitle: 'トリプルを確認',
  lockedTripleLockTitle: '共有する領域を確認',
  lockedTripleExcludeTitle: '候補を除外',
  lockedTripleObserve:
    'この3マスに入るのは{digits}だけ。各数字が1マスずつを占めます。',
  lockedTripleLock:
    'この3マスは{line}と{box}の両方に位置するため、両方の領域でこの3数字を占めます。',
  lockedTripleExclude:
    '{line}と{box}の他のマスから、強調された候補{digits}を除外します。',
  lockedPairObserveTitle: 'ペアを見つける',
  lockedPairLockTitle: '共有する領域を確認',
  lockedPairExcludeTitle: '対象候補を除外',
  lockedPairObserve:
    '強調された2マスの候補は{first}と{second}だけです。この2マスがペアになり、一方が{first}、もう一方が{second}です。',
  lockedPairLock:
    'このペアは{line}と{box}の両方にあります。2マスが{first}と{second}を占めるため、どちらの領域でも他のマスには入りません。',
  lockedPairExclude:
    '{line}と{box}の他のマスから、強調された候補{digits}を除外します。',
  singleRegionTitle: '行・列・ブロックを確認',
  singleDirect:
    '{cells}では、同じ行・列・ブロックの確定数字により{directRemoved}が除外され、候補は{remaining}だけです。',
  singleCurrentCandidates:
    '{cells}では、同じ行・列・ブロックの確定数字により{directRemoved}が除外されています。現在表示中の候補では{snapshotRemoved}も除外され、候補は{remaining}だけです。',
  singleAppliedHints:
    '{cells}では、同じ行・列・ブロックの確定数字により{directRemoved}が除外されています。適用したヒントで{snapshotRemoved}も除外され、候補は{remaining}だけです。',
  singleConclusion: 'ここに入るのは {digits} です。',
  singleCheckSummary: '除外：{removed}。残り：{remaining}。',
  hiddenSingleObserveTitle: '{region}で{digit}を探す',
  hiddenSingleObserve:
    '{digit}だけに注目します。{region}では、まだどのマスに置けるでしょうか？',
  hiddenSingleExcludeTitle: 'ほかの位置を除外',
  hiddenSingleExclude:
    '{blockingRegions}にはすでに{digit}があります。×印の位置には{digit}を置けないため、{region}では{cell}だけが残ります。',
  hiddenSingleCandidateExclude:
    '表示中の候補では、×印の位置に{digit}を置けません。{region}では{cell}だけが残ります。',
  hiddenSingleApplyTitle: '{digit}を入れる',
  hiddenSingleConclusion: '{region}で{digit}を置けるのは{cell}だけです。',
  fullHouse:
    '{regions}で未確定なのは{cells}だけです。欠けている数字は{digits}なので、{cells}は{digits}です。',
  cell: '{cells} に入るのは {digits} だけです。',
  positions:
    '{regions} で {digits} を置けるのは {cells} だけです。この領域にはその数字が1回必要です。',
  locked:
    '{source} の全候補位置が {cover} 内にあります。{source} に必要な {digits} は交差部分に入るため、{cover} の他のマスには入れません。',
  lockedConclusion:
    '{source} の {digits} は必ず {cover} 内に入ります。したがって、{cover} 内かつ {source} 外の対象 {targets} は {digits} ではありません。',
  naked:
    '{regions} の {count} マスの候補全体は {digits} です。これらのマスが {count} 個の異なる数字をすべて使うため、同じ領域の他のマスから削除できます。',
  hidden:
    '{regions} で {digits} の全候補位置はこの {count} マスだけです。これらの数字が全マスを使うため、マス内の他の候補を削除できます。',
  fish: '{count} 個の基底領域（{source}）にはそれぞれ {digits} が1つ必要です。全候補は {count} 個の被覆領域（{cover}）にあります。重複はできないため各被覆領域が1つずつ使われ、基底領域の外側から {digits} を削除できます。',
  xWingPremise:
    '2つの基底領域（{source}）には {digits} の位置がそれぞれ2つだけあり、4つの丸印候補は同じ2つの被覆領域（{cover}）に揃って X-Wing を作ります。',
  xWingCase:
    'ケース {branch}：{first} と {second} が真となり、2つの被覆領域に {digits} が1つずつ入ります。もう一方の2つの角（{crossed}）は偽となり、対象（{targets}）もこのケースでは除外されます。',
  xWingResult:
    'どちらの完全な組合せでも、2つの基底領域（{source}）の {digits} が2つの被覆領域（{cover}）を1つずつ占めます。したがって、基底の外にある {targets} を削除します。',
  jellyfishPremise:
    '数独の各領域には {digits} がちょうど1つ必要です。選んだ4つの基底領域（{source}）にはまだ {digits} がないため、それぞれ丸印の候補から1つを選ぶ必要があります。',
  jellyfishPattern:
    '4つの基底領域にある丸印の候補は、同じ4つの被覆領域（{cover}）だけにあります。凡例の「ベース線」が4つの基底領域、「カバー線」が4つの被覆領域を示します。合わせて Jellyfish になります。',
  jellyfishTarget:
    '被覆領域内かつ4つの基底領域外にある {digits} を1つ選びます。{selected} を調べます。他の対象も同じ方法で確認できます。',
  jellyfishAssume:
    '{selected} と仮定します。{cover} が使われるため、そこにある他の {digits}、{crossed} を消します。',
  jellyfishForce:
    '{base} で {digits} は {selected} だけになりました。これを選び、同じ基底と被覆の他の {digits}、{crossed} を消します。',
  jellyfishNoPlace:
    '{base} には {digits} が必要ですが、候補がすべて消えました。各領域に {digits} が必要という数独の規則に矛盾します。',
  jellyfishBranchChoose:
    'ケース {branch}：{selected} を選び、その基底と被覆にある他の {digits} 候補を消します：{crossed}。',
  jellyfishBranchReset:
    'ケース {branch} は不可能です。この分岐の仮の選択を戻し、対象を仮定した直後の候補状態から次のケースを調べます。',
  jellyfishBranchesExhausted:
    '表示した {branchCount} ケースで、基底に {digits} を置く残りの方法をすべて調べました。どのケースでも具体的な領域から {digits} の位置がなくなるため、最初の対象の仮定は不可能です。',
  jellyfishResult:
    '任意に選んだ {selected} は矛盾を生むため {digits} ではありません。他の対象も被覆内・基底外にあり、同じ証明が使えます。{targets} を削除します。',
  sashimiAlternate:
    '第二の場合：もう一方が真なら、印のある本体の二候補を除外します。',
  fishResult: '本体の外にある、印の付いた候補 {digits} を消します。',
  swordfishPatternTitle: 'Swordfish を見つける',
  swordfishPattern:
    '3つの基底領域（{source}）はいずれも {digits} を必要とし、その候補位置は同じ3つの被覆領域（{cover}）だけにあります。これが Swordfish です。',
  swordfishReasonTitle: '被覆領域の占有を導く',
  swordfishReason:
    '各基底領域に {digits} が1つ必要なので、配置は全部で3つです。同じ被覆領域に同じ数字を2つ置くことはできず、配置先はこの3つの被覆領域に限られます。したがって、各被覆領域が1つずつ使われます。',
  swordfishResultTitle: '対象候補を削除する',
  swordfishResult:
    'したがって、3つの被覆領域の {digits} は基底領域内に置かれます。基底領域の外にある印付き候補を削除します：{targets}。',
  fins: '枠で示した候補がフィンです。すべて {regions} 内です。{missing}',
  missing:
    '欠けた角 {cells} には候補がありません。証拠の候補としては扱いません。',
  finCaseTitle: 'フィン {index} が真と仮定',
  finTrue:
    'このフィンが {digits} なら、同じブロックの対象には {digits} が入りません。',
  finFalse:
    'すべてのフィンが偽なら、本体が X-Wing となり、同じ対象を除外します。',
  sashimiPair: '{regions}で {digits} が入る二か所のうち、一方は真です。',
  sashimiDirect:
    '第一の場合：この位置が真なら、同じ行・列の印の候補を除外します。',
  sashimiFin:
    '{regions}ではフィンのどれかに {digits} が入ります。対象は全フィンと関係します。',
  sashimiResult: 'どちらの場合も同じ対象を除外します。印の候補を消します。',
  wing: 'ピボットは {cells}、全候補は {digits}、両ウイングは {wings} です。ピボットの全選択肢を調べます。',
  xyWingIntroTitle: 'ピボットとウイングを見つける',
  xyWingIntro:
    '{pivot} は候補 {pivotDigits} のピボットで、候補 {wingADigits} の {wingA} と候補 {wingBDigits} の {wingB} を見ています。',
  xyWingStructureTitle: '共通の対象を見つける',
  xyWingStructure:
    '両ウイングには {targetDigit} があります。{targets} は両方のウイングを見ているため、候補 {targetDigit} の共通の対象です。',
  xyWingCaseTitle: '場合 {branch}：{pivot} が {pivotDigit}',
  xyWingCase:
    '{pivot}={pivotDigit} なら、{wing} は {pivotDigit} にはなれず、{targetDigit} になります。',
  xyWingTargetTitle: '場合 {branch}：対象の {targetDigit} を除外',
  xyWingTarget:
    'この場合、{wing} は {targetDigit} です。{targets} は {wing} を見ているため、{targetDigit} にはなれません。',
  xyWingConclusionTitle: '2つの場合をまとめる',
  xyWingConclusion:
    'ピボットの候補は {pivotDigits} だけです。どちらの場合も一方のウイングが {targetDigit} になるため、{targets} を削除できます。',
  xyzWingIntroTitle: 'ピボットとウイングを見つける',
  xyzWingIntro:
    '{pivot} は3候補 {pivotDigits} のピボットです。候補 {wingADigits} の {wingA} と候補 {wingBDigits} の {wingB} を見ており、この3マスで XYZ-Wing を作ります。',
  xyzWingTargetTitle: '3マス共通の対象を見つける',
  xyzWingTarget:
    'ピボットと両ウイングには {targetDigit} があります。対象 {targets} は、{targetDigit} の3つの候補位置すべてを見ています。',
  xyzWingCaseTitle: '場合 {branch}：{pivot} が {pivotDigit}',
  xyzWingCase:
    '{pivot}={pivotDigit} なら、{wing} は {pivotDigit} にはなれず、{targetDigit} になります。',
  xyzWingPivotCaseTitle: '場合 3：ピボットが {targetDigit}',
  xyzWingPivotCase:
    '{pivot}={targetDigit} なら、ピボット自身がすでに {targetDigit} です。これがピボットの最後の候補です。',
  xyzWingConclusionTitle: '3つの場合をまとめる',
  xyzWingConclusion:
    'ピボットがどの候補でも、{sources} の少なくとも1マスが {targetDigit} です。対象は3マスすべてを見ているため、{targets} を削除します。',
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
  wWingWingsTitle: 'これは W-Wing',
  wWingWings:
    'これは W-Wing です。まず {wingA} と {wingB} に注目します。どちらも候補が {targetDigit}、{linkDigit} だけなので、この2マスがウイングです。',
  wWingLinkTitle: 'W-Wing 全体を見る',
  wWingLink:
    '各ウイングは {linkDigit} の強リンクの一端を見ています。{region} で {linkDigit} を置けるのは {linkA} と {linkB} だけなので、どちらか一方は必ず {linkDigit} です。対象 {targets} は両方のウイングを見ています。',
  wWingCaseTitle: '場合 {branch}：{linkCell} が {linkDigit}',
  wWingCase:
    '{linkCell}={linkDigit} なら、{wingCell} の {linkDigit} は消え、このウイングは {targetDigit} になります。{targets} は {wingCell} を見るため、{targetDigit} にはできません。',
  wWingConclusionTitle: '2つの場合をまとめる',
  wWingConclusion:
    'この2つで強リンクの全場合を網羅します。したがって少なくとも一方のウイングが {targetDigit} です。すべての対象は両方のウイングを見るため、{targets} を削除できます。',
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
    'グループ {component} は1つのカラーリング成分です。丸い A = {a}、四角い B = {b}で、A と B は反対の状態を表します。全 A が真で全 B が偽、またはその逆です。これは可能な状態であり、確定数字ではありません。',
  colorConflict:
    '{a} と {b} は同じ A/B 状態で互いに見えます。この状態は真になれないため、その全候補は偽です。',
  colorTrap:
    '各対象はこのグループの A と B の両方を見ています。どちらの状態が真でも対象を除外します。',
  simpleColorStartTitle: '最初の強リンクを見つける',
  simpleColorStart:
    '{region} で {digit} を置けるのは {first} と {second} だけです。この2候補は同じカラーリング成分に属し、丸い A と四角い B で示します。A と B は反対の状態です。',
  simpleColorAlternateTitle: '強リンクをたどる',
  simpleColorAlternate:
    'つながっている {digit} の強リンクを続けてたどります。同じ成分内で、各強リンクが反対状態の丸い A と四角い B を結びます。',
  simpleColorNetworkTitle: '色ネットワークを完成する',
  simpleColorNetwork:
    'この {count} 個の候補が1つの連結ネットワークを作ります。各実線は {digit} の強リンクです。',
  simpleColorNetworkWithStates:
    'この {count} 個の候補が1つの連結ネットワークを作ります。各強リンクは A と B を結ぶため、すべての A は同じ状態、すべての B はその反対の状態です。',
  simpleColorStatesTitle: '2つの状態を理解する',
  simpleColorStates:
    'A がすべて真で B がすべて偽か、その逆です。どちらが真かを先に決める必要はありません。',
  simpleColorTrapTitle: 'A と B の両方を見る対象を探す',
  simpleColorTrap:
    '{targets} は A の {a} と B の {b} を見ています。どちらの状態が真でも、その一方が対象を除外します。',
  simpleColorTrapConclusionTitle: '挟まれた候補を削除する',
  simpleColorTrapConclusion:
    '各対象は両方の可能な状態を見ているため、{targets} を削除します。',
  simpleColorWrapTitle: '同じ状態の矛盾を見つける',
  simpleColorWrap:
    '{a} と {b} はどちらも状態 {color} で互いに見えます。同時に {digit} にはなれないため、状態 {color} は偽です。',
  simpleColorWrapInvalidTitle: '状態 {color} 全体が偽',
  simpleColorWrapInvalid:
    'この矛盾は状態 {color} 全体を否定します。状態 {color} の候補 {targets} をすべて同時に消します。',
  simpleColorWrapConclusionTitle: '矛盾する状態を削除する',
  simpleColorWrapConclusion:
    '偽と確定した状態 {color} の候補 {targets} を削除します。',
  multi:
    '異なるグループの {a} と {b} が競合します。両状態が同時に真にはなれないため、少なくとも一方のグループの反対状態が真です。対象は両方の可能性を見ています。',
  multiOverviewTitle: 'マルチカラーリングです',
  multiOverview:
    '候補 {digit} は、互いにつながらない2つのカラーリング成分を作ります。各成分の丸い A と四角い B は反対状態です。対象 {targets} を見える状態にします。',
  multiComponentTitle: '成分 {component} を確認する',
  multiComponent:
    '成分 {component}：A = {a}、B = {b}。この成分内の各強リンクは反対の状態を結びます。',
  multiConflictTitle: '成分間の矛盾を見つける',
  multiConflict:
    '{first} と {second} は異なる成分ですが、{region} で互いに見えます。同時に真にはなれません。',
  multiOppositeTitle: '少なくとも一方の反対状態が真',
  multiOpposite:
    '競合する2状態は同時に真になれないため、各グループの反対状態 {firstOpposite} または {secondOpposite} の少なくとも一方が真です。',
  multiTargetTitle: '対象は両方の選択肢を見る',
  multiTarget:
    '{targets} は {firstWitness} と {secondWitness} の両方を見ます。どちらの反対状態が真でも対象を除外します。',
  multiConclusionTitle: '対象候補を削除する',
  multiConclusion: '{targets} を削除します。',
  colorPropagation:
    '{a} が真なら {b} を除外します。後者の状態が偽になり、同じグループの反対状態 {candidates} が真になります。',
  remote:
    '全マーク付きマスの候補は正確に {digits} です。互いに見える接続マスは反対値を取ります。丸い A と四角い B は同じカラーリング成分内の2つの反対状態を表し、任意に並べたマスの連鎖ではありません。対象は両状態を見ています。',
  remoteOverviewTitle: 'リモートペアです',
  remoteOverview:
    'マークされたセルは {digits} で1つのリモートペア成分を作ります。丸い A と四角い B は反対の割り当てを表します。対象 {targets} を見える状態にします。',
  remotePairCellsTitle: '同じ二値セルを確認する',
  remotePairCells:
    'チェーンの各セル {cells} は、同じ2候補 {digits} だけを持ちます。',
  remoteAlternateTitle: '交互チェーンをたどる',
  remoteAlternate:
    '選択した連続経路では、接続セルが互いに見えるため {digits} を交換します。同じ成分内で、丸い A と四角い B が反対状態として交互になります。',
  remoteCaseTitle: '場合 {case}：A は {firstDigit}、B は {secondDigit}',
  remoteCase:
    'A は {firstWitness}、B は {secondWitness} を与えます。この配置では対象 {targets} が両方の数字を見ます。',
  remoteConclusionTitle: '対象からリモートペアを削除する',
  remoteConclusion:
    'どちらの配置でも2つの証拠セルがペアの各数字を使うため、{targets} を削除します。',
  complexOverviewTitle: '複合カラーリングです',
  complexOverview:
    '候補 {digit} は {components} 個の独立したカラーリング成分を作ります。各成分の A と B は反対状態で、成分間の競合が推論チェーンをつなぎます。対象の状態 {targets} を見える状態にします。',
  complexAssumeTitle: '対象の状態を真と仮定する',
  complexAssume:
    '{candidates} を一時的に真と仮定し、成分間の競合をたどります。',
  complexPropagationTitle: '伝播 {step}/{total}：成分 {from} → {to}',
  complexPropagation:
    '{source} が真なので、見える {conflict} は偽です。同じグループの反対の A/B 状態 {forced} が真になります。',
  complexContradictionTitle: '仮定が反対状態を強制する',
  complexContradiction:
    '仮定 {assumption} から、同じグループの反対の A/B 状態 {opposite} が真と導かれます。2状態は同時に真になれないため、仮定は偽です。',
  complexConclusionTitle: '不可能な状態を削除する',
  complexConclusion: '開始状態は真になれません。候補 {targets} を削除します。',
  uniqueness:
    'この推理は解がちょうど1つという前提を使います。4マスは2行・2列・2ボックスにまたがり、2数字を交換しても各領域の数字構成が保たれます。',
  swap: '長方形の配置 {branch}：{candidates}。4マスすべてを交換するともう一方の配置になります。仮の数字です。',
  unique:
    'Type 1：3つの角の候補は {digits} だけです。4つ目も同じ数字を取ると交換可能になるため、4つ目には別の数字が必要です。',
  uniqueRectangleType4Title: '強リンクを見つける',
  uniqueRectangleType4:
    '厳密な二値角 {bivalueCells} は {pairDigits} だけを持ちます。{strongRegion} では {strongDigit} の位置が {strongCandidates} の2か所だけなので、追加候補を持つ角の一方だけが {strongDigit} になります。{otherDigit} は {otherCandidates} にも置けるため、この2か所に限定されず、2数字は対称ではありません。',
  uniqueRectangleType4CaseTitle: '場合 {case}：{assumption} と仮定',
  uniqueRectangleType4Case:
    '{assumption} と仮定します。強リンクにより {forcedExtra}={strongDigit} となり、残る2辺が厳密な二値角を {bivalueValues} に確定します。配置は {arrangement} となり、{pairDigits} を交換した {swappedArrangement} も成立して別解が生じます。したがって仮定は偽です。',
  uniqueRectangleType4ConclusionTitle: 'もう一方の長方形候補を削除する',
  uniqueRectangleType4Conclusion:
    '追加候補を持つどちらの角でも {otherDigit} を置くと交換可能な長方形になるため、{targets} を削除します。{strongDigit} は残します。{strongRegion} では {extraCells} の一方に必要です。',
  hiddenRectangleTitle: '2本の強リンクをたどる',
  hiddenRectangle:
    '{anchor} は {pairDigits} だけを持つ厳密な二値角です。対角の {target} では、候補 {strongDigit} が {targetRow} と {targetColumn} の両方で強リンクを作り、2本とも {target} を通ります。',
  hiddenRectangleCaseTitle: '{assumption} と仮定',
  hiddenRectangleCase:
    '{assumption} なら {target} は {strongDigit} を取れません。2本の強リンクが {rowForced} と {columnForced} を {strongDigit} にし、厳密な二値角 {anchor} は {otherDigit} になります。配置 {arrangement} に対し、{pairDigits} を交換した {swappedArrangement} も成立して別解が生じます。したがって仮定は偽です。',
  hiddenRectangleConclusionTitle: '対角の候補を削除する',
  hiddenRectangleConclusion:
    '{targets} を削除します。{target} の {otherDigit} は、上で示した2解の長方形を作ります。',
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
  nakedTripleObserveTitle: 'Das Tripel erkennen',
  nakedTripleReserveTitle: 'Die Belegung verstehen',
  nakedTripleExcludeTitle: 'Kandidaten entfernen',
  nakedTripleObserve:
    'Diese drei Zellen enthalten zusammen nur die Kandidaten {digits}.',
  nakedTripleReserve:
    'In {region} dürfen sich Ziffern nicht wiederholen. Diese drei Ziffern müssen je eine Zelle belegen.',
  nakedTripleExclude:
    'Entferne die markierten Kandidaten {digits} aus den anderen Zellen in {region}.',
  hiddenTripleObserveTitle: 'Die Positionen erkennen',
  hiddenTripleReserveTitle: 'Die Belegung verstehen',
  hiddenTripleExcludeTitle: 'Kandidaten entfernen',
  hiddenTripleObserve:
    'In {region} können {digits} nur in diesen drei Zellen stehen.',
  hiddenTripleReserve:
    'Diese drei Ziffern müssen je eine Zelle belegen. Andere Ziffern passen hier nicht mehr hinein.',
  hiddenTripleExclude:
    'Entferne die markierten Kandidaten {digits} aus diesen drei Zellen.',
  nakedQuadObserveTitle: 'Das Quadrupel erkennen',
  nakedQuadReserveTitle: 'Die Belegung verstehen',
  nakedQuadExcludeTitle: 'Kandidaten entfernen',
  nakedQuadObserve:
    'Diese vier Zellen enthalten zusammen nur die Kandidaten {digits}.',
  nakedQuadReserve:
    'In {region} dürfen sich Ziffern nicht wiederholen. Diese vier Ziffern müssen je eine Zelle belegen.',
  nakedQuadExclude:
    'Entferne die markierten Kandidaten {digits} aus den anderen Zellen in {region}.',
  hiddenQuadObserveTitle: 'Die Positionen erkennen',
  hiddenQuadReserveTitle: 'Die Belegung verstehen',
  hiddenQuadExcludeTitle: 'Kandidaten entfernen',
  hiddenQuadObserve:
    'In {region} können {digits} nur in diesen vier Zellen stehen.',
  hiddenQuadReserve:
    'Diese vier Ziffern müssen je eine Zelle belegen. Andere Ziffern passen hier nicht mehr hinein.',
  hiddenQuadExclude:
    'Entferne die markierten Kandidaten {digits} aus diesen vier Zellen.',
  hiddenPairObserveTitle: 'Die zwei Zellen betrachten',
  hiddenPairReserveTitle: 'Das versteckte Paar bestätigen',
  hiddenPairExcludeTitle: 'Andere Kandidaten entfernen',
  hiddenPairObserve:
    'Betrachte zuerst die zwei hervorgehobenen Zellen. Beide enthalten die Kandidaten {first} und {second}.',
  hiddenPairReserve:
    'In {region} können {first} und {second} nur in diesen zwei hervorgehobenen Zellen stehen. Beide müssen je eine Zelle belegen, daher passen hier keine anderen Ziffern mehr hinein.',
  hiddenPairExclude:
    'Entferne die markierten Kandidaten {digits} aus diesen zwei Zellen.',
  nakedPairObserveTitle: 'Das Paar erkennen',
  nakedPairReserveTitle: 'Die Belegung verstehen',
  nakedPairExcludeTitle: 'Kandidaten entfernen',
  nakedPairObserve: 'Diese zwei Zellen enthalten nur {first} und {second}.',
  nakedPairReserve:
    'In {region} dürfen sich Ziffern nicht wiederholen. Eine Zelle muss {first}, die andere {second} sein.',
  nakedPairExclude:
    'Entferne die markierten Kandidaten {digits} aus den anderen Zellen in {region}.',
  lockedTripleObserveTitle: 'Das Tripel erkennen',
  lockedTripleLockTitle: 'Gemeinsame Bereiche erkennen',
  lockedTripleExcludeTitle: 'Kandidaten entfernen',
  lockedTripleObserve:
    'Diese drei Zellen können nur {digits} enthalten. Jede Ziffer muss eine Zelle belegen.',
  lockedTripleLock:
    'Diese drei Zellen liegen sowohl in {line} als auch in {box}. Alle drei Ziffern sind damit in beiden Bereichen belegt.',
  lockedTripleExclude:
    'Entferne die markierten Kandidaten {digits} aus den anderen Zellen in {line} und {box}.',
  lockedPairObserveTitle: 'Das Paar finden',
  lockedPairLockTitle: 'Gemeinsame Bereiche erkennen',
  lockedPairExcludeTitle: 'Zielkandidaten entfernen',
  lockedPairObserve:
    'Die zwei hervorgehobenen Zellen enthalten nur {first} und {second}. Sie bilden ein Paar: Eine muss {first}, die andere {second} sein.',
  lockedPairLock:
    'Das Paar liegt sowohl in {line} als auch in {box}. Diese zwei Zellen belegen {first} und {second}, daher können sie in keiner anderen Zelle dieser Bereiche stehen.',
  lockedPairExclude:
    'Entferne die markierten Kandidaten {digits} aus den anderen Zellen in {line} und {box}.',
  singleRegionTitle: 'Zeile, Spalte und Block prüfen',
  singleDirect:
    'In {cells} schließen gesetzte Ziffern in Zeile, Spalte und Block {directRemoved} aus. Nur der Kandidat {remaining} bleibt.',
  singleCurrentCandidates:
    'In {cells} schließen gesetzte Ziffern in Zeile, Spalte und Block {directRemoved} aus. In deinen aktuell angezeigten Kandidaten fehlt außerdem {snapshotRemoved}; nur {remaining} bleibt.',
  singleAppliedHints:
    'In {cells} schließen gesetzte Ziffern in Zeile, Spalte und Block {directRemoved} aus. Der angewendete Hinweis entfernte außerdem {snapshotRemoved}; nur {remaining} bleibt.',
  singleConclusion: 'Hier muss {digits} stehen.',
  singleCheckSummary: 'Ausgeschlossen: {removed}. Übrig: {remaining}.',
  hiddenSingleObserveTitle: '{digit} in {region} finden',
  hiddenSingleObserve:
    'Betrachte nur die {digit}. Wo kann sie in {region} noch stehen?',
  hiddenSingleExcludeTitle: 'Andere Positionen ausschließen',
  hiddenSingleExclude:
    '{blockingRegions} enthalten bereits eine {digit}. An den durchgestrichenen Positionen kann keine {digit} stehen; in {region} bleibt nur {cell}.',
  hiddenSingleCandidateExclude:
    'Mit den angezeigten Kandidaten kann an den durchgestrichenen Positionen keine {digit} stehen. In {region} bleibt nur {cell}.',
  hiddenSingleApplyTitle: '{digit} eintragen',
  hiddenSingleConclusion:
    '{cell} ist die einzige Position für {digit} in {region}.',
  fullHouse:
    'In {regions} ist nur noch {cells} leer. Es fehlt die Ziffer {digits}, also muss {cells} {digits} sein.',
  cell: 'In {cells} sind nur {digits} möglich.',
  positions:
    'In {regions} kann {digits} nur in {cells} stehen. Die Ziffer muss in diesem Bereich einmal vorkommen.',
  locked:
    'Alle Positionen aus {source} liegen in {cover}. Da {source} eine {digits} braucht, liegt sie im Schnitt. Andere Zellen in {cover} können keine {digits} enthalten.',
  lockedConclusion:
    'Die {digits} in {source} muss in {cover} liegen. Daher können die Ziele in {cover} außerhalb von {source} keine {digits} sein: {targets}.',
  naked:
    'Die vollständige Kandidatenmenge der {count} Zellen in {regions} ist {digits}. Diese Zellen brauchen alle {count} verschiedenen Ziffern. Andere Zellen desselben Bereichs können keine davon verwenden.',
  hidden:
    'In {regions} liegen alle Positionen für {digits} in diesen {count} Zellen. Die Ziffern brauchen alle diese Zellen; andere Kandidaten darin können entfallen.',
  fish: 'Jeder der {count} Basisbereiche ({source}) braucht eine {digits}. Alle Positionen liegen in {count} Deckbereichen ({cover}). Keiner darf zwei aufnehmen, also wird jeder einmal belegt. Außerhalb der Basisbereiche entfällt {digits} in den Deckbereichen.',
  xWingPremise:
    'Jeder der zwei Basisbereiche ({source}) hat genau zwei Positionen für {digits}. Die vier eingekreisten Kandidaten liegen in denselben zwei Deckbereichen ({cover}) und bilden ein X-Wing.',
  xWingCase:
    'Fall {branch}: {first} und {second} sind wahr und setzen je eine {digits} in die beiden Deckbereiche. Die anderen zwei Ecken ({crossed}) sind falsch, und die Ziele ({targets}) werden in diesem Fall ausgeschlossen.',
  xWingResult:
    'In jeder vollständigen Paarung belegen die beiden {digits} aus den Basisbereichen ({source}) die zwei Deckbereiche ({cover}), jeweils genau einmal. Entferne daher {targets} außerhalb der Basen.',
  jellyfishPremise:
    'Jeder Sudoku-Bereich muss {digits} genau einmal enthalten. Die vier gewählten Basisbereiche ({source}) brauchen die Ziffer noch und müssen jeweils einen eingekreisten Kandidaten wählen.',
  jellyfishPattern:
    'Alle eingekreisten Kandidaten der vier Basen liegen in denselben vier Deckbereichen ({cover}). In der Legende markieren „Basislinien“ die vier Basisbereiche und „Decklinien“ die vier Deckbereiche. Zusammen bilden sie den Jellyfish.',
  jellyfishTarget:
    'Wähle eine beliebige {digits} in einem Deckbereich außerhalb der vier Basen. Wir prüfen {selected}; jedes andere Ziel lässt sich genauso prüfen.',
  jellyfishAssume:
    'Nehmen wir {selected} an. Damit ist {cover} belegt; die anderen Kandidaten dort werden gestrichen: {crossed}.',
  jellyfishForce:
    'In {base} bleibt für {digits} nur {selected}. Setze ihn und streiche die übrigen Kandidaten in seiner Basis und seinem Deckbereich: {crossed}.',
  jellyfishNoPlace:
    '{base} braucht weiterhin {digits}, aber alle Kandidaten sind gestrichen. Das widerspricht der Sudoku-Regel, dass der Bereich {digits} enthalten muss.',
  jellyfishBranchChoose:
    'Fall {branch}: Setze {selected}. Streiche die anderen {digits}-Kandidaten in seiner Basis und seinem Deckbereich: {crossed}.',
  jellyfishBranchReset:
    'Fall {branch} ist unmöglich. Nimm seine vorläufigen Setzungen zurück, kehre zum Kandidatenstand nach der Zielannahme zurück und prüfe den nächsten Fall.',
  jellyfishBranchesExhausted:
    'Die gezeigten {branchCount} Fälle umfassen jede verbleibende Belegung von {digits} in den Basen. Jeder endet in einem konkreten Bereich ohne Platz für {digits}; daher ist die ursprüngliche Zielannahme unmöglich.',
  jellyfishResult:
    'Die beliebige Wahl {selected} erzeugt einen Widerspruch und kann keine {digits} sein. Für alle Ziele in einem Deckbereich außerhalb der Basen gilt derselbe Beweis; entferne {targets}.',
  sashimiAlternate:
    'Zweiter Fall: Die andere Position ist wahr und schließt die zwei markierten Körperkandidaten aus.',
  fishResult: 'Entferne die markierten {digits} außerhalb des Fischkörpers.',
  swordfishPatternTitle: 'Den Swordfish erkennen',
  swordfishPattern:
    'Die drei Basisbereiche ({source}) brauchen jeweils eine {digits}, und alle verbleibenden Kandidaten dafür liegen in denselben drei Deckbereichen ({cover}). Das bildet einen Swordfish.',
  swordfishReasonTitle: 'Die Belegung der Deckbereiche herleiten',
  swordfishReason:
    'Jeder Basisbereich muss eine {digits} setzen, insgesamt also drei. Ein Deckbereich kann dieselbe Ziffer nicht zweimal enthalten. Da alle Positionen auf diese drei Deckbereiche beschränkt sind, muss jeder genau einmal belegt werden.',
  swordfishResultTitle: 'Die Zielkandidaten entfernen',
  swordfishResult:
    'Damit müssen die {digits} der drei Deckbereiche innerhalb der Basisbereiche liegen. Entferne die markierten Kandidaten außerhalb der Basen: {targets}.',
  fins: 'Die umrandeten Kandidaten sind Flossen, alle in {regions}. {missing}',
  missing:
    'An der fehlenden Ecke {cells} gibt es keinen Kandidaten. Sie zählt nicht als Beleg.',
  finCaseTitle: 'Flosse {index} als wahr annehmen',
  finTrue:
    'Ist diese Flosse {digits}, können die markierten Ziele im selben Block keine {digits} sein.',
  finFalse:
    'Ist keine Flosse {digits}, bildet der Körper einen X-Wing, der dieselben Ziele ausschließt.',
  sashimiPair:
    'In {regions} gibt es nur zwei Plätze für {digits}; einer muss wahr sein.',
  sashimiDirect:
    'Erster Fall: Diese Position ist wahr und schließt die markierten Kandidaten in ihrer Zeile oder Spalte aus.',
  sashimiFin:
    'In {regions} muss eine Flosse {digits} sein. Alle Ziele sehen jede Flosse.',
  sashimiResult:
    'Beide Fälle schließen dieselben Ziele aus. Entferne die markierten Kandidaten.',
  wing: 'Der Drehpunkt ist {cells} mit den vollständigen Kandidaten {digits}. Die Flügel sind {wings}. Wir prüfen jeden möglichen Wert des Drehpunkts.',
  xyWingIntroTitle: 'Drehpunkt und Flügel finden',
  xyWingIntro:
    '{pivot} ist der Drehpunkt mit {pivotDigits}. Er sieht die beiden Flügel {wingA} mit {wingADigits} und {wingB} mit {wingBDigits}.',
  xyWingStructureTitle: 'Das gemeinsame Ziel finden',
  xyWingStructure:
    'Beide Flügel enthalten {targetDigit}. Jedes Ziel ({targets}) sieht beide Flügel und ist damit ein gemeinsames Ziel für {targetDigit}.',
  xyWingCaseTitle: 'Fall {branch}: {pivot} ist {pivotDigit}',
  xyWingCase:
    'Ist {pivot}={pivotDigit}, kann {wing} nicht {pivotDigit} sein und muss {targetDigit} sein.',
  xyWingTargetTitle: 'Fall {branch}: {targetDigit} im Ziel entfernen',
  xyWingTarget:
    'In diesem Fall ist {wing}={targetDigit}. Jedes Ziel ({targets}) sieht {wing} und kann daher nicht {targetDigit} sein.',
  xyWingConclusionTitle: 'Beide Fälle zusammenführen',
  xyWingConclusion:
    'Der Drehpunkt kann nur {pivotDigits} sein. In beiden Fällen ist ein Flügel {targetDigit}; entferne daher {targets}.',
  xyzWingIntroTitle: 'Drehpunkt und Flügel finden',
  xyzWingIntro:
    '{pivot} ist der Drehpunkt mit den drei Kandidaten {pivotDigits}. Er sieht die Flügel {wingA} mit {wingADigits} und {wingB} mit {wingBDigits}. Zusammen bilden sie ein XYZ-Wing.',
  xyzWingTargetTitle: 'Das gemeinsame Ziel aller drei finden',
  xyzWingTarget:
    'Der Drehpunkt und beide Flügel enthalten {targetDigit}. Jedes Ziel ({targets}) sieht alle drei möglichen Positionen von {targetDigit}.',
  xyzWingCaseTitle: 'Fall {branch}: {pivot} ist {pivotDigit}',
  xyzWingCase:
    'Ist {pivot}={pivotDigit}, kann {wing} nicht {pivotDigit} sein und muss {targetDigit} sein.',
  xyzWingPivotCaseTitle: 'Fall 3: Der Drehpunkt ist {targetDigit}',
  xyzWingPivotCase:
    'Ist {pivot}={targetDigit}, liefert der Drehpunkt selbst bereits {targetDigit}. Dies ist sein dritter und letzter möglicher Wert.',
  xyzWingConclusionTitle: 'Alle drei Fälle zusammenführen',
  xyzWingConclusion:
    'Bei jedem möglichen Wert des Drehpunkts ist eine Zelle aus {sources} gleich {targetDigit}. Jedes Ziel sieht alle drei Zellen; entferne daher {targets}.',
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
  wWingWingsTitle: 'Das ist ein W-Wing',
  wWingWings:
    'Dieses Muster ist ein W-Wing. Betrachte zuerst {wingA} und {wingB}: Beide enthalten nur {targetDigit} und {linkDigit} und bilden die zwei Flügel.',
  wWingLinkTitle: 'Das vollständige W-Wing ansehen',
  wWingLink:
    'Jeder Flügel sieht ein Ende der starken {linkDigit}-Verknüpfung. In {region} kann {linkDigit} nur in {linkA} oder {linkB} stehen; eine Position muss {linkDigit} sein. Jedes Ziel ({targets}) sieht beide Flügel.',
  wWingCaseTitle: 'Fall {branch}: {linkCell} ist {linkDigit}',
  wWingCase:
    'Ist {linkCell}={linkDigit}, entfällt {linkDigit} in {wingCell}. Dieser Flügel muss {targetDigit} sein. Da {targets} {wingCell} sieht, kann es nicht {targetDigit} sein.',
  wWingConclusionTitle: 'Beide Fälle zusammenführen',
  wWingConclusion:
    'Die zwei Fälle decken die starke Verknüpfung vollständig ab. Mindestens ein Flügel ist daher {targetDigit}. Jedes Ziel sieht beide Flügel; entferne {targets}.',
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
    'Gruppe {component} ist eine Färbungskomponente: rundes A = {a}; eckiges B = {b}. A und B sind Gegenzustände. Entweder sind alle A wahr und alle B falsch oder umgekehrt. Dies sind Möglichkeiten, keine eingetragenen Antworten.',
  colorConflict:
    '{a} und {b} haben denselben A/B-Zustand und sehen einander. Dieser Zustand kann nicht wahr sein; alle seine Kandidaten sind falsch.',
  colorTrap:
    'Jedes Ziel sieht ein A und ein B dieser Gruppe. Welcher Zustand auch wahr ist, er schließt das Ziel aus.',
  simpleColorStartTitle: 'Die erste starke Verknüpfung finden',
  simpleColorStart:
    'In {region} kann {digit} nur in {first} oder {second} stehen. Beide Kandidaten gehören zur selben Färbungskomponente und werden als rundes A und eckiges B markiert; A und B sind Gegenzustände.',
  simpleColorAlternateTitle: 'Starken Verknüpfungen folgen',
  simpleColorAlternate:
    'Folge jeder verbundenen starken Verknüpfung für {digit}. Innerhalb dieser Komponente verbindet jede starke Verknüpfung rundes A und eckiges B als Gegenzustände.',
  simpleColorNetworkTitle: 'Das Farbnetz vervollständigen',
  simpleColorNetwork:
    'Diese {count} Kandidaten bilden ein zusammenhängendes Netz. Jede durchgezogene Linie ist eine starke Verknüpfung für {digit}.',
  simpleColorNetworkWithStates:
    'Diese {count} Kandidaten bilden ein zusammenhängendes Netz. Jede starke Verknüpfung verbindet A und B: Alle A-Kandidaten teilen einen Zustand, alle B-Kandidaten den Gegenzustand.',
  simpleColorStatesTitle: 'Die zwei Zustände verstehen',
  simpleColorStates:
    'Entweder sind alle A wahr und alle B falsch oder umgekehrt. Welche Möglichkeit gilt, müssen wir nicht vorab wissen.',
  simpleColorTrapTitle: 'Ein Ziel finden, das A und B sieht',
  simpleColorTrap:
    '{targets} sieht A bei {a} und B bei {b}. Welcher Zustand auch wahr ist, einer dieser Kandidaten schließt das Ziel aus.',
  simpleColorTrapConclusionTitle: 'Den gefangenen Kandidaten entfernen',
  simpleColorTrapConclusion:
    'Da jedes Ziel beide möglichen Zustände sieht, entferne {targets}.',
  simpleColorWrapTitle: 'Den Konflikt gleicher Zustände finden',
  simpleColorWrap:
    '{a} und {b} haben beide Zustand {color} und sehen einander. Sie können nicht beide {digit} sein, daher ist Zustand {color} unmöglich.',
  simpleColorWrapInvalidTitle: 'Zustand {color} ist insgesamt unmöglich',
  simpleColorWrapInvalid:
    'Der Konflikt widerlegt den gesamten Zustand {color}. Streiche alle Kandidaten dieses Zustands gemeinsam: {targets}.',
  simpleColorWrapConclusionTitle: 'Den widersprüchlichen Zustand entfernen',
  simpleColorWrapConclusion:
    'Entferne die Kandidaten des als falsch erkannten Zustands {color}: {targets}.',
  multi:
    '{a} und {b} gehören zu verschiedenen Gruppen und widersprechen einander. Ihre Zustände können nicht beide wahr sein. Mindestens einer der Gegenzustände ist wahr. Jedes Ziel sieht beide Möglichkeiten.',
  multiOverviewTitle: 'Das ist Multi Coloring',
  multiOverview:
    'Kandidat {digit} bildet zwei getrennte Färbungskomponenten. In jeder Komponente sind rundes A und eckiges B Gegenzustände. Das Ziel {targets} bleibt sichtbar.',
  multiComponentTitle: 'Komponente {component} betrachten',
  multiComponent:
    'Färbungskomponente {component}: rundes A = {a}; eckiges B = {b}. A und B sind Gegenzustände; jede starke Verknüpfung dieser Komponente verbindet sie.',
  multiConflictTitle: 'Einen Konflikt zwischen Komponenten finden',
  multiConflict:
    '{first} und {second} gehören zu verschiedenen Komponenten, sehen einander aber in {region}. Sie können nicht beide wahr sein.',
  multiOppositeTitle: 'Mindestens ein Gegenzustand ist wahr',
  multiOpposite:
    'Da die Konfliktzustände nicht beide wahr sein können, muss mindestens einer der Gegenzustände {firstOpposite} oder {secondOpposite} wahr sein.',
  multiTargetTitle: 'Das Ziel sieht beide Alternativen',
  multiTarget:
    '{targets} sieht {firstWitness} und {secondWitness}. Welcher Gegenzustand auch wahr ist, er schließt das Ziel aus.',
  multiConclusionTitle: 'Den Zielkandidaten entfernen',
  multiConclusion: 'Entferne {targets}.',
  colorPropagation:
    'Ist {a} wahr, entfällt {b}. Dessen Zustand ist falsch und der Gegenzustand {candidates} derselben Gruppe wird wahr.',
  remote:
    'Jede markierte Zelle hat genau {digits}. Verbundene Zellen, die einander sehen, müssen entgegengesetzte Werte annehmen. Rundes A und eckiges B zeigen die zwei Gegenzustände derselben Färbungskomponente, keine beliebig sortierte Zellkette. Jedes Ziel sieht beide Zustände.',
  remoteOverviewTitle: 'Das ist ein Remote Pair',
  remoteOverview:
    'Die markierten Zellen bilden mit {digits} eine Remote-Pair-Komponente. Rundes A und eckiges B stellen ihre zwei entgegengesetzten Belegungen dar. Das Ziel {targets} bleibt sichtbar.',
  remotePairCellsTitle: 'Gleiche bivalue Zellen bestätigen',
  remotePairCells:
    'Jede Kettenzelle — {cells} — hat genau dieselben zwei Kandidaten: {digits}.',
  remoteAlternateTitle: 'Der alternierenden Kette folgen',
  remoteAlternate:
    'Auf dem gewählten zusammenhängenden Pfad sehen sich verbundene Zellen und müssen {digits} vertauschen. Rundes A und eckiges B wechseln sich daher als Gegenzustände derselben Komponente ab.',
  remoteCaseTitle: 'Fall {case}: A ist {firstDigit}, B ist {secondDigit}',
  remoteCase:
    'A ergibt {firstWitness}, B ergibt {secondWitness}. Das Ziel {targets} sieht in dieser Belegung beide Ziffern.',
  remoteConclusionTitle: 'Das Remote Pair aus dem Ziel entfernen',
  remoteConclusion:
    'In beiden möglichen Belegungen verwendet jede Beweiszelle eine der Paarziffern. Entferne daher {targets}.',
  complexOverviewTitle: 'Das ist komplexes Färben',
  complexOverview:
    'Kandidat {digit} bildet {components} getrennte Färbungskomponenten. In jeder Komponente sind A und B Gegenzustände; Konflikte verbinden Zustände zwischen den Komponenten. Der Zielzustand {targets} bleibt sichtbar.',
  complexAssumeTitle: 'Den Zielzustand als wahr annehmen',
  complexAssume:
    'Nimm vorübergehend an, dass {candidates} wahr ist, und folge den Konflikten zwischen den Komponenten.',
  complexPropagationTitle: 'Folgerung {step}/{total}: Komponente {from} → {to}',
  complexPropagation:
    '{source} ist wahr, daher ist der sichtbare Kandidat {conflict} falsch. Der entgegengesetzte A/B-Zustand {forced} seiner Gruppe ist damit wahr.',
  complexContradictionTitle: 'Die Annahme erzwingt den Gegenzustand',
  complexContradiction:
    'Die Annahme {assumption} erzwingt schließlich {opposite}, den entgegengesetzten A/B-Zustand derselben Gruppe. Beide Zustände können nicht wahr sein; die Annahme ist daher falsch.',
  complexConclusionTitle: 'Den unmöglichen Zustand entfernen',
  complexConclusion:
    'Der Ausgangszustand kann nicht wahr sein. Entferne seine Kandidaten: {targets}.',
  uniqueness:
    'Diese Argumentation setzt genau eine Lösung voraus. Die vier Zellen liegen in zwei Zeilen, zwei Spalten und zwei Blöcken. Ein Tausch der beiden Ziffern erhält jeden Bereich.',
  swap: 'Rechteckbelegung {branch}: {candidates}. Ein Tausch aller vier Einträge ergibt die andere Belegung. Die Werte sind nur hypothetisch.',
  unique:
    'Typ 1: Drei Ecken haben nur {digits}. Nähme die vierte auch eine dieser Ziffern, wäre das Rechteck austauschbar. Sie muss eine andere Ziffer verwenden.',
  uniqueRectangleType4Title: 'Die starke Verknüpfung finden',
  uniqueRectangleType4:
    'Die exakten bivalue Ecken {bivalueCells} enthalten nur {pairDigits}. In {strongRegion} hat {strongDigit} nur die Positionen {strongCandidates}; genau eine Ecke mit Zusatzkandidaten muss daher {strongDigit} enthalten. {otherDigit} kann auch in {otherCandidates} stehen und ist nicht auf die beiden Ecken beschränkt; die Ziffern sind daher nicht symmetrisch.',
  uniqueRectangleType4CaseTitle: 'Fall {case}: {assumption} annehmen',
  uniqueRectangleType4Case:
    'Nimm {assumption} an. Die starke Verknüpfung erzwingt {forcedExtra}={strongDigit}; die beiden anderen Seiten legen die exakten bivalue Ecken als {bivalueValues} fest. Das Rechteck hat nun die Belegung {arrangement}; der Tausch von {pairDigits} ergibt {swappedArrangement} und damit eine zweite Lösung. Die Annahme ist falsch.',
  uniqueRectangleType4ConclusionTitle: 'Die andere Rechteckziffer entfernen',
  uniqueRectangleType4Conclusion:
    '{otherDigit} in einer der beiden Ecken mit Zusatzkandidaten erzeugt dasselbe austauschbare Rechteck; entferne daher {targets}. {strongDigit} bleibt: {strongRegion} benötigt sie in einer der Zellen {extraCells}.',
  hiddenRectangleTitle: 'Den zwei starken Verknüpfungen folgen',
  hiddenRectangle:
    '{anchor} ist eine exakte bivalue Ecke mit nur {pairDigits}. In der diagonalen Ecke {target} bildet {strongDigit} je eine starke Verknüpfung in {targetRow} und {targetColumn}; beide laufen durch {target}.',
  hiddenRectangleCaseTitle: '{assumption} annehmen',
  hiddenRectangleCase:
    'Gilt {assumption}, kann {target} nicht {strongDigit} sein. Die beiden starken Verknüpfungen erzwingen {rowForced} und {columnForced} als {strongDigit}; die exakte bivalue Ecke {anchor} wird {otherDigit}. Zur Belegung {arrangement} entsteht durch Tausch von {pairDigits} die Belegung {swappedArrangement}, also eine zweite Lösung. Die Annahme ist falsch.',
  hiddenRectangleConclusionTitle: 'Den diagonalen Kandidaten entfernen',
  hiddenRectangleConclusion:
    'Entferne {targets}. {otherDigit} in {target} würde das oben gezeigte Rechteck mit zwei Lösungen erzeugen.',
  avoidable:
    'Die drei gezeigten Werte wurden beim Lösen eingetragen und sind keine Vorgaben. Mit {candidates} wäre das Rechteck vollständig austauschbar. Vorgaben dürfen nicht getauscht werden; deshalb ist diese Unterscheidung erforderlich.',
  bug: 'Alle anderen ungelösten Zellen haben genau zwei Kandidaten. Jede fehlende Ziffer kommt in jedem Bereich zweimal vor, außer {candidates}: dreimal in seiner Zeile, Spalte und seinem Block. Eine Streichung ließe den mehrdeutigen BUG-Zustand zurück. Unter der Voraussetzung einer einzigen Lösung muss der Kandidat wahr sein.',
  count: 'In {regions} steht {digits} an {cells}: {count} Positionen.',
  result:
    'Das geprüfte Ergebnis ist {candidates}. Alle vorläufigen Annahmen sind zurückgenommen.',
};
