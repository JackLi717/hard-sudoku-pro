import { verifyReviewProcesses } from '../src/application/technique-recognition/review-processes';
import { GrowthAnalysisRequest } from '../src/domain/technique-recognition/contracts';
import {
  processReviewRecords,
  processResponse,
} from './helpers/process-review';

test('only verifies selected-record processes, keeps alternatives and never writes records', async () => {
  const records = processReviewRecords();
  const original = JSON.stringify(records);
  const analyze = jest.fn(async q => processResponse(q));
  const report = await verifyReviewProcesses(
    records,
    'review-game',
    'review-3',
    { analyze },
    new AbortController().signal,
  );
  expect(report.processes).toHaveLength(3);
  expect(report.placementExplanations).toHaveLength(1);
  expect(report.placementExplanations![0]).toMatchObject({
    dependencyStatus: 'observed',
    independentUse: false,
    localAttribution: { automaticTechnique: 'hiddenSingle' },
  });
  expect(report.placementExplanations![0].paths).toHaveLength(2);
  expect(JSON.stringify(records)).toBe(original);
  expect(
    analyze.mock.calls.every(([q]) => q.requestId.startsWith('review:')),
  ).toBe(true);
});

test('cancellation stops native dispatch even if the native promise never settles', async () => {
  const controller = new AbortController();
  let nativeSignal: AbortSignal | undefined;
  const analyze = jest.fn((_q, options) => {
    nativeSignal = options?.signal;
    return new Promise<never>(() => undefined);
  });
  const run = verifyReviewProcesses(
    processReviewRecords(),
    'review-game',
    'review-3',
    { analyze },
    controller.signal,
  );
  controller.abort();
  await expect(run).rejects.toThrow('cancelled');
  expect(nativeSignal?.aborted).toBe(true);
  expect(analyze).toHaveBeenCalledTimes(1);
});

test('a 30-second total deadline rejects stalled verification and releases its timer', async () => {
  jest.useFakeTimers();
  try {
    const analyze = jest.fn(() => new Promise<never>(() => undefined));
    const run = verifyReviewProcesses(
      processReviewRecords(),
      'review-game',
      'review-3',
      { analyze },
      new AbortController().signal,
    );
    const outcome = run.catch(error => error);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(await outcome).toEqual(new Error('Review cancelled or timed out'));
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('cancelled before starting, foreign sessions and missing records do not invoke native', async () => {
  const controller = new AbortController();
  controller.abort();
  const analyze = jest.fn(async q => processResponse(q));
  await expect(
    verifyReviewProcesses(
      [],
      'review-game',
      'missing',
      { analyze },
      controller.signal,
    ),
  ).rejects.toThrow('cancelled');
  const report = await verifyReviewProcesses(
    processReviewRecords(),
    'foreign',
    'review-3',
    { analyze },
    new AbortController().signal,
  );
  expect(report.processes).toEqual([]);
  expect(analyze).not.toHaveBeenCalled();
});

test('native identities are isolated between review runs and foreign responses stay rejected', async () => {
  const records = processReviewRecords();
  const requests: GrowthAnalysisRequest[] = [];
  const analyze = async (q: GrowthAnalysisRequest) => {
    requests.push(q);
    return { ...processResponse(q), requestId: 'foreign' };
  };
  const first = await verifyReviewProcesses(
    records,
    'review-game',
    'review-3',
    { analyze },
    new AbortController().signal,
  );
  await verifyReviewProcesses(
    records,
    'review-game',
    'review-3',
    { analyze },
    new AbortController().signal,
  );
  expect(new Set(requests.map(q => q.requestId)).size).toBe(requests.length);
  expect(first.processes.every(p => p.attribution === null)).toBe(true);
});
