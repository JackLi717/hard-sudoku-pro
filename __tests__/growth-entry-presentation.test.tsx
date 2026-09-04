import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import {
  GrowthScreens,
  GrowthSummary,
} from '../src/ui/technique-growth/GrowthScreens';
import { buildGrowthViewModel } from '../src/application/technique-growth/view-model';
import {
  GrowthRecord,
  GrowthSession,
} from '../src/application/technique-growth/contracts';
import { TechniqueGrowthController } from '../src/application/technique-growth/controller';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { teachingFixture } from './helpers/replay';
const wrap = (child: React.ReactNode) => (
  <LocalizationProvider locale="zh-Hans">
    <ThemeProvider preference="light">{child}</ThemeProvider>
  </LocalizationProvider>
);
const text = (r: Renderer.ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .flatMap(n => [n.props.children].flat(Infinity))
    .join(' ');
const node = (r: Renderer.ReactTestRenderer, id: string) =>
  r.root.findAll(n => n.props.testID === id)[0];
const press = (r: Renderer.ReactTestRenderer, label: string) => {
  const found = r.root
    .findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityRole === 'button',
    )
    .find(
      n =>
        n.props.accessibilityLabel === label ||
        n
          .findAllByType(Text)
          .some(t =>
            [t.props.children].flat(Infinity).join('').includes(label),
          ),
    );
  if (!found) throw new Error(label);
  found.props.onPress();
};
const base: GrowthRecord = {
  id: 'hint',
  technique: 'fullHouse',
  kind: 'hint_applied',
  occurredAt: 4,
  reference: { sessionId: 's', moveIds: ['m'] },
  alternatives: [],
  reason: 'learning',
};
const application: GrowthRecord = {
  ...base,
  id: 'application',
  technique: 'nakedSingle',
  kind: 'application',
  occurredAt: 3,
  reason: 'verified_process',
};
const possible: GrowthRecord = {
  ...base,
  id: 'possible',
  technique: 'xWing',
  kind: 'possible',
  occurredAt: 5,
  reason: 'possible_path',
  alternatives: ['xWing', 'swordfish'],
};
const projection: GrowthSession = {
  sessionId: 's',
  puzzleIdentity: 'p',
  status: 'completed',
  difficulty: 1,
  endedAt: 6,
  updatedAt: 7,
  revision: 1,
  inputFingerprint: 'fixed',
  coverage: 'complete',
  records: [base, application, possible],
};
const controller = {
  retry: jest.fn(async () => undefined),
  follow: jest.fn(async () => undefined),
} as unknown as TechniqueGrowthController;

test('result features one supported record; home describes the latest actual encounter, without mutating facts', async () => {
  const vm = buildGrowthViewModel([projection]);
  const before = JSON.stringify(vm);
  let r!: Renderer.ReactTestRenderer;
  const open = jest.fn();
  await act(async () => {
    r = Renderer.create(
      wrap(<GrowthSummary vm={vm} sessionId="s" onOpen={open} />),
    );
  });
  expect(text(r)).toContain('唯一候选数');
  expect(text(r)).not.toContain('X翼');
  expect(text(r)).not.toContain('提示辅助');
  await act(async () => press(r, '查看全部足迹'));
  expect(open).toHaveBeenCalledTimes(1);
  await act(async () =>
    r.update(wrap(<GrowthSummary vm={vm} onOpen={open} />)),
  );
  expect(text(r)).toContain('X翼');
  expect(text(r)).toContain('可能解释');
  expect(text(r)).not.toContain('有应用记录');
  expect(JSON.stringify(vm)).toBe(before);
  await act(async () => r.unmount());
});
test.each([
  { records: [base], coverage: 'complete' as const, expected: '提示辅助' },
  { records: [possible], coverage: 'complete' as const, expected: '可能解释' },
  { records: [], coverage: 'complete' as const, expected: '本局暂无技巧记录' },
  { records: [], coverage: 'pending' as const, expected: '正在整理本局记录' },
  {
    records: [base],
    coverage: 'pending' as const,
    expected: '正在整理本局记录',
  },
])(
  'summary honestly presents $expected',
  async ({ records, coverage, expected }) => {
    let r!: Renderer.ReactTestRenderer;
    await act(async () => {
      r = Renderer.create(
        wrap(
          <GrowthSummary
            vm={buildGrowthViewModel([{ ...projection, records, coverage }])}
            sessionId="s"
            onOpen={jest.fn()}
          />,
        ),
      );
    });
    expect(text(r)).toContain(expected);
    expect(text(r)).not.toMatch(/掌握|有应用记录/);
    await act(async () => r.unmount());
  },
);
test('footprint preserves pagination, filtering, expanded evidence and scroll through detail and replay returns', async () => {
  const { session } = teachingFixture();
  const source = {
    readReplaySession: jest.fn(async () => session),
    listReplaySessions: async () => [],
    explainReplayMove: jest.fn(),
  };
  const rows = [
    ...projection.records,
    ...Array.from({ length: 9 }, (_, i) => ({ ...base, id: `hint-${i}` })),
  ];
  const vm = buildGrowthViewModel([{ ...projection, records: rows }]);
  const before = JSON.stringify(vm);
  const replay = jest.fn();
  let r!: Renderer.ReactTestRenderer;
  const render = (hidden = false, nextVm = vm) =>
    wrap(
      <GrowthScreens
        controller={controller}
        vm={nextVm}
        source={source}
        initialSessionId="s"
        onClose={jest.fn()}
        onStart={jest.fn()}
        onReplay={replay}
        hidden={hidden}
      />,
    );
  await act(async () => {
    r = Renderer.create(render());
  });
  expect(node(r, 'growth-record-board').props.accessibilityLabel).toContain(
    '操作前',
  );
  const scroll = node(r, 'growth-footprint-scroll');
  const initialOffset = scroll.props.contentOffset;
  await act(async () =>
    scroll.props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 380 } } }),
  );
  await act(async () => press(r, '查看更多记录'));
  expect(node(r, 'footprint-record-hint-8')).toBeDefined();
  await act(async () => press(r, '学习接触'));
  await act(async () => node(r, 'footprint-record-hint').props.onPress());
  expect(text(r)).toContain('完成不代表理解');
  await act(async () => press(r, '了解这个技巧'));
  expect(node(r, 'growth-footprint').props.accessibilityElementsHidden).toBe(
    true,
  );
  await act(async () => r.update(render(true)));
  await act(async () => r.update(render()));
  // The detail's back control, excluding the mounted hidden footprint.
  const detailBack = r.root
    .findAll(
      n =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        n
          .findAllByType(Text)
          .some(t =>
            [t.props.children].flat(Infinity).join('').includes('‹ 返回'),
          ),
    )
    .at(-1)!;
  await act(async () => detailBack.props.onPress());
  expect(
    node(r, 'footprint-record-hint').props.accessibilityState.expanded,
  ).toBe(true);
  await act(async () => press(r, '回看这一步'));
  expect(replay).toHaveBeenLastCalledWith(application.reference);
  await act(async () => r.update(render(true)));
  await act(async () => r.update(render(false, { ...vm, updating: true })));
  expect(node(r, 'growth-footprint-scroll').props.contentOffset).toBe(
    initialOffset,
  );
  expect(
    node(r, 'footprint-record-hint').props.accessibilityState.expanded,
  ).toBe(true);
  await act(async () => press(r, '全部记录'));
  expect(node(r, 'footprint-record-hint-8')).toBeDefined();
  expect(source.explainReplayMove).not.toHaveBeenCalled();
  expect(JSON.stringify(vm)).toBe(before);
  await act(async () => r.unmount());
});
test('asynchronous results replace pending state without recreating learning or losing the full replay', async () => {
  let r!: Renderer.ReactTestRenderer;
  const replay = jest.fn();
  const render = (p: GrowthSession) =>
    wrap(
      <GrowthScreens
        controller={controller}
        vm={buildGrowthViewModel([p])}
        initialSessionId="s"
        onClose={jest.fn()}
        onStart={jest.fn()}
        onReplay={replay}
      />,
    );
  await act(async () => {
    r = Renderer.create(
      render({ ...projection, coverage: 'pending', records: [] }),
    );
  });
  expect(text(r)).toContain('正在整理');
  expect(text(r)).not.toContain('本局暂无技巧记录');
  await act(async () => press(r, '复盘'));
  expect(replay).toHaveBeenLastCalledWith({ sessionId: 's', moveIds: [] });
  await act(async () => r.update(render(projection)));
  expect(text(r)).not.toContain('正在整理');
  expect(text(r)).toContain('唯一候选数');
  await act(async () =>
    r.update(render({ ...projection, coverage: 'failed' })),
  );
  expect(text(r)).toContain('暂时无法更新');
  expect(text(r)).toContain('唯一候选数');
  await act(async () => press(r, '重试'));
  expect(controller.retry).toHaveBeenCalled();
  await act(async () => r.unmount());
});
