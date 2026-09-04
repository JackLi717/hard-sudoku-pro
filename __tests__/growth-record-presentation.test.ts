import { translate } from '../src/localization';
import { formatRecordTime } from '../src/ui/technique-growth/record-time';
import { readSessionRecordDetails } from '../src/ui/technique-growth/record-preview';
import { GrowthRecord } from '../src/application/technique-growth/contracts';
import { teachingFixture } from './helpers/replay';

const now = new Date('2026-09-04T12:00:00Z').getTime();
const format = (at: number | null) =>
  formatRecordTime(at, now, 'zh-Hans', (key, params) =>
    translate('zh-Hans', key, params),
  );

test.each([
  [0, '刚刚'],
  [59, '刚刚'],
  [60, '1分钟前'],
  [600, '10分钟前'],
  [1800, '30分钟前'],
  [3600, '1小时前'],
  [7200, '2小时前'],
  [86400, '1天前'],
  [172800, '2天前'],
  [604800, '1周前'],
  [691199, '1周前'],
])('%i seconds ago is readable as %s', (seconds, expected) => {
  expect(format(now - seconds * 1000)).toBe(expected);
});
test('older and future times use explicit dates; missing dates stay unknown', () => {
  for (const at of [now - 8 * 86400000, now + 3600000])
    expect(format(at)).toBe(new Date(at).toLocaleDateString('zh-Hans'));
  expect(format(null)).toBe(translate('zh-Hans', 'growth.unknownDate'));
  expect(format(NaN)).toBe(translate('zh-Hans', 'growth.unknownDate'));
});
test.each([
  ['en', '10 minutes ago', '1 hour ago'],
  ['de', 'Vor 10 Minuten', 'Vor 1 Stunde'],
  ['ja', '10分前', '1時間前'],
] as const)('%s uses localized relative time', (locale, minutes, hour) => {
  const t = (
    key: Parameters<typeof translate>[1],
    params?: Parameters<typeof translate>[2],
  ) => translate(locale, key, params);
  expect(formatRecordTime(now - 600000, now, locale, t)).toBe(minutes);
  expect(formatRecordTime(now - 3600000, now, locale, t)).toBe(hour);
});

const record: GrowthRecord = {
  id: 'record',
  technique: 'fullHouse',
  kind: 'hint_applied',
  occurredAt: 3,
  reference: { sessionId: 's', moveIds: ['m'] },
  alternatives: [],
  reason: 'learning',
};
test('all record positions share one read-only replay timeline, including process ranges', async () => {
  const { session } = teachingFixture();
  // A saved candidate update adds a replay frame without adding a board move.
  // The total must therefore come from the replay timeline, not history.length.
  session.replayEvents = [];
  session.state.candidates = {
    ...session.state.candidates,
    manualCandidates: session.state.candidates.manualCandidates.map((c, i) =>
      i === 1 ? 3 : c,
    ),
  };
  const second = {
    ...session.history[0],
    id: 'm2',
    sequence: 2,
    before: session.history[0].after,
    after: session.history[0].after,
  };
  session.history = [...session.history, second];
  const before = JSON.stringify(session);
  const source = {
    readReplaySession: jest.fn(async () => session),
    listReplaySessions: jest.fn(),
    explainReplayMove: jest.fn(),
  };
  const details = await readSessionRecordDetails(source, 's', [
    record,
    {
      ...record,
      id: 'process',
      reference: { sessionId: 's', moveIds: ['m', 'm2'] },
    },
    {
      ...record,
      id: 'missing',
      reference: { sessionId: 's', moveIds: ['lost'] },
    },
    {
      ...record,
      id: 'partial',
      reference: { sessionId: 's', moveIds: ['m', 'lost'] },
    },
    {
      ...record,
      id: 'wrong',
      reference: { sessionId: 'other', moveIds: ['m'] },
    },
  ]);
  expect(details.record).toMatchObject({ start: 1, end: 1, total: 3 });
  expect(details.process).toMatchObject({ start: 1, end: 2, total: 3 });
  expect(details.missing).toBeUndefined();
  expect(details.partial).toBeUndefined();
  expect(details.wrong).toBeUndefined();
  expect(details.record?.preview?.values).toEqual(
    session.history[0].before.values,
  );
  expect(source.readReplaySession).toHaveBeenCalledTimes(1);
  expect(source.explainReplayMove).not.toHaveBeenCalled();
  expect(JSON.stringify(session)).toBe(before);
});
test('hint event references use the same numbered event frame as replay', async () => {
  const { session, step } = teachingFixture();
  const move = session.history[0];
  session.state.replayRecordingSinceRevision = 0;
  session.state.revision = 2;
  session.replayEvents = [
    {
      id: 'shown',
      sessionId: 's',
      previousRevision: 0,
      revision: 1,
      kind: 'reveal_hint',
      move: null,
      targetMoveId: null,
      hint: step,
      before: move.before,
      after: move.before,
      createdAtEpochMs: 2,
    },
    {
      id: 'placed',
      sessionId: 's',
      previousRevision: 1,
      revision: 2,
      kind: 'input_digit',
      move,
      targetMoveId: null,
      hint: null,
      before: move.before,
      after: move.after,
      createdAtEpochMs: 3,
    },
  ];
  const details = await readSessionRecordDetails(
    {
      readReplaySession: async () => session,
      listReplaySessions: async () => [],
    },
    's',
    [
      record,
      {
        ...record,
        id: 'hint',
        kind: 'hint_viewed',
        reference: { sessionId: 's', moveIds: [], eventId: 'shown' },
      },
    ],
  );
  expect(details.hint).toMatchObject({ start: 1, end: 1, total: 2 });
  expect(details.record).toMatchObject({ start: 2, end: 2, total: 2 });
});
test('unavailable, active and mismatched sources do not invent step numbers', async () => {
  const { session } = teachingFixture();
  for (const saved of [
    null,
    { ...session, state: { ...session.state, status: 'paused' as const } },
    { ...session, state: { ...session.state, sessionId: 'other' } },
  ]) {
    expect(
      await readSessionRecordDetails(
        {
          readReplaySession: async () => saved,
          listReplaySessions: async () => [],
        },
        's',
        [record],
      ),
    ).toEqual({});
  }
});
