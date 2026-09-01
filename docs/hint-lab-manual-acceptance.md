# Hint Lab Manual Acceptance

Hint Lab is a development-build-only catalog for manually reviewing all 39
supported hint techniques without changing the production engine's
human-oriented selection order.

## Regenerate fixtures

Run `npm run hint:lab:fixtures`. The C++ exporter replays the versioned
validation corpus, invokes every detector directly, adds the same teaching
proof used by the engine, and writes
`src/debug/generated/hint-lab-fixtures.json`.

The generated catalog must contain exactly one ordered fixture for every
technique with the level distribution `3 / 6 / 5 / 17 / 8`. Do not hand-edit
the generated JSON.

## Manual workflow

1. Run a debug build and choose **Hint Lab · 39 Techniques** on the home page.
2. Open a technique and review every proof page with Next/Back. Use Replay
   animation when timing or color transitions need another look.
3. Check reasoning, visuals, result, and Apply/Undo independently.
4. Mark the fixture Passed, Issue, or Retest and add a note when needed.
5. Use Export on the catalog to share the Markdown acceptance report.

Acceptance state is stored in the separate `hint-acceptance.sqlite` database.
A fixture content-version change invalidates the previous local records.

## Automated gate

`__tests__/hint-lab.test.ts` validates catalog order, level distribution,
presentation, candidate snapshots, Apply, and Undo for all 39 fixtures. Native
detector correctness remains covered by `npm run hint:core:check`.
