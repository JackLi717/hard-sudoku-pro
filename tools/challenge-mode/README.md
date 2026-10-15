# Three challenge episodes

Build the eighteen selected real replay sources and their unique answer keys:

```sh
npm run challenges:build
npm run challenges:check
```

The manifest records stable source IDs. The builder uses the committed teaching corpus and regenerates missing selected sources from a temporary subset of the current development puzzle CSV, verifies original uniqueness and replay with the existing native checker, and exports source boards, candidates and answers. `--corpus` and `--checker` can reuse disposable local work. HoDoKu remains offline tooling. Do not hand-edit generated content.

A separate Python solver verifies each original puzzle has exactly one solution, the replay board has the same solution, and every candidate grid preserves the true answer without adding forbidden candidates. Shared allocations exclude answer keys and reject equivalent puzzles across lessons, practice and challenges. The report records source replay, answer validation and specialist theme coverage.

The app judges submitted results by the unique answer: correct digit placements and removals of non-answer candidates are accepted. It does not match technique certificates, require intermediate clicks, enumerate player paths or call native hints during checking. Level 1 and level 6 require a correct fill; levels 2–5 pass on a correct removal or fill. Themes guide observation and do not certify the player's method.

The current small JSON replaces the former route graphs in place. No historical content or audit archive is retained. User progress records actual operations and atomic batch boundaries separately from ordinary games. Runtime validates and caches eighteen sources, replaying saved operations against the current answer key. Saved operations are validated against their source after content updates; adding episodes preserves valid existing attempts and historical passes.

The shared board removes peer candidates on draft fills according to normal game preferences. Overwrite, erase and undo rebuild candidate effects; bad batches roll back entirely. Board Back returns to its current briefing, and briefing Home exits. Drafts survive page and level switches within the same visit; accepted results survive process restart.

Relevant Jest suites are challenge-mode, challenge-catalog and challenge-screen, alongside ordinary practice and app regression tests. The three episodes each contain five themed levels and one composite level. After all six historical passes, one rewarded ad unlocks the next entire episode; Premium skips ads but still requires completion. Access persists independently of attempts and wallet credits. The third episode ends with coming soon. Store/device acceptance remains separate work.
