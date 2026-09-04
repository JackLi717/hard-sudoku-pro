import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useReplayExplanations } from '../src/ui/screens/useReplayExplanations';
import { teachingFixture } from './helpers/replay';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('playback stays shallow, pause extends, and retry preserves verified paths', async () => {
  const { session, report } = teachingFixture();
  let fail = true;
  const explainReplayMove = jest.fn(async (_s, _m, _signal, options) => {
    const deep = !options.preview;
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

test('tier switch cancels in-flight work, keeps progressive proofs, and never completes a higher tier from a lower budget stop', async () => {
  const { session, report } = teachingFixture();
  const pending: {
    signal: AbortSignal;
    options: import('../src/application/game/replay-analysis-policy').ReplayAnalysisOptions;
    finish(value: typeof report): void;
  }[] = [];
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
    explainReplayMove: jest.fn(
      async (_s, _m, signal, options) =>
        new Promise<typeof report>(finish =>
          pending.push({ signal, options, finish }),
        ),
    ),
  };
  let value!: ReturnType<typeof useReplayExplanations>;
  function Probe({
    level = 'basic',
    enabled = true,
    version = session,
  }: {
    level?: import('../src/application/game/replay-analysis-policy').ReplayAnalysisLevel;
    enabled?: boolean;
    version?: typeof session;
  }) {
    value = useReplayExplanations(
      version,
      version.history[0],
      source,
      enabled,
      true,
      null,
      level,
    );
    return null;
  }
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(<Probe />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(pending[0].options).toMatchObject({ level: 'basic', preview: false });
  await act(async () => pending[0].options.onVerified!(report));
  expect(value.status).toBe('loading');
  expect(value.report?.paths).toEqual(report.paths);
  await act(async () => r.update(<Probe level="advanced" />));
  expect(pending[0].signal.aborted).toBe(true);
  expect(value.report?.paths).toEqual(report.paths);
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  await act(async () =>
    pending[0].finish({ ...report, paths: [], limits: ['time_budget'] }),
  );
  expect(value.status).toBe('loading');
  await act(async () =>
    pending[1].finish({ ...report, limits: ['time_budget'] }),
  );
  expect(value.outcome).toBe('budget');
  await act(async () => r.update(<Probe level="expert" />));
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(source.explainReplayMove).toHaveBeenCalledTimes(3);
  await act(async () => r.update(<Probe level="expert" enabled={false} />));
  expect(pending[2].signal.aborted).toBe(true);
  expect(value.status).toBe('cancelled');
  expect(value.report?.paths).toEqual(report.paths);
  await act(async () => r.update(<Probe level="advanced" />));
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(source.explainReplayMove).toHaveBeenCalledTimes(3);
  expect(value.status).toBe('ready');
  await act(async () => r.update(<Probe version={{ ...session }} />));
  expect(value.report).toBeUndefined();
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(source.explainReplayMove).toHaveBeenCalledTimes(4);
  await act(async () => r.unmount());
});

test('pausing and seeking preempt the one speculative request; late speculative callbacks are isolated', async () => {
  const { session, report } = teachingFixture();
  const next = { ...session.history[0], id: 'next' };
  const pending: {
    signal: AbortSignal;
    options: import('../src/application/game/replay-analysis-policy').ReplayAnalysisOptions;
  }[] = [];
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
    explainReplayMove: jest.fn(async (_s, move, signal, options) => {
      pending.push({ signal, options });
      return move === next ? new Promise<typeof report>(() => {}) : report;
    }),
  };
  let value!: ReturnType<typeof useReplayExplanations>;
  function Probe({ paused = false, move = session.history[0] }) {
    value = useReplayExplanations(session, move, source, true, paused, next);
    return null;
  }
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(<Probe />);
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(pending[1].options).toMatchObject({ level: 'basic', preview: true });
  await act(async () => r.update(<Probe paused />));
  expect(pending[1].signal.aborted).toBe(true);
  await act(async () => pending[1].options.onVerified!(report));
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(pending[2].options.preview).toBe(false);
  await act(async () => r.update(<Probe paused move={next} />));
  expect(value.report).toBeUndefined();
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(source.explainReplayMove).toHaveBeenCalledTimes(4);
  await act(async () => r.unmount());
});
