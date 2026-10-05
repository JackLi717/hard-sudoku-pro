/** One visible fill step takes 200ms, including candidate cleanup. */
export const AUTO_FINISH_TIMING = {
  selection: 40,
  placement: 60,
  strike: 60,
  elimination: 40,
} as const;
