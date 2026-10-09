import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  erasedProse,
  lostTechniqueAcronyms,
  variablesPreserved,
} from './copy-invariants.mjs';

test('a natural translation may repeat a parameter but may not lose or invent one', () => {
  assert.equal(
    variablesPreserved(
      'Only {target} has {count}.',
      '{target} 以外は二つ。{target} だけ {count}。',
    ),
    true,
  );
  assert.equal(variablesPreserved('{start} and {end}', '{start}'), false);
  assert.equal(variablesPreserved('{target}', '{target} {digits}'), false);
  assert.equal(variablesPreserved('{count}', '{{count}}'), false);
});

test('placeholder-only copy and punctuation-only sentences are rejected', () => {
  assert.equal(erasedProse('{candidates} is false', '{candidates}'), true);
  assert.equal(erasedProse('{{count}} records', '{{count}}'), true);
  assert.equal(erasedProse('Stage limit reached.', '.'), true);
  assert.equal(
    erasedProse('{candidates} is false', 'Totoo ang {candidates}'),
    false,
  );
  assert.equal(erasedProse('Next', '次へ'), false);
  assert.equal(erasedProse('{digit}s', '{digit}'), false);
});

test('BUG is a Sudoku technique acronym, not a software error', () => {
  assert.deepEqual(lostTechniqueAcronyms('the BUG state', 'el estado ERROR'), [
    'BUG',
  ]);
  assert.deepEqual(lostTechniqueAcronyms('the BUG state', 'el estado BUG'), []);
  assert.deepEqual(lostTechniqueAcronyms('AIC', '交替推理链 (AIC)'), []);
});
