# Two-String Kite walkthrough

The game, saved replay and hint lab use the same causal explanation, localized in English, Simplified Chinese, Japanese and German.

1. Show the whole kite without separate row and column preamble pages.
2. Assume the elimination target contains the digit, mark it with `?`, and immediately exclude both outer candidates on the same page.
3. Show the row forcing one inner candidate.
4. Show the column forcing the other inner candidate and mark their shared-box conflict.
5. Remove the assumption and explain the original elimination.

The four kite candidates, the elimination target and the complete relationship diagram remain visible from the overview through the conclusion, providing stable context. When a page explains a row, column or box, that complete house is added to the spotlight with the theme's region color. The links needed by the current statement are emphasized while the remaining structural links stay visible at a subdued opacity. Structural lines stop at their exact candidate endpoints instead of extending to the board edge. All candidate, region, assumption, conflict, elimination and mask colors continue to come from the active board theme.

The presentation validates the actual candidate snapshot before reconstructing this proof. It supports rotated patterns, shared outer endpoints and multiple elimination targets. If the required pair relationships cannot be verified, the existing hint presentation is retained. Saved replay retains earlier candidate eliminations when opening its walkthrough.

Hypothetical digits exist only in presentation data. They do not place values, alter candidates, or change the hint's original atomic result. Native solving and persisted contracts are unchanged.

Validation covers four locales, actual native fixtures, inconsistent snapshots, multiple targets, light/dark rendering, stable core cells with page-local house emphasis, exact endpoint geometry at phone/tablet sizes, back navigation, game application, and saved replay candidates.
