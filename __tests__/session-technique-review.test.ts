import { buildSessionReview } from '../src/application/technique-recognition/session-review';
import { BehaviorShadowStore } from '../src/data/diagnostics/behavior-shadow-store';
import { AttributionIneligibilityReason } from '../src/domain/technique-recognition/contracts';
import { NodeSqliteDatabase } from './helpers/node-sqlite';
import { reviewRecord, reviewRequest } from './helpers/session-review';

describe('read-only session technique review', () => {
  test('uses saved candidates and effects without changing evidence or deduplicating opportunities', () => {
    const first = reviewRecord();
    const second = reviewRecord({
      recordId: 'second',
      segmentId: 'second',
      recordedAtEpochMs: 2,
      request: reviewRequest({ segmentId: 'second' }),
    });
    const before = JSON.stringify([first, second]);
    const entries = buildSessionReview([first, second], 'review-game');
    expect(entries).toHaveLength(2);
    expect(entries.map(entry => entry.status)).toEqual([
      'explained',
      'explained',
    ]);
    expect(entries[0].request).toEqual(first.request);
    expect(entries[0].attribution?.selectedTechnique).toBeNull();
    expect(JSON.stringify([first, second])).toBe(before);
  });

  test('excludes other games even when segment IDs match', () => {
    const other = reviewRecord({
      sessionId: 'other',
      request: reviewRequest({ sessionId: 'other' }),
    });
    expect(
      buildSessionReview([other, reviewRecord()], 'review-game'),
    ).toHaveLength(1);
    expect(buildSessionReview([other], 'missing')).toEqual([]);
    expect(
      buildSessionReview(
        [reviewRecord({ request: other.request })],
        'review-game',
      ),
    ).toEqual([]);
  });

  test('never promotes historical attribution without hint provenance', () => {
    const record = reviewRecord({
      request: reviewRequest({ hintAssistance: undefined }),
    });
    expect(buildSessionReview([record], 'review-game')[0]).toMatchObject({
      status: 'insufficient',
      reason: 'missing_hint_source',
      hintSourceMissing: true,
    });
    expect(record.diagnostic?.attribution.automaticTechnique).toBe('nakedPair');
  });

  test('retained hint assistance prevents showing an old eligible label as attribution', () => {
    const request = reviewRequest({
      hintAssistance: {
        appliedSources: [],
        knownSources: [],
        affectedEffects: [{ kind: 'placement', cell: 2, digit: 4 }],
      },
    });
    expect(
      buildSessionReview([reviewRecord({ request })], 'review-game')[0],
    ).toMatchObject({ status: 'hint_assisted', reason: 'hint_polluted' });
  });

  test.each<AttributionIneligibilityReason>([
    'hint_polluted',
    'undo_polluted',
    'restore_polluted',
    'incomplete_opportunity_set',
    'revision_expired',
    'board_fingerprint_mismatch',
    'rapid_operation_polluted',
    'invalid_effect',
    'analysis_cancelled',
    'analysis_failed',
  ])('retains %s after a late successful result', reason => {
    const record = reviewRecord();
    const invalidation = reviewRecord({
      recordId: 'invalid',
      phase: 'invalidation',
      request: null,
      recordedAtEpochMs: 2,
      diagnostic: {
        ...record.diagnostic!,
        attribution: {
          ...record.diagnostic!.attribution,
          automaticTechnique: null,
          attributionEligibility: { status: 'ineligible', reason },
        },
      },
    });
    const entries = buildSessionReview(
      [record, invalidation, { ...record, recordedAtEpochMs: 3 }],
      'review-game',
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: reason === 'hint_polluted' ? 'hint_assisted' : 'invalidated',
      reason,
      request: record.request,
    });
  });

  test('keeps reused historical segments with different starting boards separate', () => {
    const record = reviewRecord();
    const entries = buildSessionReview(
      [
        record,
        reviewRecord({
          recordId: 'later',
          recordedAtEpochMs: 2,
          request: reviewRequest({ startingRevision: 8, issuedRevision: 9 }),
        }),
      ],
      'review-game',
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  test('shows requests and provisional results as unfinished until final data arrives', () => {
    const record = reviewRecord();
    const provisional = {
      ...record,
      diagnostic: { ...record.diagnostic!, finality: 'provisional' as const },
    };
    expect(buildSessionReview([provisional], 'review-game')[0]).toMatchObject({
      status: 'insufficient',
      reason: 'unfinished',
      attribution: null,
    });
    expect(
      buildSessionReview([provisional, record], 'review-game')[0].status,
    ).toBe('explained');
  });

  test('does not promote a stale final over a newer cumulative request', () => {
    const record = reviewRecord();
    const request = reviewRequest({
      issuedRevision: 2,
      observedEffects: [
        ...record.request!.observedEffects,
        { kind: 'placement', cell: 2, digit: 4 },
      ],
    });
    expect(
      buildSessionReview(
        [
          record,
          reviewRecord({
            phase: 'request',
            recordedAtEpochMs: 2,
            request,
            diagnostic: null,
          }),
        ],
        'review-game',
      )[0],
    ).toMatchObject({ reason: 'unfinished', attribution: null, request });
  });

  test('preserves missing evidence and no-match diagnostics without invented boards', () => {
    const record = reviewRecord();
    const missing = reviewRecord({ request: null, segmentId: null });
    expect(buildSessionReview([missing], 'review-game')[0]).toMatchObject({
      request: null,
      reason: 'missing_request',
    });
    expect(
      buildSessionReview(
        [
          reviewRecord({
            request: reviewRequest({ startingBoardFingerprint: 'bad' }),
          }),
        ],
        'review-game',
      )[0].request,
    ).toBeNull();
    const noMatch = reviewRecord({
      diagnostic: {
        ...record.diagnostic!,
        attribution: {
          ...record.diagnostic!.attribution,
          automaticTechnique: null,
          candidateTechniques: [],
        },
      },
    });
    expect(buildSessionReview([noMatch], 'review-game')[0]).toMatchObject({
      status: 'insufficient',
      reason: 'no_match',
    });
  });

  test('reads one session from SQLite and notifies after saved writes without mutating records', async () => {
    const database = new NodeSqliteDatabase();
    const store = new BehaviorShadowStore(database);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    await store.save(reviewRecord());
    await store.save(reviewRecord({ recordId: 'other', sessionId: 'other' }));
    const before = await store.readAll();
    expect(await store.readSession('review-game')).toEqual([before[0]]);
    expect(await store.readSession("' OR 1=1 --")).toEqual([]);
    expect(await store.readAll()).toEqual(before);
    expect(listener.mock.calls).toEqual([['review-game'], ['other']]);
    unsubscribe();
    await store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    store.close();
  });
});
