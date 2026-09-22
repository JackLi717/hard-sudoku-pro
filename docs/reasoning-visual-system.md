# Reasoning visual system

Lessons, interactive reasoning, and ordinary same-digit highlighting use one
candidate-state language. A temporary deduction is always a candidate fact;
even when a single-digit lesson projects it as a large centered digit, it never
becomes a saved board value.

## Shared model

- `ReasoningCandidateMark` describes a temporary candidate fact: its role,
  truth, and optional branch.
- `ReasoningConflict` describes a contradiction separately from those facts.
  Its `evidence` is the exact ordered set of candidate facts that creates the
  contradiction.
- `ReasoningConflictKind` is closed over the five Sudoku contradiction forms.
  Presentation code must not add technique-specific conflict fields.

The model lives in `src/domain/reasoning/contracts.ts`. Hint presenters and the
interactive forcing workspace both emit it directly; there is no parallel
legacy hypothetical-value interface.

## Candidate-state grammar

| State | Compact candidate | Single-digit projection | Meaning |
| --- | --- | --- | --- |
| attention | blue candidate slot | compact blue background | look here; no truth claim |
| assumption true | dashed ring | dashed circle | provisionally accepted |
| consequence true | solid ring | solid circle | established in the current reasoning path |
| false / eliminated | strike | strike | ruled out |
| contradiction | red evidence plus conflict scope | red evidence plus conflict scope | the reasoning path is impossible |

The resolver in `src/ui/candidate-visual-state.ts` owns precedence. Conflict,
falsehood, and truth replace neutral attention rather than stacking unrelated
badges. Selection, `focusDigits`, and potential premises all enter through the
same attention state. Technique presenters describe facts and never choose a
shape or color.

Candidate attention is confined to the candidate's own content box. It must
never color the full cell surface; cell selection and region highlighting are
separate layers.

## Conflict grammar

| Conflict              | Evidence                          | Scope     | Frame             |
| --------------------- | --------------------------------- | --------- | ----------------- |
| `multiple_values`     | two true candidates in one cell   | cell      | dashed cell frame |
| `opposite_truth`      | the same candidate true and false | candidate | dashed cell frame |
| `peer_values`         | the same true digit in peer cells | region    | region boundary   |
| `empty_cell`          | every candidate in one cell false | cell      | dashed cell frame |
| `missing_house_digit` | every position for a digit false  | region    | region boundary   |

The mapping is defined once in
`src/ui/themes/reasoning-conflict-theme.ts`. Candidate rings, strikes,
contradiction red, path colors, and conclusion fills all come from the board
theme. Assumptions use a dashed candidate ring; consequences use a solid ring.

## Motion and reading order

The last item in `ReasoningConflict.evidence` is the incoming fact. It appears
after the existing facts, followed by the conflict frame or region boundary.
This preserves the causal reading order: assumption, propagation, incoming
fact, contradiction. Reduced-motion mode keeps the same states without
depending on motion for meaning.

## Single-digit projection

When `HintPageVisuals.diagramDigit` is present, attention and temporary facts
for that digit are rendered as a large centered digit using the same state
resolver as the compact 3×3 candidate grid. A fact may be emitted once by the
reasoning path and again as contradiction evidence; these entries identify one
logical state when cell, digit, path, and truth are equal. The board normalizes
them before choosing a renderer, preserving an assumption role and conclusion
metadata. Different paths or truth values are not merged. If they still refer
only to the projected digit, the large digit can show the combined ring/strike
state; cells containing facts for different digits retain the candidate grid.

## Adding a technique

1. Emit potential candidates or focus digits for neutral attention.
2. Emit candidate marks only for temporary logical facts.
3. When a contradiction is reached, emit one of the five canonical conflict
   kinds with exact evidence and a region where applicable.
4. Keep explanatory links and region focus as context; do not encode conflict
   copy or colors on candidate marks.
5. Test the presentation data and the shared board test IDs beginning with
   `sudoku-reasoning-`.
