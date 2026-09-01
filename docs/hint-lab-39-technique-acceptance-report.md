# 39-Technique Hint Acceptance Report

Date: 2026-09-01  
Platform: Android 15 emulator (`Medium_Phone_API_35`)  
Fixture catalog: Hint Lab fixture version 1

## Scope and method

Every supported technique was opened in the Android debug build and every
proof page was captured and reviewed. Each fixture was then exercised through
the same sequence:

1. Observe every staged proof page and review the board mask, source/affected
   regions, cell backgrounds, candidate badges, and elimination strikes.
2. Confirm the final Apply control is enabled.
3. Apply the result and confirm Applied is disabled.
4. Undo the atomic step and confirm the original hint and candidate state are
   restored.

The Android run is backed by the 39-fixture Jest matrix and the native
detector replay, negative, safe-result, randomized-state, and latency gates.

## Results

| # | Level | Technique | Pages | Result |
| -: | -: | --- | -: | --- |
| 1 | 1 | Full House | 2 | Pass |
| 2 | 1 | Naked Single | 2 | Pass |
| 3 | 1 | Hidden Single | 5 | Pass |
| 4 | 2 | Locked Candidates · Pointing | 3 | Pass |
| 5 | 2 | Locked Candidates · Claiming | 3 | Pass |
| 6 | 2 | Locked Pair | 3 | Pass |
| 7 | 2 | Locked Triple | 4 | Pass |
| 8 | 2 | Naked Pair | 3 | Pass |
| 9 | 2 | Hidden Pair | 3 | Pass |
| 10 | 3 | Naked Triple | 4 | Pass |
| 11 | 3 | Hidden Triple | 4 | Pass |
| 12 | 3 | Naked Quad | 5 | Pass |
| 13 | 3 | Hidden Quad | 5 | Pass |
| 14 | 3 | X-Wing | 3 | Pass |
| 15 | 4 | Swordfish | 4 | Pass |
| 16 | 4 | Skyscraper | 3 | Pass |
| 17 | 4 | Two-String Kite | 3 | Pass |
| 18 | 4 | Turbot Fish | 3 | Pass |
| 19 | 4 | W-Wing | 4 | Pass |
| 20 | 4 | XY-Wing | 4 | Pass |
| 21 | 4 | XYZ-Wing | 4 | Pass |
| 22 | 4 | Simple Coloring | 3 | Pass |
| 23 | 4 | Multi-Coloring | 3 | Pass |
| 24 | 4 | Remote Pair | 4 | Pass |
| 25 | 4 | Empty Rectangle | 4 | Pass |
| 26 | 4 | Hidden Rectangle | 4 | Pass |
| 27 | 4 | Avoidable Rectangle | 3 | Pass |
| 28 | 4 | Unique Rectangle | 4 | Pass |
| 29 | 4 | BUG + 1 | 3 | Pass |
| 30 | 4 | Finned X-Wing | 4 | Pass |
| 31 | 4 | Sashimi X-Wing | 3 | Pass |
| 32 | 5 | Jellyfish | 5 | Pass |
| 33 | 5 | X-Chain | 3 | Pass |
| 34 | 5 | XY-Chain | 4 | Pass |
| 35 | 5 | Alternating Inference Chain | 4 | Pass |
| 36 | 5 | Grouped AIC | 4 | Pass |
| 37 | 5 | Complex Coloring | 4 | Pass |
| 38 | 5 | Forcing Chain | 4 | Pass |
| 39 | 5 | Forcing Net | 4 | Pass |

Summary: **39 passed, 0 issues, 0 retest**.

## Issues found and resolved during acceptance

- Candidate highlights used percentage minimum dimensions on Android and could
  stretch into tall blue bars. Candidate badges now use a square aspect ratio.
- A fast second-fixture checklist update could race the Pass write and leave
  Pass disabled. Draft state is now read synchronously and database writes are
  serialized.
- Structural reason pages for many L2-L5 techniques used a generic constraint
  sentence. They now cite the exact page-local candidates and explain the
  relevant subset, fish, wing, coloring, rectangle, chain, or forcing
  relationship. Multi-reason proofs retain partial evidence until the final
  reason page instead of describing a complete structure too early. A
  39-fixture regression test rejects evidence-free or prematurely complete
  structural pages.

## Verification

- `npm run check`
- Android `installDebug`
- Android 39-technique, all-page Apply/Applied/Undo audit
- Stable-page visual review plus post-fix family spot checks for fish, wing,
  rectangle, chain, and forcing proofs
