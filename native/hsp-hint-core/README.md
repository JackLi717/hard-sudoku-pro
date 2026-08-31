# HSP Hint Core

`hsp-hint-core` is Hard Sudoku Pro's platform-neutral C++20 library for deterministic, human-style Sudoku hints. It has no React Native, JSI, SQLite, UI, localization, answer-grid, or HoDoKu dependency.

The public API accepts the confirmed board and the persisted internal `hintCandidates` masks, then returns one structured atomic step. Detectors run in a fixed order, so identical input produces identical output. Guessing, trial-and-error, backtracking, and answer-derived hints are outside the API boundary.

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
```

Alternatively, with CMake 3.22 or newer:

```bash
cmake -S native/hsp-hint-core -B build/hsp-hint-core
cmake --build build/hsp-hint-core
ctest --test-dir build/hsp-hint-core --output-on-failure
```

The check includes strict-warning unit tests and a deterministic replay of all
100 versioned validation puzzles.  Every catalog detector is independently
exercised against legal replay states (with a focused Avoidable Rectangle
fixture), and every returned action is checked against the stored solution.
The sanitizer command repeats the suite under AddressSanitizer and
UndefinedBehaviorSanitizer.

The React Native 0.87 Codegen TurboModule is integrated on both platforms. iOS
uses an Objective-C++ module with a private serial worker queue; Android uses a
Kotlin module, a single-thread executor, and a minimal JNI entry point. Both
adapters call the same `nextStepJson` C++ boundary, propagate cancellation by
atomic flag, and return the versioned TypeScript `HintStep` contract. HoDoKu2
remains an offline oracle and is never linked into this library or the App.
