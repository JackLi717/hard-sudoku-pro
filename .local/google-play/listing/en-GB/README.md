# Google Play listing assets — en-GB

2026-10-13 ASO baseline: current text source is [store-listing/en-GB.json](../../../../docs/operations/store-listing/en-GB.json). The first three phone images are `01-classic-game.png`, `02-auto-notes.png`, and `03-logic-hint.png`, captured from Android 1.0.16 (19) at 1080×1920. German, Japanese and Korean phone assets live in sibling locale directories. Current upload/review state is recorded in the [ASO tracker](../../../../docs/operations/aso-tracker.md); the older capture and submission notes below retain their original dates and do not define the current first-image order.

Editable listing assets and real Android emulator captures for the `com.platongames.sudoku` draft.

## Contents

- `app-icon/icon-512.png` — 512×512 app icon.
- `feature-graphic/feature-graphic.svg` — editable feature-graphic source.
- `feature-graphic/feature-graphic-1024x500.png` — 1024×500 listing graphic.
- `store-listing-copy.md` — English (United Kingdom) listing text.
- `screenshot-plan.md` — capture strategy, image order, and emulator notes.
- `screenshots/phone/` — contains five phone captures: Home, ordinary-game-with-notes, candidate-multi-select, current Hidden Single hint, and mid-game Replay, all at 1080×1920.
- `screenshots/tablet-7-inch/` — eight native 7-inch emulator captures: Home, later-game notes, two input-mode multi-select states, a Two-String Kite hint, and Level 4 Replay, in portrait and landscape as listed in `screenshot-plan.md`.
- `screenshots/tablet-10-inch/` — eight native emulator captures: portrait Home, notes, Digit-first multi-select, and Level 4 Replay; landscape Home, notes, Cell-first multi-select, and Level 4 Replay. Images use native 1600×2560 portrait and 2560×1600 landscape dimensions.

The legacy `com.jackli717.sudoku` captures were removed. Current uploads are for `com.platongames.sudoku`; see screenshot-plan.md for the current device groups and draft status.

The current phone captures were taken from `com.platongames.sudoku` on emulator 5560. The feature graphic was marked as AI-created/edited in the Play Console listing flow.

## Current device additions (2026-10-09)

- `android-tv-banner/tv-banner.svg` and `tv-banner-metal-1280x720.png`: TV store banner using the exact metallic tile artwork from `src/ui/components/HomeBrandEmblem.tsx`. The launcher uses its 320×180 rendering at `android/app/src/main/res/drawable-xhdpi/tv_banner.png`.
- `screenshots/android-tv/`: three genuine 1920×1080 Android TV captures (game with notes, hint observation, hint reasoning), taken from release 1.0.8 (10).
- `screenshots/desktop/`: four genuine 1920×1080 large-window Android captures (game with notes, hint observation, hint conclusion, Home), reused in the PC and Desktop listing fields. These are Android emulator captures, not Windows/Chromebook runtime certification.
- `screenshots/phone/phone-home-metal-1080x1920.png`: current English Home captured from release 1.0.9 (11), with the metallic emblem. Replaces the older phone Home in the listing.

All uploaded source PNGs are retained here. Screenshots are uncomposited, opaque RGB PNGs. Isolated, disposable emulators were used; existing developer/tester device data was not reset. Store asset changes were submitted together with 1.0.9 (11); Publishing overview shows Changes in review, with Google quick checks running. Latest orientation policy: phones, tablets and foldables portrait; TV landscape; desktop follows its window. Tablet landscape assets are retained locally but removed from the current listing draft.

- New English tablet Home captures from 1.0.9 (11): `screenshots/tablet-7-inch/portrait/tablet-7-home-metal-1200x1920.png` and `screenshots/tablet-10-inch/portrait/tablet-10-home-metal-1600x2560.png`. Both show the current metallic emblem, preserved Continue session and portrait layout.

Submission status (2026-10-09, Melbourne): the user approved restarting review provided continuous closed testing is preserved. After checking official policy and Console, 1.0.9 (11) and all seven asset groups were submitted together. Publishing overview shows Changes in review, with Google quick checks running; approval/release is still pending. The Alpha track, testers, countries, opt-in link and signing identity remain unchanged. Dashboard was checked again after submission: 12 testers continuously opted in for 5 days, unchanged.
