# Repository Guidelines

## Project Structure & Module Organization

This React Native 0.87 app targets iOS and Android. `App.tsx` is the root component; `index.js` registers it. Native projects live in `ios/` and `android/`, the platform-neutral hint engine in `native/hsp-hint-core/`, tests in `__tests__/`, and product decisions in `docs/`.

`tools/puzzle-generator/` is the offline HoDoKu2 pipeline. During pre-release experiments, regenerate and replace the current development content in place. Do not hand-edit puzzle data; update the generator and rebuild.

## Build, Test, and Development Commands

- `npm install` — install JavaScript dependencies (Node 22.13+).
- `npm start` — start Metro.
- `npm run ios` / `npm run android` — build and launch the native app.
- `npm run lint` — run the React Native ESLint configuration.
- `npm test -- --runInBand --no-watchman` — run Jest without Watchman.
- `npm run hint:core:check` — compile the C++20 hint core with strict warnings and run its tests.
- `cd tools/puzzle-generator && python3 scripts/build_puzzles.py --per-level 20 --output-dir <temporary-directory>` — generate validation puzzles. Requires Java 21+. Use temporary work files while generating, then replace the current development baseline after validation; do not increment content versions for experiments.

## Coding Style & Naming Conventions

Use TypeScript for new app code. Prettier enforces single quotes, trailing commas, unparenthesized single arrow parameters, and two-space indentation. Use `PascalCase` for components/types, `camelCase` for functions/variables, and `use` prefixes for hooks. Python uses four spaces, `snake_case`, type hints, and the standard library.

Keep UI components out of SQLite details; access content through a dedicated data layer. C++ uses C++20, namespaces under `hsp::hint_core`, `PascalCase` types, and `camelCase` functions. Stable technique codes and schema fields use `snake_case`.

## Testing Guidelines

Jest uses `@react-native/jest-preset`. Name component tests `*.test.tsx` and place them in `__tests__/`. C++ tests live beside the core in `native/hsp-hint-core/tests/`. Add tests for changed behavior; no coverage threshold is enforced. Puzzle pipeline changes must pass SQLite integrity, uniqueness, level-distribution, and forbidden-technique checks in `validation-report.json`.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects. Continue that style, optionally scoped, for example `feat(puzzles): add content v2 builder`. Commit generated content and its manifest with the policy or tool change that produced it.

Pull requests should explain intent, list verification commands, link issues, and include screenshots for UI changes. Explicitly call out schema, rating-policy, native, or vendored-tool changes.

## Architecture & Content Safety

HoDoKu2 is build-time tooling and must not be bundled into the mobile app. The shipped content database is read-only and updated only with App releases. Preserve vendor licenses, pinned tool checksums, and the separation between `content.sqlite` and user-progress storage. Do not retain per-experiment audit archives or historical generated databases unless explicitly requested.

## Release Stage & Versioning Policy

**Current stage: first public version, pre-release development.** No public user-data compatibility baseline has been shipped yet. This status is authoritative until this section is explicitly updated after the first public release.

During this stage:

- Keep one current development schema, protocol, content baseline, and algorithm policy; update them in place. Existing committed development outputs, including `content-v4`, may be regenerated and replaced.
- Do not add release-management steps, immutable historical content archives, audit workflows, compatibility branches, sequential migrations, or new version numbers for experiments and foundational work.
- Temporary checkpoints are allowed to avoid repeating expensive generation, but they are disposable implementation details and should not become committed audit artifacts.
- Keep only checks needed to establish correctness: valid and unique puzzles, accurate difficulty, required technique coverage, SQLite integrity, and relevant app tests. A concise validation summary is enough.
- Pre-release databases, progress data, and fixtures may be reset or rebuilt when internal semantics change. Preserve stable IDs and clear serialization boundaries, without supporting superseded internal states.
- Maintain vendor licenses and pinned tooling integrity; these are independent of release auditing.

At the first release candidate, record the initial public compatibility baseline for the app, user schema, shipped content, and any persisted growth-model semantics. After public release, changes that must read, migrate, or reinterpret shipped data require explicit versioning, migration tests, and documented compatibility decisions.

When development moves to version 2 or any post-release line, update **Current stage** here before implementation begins, list the shipped baseline that must remain compatible, and then apply the post-release migration rules. Do not leave this file claiming pre-release status after the first public release.
