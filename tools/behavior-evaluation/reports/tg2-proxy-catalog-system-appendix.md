# TG-2 系统归因附录

> 仅在盲审工作表填写完成后查看。本附录是系统当前输出，不是人工真值。

## 样本 1：tg2-catalog-fullHouse

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`fullHouse`
- nativeReplayAutomaticTechnique：`fullHouse`
- candidateTechniques：`fullHouse` (106)、`nakedSingle` (126)、`hiddenSingle` (222)、`lockedCandidates.claiming` (2055)、`simpleColoring` (4079)、`aic` (5115)、`forcingChain` (5135)、`forcingNet` (5146)、`jellyfish` (5174)
- analysisDiagnostics：opportunities=46, complete=true, expanded=false, limits=none

## 样本 2：tg2-catalog-nakedSingle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedSingle`
- nativeReplayAutomaticTechnique：`nakedSingle`
- candidateTechniques：`nakedSingle` (126)、`hiddenPair` (2050)
- analysisDiagnostics：opportunities=88, complete=true, expanded=false, limits=none

## 样本 3：tg2-catalog-hiddenSingle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenSingle`
- nativeReplayAutomaticTechnique：`hiddenSingle`
- candidateTechniques：`hiddenSingle` (276)、`nakedQuad` (3205)、`swordfish` (4127)
- analysisDiagnostics：opportunities=118, complete=true, expanded=true, limits=none

## 样本 4：tg2-catalog-lockedCandidates.pointing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- nativeReplayAutomaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2050)、`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2056)、`lockedPair` (2086)、`nakedPair` (2086)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 5：tg2-catalog-lockedCandidates.claiming

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- nativeReplayAutomaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2050)、`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2056)、`lockedPair` (2086)、`nakedPair` (2086)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 6：tg2-catalog-lockedPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- nativeReplayAutomaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2050)、`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2056)、`lockedPair` (2086)、`nakedPair` (2086)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 7：tg2-catalog-lockedTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.pointing`
- nativeReplayAutomaticTechnique：`lockedCandidates.pointing`
- candidateTechniques：`lockedCandidates.pointing` (2055)、`lockedCandidates.claiming` (2055)、`lockedTriple` (2120)、`hiddenQuad` (3101)、`nakedTriple` (3120)、`simpleColoring` (4079)、`forcingNet` (5131)
- analysisDiagnostics：opportunities=75, complete=true, expanded=true, limits=none

## 样本 8：tg2-catalog-nakedPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- nativeReplayAutomaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2050)、`lockedCandidates.pointing` (2056)、`lockedCandidates.claiming` (2056)、`lockedPair` (2086)、`nakedPair` (2086)、`simpleColoring` (4080)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 9：tg2-catalog-hiddenPair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenPair`
- nativeReplayAutomaticTechnique：`hiddenPair`
- candidateTechniques：`hiddenPair` (2054)、`nakedQuad` (3177)
- analysisDiagnostics：opportunities=60, complete=true, expanded=false, limits=none

## 样本 10：tg2-catalog-nakedTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenQuad`
- nativeReplayAutomaticTechnique：`hiddenQuad`
- candidateTechniques：`hiddenQuad` (3101)、`nakedTriple` (3135)
- analysisDiagnostics：opportunities=35, complete=true, expanded=false, limits=none

## 样本 11：tg2-catalog-hiddenTriple

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenTriple`
- nativeReplayAutomaticTechnique：`hiddenTriple`
- candidateTechniques：`hiddenTriple` (3077)、`nakedQuad` (3160)
- analysisDiagnostics：opportunities=35, complete=true, expanded=false, limits=none

## 样本 12：tg2-catalog-nakedQuad

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`nakedQuad`
- nativeReplayAutomaticTechnique：`nakedQuad`
- candidateTechniques：`nakedQuad` (3181)
- analysisDiagnostics：opportunities=48, complete=true, expanded=false, limits=none

## 样本 13：tg2-catalog-hiddenQuad

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenQuad`
- nativeReplayAutomaticTechnique：`hiddenQuad`
- candidateTechniques：`hiddenQuad` (3100)
- analysisDiagnostics：opportunities=48, complete=true, expanded=false, limits=none

## 样本 14：tg2-catalog-xWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`xWing`
- nativeReplayAutomaticTechnique：`xWing`
- candidateTechniques：`xWing` (3078)、`simpleColoring` (4214)
- analysisDiagnostics：opportunities=32, complete=true, expanded=false, limits=none

## 样本 15：tg2-catalog-swordfish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`swordfish`
- nativeReplayAutomaticTechnique：`swordfish`
- candidateTechniques：`swordfish` (4120)
- analysisDiagnostics：opportunities=194, complete=true, expanded=true, limits=none

## 样本 16：tg2-catalog-skyscraper

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`skyscraper`
- nativeReplayAutomaticTechnique：`skyscraper`
- candidateTechniques：`skyscraper` (4164)、`turbotFish` (4164)、`multiColoring` (4164)、`xChain` (5164)
- analysisDiagnostics：opportunities=81, complete=true, expanded=false, limits=none

## 样本 17：tg2-catalog-twoStringKite

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`twoStringKite`
- nativeReplayAutomaticTechnique：`twoStringKite`
- candidateTechniques：`twoStringKite` (4163)、`turbotFish` (4163)、`emptyRectangle` (4163)、`simpleColoring` (4192)、`xyChain` (5229)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 18：tg2-catalog-turbotFish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`skyscraper`
- nativeReplayAutomaticTechnique：`skyscraper`
- candidateTechniques：`skyscraper` (4164)、`turbotFish` (4164)、`multiColoring` (4164)、`xChain` (5164)
- analysisDiagnostics：opportunities=81, complete=true, expanded=false, limits=none

## 样本 19：tg2-catalog-wWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`wWing`
- nativeReplayAutomaticTechnique：`wWing`
- candidateTechniques：`wWing` (4177)、`xyChain` (5229)、`forcingNet` (5234)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 20：tg2-catalog-xyWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`xyWing`
- nativeReplayAutomaticTechnique：`xyWing`
- candidateTechniques：`xyWing` (4145)、`xyChain` (5145)
- analysisDiagnostics：opportunities=96, complete=true, expanded=false, limits=none

## 样本 21：tg2-catalog-xyzWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`xyzWing`
- nativeReplayAutomaticTechnique：`xyzWing`
- candidateTechniques：`xyzWing` (4134)、`forcingNet` (5229)
- analysisDiagnostics：opportunities=81, complete=true, expanded=false, limits=none

## 样本 22：tg2-catalog-simpleColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`twoStringKite`
- nativeReplayAutomaticTechnique：`twoStringKite`
- candidateTechniques：`twoStringKite` (4163)、`turbotFish` (4163)、`emptyRectangle` (4163)、`simpleColoring` (4192)、`xyChain` (5229)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 23：tg2-catalog-multiColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`skyscraper`
- nativeReplayAutomaticTechnique：`skyscraper`
- candidateTechniques：`skyscraper` (4164)、`turbotFish` (4164)、`multiColoring` (4164)、`xChain` (5164)
- analysisDiagnostics：opportunities=81, complete=true, expanded=false, limits=none

## 样本 24：tg2-catalog-remotePair

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`remotePair`
- nativeReplayAutomaticTechnique：`remotePair`
- candidateTechniques：`remotePair` (4216)
- analysisDiagnostics：opportunities=73, complete=true, expanded=false, limits=none

## 样本 25：tg2-catalog-emptyRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`twoStringKite`
- nativeReplayAutomaticTechnique：`twoStringKite`
- candidateTechniques：`twoStringKite` (4163)、`turbotFish` (4163)、`emptyRectangle` (4163)、`simpleColoring` (4192)、`xyChain` (5229)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 26：tg2-catalog-uniqueRectangleType4

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`uniqueRectangleType4`
- nativeReplayAutomaticTechnique：`uniqueRectangleType4`
- candidateTechniques：`uniqueRectangleType4` (4142)
- analysisDiagnostics：opportunities=69, complete=true, expanded=true, limits=none

## 样本 27：tg2-catalog-hiddenRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`hiddenRectangle`
- nativeReplayAutomaticTechnique：`hiddenRectangle`
- candidateTechniques：`hiddenRectangle` (4141)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 28：tg2-catalog-avoidableRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`avoidableRectangle`
- nativeReplayAutomaticTechnique：`avoidableRectangle`
- candidateTechniques：`avoidableRectangle` (4109)、`forcingChain` (5219)、`xyChain` (5282)
- analysisDiagnostics：opportunities=118, complete=true, expanded=true, limits=none

## 样本 29：tg2-catalog-uniqueRectangle

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`uniqueRectangle`
- nativeReplayAutomaticTechnique：`uniqueRectangle`
- candidateTechniques：`uniqueRectangle` (4142)
- analysisDiagnostics：opportunities=7, complete=true, expanded=false, limits=none

## 样本 30：tg2-catalog-bugPlusOne

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`bugPlusOne`
- nativeReplayAutomaticTechnique：`bugPlusOne`
- candidateTechniques：`bugPlusOne` (4064)
- analysisDiagnostics：opportunities=305, complete=true, expanded=true, limits=none

## 样本 31：tg2-catalog-finnedXWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`finnedXWing`
- nativeReplayAutomaticTechnique：`finnedXWing`
- candidateTechniques：`finnedXWing` (4178)、`emptyRectangle` (4192)、`groupedAic` (5178)
- analysisDiagnostics：opportunities=117, complete=true, expanded=false, limits=none

## 样本 32：tg2-catalog-sashimiXWing

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`sashimiXWing`
- nativeReplayAutomaticTechnique：`sashimiXWing`
- candidateTechniques：`sashimiXWing` (4163)、`skyscraper` (4164)、`turbotFish` (4164)、`multiColoring` (4164)、`xChain` (5164)、`forcingNet` (5201)、`groupedAic` (5213)
- analysisDiagnostics：opportunities=81, complete=true, expanded=false, limits=none

## 样本 33：tg2-catalog-jellyfish

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`jellyfish`
- nativeReplayAutomaticTechnique：`jellyfish`
- candidateTechniques：`jellyfish` (5176)
- analysisDiagnostics：opportunities=25, complete=true, expanded=false, limits=none

## 样本 34：tg2-catalog-xChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingNet`
- nativeReplayAutomaticTechnique：`forcingNet`
- candidateTechniques：`forcingNet` (5187)、`xChain` (5241)、`groupedAic` (5248)
- analysisDiagnostics：opportunities=82, complete=true, expanded=false, limits=none

## 样本 35：tg2-catalog-xyChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`xyChain`
- nativeReplayAutomaticTechnique：`xyChain`
- candidateTechniques：`xyChain` (5328)
- analysisDiagnostics：opportunities=20, complete=true, expanded=false, limits=none

## 样本 36：tg2-catalog-aic

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`aic`
- nativeReplayAutomaticTechnique：`aic`
- candidateTechniques：`aic` (5286)
- analysisDiagnostics：opportunities=4, complete=true, expanded=false, limits=none

## 样本 37：tg2-catalog-groupedAic

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`groupedAic`
- nativeReplayAutomaticTechnique：`groupedAic`
- candidateTechniques：`groupedAic` (5269)
- analysisDiagnostics：opportunities=21, complete=true, expanded=false, limits=none

## 样本 38：tg2-catalog-complexColoring

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`complexColoring`
- nativeReplayAutomaticTechnique：`complexColoring`
- candidateTechniques：`complexColoring` (5242)
- analysisDiagnostics：opportunities=76, complete=true, expanded=false, limits=none

## 样本 39：tg2-catalog-forcingChain

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingChain`
- nativeReplayAutomaticTechnique：`forcingChain`
- candidateTechniques：`forcingChain` (5238)、`forcingNet` (5259)、`aic` (5286)
- analysisDiagnostics：opportunities=4, complete=true, expanded=false, limits=none

## 样本 40：tg2-catalog-forcingNet

- scenarioFamily：`technique_catalog`
- attributionEligibility：`eligible`
- automaticTechnique：`forcingNet`
- nativeReplayAutomaticTechnique：`forcingNet`
- candidateTechniques：`forcingNet` (5064)
- analysisDiagnostics：opportunities=4, complete=true, expanded=false, limits=none

## 样本 41：tg2-placement-closure-001

- scenarioFamily：`placement_closure`
- attributionEligibility：`eligible`
- automaticTechnique：`lockedCandidates.claiming`
- nativeReplayAutomaticTechnique：`lockedCandidates.claiming`
- candidateTechniques：`lockedCandidates.claiming` (2057)、`simpleColoring` (4081)、`swordfish` (4122)、`xyWing` (4133)、`groupedAic` (5136)、`jellyfish` (5168)
- analysisDiagnostics：opportunities=138, complete=true, expanded=true, limits=none

## 样本 42：tg2-hint-counterexample-001

- scenarioFamily：`hint_counterexample`
- attributionEligibility：`ineligible:hint_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 43：tg2-undo-counterexample-001

- scenarioFamily：`undo_counterexample`
- attributionEligibility：`ineligible:undo_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 44：tg2-auto-pencil-counterexample-001

- scenarioFamily：`auto_pencil_counterexample`
- attributionEligibility：`eligible`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

## 样本 45：tg2-rapid-operation-counterexample-001

- scenarioFamily：`rapid_operation_counterexample`
- attributionEligibility：`ineligible:rapid_operation_polluted`
- automaticTechnique：`none`
- candidateTechniques：—
- analysisDiagnostics：not replayed

