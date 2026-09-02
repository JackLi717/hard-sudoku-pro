import samples from '../tools/behavior-evaluation/samples/tg2-initial-review-samples.json';
import proxyCatalogSamples from '../tools/behavior-evaluation/samples/tg2-proxy-catalog-reviewed.json';
import { TECHNIQUES } from '../src/domain/hints/techniques';
import {
  BehaviorReviewSample,
  evaluateBehaviorReviewSamples,
} from '../src/application';

describe('TG-2 initial behavior-review samples', () => {
  test('cover all first-round families without claiming artificial truth', () => {
    const typedSamples = samples as BehaviorReviewSample[];
    expect(typedSamples.map(sample => sample.scenarioFamily).sort()).toEqual(
      [
        'auto_pencil_counterexample',
        'chain',
        'coloring',
        'fish',
        'hint_counterexample',
        'placement_closure',
        'rapid_operation_counterexample',
        'subset',
        'undo_counterexample',
      ].sort(),
    );
    expect(
      typedSamples.every(sample => sample.humanReview.status === 'pending'),
    ).toBe(true);

    const report = evaluateBehaviorReviewSamples(typedSamples);
    expect(report).toMatchObject({
      sampleCount: 9,
      reviewedSampleCount: 0,
      pendingReviewCount: 9,
      defaultExplanationAccuracy: null,
      pollutionIsolationRate: null,
    });
  });

  test('keeps replay requests only for normalized player effects', () => {
    const typedSamples = samples as BehaviorReviewSample[];
    const replayable = typedSamples.filter(
      sample => sample.analysisRequest !== null,
    );
    expect(replayable).toHaveLength(5);
    expect(
      replayable.every(
        sample =>
          sample.analysisDiagnostics?.opportunitySetComplete === true &&
          sample.analysisDiagnostics.reachedEnumerationLimitTechniques
            .length === 0,
      ),
    ).toBe(true);
    expect(
      replayable.some(
        sample => sample.analysisDiagnostics?.usedExpandedSearch === true,
      ),
    ).toBe(true);
    expect(
      replayable.every(sample =>
        sample.analysisRequest!.observedEffects.every(effect =>
          ['placement', 'elimination'].includes(effect.kind),
        ),
      ),
    ).toBe(true);
    expect(
      typedSamples
        .filter(sample => sample.analysisRequest === null)
        .map(sample => sample.scenarioFamily)
        .sort(),
    ).toEqual(
      [
        'auto_pencil_counterexample',
        'hint_counterexample',
        'rapid_operation_counterexample',
        'undo_counterexample',
      ].sort(),
    );
    const closure = typedSamples.find(
      sample => sample.scenarioFamily === 'placement_closure',
    );
    expect(closure?.systemAttribution.automaticTechnique).toBe(
      'lockedCandidates.claiming',
    );
    expect(
      closure?.systemAttribution.candidateTechniques.map(
        candidate => candidate.technique,
      ),
    ).toContain('lockedCandidates.claiming');
  });

  test('passes the full proxy engineering catalog without claiming human review', () => {
    const typedSamples = proxyCatalogSamples as BehaviorReviewSample[];
    const catalogSamples = typedSamples.filter(
      sample => sample.scenarioFamily === 'technique_catalog',
    );
    const report = evaluateBehaviorReviewSamples(typedSamples);

    expect(typedSamples).toHaveLength(44);
    expect(catalogSamples).toHaveLength(TECHNIQUES.length);
    expect(
      new Set(catalogSamples.map(sample => sample.reviewSeedTechnique)),
    ).toEqual(new Set(TECHNIQUES.map(technique => technique.code)));
    expect(
      typedSamples.every(
        sample => sample.humanReview.status === 'proxy_reviewed',
      ),
    ).toBe(true);
    expect(
      Object.values(report.candidateRecallByTechnique).every(
        recall => recall?.recall === 1,
      ),
    ).toBe(true);
    expect(report).toMatchObject({
      sampleCount: 44,
      reviewedSampleCount: 44,
      humanReviewedSampleCount: 0,
      proxyReviewedSampleCount: 44,
      pendingReviewCount: 0,
      eligiblePositiveCount: 40,
      defaultExplanationAccuracy: 0.425,
      misattributionCount: 0,
      missedAttributionCount: 0,
      pollutionIsolationCount: 4,
      pollutionIsolationTotal: 4,
      pollutionIsolationRate: 1,
    });
  });
});
