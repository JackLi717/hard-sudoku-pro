# Hint Lab Manual Acceptance

Hint Lab is a development-build-only catalog for manually reviewing all 40
supported hint techniques without changing the engine's selection order.

## Current technique standard

The current standard was approved on **2026-09-16**. Technique identity,
required logical structure and valid conclusions follow the pinned
**HoDoKu2 2.4.3 build 116** reference. Project walkthroughs define how that
logic is presented on a small screen; historical scene counts are not a second
technique definition. Presentation scenes may combine observations when the
complete HoDoKu premise, implication and conclusion remain visible and
verifiable.

Repository commit hashes below identify source provenance only. They do not
override the pinned HoDoKu standard or create a parallel acceptance baseline.

## Content and regeneration

Run `npm run hint:lab:fixtures` to rebuild the development catalog. The builder
mines ordinary givens, retains legal replay histories and selects examples at a
verified lower-technique fixed point. The independent checker replays examples,
counts solutions and verifies teaching proofs and supported mode/geometry coverage.
Do not hand-edit generated JSON. Structural regression cases remain separate
from the visible examples. Run `npm run hint:lab:check` to verify the installed
catalog; requirements are in [hint-lab-example-requirements.md](hint-lab-example-requirements.md).

## Manual workflow

1. Open **Hint Lab · 40 Techniques** in a debug build.
2. Choose a technique, then open the example dropdown. All added examples remain
   available within their technique; previous/next example stays in that group.
3. Review each page using **Back** and **Next**. The final page offers **Restart**.
   The walkthrough does not apply a move to the example.
4. For Jellyfish, tap an outlined elimination target on the board to choose the
   contradiction to examine. Switching targets returns to the target-selection
   stage; switching examples initializes the new example's target.
5. Check the copy, regional colors, candidate marks, hypothetical values and
   conclusion. Mark Passed, Issue or Retest and add a note as appropriate.
6. Export the acceptance report from the catalog.

Acceptance records remain in the separate `hint-acceptance.sqlite` database.
No bulk acceptance marks are set by automated checks.

## Historical restoration source

Commit **`fd7136a`** is the historical source used for the earlier restoration.
The earlier `ff2da43` comparison was not that restoration source. Neither hash
defines current technique logic; the current standard is the pinned HoDoKu2
version above plus this document's approved presentation rules.

The teaching builder, four-language teaching copy, presentation contracts,
naked-single builder and localized technique descriptions are restored from
`fd7136a`. This includes the following individually reviewed implementations:

| Techniques | Restored behavior |
| --- | --- |
| Full House, Hidden Single | Visible evidence region and placed-digit evidence before the conclusion. |
| Naked Single | Combined row/column/box evidence; explicit earlier exclusions when needed. |
| Pointing, Claiming | Source region and affected region retain distinct logical roles. |
| Locked Pair, Locked Triple | Observe the cells, reveal shared line/box in order, then exclude. |
| Naked Pair, Triple, Quad | Three concise scenes; shared-region reveal animation. |
| Hidden Pair, Triple, Quad | Ordered candidate-digit reveals; reserve the cells, then exclude. |
| X-Wing | Theme-colored base and cover lines, both diagonal choices and their common result. |
| Swordfish | Single-digit diagram and complete three-base / three-cover occupancy proof. |
| Jellyfish | Default four-base / four-cover occupancy proof; selectable targets retain an optional contradiction expansion. |
| Finned X-Wing | Distinct fins; each fin assumed individually; delayed strikes; all-fins-false case. |
| Sashimi X-Wing | Hatched missing corner, direct/alternate choices and fin-based exclusion. |
| Skyscraper, Two-String Kite, Turbot Fish, Empty Rectangle | Dedicated diagrams, strong/weak lines, assumptions and conflicts. |
| W-Wing, XY-Wing, XYZ-Wing | Wing evidence and exhaustive alternative pivot values. |
| Simple Coloring, Multi-Coloring, Remote Pair, Complex Coloring | Opposite-state coloring and component implications. |
| Hidden Rectangle, Avoidable Rectangle, Unique Rectangle | Unique-solution premise and hypothetical swapped arrangements. |
| BUG + 1 | Row/column/box occurrence checks before the forced digit. |
| X-Chain, XY-Chain | Complementary endpoint cases and concise deductions. |
| AIC | Merged closing-conflict scene and direct contradiction wording. |
| Grouped AIC | Single-digit grouped diagram, strong-region introductions and both endpoint cases. |
| Forcing Chain, Forcing Net | Concise summaries backed by the complete dependency graph. Contradictory Chain branches are rejected rather than called a common result; Net contradictions name the empty cell or digitless region. |

The shared board renderer, semantic backgrounds, theme tokens and staged
animation styles use the same baseline. They read the current `useAppTheme()`;
no per-lab or historical theme is introduced. Existing ordinary gameplay's
selection fill and note color are retained outside teaching mode. Other screens'
existing static palette import contract remains available; unrelated navigation,
persistence, replay storage and settings are not rolled back.

The current **40 techniques and 543 examples are retained unchanged**, including
their IDs, proofs, replay histories and coverage metadata. Example descriptions
are derived from those current examples. Page counts and coordinates depend on
their proofs.

## Validation scope

Source restoration and behavioral tests are separate from manual device checks.
Automated checks must not be reported as 543 manually played examples. The
catalog tests retain four-language rendering, original candidate snapshots and
atomic Apply/Undo checks at the domain layer. Fish tests independently enumerate
base-line placements and verify all targets; screen tests cover dropdown
selection, Back/Restart and Jellyfish target reset.

### Device review performed

On the iPad mini simulator, using the current light appearance and English UI:

- X-Wing example 1: all four pages and Restart; both diagonal assumptions,
  common eliminations, base/cover colors and legend.
- Swordfish example 1: all current pages; single-digit diagram, three bases and
  covers, occupancy explanation and final exclusions.
- Finned X-Wing example 1: all four pages; outlined fin, true-fin assumption,
  all-fins-false case and final exclusion.
- Sashimi X-Wing example 1: all current pages; hatched missing corner, strong pair,
  direct and alternate cases, at-least-one-fin implication and conclusion.
- Jellyfish example 1: the default four-page occupancy proof and the expanded
  R4C2 contradiction path, including successive forced placements, the red
  contradiction region and final exclusions. Separately selected R4C6 and
  checked its assumption and first propagation page.

The device review above predates the 2026-09-16 Forcing Chain / Net wording
correction. Those changed pages require a fresh manual result in the exported
acceptance report; automated proof and rendering checks do not count as that
manual signoff.

### 2026-09-16 focused follow-up

On the iPhone 15 Pro simulator in English, the changed representative examples
were walked from the first page through the conclusion:

- Forcing Chain example 1 used five pages. Its first branch explicitly reported
  the `R6C2` 7/8 same-cell conflict, the next branch retained the valid
  implication, the merge page rejected the contradictory assumption, and the
  conclusion contained no temporary value.
- Forcing Net example 1 used three pages. Its summary named candidate 4 having
  no remaining position in column 4 and listed `R4C4=4` and `R6C4=4`; the
  conclusion contained only the original `R1C3=1` elimination.

This is a focused manual review of the changed representative pages, not a bulk
Pass for all 66 Forcing Chain / Net examples. The in-app acceptance count was
left unchanged; full-catalog signoff remains an explicit human release task.

These are representative device checks, not manual acceptance of all 543
examples or every language/appearance. The other technique implementations were
reviewed against the specified source baseline individually.

### Checks completed

TypeScript (`npx tsc --noEmit`), ESLint on all changed TypeScript files and
`git diff --check` passed. Relevant Jest suites passed: hint-lab, hint-teaching,
hint-presentation, hint-lab-screen, fish-teaching, hint-theme-semantics,
subset-scenes, naked-single-presentation, sudoku-board-hints,
game-screen-preferences, screen-state, product-experience and session-replay-screen.
The generated example directory has no changes.

### Baseline and cover wording

The second Jellyfish page identifies bases and covers through the board legend
rather than fixed color names. The renderer and legend continue to use the
theme's semantic base and cover colors in both light and dark appearances.
