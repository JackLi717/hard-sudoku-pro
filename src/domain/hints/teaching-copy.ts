/** One current teaching vocabulary shared by game, saved replay and paths. */
export const teachingEnglish = {
  factTrue: '{candidates} is true',
  factFalse: '{candidates} is false',
  snapshot:
    'Use the verified candidates shown here. Earlier valid removals remain in effect.',
  xChainOverviewTitle: 'Read the single-digit alternating chain',
  xChainOverview:
    'For candidate {digit}, the chain runs from {start} to {end} through {links} alternating relations. A solid link is strong: if one end is false, the other is true. A dashed link is weak: both ends cannot be true. Every target {targets} sees both endpoints.',
  xChainIndirectSummaryTitle: 'Case 1: follow the chain to the far endpoint',
  xChainIndirectSummary:
    'Assume {start} is false. Following all {links} verified strong and weak relations forces {end} true. Every target {targets} sees that endpoint and is excluded in this case.',
  xChainDirectTitle: 'Case 2: the first endpoint is true',
  xChainResultTitle: 'Combine the two endpoint cases',
  xyChainSnapshotTitle: 'Establish the bivalue chain',
  xyChainSnapshot:
    'Every chain cell is bivalue: {chainPairs}. Inside each cell, the two candidates have a strong relationship—if one is false, the other is forced true. Between different cells, linked candidates with the same digit are mutually exclusive. The two endpoints {endpoints} share candidate {endpointDigit}.',
  xyChainSummaryTitle: 'Case 1: propagate through all bivalue cells',
  xyChainSummary:
    'Assume the first endpoint {start} is false. Across {cells} bivalue cells, the complete verified chain alternates same-cell forcing and between-cell exclusion until {end} is true. That endpoint excludes {targets}.',
  xyChainDirectTitle: 'Case 2: the first endpoint is true',
  xyChainResultTitle: 'Combine the two endpoint cases',
  aicSnapshotTitle: 'Read the AIC before following it',
  aicSnapshot:
    "This catalog uses HoDoKu's discontinuous-loop conclusion: the chain returns to its starting candidate with the opposite truth value, so the starting state is impossible. It does not claim the open Type 1 or Type 2 forms. Start from {assumption} and test the resulting status of {outcome}. In {regions}, a solid link means at least one of its two ends is true; a dashed link means its ends are mutually exclusive. A same-cell step switches to the other candidate in that cell. Follow these relations by alternating false and true.",
  aicChainSummaryTitle: 'Follow the complete chain to its contradiction',
  aicChainSummary:
    'Starting from “{assumption}”, the verified path uses {transitions} transitions: {strong} strong, {weak} weak, and {cell} same-cell switches. The full path shown on the board reaches a contradiction and therefore forces {result}.',
  forcingChainSnapshotTitle: 'Separate the result from the branch switch',
  forcingChainSnapshot:
    'The common result to prove is {targets}; the branch switch is {candidates}. Any candidate is either true or false, so these two branches cover every possibility. If both reach the common result, that result is forced.',
  forcingChainBivalueSnapshotTitle:
    'Split on the other candidate in the bivalue cell',
  forcingChainBivalueSnapshot:
    'The target candidate {relatedTarget} and the split candidate {candidates} share the bivalue cell {splitCell}, whose only candidates are {splitPair}. Testing {candidates} as true and false therefore covers both values of that cell. The result to prove is {targets}; if both branches reach it, it is forced.',
  forcingChainBranchSummaryTitle: 'Branch {branch}/{total}',
  forcingChainBranchSummary:
    'Start with {assumption}. After {steps} verified propagation steps, this branch reaches {outcome}. The detailed nodes are condensed into the complete chain shown on the board.',
  forcingChainContradictionSnapshotTitle:
    'Test both states of the branch switch',
  forcingChainContradictionSnapshot:
    'The result to prove is {result}; the branch switch is {candidate}. Its true and false states cover every possibility. A valid branch may reach the result directly; if a branch contradicts Sudoku, reject that assumption and keep its opposite state.',
  forcingChainContradictionBranchSummaryTitle:
    'Branch {branch}/{total}: contradiction',
  forcingChainContradictionBranchSummary:
    'Start with {assumption}. After {steps} verified propagation steps, {conflict}. Therefore this branch assumption is impossible. The complete path remains visible on the board.',
  forcingChainContradictionResolutionTitle: 'Reject the contradictory branch',
  forcingChainContradictionResolution:
    'Branch {branch} contradicts Sudoku, which rules out this state: {rejected}. Since {candidate} must be either true or false, {surviving} is forced; its verified branch yields {result}.',
  forcingChainCommonTitle: 'Both branches reach the same result',
  forcingNetOverviewTitle: 'Map the complete forcing net',
  forcingNetOverview:
    '{exhaustive} This is a Forcing Net, not a Forcing Chain, because {classification}. The dependency graph contains {nodes} verified nodes across {branches} root branches. The common result to check is {result}.',
  forcingNetContradictionOverview:
    '{candidate} is either true or false. The graph tests {assumption}; a contradiction rules out that state and forces {result}, so the two possible states are fully covered. This is a Forcing Net, not a Forcing Chain, because {classification}. The explored branch contains {nodes} verified nodes.',
  forcingNetBinaryExhaustive:
    '{candidate} has exactly two states—true or false—so the two root branches are exhaustive.',
  forcingNetAlternativeExhaustive:
    'The root set {roots} contains every possible start in {scope}, so the root branches are exhaustive.',
  forcingNetMultiRootReason:
    'the split has {branches} exhaustive root branches rather than two linear cases',
  forcingNetDependencyReason:
    'the verified dependency graph fans out or merges instead of remaining a single linear implication path',
  forcingNetBranchSummaryTitle: 'Root branch {branch}/{total}',
  forcingNetBranchSummary:
    'Start with {assumption}. Across {nodes} verified nodes, this branch reaches {outcome}. Its detailed dependencies are condensed into the graph shown on the board.',
  forcingNetBranchesSummaryTitle: 'Check every root branch outcome',
  forcingNetBranchesSummary:
    'The exhaustive root branches end as follows: {branches}. Each listed outcome is the final verified node of that branch and directly yields the shared result shown by the net.',
  forcingNetContradictionOutcome: 'the tested branch reaches a contradiction',
  forcingConflictCell:
    '{cell} has no candidate left: {candidates} are all false',
  forcingConflictRegion:
    'Candidate {digit} has no position left in {region}: {candidates} are all false',
  forcingConflictDoubleCell:
    '{cell} would contain both {firstDigit} and {secondDigit}, which a Sudoku cell cannot do',
  forcingConflictDoubleRegion:
    '{first} and {second} would both be {digit} in {region}, which would repeat that digit',
  forcingConflictOpposite: '{candidate} is forced both true and false',
  forcingNetContradictionBranchesSummary:
    'The tested branch gives: {branches}. That assumed state is impossible, so its exhaustive opposite result, “{result}”, is forced.',
  forcingNetCommonTitle: 'Every root branch reaches the common result',
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
  lockedTitle: 'Lock the digit into the intersection',
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
  xWingCaseTitle: 'Case {branch}: occupy both cover regions',
  xWingResult:
    'In either complete pairing, the two {digits} placements from the base regions ({source}) occupy both cover regions ({cover}), one in each. Therefore remove {targets} outside the bases.',
  jellyfishPremiseTitle: 'Start with the four base regions',
  jellyfishPremise:
    'A Sudoku region must contain {digits} exactly once. Each selected base region ({source}) still needs it, so each must eventually choose one of its circled candidates.',
  jellyfishPatternTitle: 'Confine them to four cover regions',
  jellyfishPattern:
    'All circled candidates in the four bases lie in the same four cover regions ({cover}). The “Base lines” legend marks the four base regions, and “Cover lines” marks the four cover regions. Together they form the Jellyfish.',
  jellyfishOccupancyTitle: 'Each cover must be occupied once',
  jellyfishOccupancy:
    'The four bases must place four {digits} in total. A cover cannot contain the digit twice, and all four placements are confined to these four covers. Therefore the placements occupy every cover exactly once.',
  jellyfishOccupancyResultTitle: 'Remove candidates outside the bases',
  jellyfishOccupancyResult:
    'Every cover already receives its {digits} from one of the four base regions. Therefore candidates in those covers but outside the bases cannot be {digits}; remove {targets}.',
  jellyfishDeepTitle: 'Deeper proof for the selected target',
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
  finnedPatternTitle: 'Build the complete fish body',
  finnedPattern:
    'For {digits}, the two base lines ({source}) and two cover lines ({cover}) define the four body candidates {body}. The extra candidates {fins} are fins in {finBox}. The targets {targets} lie in a cover line outside the base lines.',
  finsTitle: 'Separate the fins from the body',
  fins: 'The outlined candidates {fins} are the fins in {finBox}; the other four candidates {body} are the X-Wing body. Now check both possibilities: a fin is true, or every fin is false.',
  missing: 'The missing corner {cells} has no candidate; it is not a premise.',
  finCaseTitle: 'Assume fin {index} is true',
  finTrue:
    'If the fin {fin} is true, every marked target {targets} sees it in {finBox}, so those targets cannot be {digits}.',
  finFalse:
    'If every fin {fins} is false, the four body candidates {body} form an ordinary X-Wing across the two base lines ({source}) and two cover lines ({cover}). The targets {targets} lie in a cover outside the bases, so the X-Wing excludes them.',
  finFalseTitle: 'Case: every fin is false',
  finnedResultTitle: 'Apply both target conditions',
  finnedResult:
    'A valid target must satisfy both conditions: it lies in an X-Wing cover outside the two bases, and it sees every fin. The targets {targets} satisfy both, so remove candidate {digits}.',
  sashimiPatternTitle: 'Recognize the degenerate X-Wing',
  sashimiPattern:
    'The two base lines ({source}) and two cover lines ({cover}) show the whole degenerate fish. For {digits}, {direct} and {alternate} are the two ends of the strong pair in {pairRegion}. Across the other base {finBase}, {corner} is the remaining body corner; {missing} is the missing corner and has no candidate {digits}. Thus the body is {body}, while {fins} are fins in {finBox}. The targets {targets} lie on {directCover} and see every fin.',
  sashimiDirectTitle: 'Case 1: the end beside the missing corner is true',
  sashimiDirect:
    'If the strong-pair end {direct} is true, the other end {alternate} is false. Because {direct} and the targets {targets} share {directCover}, every target is false in this case.',
  sashimiFinTitle: 'Case 2: the end beside the body corner is true',
  sashimiFin:
    'If the other strong-pair end {alternate} is true, {direct} is false, and the aligned body corner {corner} is false through {alternateCover}. The base {finBase} must then place {digits} in at least one fin among {fins}. Every target {targets} sees every fin, so every target is false in this case too.',
  sashimiResultTitle: 'The two cases cover every possibility',
  sashimiResult:
    'The strong pair in {pairRegion} has exactly the two ends {direct} and {alternate}, so one of the two cases must occur. The first end directly excludes {targets}; the second forces at least one fin, which also excludes {targets}. These cases exhaust all placements, so remove the targets.',
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
  resetTitle: 'Withdraw the previous rectangle filling',
  conflict:
    'This assumption leaves no possible value or position in {regions}: {candidates}. A Sudoku cell and each missing digit in a region must have an option. The assumption is impossible.',
  opposite: 'Assuming {assumption} creates a contradiction, so {result}.',
  aicContradictionResult:
    'The deduction contradicts “{assumption}”, so {result}.',
  aicAssumptionTitle: 'Assumption: start the alternating chain',
  aicWeakTitle: 'Weak relation: linked candidates conflict',
  aicStrongTitle: 'Strong relation: the other endpoint is forced',
  aicCellStrongTitle: 'Same cell: force the other candidate',
  aicCellStrong:
    '{from} is false. In the same cell {regions}, the other candidate {candidates} is forced true under the current assumption.',
  aicForcedTitle: 'Forced step under the current assumption',
  aicContradictionTitle: 'The chain reaches a contradiction',
  aicConclusionTitle: 'AIC summary',
  aicConclusion:
    'The alternating chain started from “{assumption}” and followed the labeled strong and weak relations, including same-cell switches where needed, to a contradiction. Therefore {result}. All temporary states are withdrawn.',
  common:
    'Every possible branch reaches the same fact: {candidates}. After withdrawing all assumptions, this fact remains certain.',
  endpoints:
    'If the first side is false, the last side is true. Thus at least one endpoint side contains the digit. Every target sees every candidate in both endpoint groups, so remove the targets.',
  xChainIndirect:
    '{from} is false, so {candidates} is forced in {regions}. Every target sees {candidates}, so cross out {targets}.',
  xChainDirect:
    'Case 2: set {selected}. Every target sees it, so cross out {targets}.',
  xChainResult:
    'The two endpoint cases exhaust all possibilities and both cross out {targets}. Withdraw the temporary states, then remove these candidates.',
  xyChainStart:
    'Case 1: {selectedCell} is the bivalue cell {selectedPair}. With its other candidate false, {selected} is forced true under the current assumption. Across cells, it is mutually exclusive with {crossed}, so cross out those conflicts.',
  xyChainHop:
    '{selectedCell} is the next bivalue cell {selectedPair}. With its other candidate false, {selected} is forced true under the current assumption. Across cells, it is mutually exclusive with {crossed}, so cross out those conflicts.',
  xyChainEnd:
    'At the endpoint bivalue cell {selectedCell} ({selectedPair}), {from} is false, so {selected} is forced true under the current assumption. This endpoint excludes the targets {targets}.',
  xyChainDirect:
    'Case 2: assume the first endpoint {selected} is true in its bivalue cell {selectedCell} ({selectedPair}). Within the cell it excludes the other candidate; between cells it excludes the visible conflicting candidates {crossed}.',
  xyChainResult:
    'The two endpoint cases exhaust all possibilities and both cross out {targets}. Withdraw the temporary states, then remove them.',
  groupedAicGroupsTitle: 'Name the OR candidate groups',
  groupedAicGroupName: 'OR candidate group {name}',
  groupedAicGroupLegend: 'OR group {name}: at least one candidate is true',
  groupedAicGroups:
    'The numbered braces and legend define these named groups: {groups}. Each group is one OR state: at least one candidate in it is true, but the chain does not claim that every member is true.',
  groupedAicStructureTitle: 'Build the group links and OR states',
  groupedAicStructure:
    'For candidate {digit}, each named region has exactly the two displayed sides, giving these group strong links: {strongLinks}. The named OR states are {groups}. An OR group means at least one member is true, not that every member is true.',
  groupedAicChainSummaryTitle: 'Case 1: follow the complete grouped chain',
  groupedAicChainSummary:
    'Assume {start} is false. Across all {links} verified transitions ({strong} group strong links and {weak} group weak links), the chain forces endpoint {end} true. That endpoint excludes {targets}.',
  groupedAicStartTitle: 'Group strong link: force the other side',
  groupedAicStart:
    'Case 1: {from} is false, so the group strong link forces {selected}. If this is an OR group, at least one of its candidates is true.',
  groupedAicWeakTitle: 'Group weak link: exclude the conflicting side',
  groupedAicWeak:
    '{selected} is true as a chain state, so the mutually exclusive side {crossed} is false.',
  groupedAicStrongTitle: 'Group strong link: one side must remain',
  groupedAicStrong:
    '{from} is false, so the group strong link forces {selected}.',
  groupedAicEndTitle: 'The indirect endpoint excludes the targets',
  groupedAicEnd:
    '{selected} is true as the endpoint state, so it excludes the targets.',
  groupedAicDirectTitle: 'Case 2: the first endpoint is true',
  groupedAicDirect:
    'Case 2: the first endpoint {selected} is true as an OR state, so it excludes the targets.',
  groupedAicDirectSingle:
    'Case 2: the first endpoint {selected} is true, so it excludes the targets.',
  groupedAicResultTitle: 'Both endpoint cases agree',
  groupedAicResult:
    'The two endpoint cases exhaust the alternatives, and both exclude {targets}. Remove them after withdrawing the temporary states.',
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
    'This walkthrough covers HoDoKu Multi Colors Type 1: two colored components contain a cross-component conflict. Candidate {digit} forms those two separate coloring components. Within each component, round A and square B are opposite states. Keep the target {targets} in view.',
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
  complexOverviewTitle: 'Confirm the starting same-state group',
  complexOverview:
    '“Complex Coloring” is this app’s name for a multi-component coloring contradiction, not a separate same-named HoDoKu technique. Candidate {digit} forms {components} separate coloring components. Alternating along the strong links puts {startMembers} together on side {startState} of component {startComponent}, so these members share one truth state. They are exactly the target candidates {targets}. Within each component, A and B are opposite states; conflicts link states across components.',
  complexAssumeTitle: 'Assume the target state is true',
  complexAssume:
    'Treat the whole same-state group {candidates} as one state and temporarily assume it is true. Follow the conflicts between components.',
  complexPropagationTitle:
    'Propagation {step}/{total}: component {from} to {to}',
  complexPropagationSummaryTitle: 'Follow every component transition',
  complexPropagationSummary: '{steps}',
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
  swapTitle: 'Rectangle filling {branch}',
  unique:
    'Type 1: three corners have only {digits}. If the fourth also took one of these digits, the rectangle could be swapped. The fourth must use another digit.',
  uniqueRectangleTitle: 'Unique Rectangle Type 1',
  uniqueRectangleConclusionTitle: 'Type 1: remove both rectangle digits',
  uniqueRectangleConclusion:
    'The other three corners are exact bivalue cells containing only {digits}. If the fourth corner {roof} took either rectangle digit, the four corners would have two swappable fillings. Remove {targets}; {roof} must use one of its extra candidates.',
  uniqueRectangleType4Title: 'Find the strong link',
  uniqueRectangleType4BivalueLegend: 'Exact bivalue corners ({pairDigits})',
  uniqueRectangleType4ExtraLegend: 'Extra-candidate corners',
  uniqueRectangleType4:
    'The legend identifies the exact bivalue corners and the extra-candidate corners. We will call {strongDigit} the link digit and {otherDigit} the other rectangle digit. In {strongRegion}, the link digit has only the two extra-candidate corners as positions, so exactly one of them contains it. The other rectangle digit has additional positions in the region, so the two digits are not symmetric.',
  uniqueRectangleType4CaseTitle: 'Case {case}: assume {assumption}',
  uniqueRectangleType4Case:
    'Assume the other rectangle digit at {assumption}. The strong link forces the other extra-candidate corner {forcedExtra} to the link digit {strongDigit}. The values shown then make the rectangle swappable; exchanging {pairDigits} gives a second solution. Therefore the assumption is false.',
  uniqueRectangleType4ConclusionTitle: 'Remove the other rectangle digit',
  uniqueRectangleType4Conclusion:
    'The other rectangle digit at either extra-candidate corner creates the same swappable rectangle, so remove {targets}. Keep the link digit {strongDigit}: its strong link in {strongRegion} must remain.',
  hiddenRectangleTitle: 'Follow the two strong links',
  hiddenRectangle:
    '{anchor} is an exact bivalue corner containing only {pairDigits}. The target {target} is its diagonal corner because it lies in the rectangle’s other row and other column. Candidate {strongDigit} forms a row strong link through {target} in {targetRow} and a column strong link through it in {targetColumn}.',
  hiddenRectangleCaseTitle: 'Assume {assumption}',
  hiddenRectangleCase:
    'If {assumption}, {target} cannot contain {strongDigit}. The row strong link forces {rowForced} to {strongDigit}, and the column strong link forces {columnForced} to {strongDigit}; the exact bivalue corner {anchor} becomes {otherDigit}. Exchanging {pairDigits} in the resulting rectangle gives a second solution, so the assumption is false.',
  hiddenRectangleConclusionTitle: 'Remove the diagonal candidate',
  hiddenRectangleConclusion:
    'Remove {targets}. Candidate {otherDigit} at {target} would create the two-solution rectangle shown above.',
  avoidable:
    'The values {enteredValues} were entered by the player during solving; none is a given clue. The remaining corner is {target}. Only player-entered values may participate in this swap.',
  avoidableTitle: 'Identify the three player-entered values',
  avoidablePairTitle: 'Compare the two rectangle fillings',
  avoidablePair:
    'Completing the corner with {target} gives {arrangement}. Swapping the rectangle digits gives {swappedArrangement}. Both fillings preserve every row, column, and box, so allowing the completion would create two solutions.',
  avoidableConclusionTitle: 'Do not complete the swappable rectangle',
  avoidableConclusion:
    'Placing {target} would complete a swappable rectangle with the three player-entered values. Remove {targets}; the player entries themselves remain unchanged.',
  bugTitle: 'Recognize the BUG + 1 state',
  bug: 'Every other unsolved cell has exactly two candidates. {target} alone has three ({targetCandidates}), so {extraCandidate} is the one extra candidate beyond a BUG pattern. First verify its counts in the row, column, and box.',
  bugConclusionTitle: 'The one extra candidate must be true',
  bugConclusion:
    'The counts show {extraCandidate} is the only extra occurrence. Removing it would leave every unsolved cell bivalue and every missing digit occurring twice in each region—the ambiguous BUG state. Because this puzzle has one solution, {extraCandidate} must be true.',
  count: 'In {regions}, {digits} occurs at {cells}: {count} positions.',
  countTitle: 'Count {digits} in {regions}',
  result:
    'The verified result is {candidates}. All temporary assumptions have been withdrawn.',
} as const;
export type TeachingCopy = { [K in keyof typeof teachingEnglish]: string };

export const teachingChinese: TeachingCopy = {
  factTrue: '{candidates} 成立',
  factFalse: '{candidates} 不成立',
  snapshot: '以下推理基于当前盘面显示的候选；此前已删除的候选保持不变。',
  xChainOverviewTitle: '先读懂单数字强弱交替链',
  xChainOverview:
    '对候选 {digit}，链从 {start} 延伸到 {end}，共有 {links} 段交替关系。实线是强关系：一端不成立时另一端必须成立；虚线是弱关系：两端不能同时成立。目标 {targets} 都能看见两个端点。',
  xChainIndirectSummaryTitle: '情况一：沿完整链推到另一端',
  xChainIndirectSummary:
    '假设 {start} 不成立。沿全部 {links} 段已验证的强、弱关系传播后，{end} 被迫成立。目标 {targets} 都能看见这个端点，因此本情况会排除目标。',
  xChainDirectTitle: '情况二：第一个端点成立',
  xChainResultTitle: '合并两个端点情况',
  xyChainSnapshotTitle: '先建立双值链',
  xyChainSnapshot:
    '链上的每一格都是双值格：{chainPairs}。在同一格内，两个候选形成强关系：一个不成立时，另一个在当前假设下被迫成立；在不同格之间，相连的同名候选互相可见，形成不能同时成立的互斥关系。链的两端 {endpoints} 都是候选 {endpointDigit}。',
  xyChainSummaryTitle: '情况一：沿全部双值格传播',
  xyChainSummary:
    '假设首端 {start} 不成立。完整的已验证链经过 {cells} 个双值格，在格内强制与格间互斥之间交替传播，最终迫使 {end} 成立；这个端点排除 {targets}。',
  xyChainDirectTitle: '情况二：首端直接成立',
  xyChainResultTitle: '合并两个端点情况',
  aicSnapshotTitle: '先读懂 AIC 交替链',
  aicSnapshot:
    '本目录使用 HoDoKu 的不连续闭环结论：链回到起始候选并得到相反真假状态，因此起始状态不可能成立；这不表示已覆盖开放式 Type 1 或 Type 2。再从“{assumption}”出发，检查它最终如何影响 {outcome}。先看高亮的{regions}：实线表示链的两端至少一端成立，虚线表示两端互斥；如果链在同一格内换候选，则转到同格另一候选。沿这些关系交替读“不成立、成立”。',
  aicChainSummaryTitle: '沿完整交替链走到矛盾',
  aicChainSummary:
    '从“{assumption}”出发，已验证路径共有 {transitions} 次转换：{strong} 次强关系、{weak} 次弱关系、{cell} 次同格切换。棋盘展示的完整路径最终产生矛盾，因此推出“{result}”。',
  forcingChainSnapshotTitle: '区分共同结果与分支开关',
  forcingChainSnapshot:
    '要证明的共同结果是 {targets}，用于分叉的开关是 {candidates}。任一候选只有成立和不成立两种状态，所以这两个分支覆盖全部可能；若两边都得到共同结果，该结果就必然成立。',
  forcingChainBivalueSnapshotTitle: '用双值格的另一候选分叉',
  forcingChainBivalueSnapshot:
    '目标候选 {relatedTarget} 与分叉候选 {candidates} 同在双值格 {splitCell}，该格只有 {splitPair}。因此分别检查 {candidates} 成立和不成立，就穷尽了这格的两种取值。要证明的共同结果是 {targets}；若两个分支都得到它，该结果就必然成立。',
  forcingChainBranchSummaryTitle: '分支 {branch}/{total}',
  forcingChainBranchSummary:
    '从“{assumption}”出发，经过 {steps} 个已验证的传播节点，本分支得到“{outcome}”。详细节点已折叠为棋盘上的完整链路。',
  forcingChainContradictionSnapshotTitle: '分别检查分支开关的真假',
  forcingChainContradictionSnapshot:
    '要证明的结果是“{result}”，分支开关是 {candidate}。它只有成立与不成立两种状态，已经穷尽全部可能。有效分支可以直接得到结果；若某分支违反数独规则，就排除该假设并保留相反状态。',
  forcingChainContradictionBranchSummaryTitle:
    '分支 {branch}/{total}：产生矛盾',
  forcingChainContradictionBranchSummary:
    '从“{assumption}”出发，经过 {steps} 个已验证的传播节点后，{conflict}。因此这个分支假设不可能成立。棋盘上保留完整传播路径。',
  forcingChainContradictionResolutionTitle: '排除产生矛盾的分支',
  forcingChainContradictionResolution:
    '分支 {branch} 违反数独规则，因此排除这个状态：“{rejected}”。{candidate} 必须成立或不成立，因此“{surviving}”被迫成立；它的已验证分支得到“{result}”。',
  forcingChainCommonTitle: '两个分支得到同一结果',
  forcingNetOverviewTitle: '先看完整分叉网',
  forcingNetOverview:
    '{exhaustive} 这是 Forcing Net，而不是 Forcing Chain，因为{classification}。依赖图共有 {branches} 个根分支、{nodes} 个已验证节点；要检查的共同结果是“{result}”。',
  forcingNetContradictionOverview:
    '{candidate} 只有成立与不成立两种状态。依赖图检查“{assumption}”；若它导致矛盾，就排除该状态并强制“{result}”，因此两种可能已完整覆盖。这是 Forcing Net，而不是 Forcing Chain，因为{classification}。本验证分支共有 {nodes} 个已验证节点。',
  forcingNetBinaryExhaustive:
    '{candidate} 只有成立与不成立两种状态，因此两个根分支已经穷尽全部可能。',
  forcingNetAlternativeExhaustive:
    '根状态全集 {roots} 恰好覆盖{scope}中的全部可行起点，因此这些根分支已经穷尽全部可能。',
  forcingNetMultiRootReason:
    '起点分成 {branches} 个穷尽根分支，而不是两条线性情况',
  forcingNetDependencyReason:
    '已验证的依赖图发生扇出或汇合，不再是一条线性蕴含路径',
  forcingNetBranchSummaryTitle: '根分支 {branch}/{total}',
  forcingNetBranchSummary:
    '从“{assumption}”出发，本分支通过 {nodes} 个已验证节点得到“{outcome}”；详细依赖已折叠为棋盘上的分叉图。',
  forcingNetBranchesSummaryTitle: '核对全部根分支的结果',
  forcingNetBranchesSummary:
    '穷尽根分支分别得到：{branches}。这里列出的每个结果都是对应分支最后一个已验证节点，并且直接得到网络所示的共同结论。',
  forcingNetContradictionOutcome: '受检分支产生矛盾',
  forcingConflictCell:
    '{cell} 的所有候选都被排除：{candidates} 全部不成立，该格无数可填',
  forcingConflictRegion:
    '候选 {digit} 在{region}中没有剩余位置：{candidates} 全部不成立',
  forcingConflictDoubleCell:
    '{cell} 会同时填入 {firstDigit} 和 {secondDigit}，违反一格只填一个数的规则',
  forcingConflictDoubleRegion:
    '{first} 和 {second} 会在{region}中同时填 {digit}，造成数字重复',
  forcingConflictOpposite: '{candidate} 被同时推导为成立和不成立',
  forcingNetContradictionBranchesSummary:
    '验证分支得到：{branches}。因此该假设状态不可能成立，穷尽的相反结果“{result}”被迫成立。',
  forcingNetCommonTitle: '所有根分支得到同一结果',
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
  lockedTitle: '把数字锁定在交叉区域',
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
  xWingCaseTitle: '情况 {branch}：占满两条覆盖区域',
  xWingResult:
    '无论采用哪种完整配对，两个基础区域（{source}）中的两个 {digits} 都会分别占满两条覆盖区域（{cover}），每条恰好一个。因此删除基础区域外的 {targets}。',
  jellyfishPremiseTitle: '先看四个基础区域',
  jellyfishPremise:
    '数独的每个区域都必须恰好出现一次 {digits}。选出的四个基础区域（{source}）目前都还缺 {digits}，所以每个区域最终都必须从圈出的候选中选一个。',
  jellyfishPatternTitle: '候选只落在四个覆盖区域',
  jellyfishPattern:
    '四个基础区域中圈出的全部候选，都只位于同样四个覆盖区域（{cover}）内。图例中的“基线”标出四个基础区域，“覆盖线”标出四个覆盖区域。两者共同构成 Jellyfish。',
  jellyfishOccupancyTitle: '四个覆盖区域各被占用一次',
  jellyfishOccupancy:
    '四个基础区域一共必须放入四个 {digits}。同一覆盖区域不能出现两个 {digits}，而全部四个落点又只限于这四个覆盖区域，因此每个覆盖区域都恰好被占用一次。',
  jellyfishOccupancyResultTitle: '删除基础区域外的候选',
  jellyfishOccupancyResult:
    '每个覆盖区域中的 {digits} 都必定由四个基础区域之一提供。因此，位于这些覆盖区域内、基础区域外的候选不能是 {digits}；删除 {targets}。',
  jellyfishDeepTitle: '深入理解所选目标的反证',
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
  finnedPatternTitle: '先建立完整鱼身',
  finnedPattern:
    '对候选 {digits}，两条基线（{source}）与两条覆盖线（{cover}）确定四个鱼身候选：{body}。额外候选 {fins} 是位于{finBox}的鳍。目标 {targets} 位于覆盖线上、两条基线之外。',
  finsTitle: '区分鱼身与全部鳍',
  fins: '描边的 {fins} 是{finBox}中的全部鳍；其余四个候选 {body} 构成 X-Wing 鱼身。下面分别检查“某个鳍成立”和“所有鳍都不成立”。',
  missing: '缺角 {cells} 没有该候选，不把它当作证据。',
  finCaseTitle: '假设鳍 {index} 成立',
  finTrue:
    '如果鳍 {fin} 成立，目标 {targets} 都能在{finBox}中看见它，因此这些目标不能是 {digits}。',
  finFalse:
    '如果全部鳍 {fins} 都不成立，四个鱼身候选 {body} 就在两条基线（{source}）和两条覆盖线（{cover}）上形成普通 X-Wing。目标 {targets} 位于覆盖线上、基线之外，因此被这个 X-Wing 排除。',
  finFalseTitle: '情况：所有鳍都不成立',
  finnedResultTitle: '同时检查目标的两个条件',
  finnedResult:
    '可删除的目标必须同时满足两个条件：位于普通 X-Wing 的覆盖线上且在两条基线之外，并且能看见全部鳍。目标 {targets} 同时满足这两个条件，所以删除候选 {digits}。',
  sashimiPatternTitle: '识别退化的 X-Wing 整体',
  sashimiPattern:
    '两条基线（{source}）和两条覆盖线（{cover}）标出完整的退化鱼形。对候选 {digits}，{direct} 与 {alternate} 是{pairRegion}强对的两个端点。在另一条基线{finBase}中，{corner} 是保留的鱼身角；缺角 {missing} 没有候选 {digits}。因此鱼身是 {body}，{fins} 是{finBox}中的鳍。目标 {targets} 位于{directCover}，并且能看见全部鳍。',
  sashimiDirectTitle: '情况一：缺角一侧的强对端点成立',
  sashimiDirect:
    '若强对端点 {direct} 成立，另一个端点 {alternate} 就不成立。{direct} 与目标 {targets} 同在{directCover}，所以本情形下所有目标都被排除。',
  sashimiFinTitle: '情况二：鱼身角一侧的强对端点成立',
  sashimiFin:
    '若另一个强对端点 {alternate} 成立，{direct} 不成立，并通过{alternateCover}排除与它对齐的鱼身角 {corner}。于是基础区域{finBase}只能在鳍 {fins} 中放置 {digits}；至少一个鳍成立。目标 {targets} 看见所有鳍，所以本情形下也全部被排除。',
  sashimiResultTitle: '两种情况覆盖全部可能',
  sashimiResult:
    '{pairRegion}中的强对只有 {direct} 与 {alternate} 两个端点，因此必然落入上述一种情况。前一端点直接排除 {targets}；后一端点迫使至少一个鳍成立，同样排除 {targets}。两种情况穷尽全部放法，所以删除这些目标候选。',
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
  resetTitle: '撤回上一种矩形填法',
  conflict:
    '这个假设让{regions}没有可用的数字或落点：{candidates}。每格、每个区域中缺少的数字都必须有选项，因此假设不可能成立。',
  opposite: '假设{assumption}会产生矛盾，所以{result}。',
  aicContradictionResult: '推导结果与“{assumption}”矛盾，所以{result}。',
  aicAssumptionTitle: '假设：开始交替链',
  aicWeakTitle: '弱关系：相连候选互斥',
  aicStrongTitle: '强关系：另一端被迫成立',
  aicCellStrongTitle: '同格切换：另一候选被迫成立',
  aicCellStrong:
    '{from} 不成立。在同一格 {regions} 内，同格另一候选 {candidates} 在当前假设下被迫成立。',
  aicForcedTitle: '当前假设下的被迫步骤',
  aicContradictionTitle: '交替链产生矛盾',
  aicConclusionTitle: 'AIC 首尾摘要',
  aicConclusion:
    '交替链从“{assumption}”出发，沿页面标出的强关系和弱关系推进，需要时切换到同格另一候选，最终产生矛盾。因此{result}。全部临时状态均已撤回。',
  common:
    '所有可能分支都得到同一事实：{candidates}。撤回全部假设后，这一事实仍然必然成立。',
  endpoints:
    '如果首端不成立，末端就必须成立，所以两端至少有一端包含该数字。每个目标都能看见两端组内的全部候选，因此可以直接排除。',
  xChainIndirect:
    '{from} 不成立，所以{regions}只剩 {candidates}。所有目标都能看见 {candidates}，因此划掉 {targets}。',
  xChainDirect:
    '第二种：选定 {selected}。所有目标都能看见它，因此直接划掉 {targets}。',
  xChainResult:
    '两个端点情况穷尽全部可能，并且都会划掉 {targets}。撤回临时状态后，可以删除这些候选。',
  xyChainStart:
    '第一种：{selectedCell} 是双值格（{selectedPair}）。其中另一个候选不成立，所以 {selected} 在当前假设下被迫成立；它与不同格中的 {crossed} 互斥，因此划掉这些冲突候选。',
  xyChainHop:
    '下一个节点 {selectedCell} 仍是双值格（{selectedPair}）。其中另一个候选不成立，所以 {selected} 在当前假设下被迫成立；它与不同格中的 {crossed} 互斥，因此划掉这些冲突候选。',
  xyChainEnd:
    '末端 {selectedCell} 是双值格（{selectedPair}）。{from} 不成立，所以 {selected} 在当前假设下被迫成立，并排除目标 {targets}。',
  xyChainDirect:
    '第二种：假设首端 {selected} 在双值格 {selectedCell}（{selectedPair}）中成立。它在格内排除另一个候选，并在格间排除互相可见的冲突候选 {crossed}。',
  xyChainResult:
    '两个端点情况穷尽全部可能，并且都会划掉 {targets}。撤回临时状态后，可以删除。',
  groupedAicGroupsTitle: '先给 OR 候选组命名',
  groupedAicGroupName: 'OR 候选组 {name}',
  groupedAicGroupLegend: 'OR 候选组 {name}：至少一个候选成立',
  groupedAicGroups:
    '棋盘上的编号大括号和图例定义了这些候选组：{groups}。每个组代表一个 OR 状态：组内至少一个候选成立，但并不是说所有成员同时成立。',
  groupedAicStructureTitle: '建立组强链与 OR 候选组',
  groupedAicStructure:
    '对候选 {digit}，每个点名区域都只剩棋盘所示的两侧，因此形成这些组强链：{strongLinks}。其中的具名 OR 状态为 {groups}。OR 候选组表示组内至少一个候选成立，并不表示全部成员同时成立。',
  groupedAicChainSummaryTitle: '情况一：沿完整分组链传播',
  groupedAicChainSummary:
    '假设 {start} 不成立。沿全部 {links} 段已验证关系传播（{strong} 段组强链、{weak} 段组弱链）后，端点 {end} 被迫成立，并排除目标 {targets}。',
  groupedAicStartTitle: '组强链：迫使另一侧成立',
  groupedAicStart:
    '第一种：{from} 不成立，组强链便迫使 {selected} 成立。若它是 OR 候选组，含义是组内至少一个候选成立。',
  groupedAicWeakTitle: '组弱链：排除互斥的一侧',
  groupedAicWeak:
    '{selected} 作为链状态成立，因此与它互斥的 {crossed} 不成立。',
  groupedAicStrongTitle: '组强链：两侧至少保留一侧',
  groupedAicStrong: '{from} 不成立，组强链便迫使 {selected} 成立。',
  groupedAicEndTitle: '间接端点排除目标',
  groupedAicEnd: '{selected} 作为端点状态成立，因此排除目标候选。',
  groupedAicDirectTitle: '第二种：首端直接成立',
  groupedAicDirect:
    '第二种：首端 {selected} 作为 OR 状态成立，因此排除目标候选。',
  groupedAicDirectSingle: '第二种：首端 {selected} 成立，因此排除目标候选。',
  groupedAicResultTitle: '两个端点情况得到相同结论',
  groupedAicResult:
    '两个端点情况穷尽全部可能，并且都会排除 {targets}。撤回临时状态后，可以删除这些候选。',
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
    '本讲解只覆盖 HoDoKu Multi Colors Type 1：两个染色分量之间存在跨分量冲突。候选 {digit} 形成这两个互不连接的染色分量。每个分量内的圆形 A 与方形 B 代表相反状态。先保持目标 {targets} 清晰可见。',
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
    '每个标记格的候选都恰好是 {digits}。相连且互相可见的格必须取相反值。圆形 A 和方形 B 记录同一染色分量内的两种相反状态，并不是任意排列的格链。每个目标都能看见这两种状态。',
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
  complexOverviewTitle: '确认起始同状态组',
  complexOverview:
    '“复杂染色”是本产品对这类多分量染色反证的自定义分类，并非 HoDoKu 的同名独立技巧。候选 {digit} 形成 {components} 个独立染色分量。沿强链交替染色后，{startMembers} 同属分量 {startComponent} 的 {startState} 侧，因此必须同真同假；这些成员恰好就是目标候选 {targets}。每个分量内的 A 与 B 代表相反状态，分量之间再由冲突连成推理链。',
  complexAssumeTitle: '假设目标状态成立',
  complexAssume:
    '把整组同状态候选 {candidates} 视为一个状态，暂时假设它成立，然后沿分量之间的冲突继续传播。',
  complexPropagationTitle: '传播 {step}/{total}：分量 {from} → 分量 {to}',
  complexPropagationSummaryTitle: '沿全部染色分量传播',
  complexPropagationSummary: '{steps}',
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
  swapTitle: '矩形填法 {branch}',
  unique:
    'Type 1：三个角只有 {digits}。如果第四角也选其中之一，整个矩形就可以交换，因此第四角必须使用其他数字。',
  uniqueRectangleTitle: '唯一矩形 Type 1',
  uniqueRectangleConclusionTitle: 'Type 1：删除两个矩形数字',
  uniqueRectangleConclusion:
    '另外三个角都是只含 {digits} 的严格双值格。如果第四角 {roof} 取任一矩形数字，四个角就会形成两种可交换填法。因此删除 {targets}；{roof} 必须使用额外候选。',
  uniqueRectangleType4Title: '找到强链',
  uniqueRectangleType4BivalueLegend: '严格双值角（{pairDigits}）',
  uniqueRectangleType4ExtraLegend: '含额外候选的角',
  uniqueRectangleType4:
    '图例分别标出严格双值角和含额外候选的角。下文固定称 {strongDigit} 为“连接数字”，{otherDigit} 为“另一个矩形数字”。在{strongRegion}中，连接数字只剩两个含额外候选的角，因此其中有且只有一格取连接数字；另一个矩形数字在该区域还有其他落点，所以两个数字并不对称。',
  uniqueRectangleType4CaseTitle: '情况 {case}：假设 {assumption}',
  uniqueRectangleType4Case:
    '假设另一个矩形数字出现在 {assumption}。强链便迫使另一含额外候选角 {forcedExtra} 取连接数字 {strongDigit}。图中四角随即形成可交换填法；交换 {pairDigits} 后会得到第二个解，因此该假设不成立。',
  uniqueRectangleType4ConclusionTitle: '删除另一个矩形数字',
  uniqueRectangleType4Conclusion:
    '另一个矩形数字只要出现在任一含额外候选角，都会形成上述可交换矩形，因此删除 {targets}。保留连接数字 {strongDigit}：它在{strongRegion}中的强链必须保留。',
  hiddenRectangleTitle: '沿两条强链推理',
  hiddenRectangle:
    '{anchor} 是只含 {pairDigits} 的严格双值角。目标 {target} 与它分处矩形的另一行和另一列，因此是它的对角格。候选 {strongDigit} 在{targetRow}形成经过 {target} 的行强链，在{targetColumn}形成经过 {target} 的列强链。',
  hiddenRectangleCaseTitle: '假设 {assumption}',
  hiddenRectangleCase:
    '若 {assumption}，{target} 就不能取 {strongDigit}。行强链迫使 {rowForced} 取 {strongDigit}，列强链迫使 {columnForced} 取 {strongDigit}，严格双值角 {anchor} 则只能取 {otherDigit}。此时交换矩形中的 {pairDigits} 会得到第二个解，因此该假设不成立。',
  hiddenRectangleConclusionTitle: '删除对角格候选',
  hiddenRectangleConclusion:
    '删除 {targets}。如果 {target} 取 {otherDigit}，就会形成上面展示的双解矩形。',
  avoidable:
    '{enteredValues} 是玩家在解题过程中填入的数字，都不是题目给定；尚未确定的角是 {target}。只有玩家填入的值才能参与这种交换。',
  avoidableTitle: '确认三个玩家填入值',
  avoidablePairTitle: '对照两种矩形填法',
  avoidablePair:
    '用 {target} 补齐后，第一种填法是 {arrangement}；交换矩形中的两个数字，又得到 {swappedArrangement}。两种填法都不破坏任何行、列、宫，因此补成该候选会产生两个解。',
  avoidableConclusionTitle: '不能补成可交换矩形',
  avoidableConclusion:
    '填入 {target} 会与三个玩家填入值组成可交换矩形，因此删除 {targets}；三个玩家填入值本身保持不变。',
  bugTitle: '识别 BUG + 1 状态',
  bug: '其余未填格都恰好只有两个候选，只有 {target} 有三个候选（{targetCandidates}），所以 {extraCandidate} 是 BUG 状态之外唯一多出的候选。先分别核对它在行、列、宫中的次数。',
  bugConclusionTitle: '唯一额外候选必须成立',
  bugConclusion:
    '三次计数表明 {extraCandidate} 是唯一多出的落点。若删除它，所有未填格都会变成双值格，每个区域的每个缺失数字也都恰好出现两次，留下可产生双解的 BUG 状态。题目只有一个解，因此 {extraCandidate} 必须成立。',
  count: '在{regions}中，{digits} 的落点是 {cells}，共 {count} 处。',
  countTitle: '核对{regions}中的数字{digits}',
  result: '已验证的结论是 {candidates}。所有临时假设均已撤回。',
};
export const teachingJapanese: TeachingCopy = {
  factTrue: '{candidates} は真',
  factFalse: '{candidates} は偽',
  snapshot:
    '表示されている検証済み候補を使います。以前の正しい候補削除も有効です。',
  xChainOverviewTitle: '単一数字の強弱交替チェーンを読む',
  xChainOverview:
    '候補 {digit} のチェーンは {start} から {end} まで {links} 個の交替関係で続きます。実線は強い関係で、一方が偽なら他方が真です。破線は弱い関係で、両端は同時に真になれません。対象 {targets} は両端を見ています。',
  xChainIndirectSummaryTitle: 'ケース1：チェーンをたどって反対端へ',
  xChainIndirectSummary:
    '{start} が偽と仮定します。検証済みの {links} 個の強弱関係をすべてたどると {end} が真に強制されます。対象 {targets} はこの端点を見ているため除外されます。',
  xChainDirectTitle: 'ケース2：最初の端点が真',
  xChainResultTitle: '2つの端点ケースをまとめる',
  xyChainSnapshotTitle: '二値セルの連鎖を確認する',
  xyChainSnapshot:
    '連鎖の各セルは二値です：{chainPairs}。同じセル内の2候補は強い関係にあり、一方が偽なら他方が現在の仮定のもとで真に強制されます。異なるセル間でつながる同じ数字の候補は互いに排他的です。両端 {endpoints} は同じ候補 {endpointDigit} を持ちます。',
  xyChainSummaryTitle: 'ケース1：すべての二値セルを伝播する',
  xyChainSummary:
    '最初の端点 {start} が偽と仮定します。完全な検証済みチェーンは {cells} 個の二値セルを通り、セル内の強制とセル間の排他を交互に伝えて {end} を真にします。この端点が {targets} を除外します。',
  xyChainDirectTitle: 'ケース2：始点が真',
  xyChainResultTitle: '2つの端点ケースをまとめる',
  aicSnapshotTitle: 'AIC を先に読み取る',
  aicSnapshot:
    'このカタログは HoDoKu の不連続ループの結論を扱います。チェーンが開始候補へ逆の真偽値で戻るため、開始状態は不可能です。開いた Type 1 や Type 2 まで対応するとはしません。「{assumption}」から始め、{outcome} への影響を調べます。{regions} の実線は両端の少なくとも一方が真、破線は両端が互いに排他的であることを示します。同じセル内の手順では同セルのもう一方の候補へ切り替えます。偽と真を交互にたどります。',
  aicChainSummaryTitle: '完全なチェーンを矛盾までたどる',
  aicChainSummary:
    '「{assumption}」から始まる検証済み経路は {transitions} 回切り替わります。内訳は強い関係 {strong} 回、弱い関係 {weak} 回、同セル切替 {cell} 回です。盤上の完全な経路が矛盾に達するため、「{result}」が強制されます。',
  forcingChainSnapshotTitle: '共通結果と分岐スイッチを区別する',
  forcingChainSnapshot:
    '証明する共通結果は {targets}、分岐のスイッチは {candidates} です。候補は真か偽のどちらかなので、この2分岐ですべての可能性を網羅します。両方が同じ結果に達すれば、その結果は必然です。',
  forcingChainBivalueSnapshotTitle: '二値セルのもう一方の候補で分岐する',
  forcingChainBivalueSnapshot:
    '対象候補 {relatedTarget} と分岐候補 {candidates} は、候補が {splitPair} だけの二値セル {splitCell} にあります。したがって {candidates} が真の場合と偽の場合を調べれば、このセルの2つの値をすべて網羅できます。証明する共通結果は {targets} です。2分岐がどちらもその結果に達すれば、必然です。',
  forcingChainBranchSummaryTitle: '分岐 {branch}/{total}',
  forcingChainBranchSummary:
    '「{assumption}」から始め、{steps} 個の検証済み伝播ノードを経て、この分岐は「{outcome}」に達します。詳細ノードは盤上の完全なチェーンにまとめて表示します。',
  forcingChainContradictionSnapshotTitle: '分岐スイッチの両状態を調べる',
  forcingChainContradictionSnapshot:
    '証明する結果は「{result}」、分岐スイッチは {candidate} です。真と偽の2状態ですべての可能性を網羅します。有効な分岐は結果に直接達します。矛盾する分岐はその仮定を棄却し、反対の状態を残します。',
  forcingChainContradictionBranchSummaryTitle: '分岐 {branch}/{total}：矛盾',
  forcingChainContradictionBranchSummary:
    '「{assumption}」から始め、{steps} 個の検証済み伝播ノードの後、{conflict}。したがってこの分岐の仮定は不可能です。完全な経路は盤上に残します。',
  forcingChainContradictionResolutionTitle: '矛盾する分岐を棄却する',
  forcingChainContradictionResolution:
    '分岐 {branch} は数独に矛盾するため、この状態を棄却します：「{rejected}」。{candidate} は真か偽のどちらかなので、「{surviving}」が強制され、その検証済み分岐から「{result}」が得られます。',
  forcingChainCommonTitle: '2つの分岐が同じ結果に達する',
  forcingNetOverviewTitle: '強制ネット全体を確認する',
  forcingNetOverview:
    '{exhaustive} {classification}ため、これは Forcing Chain ではなく Forcing Net です。依存グラフには {branches} 個の根分岐と {nodes} 個の検証済みノードがあります。確認する共通結果は「{result}」です。',
  forcingNetContradictionOverview:
    '{candidate} は真か偽かの2状態です。グラフで「{assumption}」を調べ、矛盾が起きればその状態を排除して「{result}」を強制するため、2つの可能性は完全に覆われます。{classification}ため、これは Forcing Chain ではなく Forcing Net です。検証した分岐には {nodes} 個の検証済みノードがあります。',
  forcingNetBinaryExhaustive:
    '{candidate} は真か偽かの2状態しかないため、2つの根分岐ですべての可能性を網羅します。',
  forcingNetAlternativeExhaustive:
    '根集合 {roots} は {scope} の可能な開始点をすべて含むため、これらの根分岐で全可能性を網羅します。',
  forcingNetMultiRootReason:
    '分岐が2つの線形ケースではなく {branches} 個の網羅的な根分岐を持つ',
  forcingNetDependencyReason:
    '検証済みの依存グラフが単一の線形な含意経路ではなく、分岐または合流する',
  forcingNetBranchSummaryTitle: '根分岐 {branch}/{total}',
  forcingNetBranchSummary:
    '「{assumption}」から始め、{nodes} 個の検証済みノードを通じてこの分岐は「{outcome}」に達します。詳細な依存関係は盤上のグラフにまとめて表示します。',
  forcingNetBranchesSummaryTitle: 'すべての根分岐の結果を確認する',
  forcingNetBranchesSummary:
    '網羅的な根分岐の終点は次のとおりです：{branches}。各結果はその分岐の最後の検証済みノードであり、ネットが示す共通結果を直接導きます。',
  forcingNetContradictionOutcome: '検証した分岐が矛盾に達する',
  forcingConflictCell: '{cell} に候補が残りません：{candidates} がすべて偽です',
  forcingConflictRegion:
    '候補 {digit} を {region} に置ける場所が残りません：{candidates} がすべて偽です',
  forcingConflictDoubleCell:
    '{cell} が {firstDigit} と {secondDigit} の両方になり、1マスに1数字という数独のルールに反します',
  forcingConflictDoubleRegion:
    '{first} と {second} が {region} 内でともに {digit} になり、同じ数字が重複します',
  forcingConflictOpposite: '{candidate} が同時に真と偽に強制されます',
  forcingNetContradictionBranchesSummary:
    '検証した分岐の結果：{branches}。この仮定状態は不可能なので、網羅的な反対結果「{result}」が強制されます。',
  forcingNetCommonTitle: 'すべての根分岐が同じ結果に達する',
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
  lockedTitle: '数字を交差領域に固定する',
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
  xWingCaseTitle: 'ケース {branch}：両方の被覆領域を使う',
  xWingResult:
    'どちらの完全な組合せでも、2つの基底領域（{source}）の {digits} が2つの被覆領域（{cover}）を1つずつ占めます。したがって、基底の外にある {targets} を削除します。',
  jellyfishPremiseTitle: '4つの基底領域から始める',
  jellyfishPremise:
    '数独の各領域には {digits} がちょうど1つ必要です。選んだ4つの基底領域（{source}）にはまだ {digits} がないため、それぞれ丸印の候補から1つを選ぶ必要があります。',
  jellyfishPatternTitle: '4つの被覆領域に限定する',
  jellyfishPattern:
    '4つの基底領域にある丸印の候補は、同じ4つの被覆領域（{cover}）だけにあります。凡例の「ベース線」が4つの基底領域、「カバー線」が4つの被覆領域を示します。合わせて Jellyfish になります。',
  jellyfishOccupancyTitle: '各被覆領域が1回ずつ使われる',
  jellyfishOccupancy:
    '4つの基底領域は合計4つの {digits} を置く必要があります。同じ被覆領域に2つは置けず、4つの配置先はこの4被覆だけです。したがって各被覆領域がちょうど1回ずつ使われます。',
  jellyfishOccupancyResultTitle: '基底外の候補を削除する',
  jellyfishOccupancyResult:
    '各被覆領域の {digits} は4つの基底領域のいずれかから置かれます。したがって、被覆内で基底外にある候補は {digits} ではありません。{targets} を削除します。',
  jellyfishDeepTitle: '選択した対象をさらに詳しく証明する',
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
  finnedPatternTitle: '完全なフィッシュ本体を確認する',
  finnedPattern:
    '{digits} について、2本の基底線（{source}）と2本の被覆線（{cover}）が4つの本体候補 {body} を定めます。余分な候補 {fins} は {finBox} 内のフィンです。対象 {targets} は被覆線上かつ基底線の外側にあります。',
  finsTitle: '本体とすべてのフィンを分ける',
  fins: '枠で示した {fins} が {finBox} 内のフィンで、残る4候補 {body} が X-Wing の本体です。フィンの1つが真の場合と、すべてのフィンが偽の場合を調べます。',
  missing:
    '欠けた角 {cells} には候補がありません。証拠の候補としては扱いません。',
  finCaseTitle: 'フィン {index} が真と仮定',
  finTrue:
    'フィン {fin} が真なら、対象 {targets} はすべて {finBox} 内でそのフィンを見るため、{digits} にはなれません。',
  finFalse:
    'すべてのフィン {fins} が偽なら、4つの本体候補 {body} は2本の基底線（{source}）と2本の被覆線（{cover}）上で通常の X-Wing を作ります。対象 {targets} は被覆線上かつ基底線の外側なので除外されます。',
  finFalseTitle: 'ケース：すべてのフィンが偽',
  finnedResultTitle: '対象の2条件を同時に確認する',
  finnedResult:
    '削除できる対象は、X-Wing の被覆線上かつ2本の基底線の外側にあり、さらにすべてのフィンを見る必要があります。対象 {targets} は両方を満たすため、候補 {digits} を削除します。',
  sashimiPatternTitle: '退化した X-Wing 全体を確認する',
  sashimiPattern:
    '2本の基底線（{source}）と2本の被覆線（{cover}）が退化したフィッシュ全体を示します。{digits} では、{direct} と {alternate} が {pairRegion} の強リンクの両端です。もう一方の基底 {finBase} では {corner} が残る本体角で、欠けた角 {missing} には候補 {digits} がありません。したがって本体は {body}、{fins} は {finBox} のフィンです。対象 {targets} は {directCover} 上にあり、すべてのフィンを見ます。',
  sashimiDirectTitle: '場合1：欠けた角側の強リンク端が真',
  sashimiDirect:
    '強リンク端 {direct} が真なら、もう一方の端 {alternate} は偽です。{direct} と対象 {targets} は {directCover} を共有するため、この場合は全対象が偽になります。',
  sashimiFinTitle: '場合2：本体角側の強リンク端が真',
  sashimiFin:
    'もう一方の強リンク端 {alternate} が真なら、{direct} は偽になり、{alternateCover} で整列する本体角 {corner} も偽になります。すると基底 {finBase} はフィン {fins} の少なくとも1つに {digits} を置く必要があります。対象 {targets} は全フィンを見るため、この場合もすべて偽です。',
  sashimiResultTitle: '2つの場合ですべての可能性を覆う',
  sashimiResult:
    '{pairRegion} の強リンク端は {direct} と {alternate} の2つだけなので、必ずどちらかの場合になります。前者は {targets} を直接除外し、後者は少なくとも1つのフィンを真にして同じ対象を除外します。全配置を尽くしたため、対象候補を削除します。',
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
  resetTitle: '前の長方形配置を取り消す',
  conflict:
    'この仮定では {regions} の選択肢 {candidates} がすべてなくなります。マスと領域の不足数字には必ず選択肢が必要なので、この仮定は不可能です。',
  opposite: '{assumption} と仮定すると矛盾するため、{result} です。',
  aicContradictionResult:
    '推論結果は「{assumption}」と矛盾するため、{result} です。',
  aicAssumptionTitle: '仮定：交替連鎖を始める',
  aicWeakTitle: '弱い関係：接続候補は排他的',
  aicStrongTitle: '強い関係：もう一方の端が強制される',
  aicCellStrongTitle: '同じセル：もう一方の候補を強制する',
  aicCellStrong:
    '{from} は偽です。同じセル {regions} では、同セルのもう一方の候補 {candidates} が現在の仮定のもとで真に強制されます。',
  aicForcedTitle: '現在の仮定で強制される手順',
  aicContradictionTitle: '連鎖が矛盾に到達する',
  aicConclusionTitle: 'AIC の始点と結論',
  aicConclusion:
    '交替連鎖は「{assumption}」から始まり、表示された強い関係と弱い関係をたどり、必要な場合は同セルのもう一方の候補へ切り替えて、矛盾に達しました。したがって {result}。仮の状態はすべて取り消します。',
  common:
    '全分岐で同じ事実 {candidates} に達しました。すべての仮定を取り消しても、この事実は確実です。',
  endpoints:
    '始点側が偽なら終点側が真です。少なくとも一方の端点グループに数字が入ります。各対象は両端グループの全候補を見ているため、対象を除外できます。',
  xChainIndirect:
    '{from} が偽なので、{regions} では {candidates} が確定します。すべての対象は {candidates} を見ているため、{targets} を消します。',
  xChainDirect:
    'ケース2：{selected} を選びます。すべての対象はこれを見ているため、{targets} を直接消します。',
  xChainResult:
    '2つの端点ケースですべての可能性を尽くし、どちらも {targets} を消します。仮の状態を取り消して、これらの候補を削除します。',
  xyChainStart:
    'ケース1：{selectedCell} は二値セル（{selectedPair}）です。もう一方が偽なので、{selected} は現在の仮定のもとで真に強制されます。異なるセルの {crossed} とは排他的なので、それらを消します。',
  xyChainHop:
    '次の節点 {selectedCell} も二値セル（{selectedPair}）です。もう一方が偽なので、{selected} は現在の仮定のもとで真に強制されます。異なるセルの {crossed} とは排他的なので、それらを消します。',
  xyChainEnd:
    '終点 {selectedCell} は二値セル（{selectedPair}）です。{from} が偽なので、{selected} は現在の仮定のもとで真に強制され、対象 {targets} を除外します。',
  xyChainDirect:
    'ケース2：始点 {selected} が二値セル {selectedCell}（{selectedPair}）で真と仮定します。セル内ではもう一方を、セル間では見えている競合候補 {crossed} を除外します。',
  xyChainResult:
    '2つの端点ケースですべての可能性を尽くし、どちらも {targets} を消します。仮の状態を取り消して削除します。',
  groupedAicGroupsTitle: 'OR 候補グループに名前を付ける',
  groupedAicGroupName: 'OR 候補グループ {name}',
  groupedAicGroupLegend: 'OR グループ {name}：少なくとも1つの候補が真',
  groupedAicGroups:
    '盤面の番号付き波括弧と凡例が、次の候補グループを定義します：{groups}。各グループは1つの OR 状態で、内部の少なくとも1候補が真ですが、全候補が同時に真という意味ではありません。',
  groupedAicStructureTitle: 'グループ強リンクと OR 状態を組み立てる',
  groupedAicStructure:
    '候補 {digit} について、各領域には表示された2つの側だけが残るため、次のグループ強リンクになります：{strongLinks}。名前付き OR 状態は {groups} です。OR グループは少なくとも1候補が真という意味で、全候補が同時に真という意味ではありません。',
  groupedAicChainSummaryTitle: 'ケース1：完全なグループチェーンをたどる',
  groupedAicChainSummary:
    '{start} が偽と仮定します。検証済みの全 {links} 遷移（グループ強リンク {strong} 本、グループ弱リンク {weak} 本）をたどると、終点 {end} が真に強制され、対象 {targets} を除外します。',
  groupedAicStartTitle: 'グループ強リンク：反対側を強制する',
  groupedAicStart:
    'ケース1：{from} が偽なので、グループ強リンクが {selected} を強制します。OR 候補グループなら、内部の少なくとも1候補が真という意味です。',
  groupedAicWeakTitle: 'グループ弱リンク：競合する側を除外する',
  groupedAicWeak:
    '{selected} が連鎖状態として真なので、排他的な側 {crossed} は偽です。',
  groupedAicStrongTitle: 'グループ強リンク：一方は必ず残る',
  groupedAicStrong:
    '{from} が偽なので、グループ強リンクが {selected} を強制します。',
  groupedAicEndTitle: '間接端点が対象を除外する',
  groupedAicEnd: '{selected} が端点状態として真なので、対象候補を除外します。',
  groupedAicDirectTitle: 'ケース2：始点が真',
  groupedAicDirect:
    'ケース2：始点 {selected} が OR 状態として真なので、対象候補を除外します。',
  groupedAicDirectSingle:
    'ケース2：始点 {selected} が真なので、対象候補を除外します。',
  groupedAicResultTitle: '両方の端点ケースが同じ結論になる',
  groupedAicResult:
    '2つの端点ケースですべての可能性を尽くし、どちらも {targets} を除外します。仮の状態を取り消して、これらの候補を削除します。',
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
    'この説明は HoDoKu Multi Colors Type 1 のみを扱います。2つのカラーリング成分の間に競合があります。候補 {digit} はその2つの独立した成分を作ります。各成分の丸い A と四角い B は反対状態です。対象 {targets} を見える状態にします。',
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
  complexOverviewTitle: '開始時の同一状態グループを確認する',
  complexOverview:
    '「Complex Coloring」は複数成分のカラーリング矛盾に対する本製品独自の分類名であり、HoDoKu に同名の独立手筋はありません。候補 {digit} は {components} 個の独立したカラーリング成分を作ります。強いリンクに沿って交互に色分けすると、{startMembers} は成分 {startComponent} の {startState} 側にまとまり、同じ真偽状態を共有します。これらは対象候補 {targets} と完全に一致します。各成分の A と B は反対状態で、成分間の競合が推論チェーンをつなぎます。',
  complexAssumeTitle: '対象の状態を真と仮定する',
  complexAssume:
    '同一状態のグループ全体 {candidates} を1つの状態として一時的に真と仮定し、成分間の競合をたどります。',
  complexPropagationTitle: '伝播 {step}/{total}：成分 {from} → {to}',
  complexPropagationSummaryTitle: 'すべての成分遷移をたどる',
  complexPropagationSummary: '{steps}',
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
  swapTitle: '長方形の配置 {branch}',
  unique:
    'Type 1：3つの角の候補は {digits} だけです。4つ目も同じ数字を取ると交換可能になるため、4つ目には別の数字が必要です。',
  uniqueRectangleTitle: 'ユニークレクタングル Type 1',
  uniqueRectangleConclusionTitle: 'Type 1：長方形の2候補を削除する',
  uniqueRectangleConclusion:
    '他の3角は {digits} だけを持つ厳密な二値セルです。4つ目の角 {roof} がどちらかの長方形数字を取ると、4角に交換可能な2つの配置ができます。{targets} を削除し、{roof} には追加候補を使います。',
  uniqueRectangleType4Title: '強リンクを見つける',
  uniqueRectangleType4BivalueLegend: '厳密な二値角（{pairDigits}）',
  uniqueRectangleType4ExtraLegend: '追加候補を持つ角',
  uniqueRectangleType4:
    '凡例は厳密な二値角と追加候補を持つ角を区別します。以下では {strongDigit} を「リンク数字」、{otherDigit} を「もう一方の長方形数字」と呼びます。{strongRegion} でリンク数字を置けるのは追加候補を持つ2角だけなので、その一方だけがリンク数字になります。もう一方の長方形数字には領域内の別の候補位置もあり、2数字は対称ではありません。',
  uniqueRectangleType4CaseTitle: '場合 {case}：{assumption} と仮定',
  uniqueRectangleType4Case:
    '{assumption} にもう一方の長方形数字が入ると仮定します。強リンクにより、もう一方の追加候補角 {forcedExtra} はリンク数字 {strongDigit} になります。表示された4角は交換可能となり、{pairDigits} を交換すると第2解が生じます。したがって仮定は偽です。',
  uniqueRectangleType4ConclusionTitle: 'もう一方の長方形候補を削除する',
  uniqueRectangleType4Conclusion:
    'もう一方の長方形数字を追加候補角のどちらに置いても交換可能な長方形になるため、{targets} を削除します。リンク数字 {strongDigit} は残します。{strongRegion} の強リンクに必要です。',
  hiddenRectangleTitle: '2本の強リンクをたどる',
  hiddenRectangle:
    '{anchor} は {pairDigits} だけを持つ厳密な二値角です。対象 {target} は長方形の別の行かつ別の列にあるため、その対角です。候補 {strongDigit} は {targetRow} で {target} を通る行の強リンクを、{targetColumn} で {target} を通る列の強リンクを作ります。',
  hiddenRectangleCaseTitle: '{assumption} と仮定',
  hiddenRectangleCase:
    '{assumption} なら {target} は {strongDigit} を取れません。行の強リンクが {rowForced} を、列の強リンクが {columnForced} を {strongDigit} にし、厳密な二値角 {anchor} は {otherDigit} になります。長方形の {pairDigits} を交換すると第2解が生じるため、仮定は偽です。',
  hiddenRectangleConclusionTitle: '対角の候補を削除する',
  hiddenRectangleConclusion:
    '{targets} を削除します。{target} の {otherDigit} は、上で示した2解の長方形を作ります。',
  avoidable:
    '{enteredValues} はプレイヤーが解答中に入力した値で、与えられた数字ではありません。未確定の角は {target} です。この交換に使えるのはプレイヤー入力だけです。',
  avoidableTitle: '3つのプレイヤー入力を確認する',
  avoidablePairTitle: '2つの長方形配置を比較する',
  avoidablePair:
    '{target} で角を完成すると {arrangement} になります。長方形の2数字を交換すると {swappedArrangement} になります。どちらも各行・列・ボックスを保つため、この完成を許すと2解が生じます。',
  avoidableConclusionTitle: '交換可能な長方形を完成させない',
  avoidableConclusion:
    '{target} を置くと3つのプレイヤー入力と交換可能な長方形を作ります。{targets} を削除し、プレイヤー入力はそのまま残します。',
  bugTitle: 'BUG + 1 状態を見つける',
  bug: '他の未確定マスはすべて2候補ですが、{target} だけは3候補（{targetCandidates}）です。したがって {extraCandidate} が BUG 状態に1つだけ加わった候補です。まず行・列・ボックスでの出現数を確認します。',
  bugConclusionTitle: '唯一の余分な候補は真になる',
  bugConclusion:
    '3つの数え上げから、{extraCandidate} だけが余分な位置だと分かります。これを削除すると、全未確定マスが2候補になり、各領域の不足数字も2回ずつ現れる曖昧な BUG 状態が残ります。一意解なので {extraCandidate} は真です。',
  count: '{regions} の {digits} の位置は {cells}、計 {count} か所です。',
  countTitle: '{regions} の {digits} を数える',
  result:
    '検証済みの結論は {candidates} です。一時的な仮定はすべて取り消しました。',
};
export const teachingGerman: TeachingCopy = {
  factTrue: '{candidates} ist wahr',
  factFalse: '{candidates} ist falsch',
  snapshot:
    'Wir verwenden die gezeigten, geprüften Kandidaten. Frühere gültige Streichungen bleiben bestehen.',
  xChainOverviewTitle: 'Die einstellige alternierende Kette lesen',
  xChainOverview:
    'Für den Kandidaten {digit} verläuft die Kette von {start} bis {end} über {links} alternierende Beziehungen. Eine durchgezogene Verbindung ist stark: Ist ein Ende falsch, ist das andere wahr. Eine gestrichelte ist schwach: Beide Enden können nicht zugleich wahr sein. Jedes Ziel {targets} sieht beide Endpunkte.',
  xChainIndirectSummaryTitle: 'Fall 1: Der Kette bis zum anderen Ende folgen',
  xChainIndirectSummary:
    '{start} sei falsch. Über alle {links} geprüften starken und schwachen Beziehungen wird {end} wahr. Jedes Ziel {targets} sieht diesen Endpunkt und wird in diesem Fall ausgeschlossen.',
  xChainDirectTitle: 'Fall 2: Der erste Endpunkt ist wahr',
  xChainResultTitle: 'Beide Endpunktfälle zusammenführen',
  xyChainSnapshotTitle: 'Die Kette aus bivalue Zellen aufbauen',
  xyChainSnapshot:
    'Jede Zelle der Kette ist bivalue: {chainPairs}. Innerhalb einer Zelle bilden die zwei Kandidaten eine starke Beziehung: Ist einer falsch, wird der andere unter der aktuellen Annahme erzwungen. Zwischen verschiedenen Zellen schließen sich verbundene Kandidaten derselben Ziffer gegenseitig aus. Die Endpunkte {endpoints} tragen beide den Kandidaten {endpointDigit}.',
  xyChainSummaryTitle: 'Fall 1: Durch alle bivalue Zellen propagieren',
  xyChainSummary:
    'Der erste Endpunkt {start} sei falsch. Die vollständige geprüfte Kette läuft durch {cells} bivalue Zellen und wechselt zwischen Erzwingung innerhalb einer Zelle und Ausschluss zwischen Zellen, bis {end} wahr ist. Dieser Endpunkt schließt {targets} aus.',
  xyChainDirectTitle: 'Fall 2: Der Startpunkt ist wahr',
  xyChainResultTitle: 'Beide Endpunktfälle zusammenführen',
  aicSnapshotTitle: 'Die AIC vor dem Verfolgen lesen',
  aicSnapshot:
    'Dieser Katalog verwendet den HoDoKu-Schluss einer diskontinuierlichen Schleife: Die Kette kehrt mit dem entgegengesetzten Wahrheitswert zum Startkandidaten zurück, daher ist der Startzustand unmöglich. Offene Formen vom Typ 1 oder Typ 2 werden damit nicht beansprucht. Beginne mit „{assumption}“ und prüfe die Auswirkung auf {outcome}. In {regions} bedeutet eine durchgezogene Verbindung, dass mindestens ein Ende wahr ist; eine gestrichelte Verbindung macht die Enden gegenseitig ausschließend. Ein Schritt innerhalb derselben Zelle wechselt zum anderen Kandidaten dieser Zelle. Folge diesen Beziehungen abwechselnd als falsch und wahr.',
  aicChainSummaryTitle: 'Der vollständigen Kette bis zum Widerspruch folgen',
  aicChainSummary:
    'Ausgehend von „{assumption}“ verwendet der geprüfte Pfad {transitions} Übergänge: {strong} starke, {weak} schwache und {cell} Wechsel innerhalb derselben Zelle. Der vollständige Pfad auf dem Brett erreicht einen Widerspruch und erzwingt daher „{result}“.',
  forcingChainSnapshotTitle:
    'Gemeinsames Ergebnis und Verzweigungsschalter unterscheiden',
  forcingChainSnapshot:
    'Das zu beweisende gemeinsame Ergebnis ist {targets}; der Verzweigungsschalter ist {candidates}. Jeder Kandidat ist entweder wahr oder falsch, daher decken diese beiden Zweige alle Möglichkeiten ab. Erreichen beide das gemeinsame Ergebnis, ist es erzwungen.',
  forcingChainBivalueSnapshotTitle:
    'Am anderen Kandidaten der bivalue Zelle verzweigen',
  forcingChainBivalueSnapshot:
    'Der Zielkandidat {relatedTarget} und der Verzweigungskandidat {candidates} liegen in derselben bivalue Zelle {splitCell}, deren einzige Kandidaten {splitPair} sind. Die Fälle „{candidates} wahr“ und „{candidates} falsch“ decken daher beide Werte dieser Zelle ab. Zu beweisen ist das gemeinsame Ergebnis {targets}; erreichen beide Zweige dieses Ergebnis, ist es erzwungen.',
  forcingChainBranchSummaryTitle: 'Zweig {branch}/{total}',
  forcingChainBranchSummary:
    'Ausgehend von „{assumption}“ erreicht dieser Zweig nach {steps} geprüften Folgerungsknoten „{outcome}“. Die Detailknoten sind in der vollständigen Kette auf dem Brett zusammengefasst.',
  forcingChainContradictionSnapshotTitle:
    'Beide Zustände des Verzweigungsschalters prüfen',
  forcingChainContradictionSnapshot:
    'Zu beweisen ist „{result}“; der Verzweigungsschalter ist {candidate}. Seine Zustände wahr und falsch decken alle Möglichkeiten ab. Ein gültiger Zweig kann das Ergebnis direkt erreichen; widerspricht ein Zweig den Sudoku-Regeln, wird diese Annahme verworfen und ihr Gegenstatus bleibt bestehen.',
  forcingChainContradictionBranchSummaryTitle:
    'Zweig {branch}/{total}: Widerspruch',
  forcingChainContradictionBranchSummary:
    'Ausgehend von „{assumption}“ gilt nach {steps} geprüften Folgerungsknoten: {conflict}. Daher ist die Annahme dieses Zweigs unmöglich. Der vollständige Pfad bleibt auf dem Brett sichtbar.',
  forcingChainContradictionResolutionTitle:
    'Den widersprüchlichen Zweig verwerfen',
  forcingChainContradictionResolution:
    'Zweig {branch} widerspricht den Sudoku-Regeln; damit ist dieser Zustand ausgeschlossen: „{rejected}“. Da {candidate} entweder wahr oder falsch sein muss, wird „{surviving}“ erzwungen; dessen geprüfter Zweig ergibt „{result}“.',
  forcingChainCommonTitle: 'Beide Zweige erreichen dasselbe Ergebnis',
  forcingNetOverviewTitle: 'Das vollständige Forcing Net abbilden',
  forcingNetOverview:
    '{exhaustive} Dies ist ein Forcing Net und keine Forcing Chain, weil {classification}. Der Abhängigkeitsgraph enthält {nodes} geprüfte Knoten in {branches} Wurzelzweigen. Das zu prüfende gemeinsame Ergebnis ist „{result}“.',
  forcingNetContradictionOverview:
    '{candidate} ist entweder wahr oder falsch. Der Graph prüft „{assumption}“; ein Widerspruch schließt diesen Zustand aus und erzwingt „{result}“, sodass beide möglichen Zustände vollständig abgedeckt sind. Dies ist ein Forcing Net und keine Forcing Chain, weil {classification}. Der untersuchte Zweig enthält {nodes} geprüfte Knoten.',
  forcingNetBinaryExhaustive:
    '{candidate} hat genau zwei Zustände – wahr oder falsch –, daher sind die beiden Wurzelzweige vollständig.',
  forcingNetAlternativeExhaustive:
    'Die Wurzelmenge {roots} enthält jeden möglichen Start in {scope}; damit sind die Wurzelzweige vollständig.',
  forcingNetMultiRootReason:
    'die Aufteilung {branches} vollständige Wurzelzweige statt zweier linearer Fälle besitzt',
  forcingNetDependencyReason:
    'der geprüfte Abhängigkeitsgraph sich auffächert oder zusammenläuft, statt ein einzelner linearer Folgerungspfad zu bleiben',
  forcingNetBranchSummaryTitle: 'Wurzelzweig {branch}/{total}',
  forcingNetBranchSummary:
    'Ausgehend von „{assumption}“ erreicht dieser Zweig über {nodes} geprüfte Knoten „{outcome}“. Seine Detailabhängigkeiten sind im Graphen auf dem Brett zusammengefasst.',
  forcingNetBranchesSummaryTitle: 'Die Ergebnisse aller Wurzelzweige prüfen',
  forcingNetBranchesSummary:
    'Die vollständigen Wurzelzweige enden wie folgt: {branches}. Jedes aufgeführte Ergebnis ist der letzte geprüfte Knoten seines Zweigs und führt direkt zum gemeinsamen Ergebnis des Netzes.',
  forcingNetContradictionOutcome:
    'der geprüfte Zweig erreicht einen Widerspruch',
  forcingConflictCell:
    'In {cell} bleibt kein Kandidat: {candidates} sind alle falsch',
  forcingConflictRegion:
    'Für Kandidat {digit} bleibt in {region} keine Position: {candidates} sind alle falsch',
  forcingConflictDoubleCell:
    '{cell} enthielte gleichzeitig {firstDigit} und {secondDigit}; eine Sudoku-Zelle kann aber nur eine Zahl enthalten',
  forcingConflictDoubleRegion:
    '{first} und {second} wären in {region} beide {digit}; damit würde sich die Zahl wiederholen',
  forcingConflictOpposite:
    '{candidate} wird gleichzeitig als wahr und falsch erzwungen',
  forcingNetContradictionBranchesSummary:
    'Der geprüfte Zweig ergibt: {branches}. Dieser angenommene Zustand ist unmöglich; daher wird sein vollständiges Gegenresultat „{result}“ erzwungen.',
  forcingNetCommonTitle: 'Alle Wurzelzweige erreichen dasselbe Ergebnis',
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
  lockedTitle: 'Die Ziffer auf den Schnitt festlegen',
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
  xWingCaseTitle: 'Fall {branch}: beide Deckbereiche belegen',
  xWingResult:
    'In jeder vollständigen Paarung belegen die beiden {digits} aus den Basisbereichen ({source}) die zwei Deckbereiche ({cover}), jeweils genau einmal. Entferne daher {targets} außerhalb der Basen.',
  jellyfishPremiseTitle: 'Mit den vier Basisbereichen beginnen',
  jellyfishPremise:
    'Jeder Sudoku-Bereich muss {digits} genau einmal enthalten. Die vier gewählten Basisbereiche ({source}) brauchen die Ziffer noch und müssen jeweils einen eingekreisten Kandidaten wählen.',
  jellyfishPatternTitle: 'Auf vier Deckbereiche beschränken',
  jellyfishPattern:
    'Alle eingekreisten Kandidaten der vier Basen liegen in denselben vier Deckbereichen ({cover}). In der Legende markieren „Basislinien“ die vier Basisbereiche und „Decklinien“ die vier Deckbereiche. Zusammen bilden sie den Jellyfish.',
  jellyfishOccupancyTitle: 'Jeder Deckbereich wird genau einmal belegt',
  jellyfishOccupancy:
    'Die vier Basisbereiche müssen insgesamt vier {digits} setzen. Ein Deckbereich kann die Ziffer nicht zweimal enthalten, und alle vier Setzungen sind auf diese vier Deckbereiche beschränkt. Daher wird jeder Deckbereich genau einmal belegt.',
  jellyfishOccupancyResultTitle: 'Kandidaten außerhalb der Basen entfernen',
  jellyfishOccupancyResult:
    'Jeder Deckbereich erhält seine {digits} bereits aus einem der vier Basisbereiche. Kandidaten in diesen Deckbereichen, aber außerhalb der Basen, können daher nicht {digits} sein; entferne {targets}.',
  jellyfishDeepTitle: 'Vertiefter Beweis für das gewählte Ziel',
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
  finnedPatternTitle: 'Den vollständigen Fischkörper aufbauen',
  finnedPattern:
    'Für {digits} bestimmen die zwei Basislinien ({source}) und zwei Decklinien ({cover}) die vier Körperkandidaten {body}. Die zusätzlichen Kandidaten {fins} sind Flossen in {finBox}. Die Ziele {targets} liegen auf einer Decklinie außerhalb der Basislinien.',
  finsTitle: 'Flossen und Körper unterscheiden',
  fins: 'Die umrandeten Kandidaten {fins} sind die Flossen in {finBox}; die anderen vier Kandidaten {body} bilden den X-Wing-Körper. Nun werden beide Möglichkeiten geprüft: Eine Flosse ist wahr oder alle Flossen sind falsch.',
  missing:
    'An der fehlenden Ecke {cells} gibt es keinen Kandidaten. Sie zählt nicht als Beleg.',
  finCaseTitle: 'Flosse {index} als wahr annehmen',
  finTrue:
    'Ist die Flosse {fin} wahr, sieht jedes markierte Ziel {targets} sie in {finBox}; daher können diese Ziele keine {digits} sein.',
  finFalse:
    'Sind alle Flossen {fins} falsch, bilden die vier Körperkandidaten {body} über die zwei Basislinien ({source}) und zwei Decklinien ({cover}) einen gewöhnlichen X-Wing. Die Ziele {targets} liegen in einer Decklinie außerhalb der Basen und werden ausgeschlossen.',
  finFalseTitle: 'Fall: alle Flossen sind falsch',
  finnedResultTitle: 'Beide Zielbedingungen anwenden',
  finnedResult:
    'Ein gültiges Ziel muss beide Bedingungen erfüllen: Es liegt in einer X-Wing-Decklinie außerhalb der beiden Basen und sieht jede Flosse. Die Ziele {targets} erfüllen beides; entferne daher den Kandidaten {digits}.',
  sashimiPatternTitle: 'Den degenerierten X-Wing als Ganzes erkennen',
  sashimiPattern:
    'Die zwei Basislinien ({source}) und zwei Decklinien ({cover}) zeigen den vollständigen degenerierten Fisch. Für {digits} sind {direct} und {alternate} die beiden Enden der starken Verknüpfung in {pairRegion}. In der anderen Basis {finBase} ist {corner} die verbleibende Körperecke; an der fehlenden Ecke {missing} gibt es keinen Kandidaten {digits}. Damit ist der Körper {body}, während {fins} die Flossen in {finBox} sind. Die Ziele {targets} liegen in {directCover} und sehen jede Flosse.',
  sashimiDirectTitle: 'Fall 1: Das Ende neben der fehlenden Ecke ist wahr',
  sashimiDirect:
    'Ist das Ende {direct} wahr, ist das andere Ende {alternate} falsch. {direct} und die Ziele {targets} liegen gemeinsam in {directCover}; daher sind alle Ziele in diesem Fall falsch.',
  sashimiFinTitle: 'Fall 2: Das Ende neben der Körperecke ist wahr',
  sashimiFin:
    'Ist das andere Ende {alternate} wahr, ist {direct} falsch; über {alternateCover} wird auch die ausgerichtete Körperecke {corner} ausgeschlossen. Die Basis {finBase} muss {digits} nun in mindestens eine der Flossen {fins} setzen. Jedes Ziel {targets} sieht jede Flosse und ist deshalb auch in diesem Fall falsch.',
  sashimiResultTitle: 'Die zwei Fälle decken alle Möglichkeiten ab',
  sashimiResult:
    'Die starke Verknüpfung in {pairRegion} hat genau die Enden {direct} und {alternate}; einer der beiden Fälle muss daher eintreten. Das erste Ende schließt {targets} direkt aus, das zweite erzwingt mindestens eine Flosse, die dieselben Ziele ausschließt. Damit sind alle Belegungen erfasst und die Ziele können entfernt werden.',
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
  resetTitle: 'Die vorherige Rechteckbelegung zurücknehmen',
  conflict:
    'Diese Annahme lässt in {regions} keine Möglichkeit mehr: {candidates}. Jede Zelle und jede fehlende Ziffer eines Bereichs braucht eine Möglichkeit. Die Annahme ist unmöglich.',
  opposite:
    'Die Annahme {assumption} führt zum Widerspruch. Daher gilt {result}.',
  aicContradictionResult:
    'Die Folgerung widerspricht „{assumption}“. Daher gilt {result}.',
  aicAssumptionTitle: 'Annahme: die alternierende Kette beginnen',
  aicWeakTitle: 'Schwache Beziehung: verbundene Kandidaten schließen sich aus',
  aicStrongTitle: 'Starke Beziehung: das andere Ende wird erzwungen',
  aicCellStrongTitle: 'Gleiche Zelle: den anderen Kandidaten erzwingen',
  aicCellStrong:
    '{from} ist falsch. In derselben Zelle {regions} wird der andere Kandidat {candidates} unter der aktuellen Annahme erzwungen.',
  aicForcedTitle: 'Erzwungener Schritt unter der aktuellen Annahme',
  aicContradictionTitle: 'Die Kette erreicht einen Widerspruch',
  aicConclusionTitle: 'AIC-Zusammenfassung',
  aicConclusion:
    'Die alternierende Kette begann mit „{assumption}“ und folgte den gekennzeichneten starken und schwachen Beziehungen sowie, falls nötig, dem Wechsel zum anderen Kandidaten derselben Zelle bis zum Widerspruch. Daher gilt {result}. Alle vorläufigen Zustände werden zurückgenommen.',
  common:
    'Alle möglichen Zweige ergeben dieselbe Tatsache: {candidates}. Auch nach Rücknahme aller Annahmen bleibt sie sicher.',
  endpoints:
    'Ist die erste Seite falsch, ist die letzte wahr. Mindestens eine Endgruppe enthält also die Ziffer. Jedes Ziel sieht alle Kandidaten beider Endgruppen und kann entfernt werden.',
  xChainIndirect:
    '{from} ist falsch, daher wird {candidates} in {regions} erzwungen. Jedes Ziel sieht {candidates}, also wird {targets} gestrichen.',
  xChainDirect:
    'Fall 2: Wir setzen {selected}. Jedes Ziel sieht diesen Kandidaten, also wird {targets} direkt gestrichen.',
  xChainResult:
    'Die beiden Endpunktfälle erfassen alle Möglichkeiten und streichen beide {targets}. Nach Rücknahme der vorläufigen Zustände können diese Kandidaten entfernt werden.',
  xyChainStart:
    'Fall 1: {selectedCell} ist die bivalue Zelle {selectedPair}. Da ihr anderer Kandidat falsch ist, wird {selected} unter der aktuellen Annahme erzwungen. Zwischen Zellen schließt er {crossed} aus; diese Konflikte werden gestrichen.',
  xyChainHop:
    'Der nächste Knoten {selectedCell} ist wieder eine bivalue Zelle ({selectedPair}). Da der andere Kandidat falsch ist, wird {selected} unter der aktuellen Annahme erzwungen. Zwischen Zellen schließt er {crossed} aus; diese Konflikte werden gestrichen.',
  xyChainEnd:
    'Der Endpunkt {selectedCell} ist eine bivalue Zelle ({selectedPair}). Weil {from} falsch ist, wird {selected} unter der aktuellen Annahme erzwungen und schließt die Ziele {targets} aus.',
  xyChainDirect:
    'Fall 2: Der Startpunkt {selected} sei in seiner bivalue Zelle {selectedCell} ({selectedPair}) wahr. Innerhalb der Zelle schließt er den anderen Kandidaten aus, zwischen Zellen die sichtbaren Konflikte {crossed}.',
  xyChainResult:
    'Die beiden Endpunktfälle erfassen alle Möglichkeiten und streichen beide {targets}. Nach Rücknahme der vorläufigen Zustände können sie entfernt werden.',
  groupedAicGroupsTitle: 'Die OR-Kandidatengruppen benennen',
  groupedAicGroupName: 'OR-Kandidatengruppe {name}',
  groupedAicGroupLegend: 'OR-Gruppe {name}: Mindestens ein Kandidat ist wahr',
  groupedAicGroups:
    'Die nummerierten Klammern und die Legende definieren diese Gruppen: {groups}. Jede Gruppe ist ein OR-Zustand: Mindestens ein Kandidat darin ist wahr, aber nicht zwangsläufig alle gleichzeitig.',
  groupedAicStructureTitle: 'Gruppenstarklinks und OR-Zustände aufbauen',
  groupedAicStructure:
    'Für Kandidat {digit} bleiben in jedem genannten Bereich genau die beiden gezeigten Seiten; daraus entstehen diese Gruppenstarklinks: {strongLinks}. Die benannten OR-Zustände sind {groups}. Eine OR-Gruppe bedeutet, dass mindestens ein Mitglied wahr ist, nicht alle zugleich.',
  groupedAicChainSummaryTitle: 'Fall 1: der vollständigen Gruppenkette folgen',
  groupedAicChainSummary:
    'Nimm an, {start} sei falsch. Über alle {links} geprüften Übergänge ({strong} Gruppenstarklinks und {weak} Gruppenschwachlinks) erzwingt die Kette den Endpunkt {end}. Dieser schließt {targets} aus.',
  groupedAicStartTitle: 'Gruppenstarklink: die andere Seite erzwingen',
  groupedAicStart:
    'Fall 1: {from} ist falsch, daher erzwingt der Gruppenstarklink {selected}. Bei einer OR-Gruppe bedeutet das: Mindestens ein Kandidat darin ist wahr.',
  groupedAicWeakTitle: 'Gruppenschwachlink: die Gegenseite ausschließen',
  groupedAicWeak:
    '{selected} ist als Kettenzustand wahr; die unvereinbare Seite {crossed} ist daher falsch.',
  groupedAicStrongTitle: 'Gruppenstarklink: eine Seite muss bleiben',
  groupedAicStrong:
    '{from} ist falsch, daher erzwingt der Gruppenstarklink {selected}.',
  groupedAicEndTitle: 'Der indirekte Endpunkt schließt die Ziele aus',
  groupedAicEnd:
    '{selected} ist als Endzustand wahr und schließt deshalb die Ziele aus.',
  groupedAicDirectTitle: 'Fall 2: Der Startpunkt ist wahr',
  groupedAicDirect:
    'Fall 2: Der Startpunkt {selected} ist als OR-Zustand wahr und schließt deshalb die Ziele aus.',
  groupedAicDirectSingle:
    'Fall 2: Der Startpunkt {selected} ist wahr und schließt deshalb die Ziele aus.',
  groupedAicResultTitle: 'Beide Endpunktfälle stimmen überein',
  groupedAicResult:
    'Die beiden Endpunktfälle erfassen alle Möglichkeiten und schließen beide {targets} aus. Nach Rücknahme der vorläufigen Zustände können sie entfernt werden.',
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
    'Diese Erklärung deckt nur HoDoKu Multi Colors Typ 1 ab: Zwischen zwei Färbungskomponenten besteht ein Konflikt. Kandidat {digit} bildet diese zwei getrennten Komponenten. In jeder Komponente sind rundes A und eckiges B Gegenzustände. Das Ziel {targets} bleibt sichtbar.',
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
  complexOverviewTitle: 'Die gleichzuständige Startgruppe bestätigen',
  complexOverview:
    '„Complex Coloring“ ist die produkteigene Bezeichnung für diesen Widerspruch über mehrere Färbungskomponenten; bei HoDoKu gibt es keine eigenständige gleichnamige Technik. Kandidat {digit} bildet {components} getrennte Färbungskomponenten. Durch alternierendes Färben entlang der starken Verknüpfungen liegen {startMembers} gemeinsam auf Seite {startState} der Komponente {startComponent} und teilen daher denselben Wahrheitszustand. Diese Mitglieder sind genau die Zielkandidaten {targets}. In jeder Komponente sind A und B Gegenzustände; Konflikte verbinden Zustände zwischen den Komponenten.',
  complexAssumeTitle: 'Den Zielzustand als wahr annehmen',
  complexAssume:
    'Behandle die gesamte gleichzuständige Gruppe {candidates} als einen Zustand, nimm ihn vorübergehend als wahr an und folge den Konflikten zwischen den Komponenten.',
  complexPropagationTitle: 'Folgerung {step}/{total}: Komponente {from} → {to}',
  complexPropagationSummaryTitle: 'Allen Komponentenübergängen folgen',
  complexPropagationSummary: '{steps}',
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
  swapTitle: 'Rechteckbelegung {branch}',
  unique:
    'Typ 1: Drei Ecken haben nur {digits}. Nähme die vierte auch eine dieser Ziffern, wäre das Rechteck austauschbar. Sie muss eine andere Ziffer verwenden.',
  uniqueRectangleTitle: 'Eindeutiges Rechteck Typ 1',
  uniqueRectangleConclusionTitle: 'Typ 1: beide Rechteckziffern entfernen',
  uniqueRectangleConclusion:
    'Die anderen drei Ecken sind exakte bivalue Zellen mit nur {digits}. Nähme die vierte Ecke {roof} eine der beiden Rechteckziffern, hätten die vier Ecken zwei austauschbare Belegungen. Entferne {targets}; {roof} muss einen Zusatzkandidaten verwenden.',
  uniqueRectangleType4Title: 'Die starke Verknüpfung finden',
  uniqueRectangleType4BivalueLegend: 'Exakte bivalue Ecken ({pairDigits})',
  uniqueRectangleType4ExtraLegend: 'Ecken mit Zusatzkandidaten',
  uniqueRectangleType4:
    'Die Legende unterscheidet die exakten bivalue Ecken von den Ecken mit Zusatzkandidaten. Im Folgenden heißt {strongDigit} Verbindungsziffer und {otherDigit} andere Rechteckziffer. In {strongRegion} kann die Verbindungsziffer nur in den beiden Ecken mit Zusatzkandidaten stehen; genau eine enthält sie. Die andere Rechteckziffer hat weitere Positionen im Bereich, daher sind die Ziffern nicht symmetrisch.',
  uniqueRectangleType4CaseTitle: 'Fall {case}: {assumption} annehmen',
  uniqueRectangleType4Case:
    'Nimm die andere Rechteckziffer in {assumption} an. Die starke Verknüpfung erzwingt in der anderen Ecke mit Zusatzkandidaten {forcedExtra} die Verbindungsziffer {strongDigit}. Die angezeigten vier Ecken sind nun austauschbar; ein Tausch von {pairDigits} ergibt eine zweite Lösung. Die Annahme ist falsch.',
  uniqueRectangleType4ConclusionTitle: 'Die andere Rechteckziffer entfernen',
  uniqueRectangleType4Conclusion:
    'Die andere Rechteckziffer in einer der beiden Ecken mit Zusatzkandidaten erzeugt dasselbe austauschbare Rechteck; entferne daher {targets}. Die Verbindungsziffer {strongDigit} bleibt, denn ihre starke Verknüpfung in {strongRegion} wird benötigt.',
  hiddenRectangleTitle: 'Den zwei starken Verknüpfungen folgen',
  hiddenRectangle:
    '{anchor} ist eine exakte bivalue Ecke mit nur {pairDigits}. Das Ziel {target} liegt in der jeweils anderen Zeile und Spalte des Rechtecks und ist deshalb die diagonale Ecke. {strongDigit} bildet durch {target} eine starke Zeilenverknüpfung in {targetRow} und eine starke Spaltenverknüpfung in {targetColumn}.',
  hiddenRectangleCaseTitle: '{assumption} annehmen',
  hiddenRectangleCase:
    'Gilt {assumption}, kann {target} nicht {strongDigit} sein. Die starke Zeilenverknüpfung erzwingt {rowForced}, die starke Spaltenverknüpfung {columnForced} als {strongDigit}; die exakte bivalue Ecke {anchor} wird {otherDigit}. Ein Tausch von {pairDigits} im Rechteck ergibt eine zweite Lösung. Die Annahme ist falsch.',
  hiddenRectangleConclusionTitle: 'Den diagonalen Kandidaten entfernen',
  hiddenRectangleConclusion:
    'Entferne {targets}. {otherDigit} in {target} würde das oben gezeigte Rechteck mit zwei Lösungen erzeugen.',
  avoidable:
    '{enteredValues} wurden beim Lösen vom Spieler eingetragen und sind keine Vorgaben. Die noch offene Ecke ist {target}. Nur Spielereingaben dürfen an diesem Tausch teilnehmen.',
  avoidableTitle: 'Die drei Spielereingaben bestimmen',
  avoidablePairTitle: 'Die beiden Rechteckbelegungen vergleichen',
  avoidablePair:
    'Wird die Ecke mit {target} ergänzt, entsteht {arrangement}. Ein Tausch der beiden Rechteckziffern ergibt {swappedArrangement}. Beide Belegungen erhalten jede Zeile, Spalte und jeden Block; die Ergänzung würde daher zwei Lösungen erzeugen.',
  avoidableConclusionTitle: 'Das austauschbare Rechteck nicht vervollständigen',
  avoidableConclusion:
    '{target} würde mit den drei Spielereingaben ein austauschbares Rechteck vervollständigen. Entferne {targets}; die Spielereingaben selbst bleiben unverändert.',
  bugTitle: 'Den BUG + 1-Zustand erkennen',
  bug: 'Alle anderen ungelösten Zellen haben genau zwei Kandidaten. Nur {target} hat drei ({targetCandidates}); damit ist {extraCandidate} der einzige zusätzliche Kandidat gegenüber einem BUG-Muster. Zuerst werden seine Vorkommen in Zeile, Spalte und Block gezählt.',
  bugConclusionTitle: 'Der einzige Zusatzkandidat muss wahr sein',
  bugConclusion:
    'Die drei Zählungen zeigen, dass {extraCandidate} das einzige zusätzliche Vorkommen ist. Ohne ihn wären alle ungelösten Zellen bivalue und jede fehlende Ziffer käme in jedem Bereich zweimal vor: der mehrdeutige BUG-Zustand. Da das Rätsel genau eine Lösung hat, muss {extraCandidate} wahr sein.',
  count: 'In {regions} steht {digits} an {cells}: {count} Positionen.',
  countTitle: '{digits} in {regions} zählen',
  result:
    'Das geprüfte Ergebnis ist {candidates}. Alle vorläufigen Annahmen sind zurückgenommen.',
};
