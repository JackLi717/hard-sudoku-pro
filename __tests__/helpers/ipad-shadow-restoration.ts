// Minimal board snapshots from the iPad mini session completed 2026-09-03.
// No player identity or timing data. These are regression inputs, not human truth.
export const ipadShadowPuzzle =
  '080200000000080050007000000021070800000009100300000049000001000600030002002000964';
export const ipadShadowSolution =
  '583296471469187253217543698921475836845369127376812549794621385658934712132758964';

export const ipadCandidateRestorations = [
  {
    label: 'R6C5 restore 1',
    board:
      '080200000000080050007000000921070830800309120300802049000621000608934012132758964',
    cell: 49,
    digit: 1 as const,
    originalDeletionRevision: 77,
    originalPlacementRevision: 80,
  },
  {
    label: 'R3C4 restore 5',
    board:
      '080290071000087050007040090921475836800369127370812049700621000608934712132758964',
    cell: 21,
    digit: 5 as const,
    originalDeletionRevision: 99,
    originalPlacementRevision: 102,
  },
];
