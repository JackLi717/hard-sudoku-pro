import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import * as Native from 'react-native';
import { GrowthScreens } from '../src/ui/technique-growth/GrowthScreens';
import { readRecordPreview } from '../src/ui/technique-growth/record-preview';
import { buildGrowthViewModel } from '../src/application/technique-growth/view-model';
import {
  GrowthRecord,
  GrowthSession,
} from '../src/application/technique-growth/contracts';
import { TechniqueGrowthController } from '../src/application/technique-growth/controller';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { teachingFixture } from './helpers/replay';

const record: GrowthRecord = {
  id: 'actual',
  technique: 'fullHouse',
  kind: 'hint_applied',
  occurredAt: 3,
  reference: { sessionId: 's', moveIds: ['m'], recordId: 'actual' },
  alternatives: [],
  reason: 'learning',
};
const projection: GrowthSession = {
  sessionId: 's',
  puzzleIdentity: 'p',
  difficulty: 1,
  status: 'completed',
  endedAt: 3,
  revision: 1,
  inputFingerprint: 'fixed',
  updatedAt: 4,
  coverage: 'complete',
  records: [record],
};
const vm = buildGrowthViewModel([projection]);
const controller = {
  follow: jest.fn(async () => undefined),
  retry: jest.fn(),
} as unknown as TechniqueGrowthController;
const wrap = (child: React.ReactNode) => (
  <LocalizationProvider locale="zh-Hans">
    <ThemeProvider preference="light">{child}</ThemeProvider>
  </LocalizationProvider>
);
const text = (r: Renderer.ReactTestRenderer) =>
  r.root
    .findAllByType(Native.Text)
    .map(n => n.props.children)
    .flat(Infinity)
    .join(' ');
const button = (r: Renderer.ReactTestRenderer, label: string) =>
  r.root
    .findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityRole === 'button',
    )
    .find(
      n =>
        n.props.accessibilityLabel === label ||
        n
          .findAllByType(Native.Text)
          .some(t =>
            [t.props.children].flat(Infinity).join('').includes(label),
          ),
    )!;

test('preview comes from the referenced before snapshot, with no analysis or source mutation', async () => {
  const { session } = teachingFixture();
  const original = JSON.stringify(session);
  const analyze = jest.fn();
  const source = {
    readReplaySession: jest.fn(async () => session),
    listReplaySessions: jest.fn(),
    explainReplayMove: analyze,
  };
  const preview = await readRecordPreview(source, record);
  expect(preview?.values).toEqual(session.history[0].before.values);
  expect(preview?.values[0]).toBeNull();
  expect(session.history[0].after.values[0]).toBe(5);
  expect(preview?.focus).toBe(0);
  expect(source.readReplaySession).toHaveBeenCalledWith('s');
  expect(analyze).not.toHaveBeenCalled();
  expect(JSON.stringify(session)).toBe(original);
});
test('missing reference, wrong session and active game never get a substitute preview', async () => {
  const { session } = teachingFixture();
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
  };
  expect(
    await readRecordPreview(source, {
      ...record,
      reference: { sessionId: 's', moveIds: ['missing'] },
    }),
  ).toBeNull();
  expect(
    await readRecordPreview(source, {
      ...record,
      reference: { sessionId: 'other', moveIds: ['m'] },
    }),
  ).toBeNull();
  session.state.status = 'paused';
  expect(await readRecordPreview(source, record)).toBeNull();
});
test('collection is concise; real preview, source and disclosures survive replay return', async () => {
  const { session } = teachingFixture();
  const source = {
    readReplaySession: jest.fn(async () => session),
    listReplaySessions: async () => [],
  };
  const onReplay = jest.fn();
  let r!: Renderer.ReactTestRenderer;
  const render = (hidden = false) =>
    wrap(
      <GrowthScreens
        controller={controller}
        vm={vm}
        source={source}
        hidden={hidden}
        onReplay={onReplay}
        onClose={jest.fn()}
        onStart={jest.fn()}
      />,
    );
  await act(async () => {
    r = Renderer.create(render());
  });
  expect(text(r)).toContain('学习接触');
  expect(text(r)).not.toContain('应用过程 ·');
  expect(text(r)).not.toContain('实际活动');
  await act(async () =>
    r.root
      .findAll(
        n =>
          typeof n.props.onPress === 'function' &&
          n.props.testID === 'technique-tile-fullHouse',
      )[0]
      .props.onPress(),
  );
  expect(
    r.root.findAll(n => n.props.testID === 'growth-record-board').length,
  ).toBeGreaterThan(0);
  expect(text(r)).toContain('操作前');
  expect(text(r)).not.toContain('应用过程 ·');
  expect(button(r, '过往记录').props.accessibilityState.expanded).toBe(false);
  await act(async () => button(r, '过往记录').props.onPress());
  await act(async () => button(r, '学习接触').props.onPress());
  await act(async () => button(r, '统计与里程碑').props.onPress());
  expect(text(r)).toContain('学习接触 · 1局');
  await act(async () => button(r, '回看这一步').props.onPress());
  expect(onReplay).toHaveBeenCalledWith(record.reference);
  await act(async () => r.update(render(true)));
  await act(async () => r.update(render(false)));
  expect(button(r, '过往记录').props.accessibilityState.expanded).toBe(true);
  expect(button(r, '学习接触').props.accessibilityState.selected).toBe(true);
  expect(button(r, '统计与里程碑').props.accessibilityState.expanded).toBe(
    true,
  );
  expect(source.readReplaySession).toHaveBeenCalledTimes(1);
  await act(async () => r.unmount());
});
test('possible-only records remain possible and missing snapshots show an honest empty preview', async () => {
  const possible = {
    ...record,
    kind: 'possible' as const,
    reason: 'possible_path' as const,
  };
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrap(
        <GrowthScreens
          controller={controller}
          vm={buildGrowthViewModel([{ ...projection, records: [possible] }])}
          source={{
            readReplaySession: async () => null,
            listReplaySessions: async () => [],
          }}
          onReplay={jest.fn()}
          onClose={jest.fn()}
          onStart={jest.fn()}
        />,
      ),
    );
  });
  expect(text(r)).toContain('可能解释');
  expect(text(r)).not.toContain('有应用记录');
  await act(async () =>
    r.root
      .findAll(
        n =>
          typeof n.props.onPress === 'function' &&
          n.props.testID === 'technique-tile-fullHouse',
      )[0]
      .props.onPress(),
  );
  expect(text(r)).toContain('没有可恢复的预览');
  expect(
    r.root.findAll(n => n.props.testID === 'growth-record-board'),
  ).toHaveLength(0);
  await act(async () => r.unmount());
});
test.each([
  { name: 'phone portrait', width: 390, height: 844, fontScale: 1, columns: 1 },
  {
    name: 'phone landscape',
    width: 844,
    height: 390,
    fontScale: 1,
    columns: 1,
  },
  {
    name: 'phone large text',
    width: 390,
    height: 844,
    fontScale: 1.5,
    columns: 1,
  },
  { name: 'iPad', width: 744, height: 1133, fontScale: 1, columns: 3 },
  {
    name: 'iPad large text',
    width: 744,
    height: 1133,
    fontScale: 1.5,
    columns: 1,
  },
])(
  '$name uses $columns columns with accessible touch targets',
  async ({ width, height, fontScale, columns }) => {
    const previous = Native.Dimensions.get('window');
    Native.Dimensions.set({
      window: { width, height, scale: 3, fontScale },
    });
    let r!: Renderer.ReactTestRenderer;
    try {
      await act(async () => {
        r = Renderer.create(
          wrap(
            <GrowthScreens
              controller={controller}
              vm={vm}
              onReplay={jest.fn()}
              onClose={jest.fn()}
              onStart={jest.fn()}
            />,
          ),
        );
      });
      const tile = r.root.findAll(
        n =>
          typeof n.props.onPress === 'function' &&
          n.props.testID === 'technique-tile-fullHouse',
      )[0];
      const style = Native.StyleSheet.flatten(tile.props.style);
      expect(style.width).toBe(
        (Math.min(width - 40, 720) - (columns - 1) * 12) / columns,
      );
      expect(style.flexDirection ?? 'column').toBe(
        columns === 1 ? 'row' : 'column',
      );
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
      expect(tile.props.accessibilityLabel).toContain('学习接触');
      await act(async () => r.unmount());
    } finally {
      Native.Dimensions.set({ window: previous });
    }
  },
);
test('footprint keeps its stable replay action', async () => {
  let r!: Renderer.ReactTestRenderer;
  const onReplay = jest.fn();
  await act(async () => {
    r = Renderer.create(
      wrap(
        <GrowthScreens
          controller={controller}
          vm={vm}
          initialSessionId="s"
          onReplay={onReplay}
          onClose={jest.fn()}
          onStart={jest.fn()}
        />,
      ),
    );
  });
  expect(text(r)).toContain('本局技巧足迹');
  expect(text(r)).toContain('提示辅助');
  await act(async () => button(r, '回看这一步').props.onPress());
  expect(onReplay).toHaveBeenCalledWith(record.reference);
  await act(async () => r.unmount());
});
