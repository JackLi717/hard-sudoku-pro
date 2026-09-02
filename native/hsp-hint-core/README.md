# HSP Hint Core

`hsp-hint-core` is Hard Sudoku Pro's platform-neutral C++20 library for deterministic, human-style Sudoku hints. It has no React Native, JSI, SQLite, UI, localization, answer-grid, or HoDoKu dependency.

The public API accepts the confirmed board and the persisted internal
`hintCandidates` masks. `Engine::nextStep()` returns one structured atomic
step. `Engine::collectFrontierOpportunities()` returns every detected
opportunity at the lowest non-empty difficulty level, with the same best step
first; validation, solved, cancellation, and no-step statuses are preserved.
Both methods share one detector and ranking path.

`Engine::startOpportunitySearch()` exposes the same analysis as an isolated,
resumable algorithm session. Each `advance()` budget unit runs exactly one
catalog detector, so work partitioning is deterministic and independent of
wall-clock speed. `frontierOnly` stops after the lowest non-empty level, while
`allDirect` continues through the configured catalog levels on the unchanged
snapshot. Every batch is the complete opportunity snapshot found so far;
one-shot and arbitrarily partitioned searches must finish with identical
ordered results. The session copies board, candidate, and given-cell data,
holds no UI, storage, scheduling, or player-growth state, and may be used
independently alongside other sessions. Individual detectors remain atomic
work units and retain their existing bounded-enumeration policy. Every
completed detector emits its candidate count and a conservative
`reachedEnumerationLimit` diagnostic. Search options keep the runtime bounds
by default and allow larger deterministic limits for algorithm sensitivity
tests without changing hint selection policy.

`analyzeOpportunitySet()` provides the algorithm-only identity and masking
layer used to evaluate those search results. Placements and eliminations are
canonicalized into an outcome; technique plus outcome forms an opportunity
identity. Multiple proofs of the same identity collapse without losing their
variant count, while different techniques with an identical outcome are
marked ambiguous. Non-selected identities are classified as hidden by either
the selected frontier ranking or a lower difficulty level. Atomic placements
and eliminations are also grouped independently, so two unequal outcomes that
share only one action are still exposed as an attribution conflict. This
analysis has no player, timing, persistence, or growth-score input.

`attributeOpportunityEffect()` resolves one placement or elimination against
an analyzed set into four deterministic states: no match, one matching
identity, multiple matching identities from one technique, or matches from
multiple techniques. Only the two one-technique states contain an attributed
technique; a cross-technique result deliberately abstains. “Unique” is always
relative to the supplied bounded opportunity set. A caller must not promote it
to a reliable player attribution when any relevant detector reports
`reachedEnumerationLimit`, and this core result alone never proves that the
player independently discovered the technique.

`compareOpportunityEffectAttribution()` takes a baseline and a comparison
analysis, forms the deterministic union of their effects, and records both
four-state results plus whether the same technique candidate survives. It is
used by enumeration-sensitivity tests to detect a bounded baseline that looks
unique but becomes cross-technique ambiguous after expansion; it does not
silently choose either proof.

`startOpportunitySequence()` and `advanceOpportunitySequence()` provide the
minimal algorithm-only matcher for a continuous series of accepted player
effects. The state keeps the canonical effects already seen and intersects the
remaining normalized identities after every action. A multi-effect outcome is
partial until every effect is present; a shorter completed identity also waits
while a longer overlapping identity remains possible. Only a fully resolved,
single-technique sequence emits a technique candidate. Cross-technique
completion, unrelated board changes, revision gaps, hints, undo, and malformed
events terminate conservatively without attribution. Terminal states are
absorbing. This matcher has no board-diff inference, timing, independence,
storage, scoring, or growth-event policy, and callers must supply an
enumeration-safe opportunity analysis.

The opportunity evaluation replays every one of the 39 Hint Lab detector
outcomes through this sequence matcher in forward, reverse, partial,
unrelated-action, revision-gap, hint, and undo paths. States that hit a default
detector enumeration limit are expanded before sequence matching, and the
evaluation fails if the expanded search still reaches a limit. The report
separates unique completion from cross-technique ambiguity and conservative
waiting caused by longer overlapping identities.

The generated report also audits representative subset, fish, chain, and
coloring conflicts at proof level. It records outcome containment, remaining
effects, proof variants, cost, focus, premises, and proof-reason sequences.
These fields explain why each engine technique is valid, but they are not
treated as observations of the player's reasoning and never break an outcome
tie by level, cost, or proof shape.

Detectors run in a fixed order, so identical input produces identical output.
Guessing, trial-and-error, backtracking, and answer-derived hints are outside
the API boundary.

The JSON bridge also derives localizable explanation parameters from the proof:
focus cells and regions, premise candidates, eliminations, placements, and the
atomic result count. Presentation text remains outside the C++ core.

The runtime detector pipeline now implements the complete version-1 catalog in
the fixed order declared by `kTechniqueCatalog`:

- Level 1: Full House, Naked Single, Hidden Single.
- Level 2: pointing/claiming Locked Candidates, locked pairs/triples, naked
  and hidden pairs.
- Level 3: naked/hidden triples and quads, X-Wing.
- Level 4: Swordfish, Skyscraper, Two-String Kite, Turbot Fish, W/XY/XYZ-Wing,
  simple/multi coloring, Remote Pair, Empty/Hidden/Avoidable/Unique Rectangle,
  BUG+1, Finned X-Wing, and Sashimi X-Wing.
- Level 5: Jellyfish, X/XY-Chain, AIC, Grouped AIC, Complex Coloring, and
  bounded Forcing Chain/Net.

Subset and fish enumeration, conjugate/weak links, two-color components,
grouped candidate nodes, and the bounded implication graph are shared
primitives.  They use deterministic traversal and produce only one atomic
placement or elimination step.  The implication graph propagates Sudoku
constraints; it is not a solution search and has no answer-grid input.
Advanced searches have fixed depth/visited-node bounds and poll the optional
atomic cancellation flag on `HintRequest`; cancellation returns the explicit
`cancelled` status and never exposes a partial proof.

`HintRequest::givenCells` is optional for source compatibility, but it must be
provided to enable Avoidable Rectangle.  That proof depends on distinguishing
immutable clues from values entered during play.  An absent mask disables that
detector rather than risking an invalid uniqueness deduction.

Run the same compiler check used by the repository:

```bash
npm run hint:core:check
npm run hint:core:sanitize
npm run hint:opportunity:evaluate
```

Alternatively, with CMake 3.22 or newer:

```bash
cmake -S native/hsp-hint-core -B build/hsp-hint-core
cmake --build build/hsp-hint-core
ctest --test-dir build/hsp-hint-core --output-on-failure
```

The check includes strict-warning unit tests and a deterministic replay of all
100 versioned validation puzzles plus 1,000 sampled legal intermediate states.
Every catalog detector has positive, solved-board negative, post-result
near-negative, and safe-result coverage against legal replay states (with a
focused Avoidable Rectangle fixture), and
every returned action is checked against the stored solution. Run
`npm run content:production:check` to replay all 10,000 shipping puzzles.
The sanitizer command repeats the suite under AddressSanitizer and
UndefinedBehaviorSanitizer.

The React Native 0.87 Codegen TurboModule is integrated on both platforms. iOS
uses an Objective-C++ module with a private serial worker queue; Android uses a
Kotlin module, a single-thread executor, and a minimal JNI entry point. Both
adapters call the same `nextStepJson` C++ boundary, propagate cancellation by
atomic flag, and return the versioned TypeScript `HintStep` contract. HoDoKu2
remains an offline oracle and is never linked into this library or the App.
