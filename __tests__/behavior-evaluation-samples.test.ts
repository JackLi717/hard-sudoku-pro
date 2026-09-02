import samples from '../tools/behavior-evaluation/samples/tg2-initial-review-samples.json';
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
  });
});
