# Hint Lab Manual Acceptance

Hint Lab is a development-build-only catalog for manually reviewing all 39
supported hint techniques without changing the production engine's
human-oriented selection order.

## Regenerate fixtures

Run `npm run hint:lab:fixtures`. The C++ exporter replays the versioned
validation corpus, invokes every detector directly, adds the same teaching
proof used by the engine, and writes
`src/debug/generated/hint-lab-fixtures.json`.

The generated catalog must contain one ordered primary fixture for every
technique with the level distribution `3 / 6 / 5 / 17 / 8`. A technique may
also contain selected teaching variants. Do not hand-edit the generated JSON.

## Manual workflow

1. Run a debug build and choose **Hint Lab · 39 Techniques** on the home page.
2. Filter the technique catalog by L1–L5, then open a technique. When it has
   multiple examples, choose each board from the dropdown list inside it.
3. Review every proof page with Next/Back and use Restart to replay it.
4. Check reasoning, visuals, result, and Restart/Back independently.
5. Mark the example Passed, Issue, or Retest and add a note when needed.
6. Use Export on the catalog to share the Markdown acceptance report.

Acceptance state is stored in the separate `hint-acceptance.sqlite` database.
A fixture content-version change invalidates the previous local records.

## Automated gate

`__tests__/hint-lab.test.ts` validates catalog order, level distribution,
presentation, candidate snapshots, Apply, and Undo for all 39 fixtures. Native
detector correctness remains covered by `npm run hint:core:check`.

The completed Android acceptance run and per-technique results are recorded in
[`hint-lab-39-technique-acceptance-report.md`](hint-lab-39-technique-acceptance-report.md).
