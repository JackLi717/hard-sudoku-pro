import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import { LocalizationProvider } from '../src/localization';
import { LevelPickerModal } from '../src/ui/components/LevelPickerModal';
import { ThemeProvider } from '../src/ui/theme';

type Level = 1 | 2 | 3 | 4 | 5;
const completedByLevel: Record<Level, number> = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
};

function renderPicker({
  busy = false,
  completed = completedByLevel,
  locale = 'en',
  onClose = jest.fn(),
  onSelect = jest.fn(),
}: {
  busy?: boolean;
  completed?: Record<Level, number>;
  locale?: 'en' | 'zh-Hans';
  onClose?: () => void;
  onSelect?: (level: Level) => void;
} = {}) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference="light">
        <LevelPickerModal
          busy={busy}
          completedByLevel={completed}
          onClose={onClose}
          onSelect={onSelect}
          visible
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('LevelPickerModal', () => {
  test('renders all level facts and returns the selected level', async () => {
    const onSelect = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ onSelect });
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Start Hard, 3 completed',
      }).props.accessibilityHint,
    ).toBe('Combined techniques, a greater challenge');
    for (const level of [1, 2, 3, 4, 5]) {
      expect(
        renderer.root.findByProps({ testID: `level-picker-option-${level}` }),
      ).toBeTruthy();
    }

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-4' })
        .props.onPress(),
    );
    expect(onSelect).toHaveBeenCalledWith(4);
    await act(async () => renderer.unmount());
  });

  test('shows Chinese descriptions and only nonzero completion counts beside the name', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({
        locale: 'zh-Hans',
        completed: { 1: 0, 2: 0, 3: 0, 4: 18, 5: 0 },
      });
    });

    const rows = [
      ['简单', '基础技巧，轻松热身'],
      ['中等', '候选判断，稳步进阶'],
      ['困难', '综合技巧，更具挑战'],
      ['专家', '进阶技巧，复杂推理'],
      ['极限', '深度推理，极限挑战'],
    ];
    rows.forEach(([name, description], index) => {
      const option = renderer.root.findByProps({
        testID: `level-picker-option-${index + 1}`,
      });
      const texts = option.findAllByType(Text).map(node => node.props.children);
      expect(texts).toContain(name);
      expect(texts).toContain(description);
      expect(texts).toContain('›');
      expect(texts.filter(value => typeof value === 'number')).toEqual(
        index === 3 ? [18] : [],
      );
    });
    expect(
      renderer.root.findAllByProps({ children: '选择今天想挑战的难度。' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'level-picker-option-4' }).props
        .accessibilityLabel,
    ).toBe('开始专家难度, 已完成 18 题');
    expect(
      renderer.root.findByProps({ testID: 'level-picker-option-1' }).props
        .accessibilityLabel,
    ).toBe('开始简单难度');
    await act(async () => renderer.unmount());
  });

  test('closes from the backdrop and the platform modal request', async () => {
    const onClose = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ onClose });
    });

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-backdrop' })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root.findByType(Modal).props.onRequestClose(),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  test('disables every level while its owner is busy', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ busy: true });
    });

    for (const level of [1, 2, 3, 4, 5]) {
      const option = renderer.root.findByProps({
        testID: `level-picker-option-${level}`,
      });
      expect(option.props.disabled).toBe(true);
      expect(option.props.accessibilityState).toEqual({ disabled: true });
    }
    await act(async () => renderer.unmount());
  });
});
