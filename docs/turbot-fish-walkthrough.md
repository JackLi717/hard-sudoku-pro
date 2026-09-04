# Turbot Fish diagram walkthrough

The game hint, saved replay and hint lab share the eight scenes from the approved interactive diagram: show the four candidates, explain each exact pair, assume the target digit, exclude both endpoints, force the first inner digit, force the second and expose the conflict, then withdraw the assumptions and show the original elimination.

The diagram keeps the complete pattern houses bright. It shows one candidate digit at cell centers, circles the four premises, outlines the target, strikes excluded candidates and marks hypothetical numbers with `?`. Active houses receive a subtle fill; the conflict house, link and two repeated numbers turn red. Other digits are subdued. Navigating backwards reconstructs the scene without changing the actual board.

The screenshot example uses candidate 5 in box 6 (R5C9/R6C8) and row 9 (R9C5/R9C8). Assuming R5C5=5 forces R6C8=5 and R9C8=5, contradicting column 8. The implementation validates the actual candidate snapshot, supports different row/column/box pair arrangements and digits, and falls back to the existing hint when a four-candidate proof cannot be established. Multiple targets are explained separately before one atomic final result.

English, Chinese, Japanese and German share the same scene structure. This is presentation-only: no native solver, persistence contract or hint application change. Regression tests cover the approved screenshot, rotated/renumbered patterns, saved candidate eliminations, invalid snapshots, the native fixture, light/dark diagram rendering, conflict accessibility, backward navigation and assumption cleanup.
