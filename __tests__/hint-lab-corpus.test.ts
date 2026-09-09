import { readFileSync } from 'node:fs';
import {
  buildHintPresentation,
  HintStep,
  validateHintEngineRequest,
  validateHintStepForState,
} from '../src/domain';
import { HINT_PRESENTATION_COPIES } from '../src/localization';

// Optional pre-selection QA: HINT_LAB_CORPUS_PATH=/tmp/corpus.json npm test -- hint-lab-corpus --runInBand --no-watchman
const corpusPath = process.env.HINT_LAB_CORPUS_PATH;
type CorpusFixture = {
  id: string;
  boardFingerprint: string;
  candidateMasks: readonly number[];
  givenCells: readonly boolean[];
  solutionFingerprint: string;
  engineResult: { step: HintStep };
};
const corpus: { fixtures: CorpusFixture[]; variants?: CorpusFixture[] } =
  corpusPath ? JSON.parse(readFileSync(corpusPath, 'utf8')) : { fixtures: [] };
const examples = [...corpus.fixtures, ...(corpus.variants ?? [])];
const describeCorpus = corpusPath ? describe : describe.skip;
describeCorpus('generated corpus presentation QA', () => {
  test('contains generated examples', () =>
    expect(examples.length).toBeGreaterThan(0));
  test.each(examples)(
    '$id supports verified walkthroughs in all product languages',
    fixture => {
      const request = {
        contractVersion: 1 as const,
        boardFingerprint: fixture.boardFingerprint,
        hintCandidates: fixture.candidateMasks,
        givenCells: fixture.givenCells,
      };
      expect(validateHintEngineRequest(request)).toEqual([]);
      expect(
        validateHintStepForState(
          request,
          fixture.engineResult.step,
          fixture.solutionFingerprint,
        ),
      ).toEqual([]);
      for (const [locale, copy] of Object.entries(HINT_PRESENTATION_COPIES)) {
        const presentation = buildHintPresentation(
          fixture.engineResult.step,
          copy,
          'game',
          fixture.candidateMasks,
        );
        expect({
          locale,
          first: presentation.pages[0].kind,
          last: presentation.pages.at(-1)?.kind,
        }).toEqual({ locale, first: 'observe', last: 'apply' });
        expect(presentation.pages.length).toBeGreaterThanOrEqual(2);
        for (const page of presentation.pages) {
          expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
          expect(page.body).not.toBe(copy.teaching.legacy);
          expect(page.title.length).toBeGreaterThan(0);
          expect(page.body.length).toBeGreaterThan(0);
          expect(page.accessibilitySummary.length).toBeGreaterThan(0);
        }
      }
    },
  );
});
