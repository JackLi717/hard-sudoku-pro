# TG-2 系统归因附录

> 仅在盲审工作表填写完成后查看。本附录是系统当前输出，不是人工真值。

## 样本 1：tg2-subset-001

- scenarioFamily：`subset`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedTriple`
- candidateTechniques：`lockedTriple` (2134)、`nakedTriple` (3131)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 2：tg2-fish-001

- scenarioFamily：`fish`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.pointing`
- candidateTechniques：`lockedCandidates.pointing` (2056)、`lockedTriple` (2131)、`xWing` (3074)、`nakedTriple` (3131)、`simpleColoring` (4122)
- analysisDiagnostics：opportunities=62, complete=true, expanded=false, limits=none

## 样本 3：tg2-chain-001

- scenarioFamily：`chain`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`turbotFish` (4149)、`multiColoring` (4149)、`xChain` (5149)、`forcingNet` (5234)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 4：tg2-coloring-001

- scenarioFamily：`coloring`
- attributionEligibility：`eligible`
- automaticTechnique：`simpleColoring`
- candidateTechniques：`simpleColoring` (4101)、`complexColoring` (5249)
- analysisDiagnostics：opportunities=67, complete=true, expanded=false, limits=none

## 样本 5：tg2-placement-closure-001

- scenarioFamily：`placement_closure`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)、`groupedAic` (5136)、`jellyfish` (5168)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 6：tg2-hint-counterexample-001

- scenarioFamily：`hint_counterexample`
- attributionEligibility：`ineligible:hint_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 7：tg2-undo-counterexample-001

- scenarioFamily：`undo_counterexample`
- attributionEligibility：`ineligible:undo_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 8：tg2-auto-pencil-counterexample-001

- scenarioFamily：`auto_pencil_counterexample`
- attributionEligibility：`eligible`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 9：tg2-rapid-operation-counterexample-001

- scenarioFamily：`rapid_operation_counterexample`
- attributionEligibility：`ineligible:rapid_operation_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

