# Skyscraper diagram walkthrough

Game hints and replay use the approved ten-scene walkthrough: see both towers, inspect each exact candidate pair, identify the aligned ends, assume a target, exclude the first roof, force its base, exclude the second roof, force its base and show the conflict, then withdraw assumptions and show the original elimination.

The screenshot example has column-4 candidates R6C4/R7C4 and column-9 candidates R5C9/R7C9. Assuming R5C5=5 excludes R6C4 in box 5 and R5C9 in row 5. Their columns force R7C4 and R7C9 to both be 5, contradicting row 7. The aligned row may contain additional candidates; it is not described as another exact pair.

Skyscraper shares the validated pair proof and rendering with Turbot Fish. Its verifier additionally requires two parallel row or column pairs, aligned connecting ends, and offset roofs. It checks the pre-hint candidate snapshot and all original elimination targets. The connecting row/column is used for the conflict even if both bases also share a box. Rotations, arbitrary digits, and roofs sharing a box are supported. An X-Wing or an unrelated Turbot Fish is not presented as a Skyscraper.

The full pattern and surrounding houses remain visible. Each target gets its own assumption and deductions; only that target's current exclusion links light up. Multiple targets share the introductory scenes and one final apply page. Hypothetical values never become placements, and the final page retains exactly the solver's original eliminations.

English, Chinese, Japanese and German use the same steps. Tests cover the actual example, rotations, multiple targets, candidate snapshot validation, the native fixture, shared-box alignment, light/dark board rendering, backward navigation and overlay cleanup, game application, and read-only saved replay. No native solver or persistence contract changed.
