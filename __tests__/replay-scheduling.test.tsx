import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useReplayExplanations } from '../src/ui/screens/useReplayExplanations';
import { teachingFixture } from './helpers/replay';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('playback stays shallow, pause extends, and retry preserves verified paths', async () => {
  const { session, report } = teachingFixture();
  let fail = true;
  const explainReplayMove = jest.fn(async (_s, _m, _signal, deep) => {
    if (deep && fail) throw Error('native failure');
    return deep ? report : { ...report, limits: ['depth_limit'] };
  });
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
    explainReplayMove,
  };
  let value!: ReturnType<typeof useReplayExplanations>;
  function Probe({ deep }: { deep: boolean }) {
    value = useReplayExplanations(
      session,
      session.history[0],
      source,
      true,
      deep,
    );
    return null;
  }
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(<Probe deep={false} />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(explainReplayMove).toHaveBeenCalledTimes(1);
  expect(value.report?.paths).toEqual(report.paths);
  await act(async () => {
    r.update(<Probe deep />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(value.status).toBe('failed');
  expect(value.report?.paths).toEqual(report.paths);
  fail = false;
  await act(async () => value.retry());
  expect(value.report?.paths).toEqual(report.paths);
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(value.status).toBe('ready');
  expect(explainReplayMove).toHaveBeenCalledTimes(3);
  await act(async () => r.unmount());
});

test('one-step prefetch is cached and visiting more than eight actions retains the first', async () => {
  const { session, report } = teachingFixture();
  const moves = Array.from({ length: 12 }, (_, i) => ({
    ...session.history[0],
    id: `m${i}`,
  }));
  const explainReplayMove = jest.fn(async () => report);
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
    explainReplayMove,
  };
  function Probe({
    index,
    prefetch = false,
  }: {
    index: number;
    prefetch?: boolean;
  }) {
    useReplayExplanations(
      session,
      moves[index],
      source,
      true,
      false,
      prefetch ? moves[index + 1] : null,
    );
    return null;
  }
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(<Probe index={0} prefetch />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(explainReplayMove).toHaveBeenCalledTimes(2);
  for (let i = 1; i < moves.length; i++) {
    await act(async () => {
      r.update(<Probe index={i} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
  }
  expect(explainReplayMove).toHaveBeenCalledTimes(12);
  await act(async () => {
    r.update(<Probe index={0} />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(explainReplayMove).toHaveBeenCalledTimes(12);
  await act(async () => r.unmount());
});
