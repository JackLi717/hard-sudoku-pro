# Repository Guidelines

## Project Structure & Module Organization

This React Native 0.87 app targets iOS and Android. `App.tsx` is the root component; `index.js` registers it. Native projects live in `ios/` and `android/`, the platform-neutral hint engine in `native/hsp-hint-core/`, tests in `__tests__/`, and product decisions in `docs/`.

`tools/puzzle-generator/` is the offline HoDoKu2 pipeline. Its versioned outputs are generated artifacts; do not hand-edit them.

## Build, Test, and Development Commands

- `npm install` — install JavaScript dependencies (Node 22.13+).
- `npm start` — start Metro.
- `npm run ios` / `npm run android` — build and launch the native app.
- `npm run lint` — run the React Native ESLint configuration.
- `npm test -- --runInBand --no-watchman` — run Jest without Watchman.
- `npm run hint:core:check` — compile the C++20 hint core with strict warnings and run its tests.
- `cd tools/puzzle-generator && python3 scripts/build_puzzles.py --per-level 20 --content-version 2` — create 100 validation puzzles. Requires Java 21+; never reuse a content version.

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
