# Google Play Screenshot Plan — en-GB

## Device coverage and image order

Use portrait screenshots for phones. For each tablet size (7-inch and 10-inch), capture four portrait and four landscape screenshots. Keep each device group within Google Play's eight-screenshot limit.

### Phone portrait — five images

1. **Home** — `screenshots/phone/phone-home-9x16.png`; show the product identity, resume/new-game actions, and navigation.
2. **Ordinary Expert game with notes** — `screenshots/phone/phone-game-notes-1080x1920.png`; show the live board and visible candidate notes without an active batch selection.
3. **Candidate multi-select** — `screenshots/phone/phone-multiselect-1080x1920.png`; show selected candidate cells and the batch-remove action clearly.
4. **Technique hint** — `screenshots/phone/phone-hint-hidden-single-1080x1920.png`; show the current hint's board evidence and explanation together.
5. **Mid-game Replay analysis** — `screenshots/phone/phone-replay-midgame-1080x1920.png`; show a progressed board, replay position, and useful analysis.

### 7-inch tablet — eight images

Portrait:

1. **Home** — `screenshots/tablet-7-inch/portrait/tablet-7-home-1200x1920.png`.
2. **Later Expert game with notes** — `screenshots/tablet-7-inch/portrait/tablet-7-game-notes-1200x1920.png`; use the progressed board described below, with candidate 6 focused and no active batch selection.
3. **Digit-first multi-select** — `screenshots/tablet-7-inch/portrait/tablet-7-multiselect-1200x1920.png`; show digits 5 and 6 selected together on that same board. Do not remove candidates.
4. **Level 4 Replay analysis** — `screenshots/tablet-7-inch/portrait/tablet-7-replay-level4-1200x1920.png`; show the Sashimi X-Wing at Step 33/62 with the board and analysis visible.

Landscape:

1. **Later Expert game with notes** — `screenshots/tablet-7-inch/landscape/tablet-7-game-notes-1920x1200.png`; same progressed board, normal input state, with candidate 6 focused.
2. **Cell-first multi-select** — `screenshots/tablet-7-inch/landscape/tablet-7-multiselect-1920x1200.png`; select three candidate cells and show the candidate counts. Do not remove candidates.
3. **Level 3 technique hint** — `screenshots/tablet-7-inch/landscape/tablet-7-hint-two-string-kite-1920x1200.png`; show the Two-String Kite explanation on the progressed board.
4. **Level 4 Replay analysis** — `screenshots/tablet-7-inch/landscape/tablet-7-replay-level4-1920x1200.png`; use the same Sashimi X-Wing Replay step as portrait.

### 10-inch tablet — eight images

Portrait:

1. **Home** — `screenshots/tablet-10-inch/portrait/tablet-10-home-1600x2560.png`.
2. **Later Expert game with notes** — `screenshots/tablet-10-inch/portrait/tablet-10-game-notes-1600x2560.png`.
3. **Digit-first multi-select** — `screenshots/tablet-10-inch/portrait/tablet-10-multiselect-1600x2560.png`; digits 5 and 6 are selected together.
4. **Level 4 Replay analysis** — `screenshots/tablet-10-inch/portrait/tablet-10-replay-level4-1600x2560.png`; show the Sashimi X-Wing step.

Landscape:

1. **Home** — `screenshots/tablet-10-inch/landscape/tablet-10-home-2560x1600.png`.
2. **Later Expert game with notes** — `screenshots/tablet-10-inch/landscape/tablet-10-game-notes-2560x1600.png`.
3. **Cell-first multi-select** — `screenshots/tablet-10-inch/landscape/tablet-10-multiselect-2560x1600.png`; show three selected candidate cells without removing candidates.
4. **Level 4 Replay analysis** — `screenshots/tablet-10-inch/landscape/tablet-10-replay-level4-2560x1600.png`.

The 10-inch set uses a second Home view in landscape instead of a separate Level 3 hint. The 7-inch set retains the Two-String Kite hint.

## Capture rules

- Capture genuine app screens from the current `com.platongames.sudoku` build.
- Reuse one real game where practical so the ordinary board, multi-select, hint, and Replay tell a consistent story. Choose the puzzle and replay step separately before the remaining captures.
- Keep candidate notes visible in the ordinary game image. In the multi-select image, make the selected cells/numbers and batch-remove control understandable without implying that a removal has already happened.
- Prefer a mid-session Replay position with populated candidates and multiple useful deductions; avoid an opening board that shows only basic moves.
- Do not use Statistics or the Replay history list, which expose accumulated local scores and play history.
- Keep captures uncomposited and unannotated. Use 9:16 portrait and 16:9 landscape framing, and use English text for the en-GB listing.
- For tablet captures, rotate Android itself and capture the resulting app layout; do not rotate the PNG afterward. The 7-inch emulator is 1200×1920 physically; the capture set uses the device's real 1200×1920 portrait and 1920×1200 landscape output. A temporary display-density override was used to fit the adaptive game layout and is restored after capture.
- The 7-inch live-game images use one Expert board progressed through all available Level 1 and Level 2 steps. Smart Hint's next result was **Two-String Kite** (Level 3), so the board had no Level 1–2 hint remaining; leave the Kite unapplied. The portrait Digit-first and landscape Cell-first multi-select images show this same board in their respective input modes.
- The 10-inch captures use the emulator's native 1600×2560 portrait and 2560×1600 landscape output. Landscape was captured after changing Android's actual orientation; the app's adaptive layout is visible without rotating the PNG.

## Capture status

- Completed: `screenshots/phone/phone-game-notes-1080x1920.png`, refreshed from the current live Expert board on emulator 5560 at 1080×1920. Candidate notes are visible with no hint overlay or active batch selection; the emulator's original display size was restored after capture.
- Completed: `screenshots/phone/phone-multiselect-1080x1920.png`, captured from `com.platongames.sudoku` on emulator 5560 at 1080×1920. It shows four selected candidate cells, the batch-remove control, and per-digit removal counts; no candidates were removed during capture.
- Completed: `screenshots/phone/phone-hint-hidden-single-1080x1920.png`, captured from the current hint panel on emulator 5560 at 1080×1920. It shows the Hidden Single explanation with the supporting board highlights; the hint was not applied.
- Completed: `screenshots/phone/phone-replay-midgame-1080x1920.png`, captured from the prepared Replay view at Step 21/55. It shows the replay board, timeline controls, and board-analysis findings together.
- Completed: `screenshots/phone/phone-home-9x16.png`, captured from the Home tab on emulator 5560 at 1080×1920. It shows the product title, Continue and New Game actions, settings, and bottom navigation.
- Completed: all eight 7-inch captures at native emulator screenshot dimensions. The portrait Digit-first image shows two selected digits (5 and 6); the landscape Cell-first image shows three selected cells and the per-digit counts. Neither image applies a candidate removal.
- Completed: the 7-inch live board was advanced until Smart Hint returned Two-String Kite after Level 1–2 deductions had been applied. The Two-String Kite step itself is left unapplied in the hint image.
- Completed: all eight 10-inch captures at native emulator dimensions. The portrait set contains Home, notes, Digit-first multi-select, and Level 4 Replay; the landscape set contains Home, notes, Cell-first multi-select, and Level 4 Replay. The multi-select images show real selections in each input mode and do not apply removals. Both Replay images show the Sashimi X-Wing analysis.
- The 10-inch landscape set does not include a separate Level 3 hint image; its fourth planned scene is the landscape Home view. The 7-inch landscape set includes the Two-String Kite Level 3 hint.
- The older screenshot PNGs from the legacy `com.jackli717.sudoku` package were removed from this directory. On 2026-09-30, the Play Console en-GB draft showed all five current phone files, eight current 7-inch files, and eight current 10-inch files uploaded. The three groups were reordered to match the plan above, and Play Console confirmed the changes were saved.

Google Play source: [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB).
