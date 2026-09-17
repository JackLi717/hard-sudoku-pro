import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import { TRANSLATIONS } from '../src/localization/resources';

describe('launch copy terminology', () => {
  const zh = TRANSLATIONS['zh-Hans'];

  test('uses the approved Simplified Chinese player terms', () => {
    expect(zh['game.pencil']).toBe('笔记');
    expect(zh['game.quick']).toBe('快速候选');
    expect(zh['credits.balance']).toBe('可用 {{count}} 次');
    expect(zh['statistics.attempts']).toBe('开局次数');
    expect(zh['statistics.totalTime']).toBe('总游戏时长');
    expect(zh['result.ended']).toBe('本局已结束');
    expect(zh['settings.alternatingBoxShading']).toBe('3×3 宫交错底色');
    expect(zh['board.cell']).toBe('第 {{row}} 行，第 {{column}} 列');
    expect(zh['board.empty']).toBe('空格');
    expect(zh['help.tutorial.step.select']).toBe(
      '每行、每列和每个 3×3 宫都要填入 1–9，而且每个数字不能重复。请点击高亮的空格。',
    );
    expect(zh['modal.replace.body']).toBe(
      '开始新题后，本局会记为“已放弃”，且无法恢复。',
    );
  });

  test('does not expose retired Simplified Chinese aliases in launch resources', () => {
    const playerCopy = JSON.stringify({
      translations: zh,
      hints: HINT_PRESENTATION_COPIES['zh-Hans'],
    });

    expect(playerCopy).not.toMatch(
      /快速铅笔|快速笔记|自动候选|铅笔|备注|额度|库存|余额|单元格|格子|九宫/,
    );
  });

  test('keeps the same concepts across every launch locale', () => {
    expect(
      Object.fromEntries(
        Object.entries(TRANSLATIONS).map(([locale, copy]) => [
          locale,
          [copy['game.pencil'], copy['game.quick'], copy['result.ended']],
        ]),
      ),
    ).toEqual({
      en: ['Notes', 'Quick Candidates', 'Game ended'],
      ja: ['メモ', 'クイック候補', 'このゲームは終了しました'],
      de: ['Notizen', 'Schnellkandidaten', 'Spiel beendet'],
      'zh-Hans': ['笔记', '快速候选', '本局已结束'],
    });
  });
});
