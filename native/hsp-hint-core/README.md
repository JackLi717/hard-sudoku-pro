# HSP Hint Core

`hsp-hint-core` is Hard Sudoku Pro's platform-neutral C++20 library for deterministic, human-style Sudoku hints. It has no React Native, JSI, SQLite, UI, localization, answer-grid, or HoDoKu dependency.

The public API accepts the confirmed board and the persisted internal `hintCandidates` masks, then returns one structured atomic step. Detectors run in a fixed order, so identical input produces identical output. Guessing, trial-and-error, backtracking, and answer-derived hints are outside the API boundary.

The initial executable slice supports:

1. Full House
2. Naked Single
3. Hidden Single

Run the same compiler check used by the repository:

```bash
npm run hint:core:check
```

Alternatively, with CMake 3.22 or newer:

```bash
cmake -S native/hsp-hint-core -B build/hsp-hint-core
cmake --build build/hsp-hint-core
ctest --test-dir build/hsp-hint-core --output-on-failure
```

The React Native TurboModule adapter will be added only after the core detector set and replay tests are stable. HoDoKu2 remains an offline oracle and is never linked into this library or the App.
