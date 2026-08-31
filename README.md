# Hard Sudoku Pro

Hard Sudoku Pro is a Sudoku application for iPhone and Android, built with React Native. The project is currently defining its product architecture and offline puzzle-production workflow; gameplay screens and rules are not implemented yet.

## Current scope

- React Native 0.87.1 application scaffold for iOS and Android.
- English, Japanese, German, and Simplified Chinese planned for the first release.
- Read-only puzzle content updated only through App releases.
- Separate future storage for bundled puzzle content and persistent user progress.
- Technique-based difficulty levels from Level 1 to Level 5.
- HoDoKu2-based offline generation, solving, and rating pipeline.
- A 100-puzzle balanced validation set for exercising the content pipeline; this is not the launch library.
- A planned launch library of 10,000–30,000 reviewed offline puzzles, with the final level distribution decided before release.

Product and data decisions are documented in [the architecture guide](docs/product-and-data-architecture.md). The first-release screens, local statistics, ads, purchases, and assist-credit rewards are defined in [the game feature plan](docs/game-feature-plan.md). The implementation order, delivery gates, and test strategy are recorded in [the development roadmap](docs/development-roadmap.md).

## Repository structure

```text
android/                    Android native project
ios/                        iOS native project
__tests__/                  Jest tests
docs/                       Product and architecture decisions
tools/puzzle-generator/     Offline HoDoKu2 content pipeline
App.tsx                     React Native root component
```

HoDoKu2 is a build-time tool only. It is not linked into or distributed with the mobile application. The App will consume a generated `content.sqlite` database after the candidate library has been reviewed.

## Development setup

Requirements:

- Node.js 22.11 or newer
- npm
- React Native iOS/Android development environment

Install dependencies and start Metro:

```bash
npm install
npm start
```

Run the application in another terminal:

```bash
npm run ios
npm run android
```

For the first iOS build, install CocoaPods dependencies:

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## Quality checks

```bash
npm run lint
npm test -- --runInBand --no-watchman
```

## Puzzle content pipeline

The pinned HoDoKu2 binary, rating policy, licenses, build script, and generated review artifacts live in `tools/puzzle-generator/`.

To create a new balanced 100-puzzle validation set:

```bash
cd tools/puzzle-generator
python3 scripts/build_puzzles.py --per-level 20 --content-version 2
```

Puzzle generation requires Java 21 or newer. Content versions are immutable: use a new version number instead of overwriting an existing release. See [the puzzle generator guide](tools/puzzle-generator/README.md) for output formats and validation rules.

## Project status

This repository is in active early development. The generated `content-v1` database is a validation set awaiting human review, not a final production puzzle library.

The vendored HoDoKu2 tool retains its upstream GPL-3.0 license and third-party notices. No license has yet been declared for the rest of this repository.
