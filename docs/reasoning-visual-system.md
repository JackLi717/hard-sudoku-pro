# Reasoning visual system

Lessons and interactive reasoning use one presentation model. A temporary
deduction is always a candidate-position mark; it is never rendered as a large
cell value and never mutates the puzzle board.

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

## Visual grammar

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

When `HintPageVisuals.diagramDigit` is present, a temporary fact for that digit
is rendered as a large centered digit. A fact may be emitted once by the
reasoning path and again as contradiction evidence; these entries identify one
logical state when cell, digit, path, and truth are equal. The board normalizes
them before choosing a renderer, preserving an assumption role and conclusion
metadata. Different paths or truth values are not merged and continue to use
the candidate-grid representation so no branch information is lost.

## Adding a technique

1. Emit candidate marks for every temporary fact.
2. When a contradiction is reached, emit one of the five canonical conflict
   kinds with exact evidence and a region where applicable.
3. Keep explanatory links and region focus as context; do not encode conflict
   copy or colors on candidate marks.
4. Test the presentation data and the shared board test IDs beginning with
   `sudoku-reasoning-`.
