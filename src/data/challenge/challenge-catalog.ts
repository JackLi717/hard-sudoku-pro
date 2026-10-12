import { validateContentSource } from '../../domain/lessons/content-source';
import { validateHintEngineRequest } from '../../domain/hints/candidate-state';
import { CHALLENGE_TECHNIQUES } from '../../domain/challenge/contracts';
import type { ChallengeCatalog } from '../../domain/challenge/contracts';
import { hasCandidate } from '../../domain/sudoku/board';
import type { Digit } from '../../domain/sudoku/contracts';

let decoded: ChallengeCatalog | null = null;
export function getChallengeCatalog(): ChallengeCatalog {
  decoded ??= decodeChallengeCatalog(
    require('./generated/challenge-catalog.json'),
  );
  return decoded;
}

export function decodeChallengeCatalog(raw: unknown): ChallengeCatalog {
  const catalog = raw as ChallengeCatalog;
  if (
    catalog.content_usage !== 'challenge' ||
    catalog.set_id !== 'discovery' ||
    !/^[a-f0-9]{64}$/.test(catalog.content_key) ||
    catalog.levels.length !== 6
  )
    throw new Error('Invalid challenge catalog');
  const ids = new Set<string>();
  catalog.levels.forEach((level, index) => {
    if (
      ids.has(level.id) ||
      level.technique_code !== (CHALLENGE_TECHNIQUES[index] ?? null)
    )
      throw new Error('Invalid challenge order');
    ids.add(level.id);
    validateContentSource(level.source);
    const solution = level.source.solution_fingerprint;
    if (
      !/^[1-9]{81}$/.test(solution) ||
      validateHintEngineRequest({
        contractVersion: 1,
        boardFingerprint: solution,
        hintCandidates: Array<number>(81).fill(0),
      }).length ||
      [...level.source.board_fingerprint].some((value, cell) =>
        value === '0'
          ? !hasCandidate(
              level.source.candidate_masks[cell],
              Number(solution[cell]) as Digit,
            )
          : value !== solution[cell],
      )
    )
      throw new Error('Invalid challenge solution');
  });
  return freeze(catalog);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
