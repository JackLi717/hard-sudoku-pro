import { removeCandidate } from '../src/domain/sudoku/board';
import {
  getChallengeCatalog,
  decodeChallengeCatalog,
} from '../src/data/challenge/challenge-catalog';

const raw = () => JSON.parse(JSON.stringify(getChallengeCatalog()));
test('the cached catalog contains six immutable sources and answer keys, without route graphs', () => {
  const catalog = getChallengeCatalog();
  expect(getChallengeCatalog()).toBe(catalog);
  expect(catalog.levels).toHaveLength(6);
  expect(Object.isFrozen(catalog.levels[5].source.candidate_masks)).toBe(true);
  expect(JSON.stringify(catalog)).not.toContain('nodes');
  expect(JSON.stringify(catalog).length).toBeLessThan(10000);
  expect(decodeChallengeCatalog(raw())).toEqual(catalog);
});
test('a conflicting answer, changed given or removed true candidate rejects content', () => {
  const badAnswer = raw();
  badAnswer.levels[5].source.solution_fingerprint = '1'.repeat(81);
  expect(() => decodeChallengeCatalog(badAnswer)).toThrow(
    'Invalid challenge solution',
  );
  const badGiven = raw();
  badGiven.levels[5].source.solution_fingerprint =
    getChallengeCatalog().levels[0].source.solution_fingerprint;
  expect(() => decodeChallengeCatalog(badGiven)).toThrow();
  const badCandidate = raw();
  badCandidate.levels[5].source.candidate_masks[76] = removeCandidate(
    badCandidate.levels[5].source.candidate_masks[76],
    7,
  );
  expect(() => decodeChallengeCatalog(badCandidate)).toThrow(
    'Invalid challenge solution',
  );
});
