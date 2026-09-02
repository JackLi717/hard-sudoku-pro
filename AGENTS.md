# Repository Guidelines

## Project Structure & Module Organization

This React Native 0.87 app targets iOS and Android. `App.tsx` is the root component; `index.js` registers it. Native projects live in `ios/` and `android/`, the platform-neutral hint engine in `native/hsp-hint-core/`, tests in `__tests__/`, and product decisions in `docs/`.

`tools/puzzle-generator/` is the offline HoDoKu2 pipeline. Its release outputs are generated artifacts; do not hand-edit committed immutable outputs.

## Build, Test, and Development Commands

- `npm install` — install JavaScript dependencies (Node 22.13+).
- `npm start` — start Metro.
- `npm run ios` / `npm run android` — build and launch the native app.
- `npm run lint` — run the React Native ESLint configuration.
- `npm test -- --runInBand --no-watchman` — run Jest without Watchman.
- `npm run hint:core:check` — compile the C++20 hint core with strict warnings and run its tests.
- `cd tools/puzzle-generator && python3 scripts/build_puzzles.py --per-level 20 --content-version <development-version>` — create 100 validation puzzles in an empty disposable output location. Requires Java 21+. The generator's existing-directory refusal protects immutable artifacts; it is not a reason to increment the product content version. During first-release development, rebuild only an explicitly disposable baseline and never overwrite committed `content-v1` or `content-v4` artifacts.

## Coding Style & Naming Conventions

Use TypeScript for new app code. Prettier enforces single quotes, trailing commas, unparenthesized single arrow parameters, and two-space indentation. Use `PascalCase` for components/types, `camelCase` for functions/variables, and `use` prefixes for hooks. Python uses four spaces, `snake_case`, type hints, and the standard library.

Keep UI components out of SQLite details; access content through a dedicated data layer. C++ uses C++20, namespaces under `hsp::hint_core`, `PascalCase` types, and `camelCase` functions. Stable technique codes and schema fields use `snake_case`.

## Testing Guidelines

Jest uses `@react-native/jest-preset`. Name component tests `*.test.tsx` and place them in `__tests__/`. C++ tests live beside the core in `native/hsp-hint-core/tests/`. Add tests for changed behavior; no coverage threshold is enforced. Puzzle pipeline changes must pass SQLite integrity, uniqueness, level-distribution, and forbidden-technique checks in `validation-report.json`.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects. Continue that style, optionally scoped, for example `feat(puzzles): add content v2 builder`. Commit generated content and its manifest with the policy or tool change that produced it.

Pull requests should explain intent, list verification commands, link issues, and include screenshots for UI changes. Explicitly call out schema, rating-policy, native, or vendored-tool changes.

## Architecture & Content Safety

HoDoKu2 is build-time tooling and must not be bundled into the mobile app. The shipped content database is read-only and updated only with App releases. Preserve vendor licenses, pinned checksums, audit output, and the separation between future `content.sqlite` and user-progress storage.

## Release Stage & Versioning Policy

**Current stage: first public version, pre-release development.** No public user-data compatibility baseline has been shipped yet. This status is authoritative until this section is explicitly updated after the first public release.

During this stage:

- Keep one current development schema, protocol, content baseline, and algorithm policy. Update them in place when the design changes; do not add version fields, compatibility branches, or sequential migrations solely to preserve superseded internal development states.
- Preserve future upgrade seams through stable IDs, explicit serialization boundaries, migration entry points, and reproducible generated artifacts. “Upgrade-ready” does not mean maintaining multiple active pre-release versions.
- Before adding or incrementing a version, identify the real compatibility boundary: publicly shipped user data, an immutable content release, exported data, or persisted semantics that must be reprocessed. If none exists, prefer changing the current baseline and its tests.
- Pre-release development databases and fixtures may be reset or rebuilt when a breaking internal change is intentional. Consolidate/squash development migrations before the release candidate unless a designated Beta dataset has explicitly become a compatibility test baseline.
- For puzzle generation, repeated validation builds do not require new product content versions. Use disposable staging output or rebuild the single documented development baseline. Once an artifact is committed or designated as an immutable release/audit artifact, do not overwrite or reuse its version.
- Do not introduce separate contract, opportunity-policy, profile-policy, and feedback-policy version numbers during initial technique-growth exploration. Use build/config fingerprints for algorithm experiments; establish the minimum persisted compatibility versions only when the first release contract is frozen.

At the first release candidate, record the initial public compatibility baseline for the app, user schema, shipped content, and any persisted growth-model semantics. After public release, changes that must read, migrate, or reinterpret shipped data require explicit versioning, migration tests, and documented compatibility decisions.

When development moves to version 2 or any post-release line, update **Current stage** here before implementation begins, list the shipped baseline that must remain compatible, and then apply the post-release migration rules. Do not leave this file claiming pre-release status after the first public release.
