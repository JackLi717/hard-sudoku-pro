import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

export async function openGameMenu(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  if (
    renderer.root.findAllByProps({ testID: 'game-more' }).length > 0 &&
    renderer.root.findAllByProps({ testID: 'game-more-panel' }).length === 0
  ) {
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'game-more' }).props.onPress();
    });
  }
}

export async function pressGameMenuTool(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  await openGameMenu(renderer);
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ testID }).props.onPress();
  });
}

export function batchNotesSelected(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  if (renderer.root.findAllByProps({ testID: 'game-more' }).length === 0) {
    return renderer.root.findByProps({ testID: 'multi-select-tool' }).props
      .accessibilityState.selected;
  }
  return renderer.root
    .findByProps({ testID: 'pencil-tool' })
    .findAllByType(Text)
    .some(node => ['Batch notes', '批量笔记'].includes(node.props.children));
}
