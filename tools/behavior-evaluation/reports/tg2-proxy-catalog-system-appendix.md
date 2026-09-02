# TG-2 系统归因附录

> 仅在盲审工作表填写完成后查看。本附录是系统当前输出，不是人工真值。

## 样本 1：tg2-catalog-fullHouse

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`fullHouse`
- candidateTechniques：`fullHouse` (106)、`nakedSingle` (126)、`hiddenSingle` (244)、`hiddenTriple` (3072)、`hiddenQuad` (3105)、`swordfish` (4113)、`forcingNet` (5178)
- analysisDiagnostics：opportunities=83, complete=true, expanded=false, limits=none

## 样本 2：tg2-catalog-nakedSingle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedSingle`
- candidateTechniques：`nakedSingle` (126)、`hiddenPair` (2052)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 3：tg2-catalog-hiddenSingle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenSingle`
- candidateTechniques：`hiddenSingle` (220)、`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 4：tg2-catalog-lockedCandidates.pointing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.pointing`
- candidateTechniques：`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2065)、`simpleColoring` (4115)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 5：tg2-catalog-lockedCandidates.claiming

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 6：tg2-catalog-lockedPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedPair`
- candidateTechniques：`lockedPair` (2086)、`nakedPair` (2086)、`hiddenQuad` (3095)
- analysisDiagnostics：opportunities=96, complete=true, expanded=false, limits=none

## 样本 7：tg2-catalog-lockedTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedTriple`
- candidateTechniques：`lockedTriple` (2134)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 8：tg2-catalog-nakedPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedPair`
- candidateTechniques：`nakedPair` (2100)
- analysisDiagnostics：opportunities=57, complete=true, expanded=false, limits=none

## 样本 9：tg2-catalog-hiddenPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2052)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 10：tg2-catalog-nakedTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedTriple`
- candidateTechniques：`lockedTriple` (2134)、`nakedTriple` (3131)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 11：tg2-catalog-hiddenTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenTriple`
- candidateTechniques：`hiddenTriple` (3079)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 12：tg2-catalog-nakedQuad

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedQuad`
- candidateTechniques：`nakedQuad` (3171)
- analysisDiagnostics：opportunities=116, complete=true, expanded=true, limits=none

## 样本 13：tg2-catalog-hiddenQuad

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedTriple`
- candidateTechniques：`lockedTriple` (2129)、`hiddenQuad` (3100)、`nakedTriple` (3129)
- analysisDiagnostics：opportunities=65, complete=true, expanded=false, limits=none

## 样本 14：tg2-catalog-xWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.pointing`
- candidateTechniques：`lockedCandidates.pointing` (2056)、`lockedTriple` (2131)、`xWing` (3074)、`nakedTriple` (3131)、`simpleColoring` (4122)
- analysisDiagnostics：opportunities=62, complete=true, expanded=false, limits=none

## 样本 15：tg2-catalog-swordfish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 16：tg2-catalog-skyscraper

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`skyscraper` (4135)、`turbotFish` (4135)、`multiColoring` (4135)、`xChain` (5135)、`groupedAic` (5164)、`jellyfish` (5175)
- analysisDiagnostics：opportunities=92, complete=true, expanded=false, limits=none

## 样本 17：tg2-catalog-twoStringKite

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`twoStringKite` (4100)、`simpleColoring` (4100)、`swordfish` (4114)、`xyWing` (4132)、`sashimiXWing` (4135)、`jellyfish` (5146)
- analysisDiagnostics：opportunities=67, complete=true, expanded=false, limits=none

## 样本 18：tg2-catalog-turbotFish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`turbotFish` (4149)、`multiColoring` (4149)、`xChain` (5149)、`forcingNet` (5234)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 19：tg2-catalog-wWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2049)、`nakedPair` (2102)、`nakedTriple` (3136)、`wWing` (4163)、`forcingNet` (5276)
- analysisDiagnostics：opportunities=125, complete=true, expanded=true, limits=none

## 样本 20：tg2-catalog-xyWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedTriple`
- candidateTechniques：`nakedTriple` (3131)、`xyWing` (4131)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 21：tg2-catalog-xyzWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2045)、`lockedCandidates.pointing` (2064)、`lockedTriple` (2122)、`nakedTriple` (3122)、`nakedQuad` (3167)、`xyzWing` (4120)、`jellyfish` (5196)
- analysisDiagnostics：opportunities=78, complete=true, expanded=false, limits=none

## 样本 22：tg2-catalog-simpleColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 23：tg2-catalog-multiColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`turbotFish` (4149)、`multiColoring` (4149)、`xChain` (5149)、`forcingNet` (5234)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 24：tg2-catalog-remotePair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`remotePair`
- candidateTechniques：`remotePair` (4160)
- analysisDiagnostics：opportunities=95, complete=true, expanded=false, limits=none

## 样本 25：tg2-catalog-emptyRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.pointing`
- candidateTechniques：`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2065)、`simpleColoring` (4115)、`emptyRectangle` (4192)、`forcingNet` (5131)、`groupedAic` (5192)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 26：tg2-catalog-hiddenRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2047)、`hiddenTriple` (3057)、`hiddenRectangle` (4142)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 27：tg2-catalog-avoidableRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`avoidableRectangle`
- candidateTechniques：`avoidableRectangle` (4109)、`xyChain` (5297)
- analysisDiagnostics：opportunities=19, complete=true, expanded=false, limits=none

## 样本 28：tg2-catalog-uniqueRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2048)、`nakedPair` (2101)、`hiddenTriple` (3070)、`nakedTriple` (3121)、`nakedQuad` (3167)、`uniqueRectangle` (4142)、`remotePair` (4160)
- analysisDiagnostics：opportunities=95, complete=true, expanded=false, limits=none

## 样本 29：tg2-catalog-bugPlusOne

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`bugPlusOne`
- candidateTechniques：`bugPlusOne` (4064)
- analysisDiagnostics：opportunities=166, complete=true, expanded=true, limits=none

## 样本 30：tg2-catalog-finnedXWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)、`finnedXWing` (4150)、`groupedAic` (5151)、`jellyfish` (5168)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 31：tg2-catalog-sashimiXWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`sashimiXWing` (4149)、`multiColoring` (4178)、`xChain` (5135)、`groupedAic` (5135)、`forcingNet` (5150)
- analysisDiagnostics：opportunities=116, complete=true, expanded=true, limits=none

## 样本 32：tg2-catalog-jellyfish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2065)、`jellyfish` (5168)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 33：tg2-catalog-xChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`turbotFish` (4149)、`multiColoring` (4149)、`xChain` (5149)、`forcingNet` (5234)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 34：tg2-catalog-xyChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`xyChain`
- candidateTechniques：`xyChain` (5170)
- analysisDiagnostics：opportunities=78, complete=true, expanded=false, limits=none

## 样本 35：tg2-catalog-aic

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingNet`
- candidateTechniques：`forcingNet` (5078)、`aic` (5134)、`forcingChain` (5134)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 36：tg2-catalog-groupedAic

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2056)、`simpleColoring` (4080)、`forcingNet` (5114)、`groupedAic` (5157)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 37：tg2-catalog-complexColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`simpleColoring`
- candidateTechniques：`simpleColoring` (4101)、`complexColoring` (5249)
- analysisDiagnostics：opportunities=67, complete=true, expanded=false, limits=none

## 样本 38：tg2-catalog-forcingChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingNet`
- candidateTechniques：`forcingNet` (5078)、`aic` (5134)、`forcingChain` (5134)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 39：tg2-catalog-forcingNet

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingNet`
- candidateTechniques：`forcingNet` (5078)、`aic` (5134)、`forcingChain` (5134)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 40：tg2-placement-closure-001

- scenarioFamily：`placement_closure`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)、`groupedAic` (5136)、`jellyfish` (5168)
- analysisDiagnostics：opportunities=128, complete=true, expanded=true, limits=none

## 样本 41：tg2-hint-counterexample-001

- scenarioFamily：`hint_counterexample`
- attributionEligibility：`ineligible:hint_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 42：tg2-undo-counterexample-001

- scenarioFamily：`undo_counterexample`
- attributionEligibility：`ineligible:undo_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 43：tg2-auto-pencil-counterexample-001

- scenarioFamily：`auto_pencil_counterexample`
- attributionEligibility：`eligible`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 44：tg2-rapid-operation-counterexample-001

- scenarioFamily：`rapid_operation_counterexample`
- attributionEligibility：`ineligible:rapid_operation_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

