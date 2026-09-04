# Two-String Kite walkthrough

The game, saved replay and hint lab use the same causal explanation, localized in English, Simplified Chinese, Japanese and German.

1. Show the whole kite, then identify the two candidate positions in its row and column.
2. Assume the elimination target contains the digit. Mark this number with `?`.
3. Explain why that assumption excludes both outer candidates.
4. Show the row forcing one inner candidate, then the column forcing the other.
5. Mark the two hypothetical digits in the shared box as a conflict. Remove the assumption and explain the original elimination.

The entire pattern, shared box and connecting corridors remain visible across all pages. The two structural lines extend outwards past their outer candidates to the board edge; their background corridors are bright as well. The line leaves a gap around each endpoint digit. Background numbers are subdued, and unrelated candidates do not receive the blue focus badge. Only the current reasoning emphasis changes while paging.

The presentation validates the actual candidate snapshot before reconstructing this proof. It supports rotated patterns, shared outer endpoints and multiple elimination targets. If the required pair relationships cannot be verified, the existing hint presentation is retained. Saved replay retains earlier candidate eliminations when opening its walkthrough.

Hypothetical digits exist only in presentation data. They do not place values, alter candidates, or change the hint's original atomic result. Native solving and persisted contracts are unchanged.

Validation covers four locales, actual native fixtures, inconsistent snapshots, multiple targets, light/dark rendering, stable masks, extension geometry at phone/tablet sizes, back navigation, game application, and saved replay candidates. Android inspection confirmed the overview with extended lines and bright corridors, and the hypothetical conflict on an actual replay board. The full Jest run passed 983 tests (15 skipped by existing configuration); TypeScript, ESLint and formatting checks passed.
