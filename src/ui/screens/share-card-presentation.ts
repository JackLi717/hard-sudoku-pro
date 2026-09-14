import type { ProductLocale } from '../../application';
import type { GameState, UndoSnapshot } from '../../domain/game/contracts';
import type { Board } from '../../domain/sudoku/contracts';

export type BoardSnapshot = {
  givens: Board;
  values: Board;
};

export type ShareResultFacts = {
  kind: 'result';
  isNewRecord: boolean;
  boardSnapshot: BoardSnapshot;
  difficultyLevel: GameState['difficultyLevel'];
  elapsedMs: number;
  mistakes: number;
  hints: number;
};

export type ShareCurrentBoardFacts = {
  kind: 'current_board';
  boardSnapshot: BoardSnapshot;
  difficultyLevel: GameState['difficultyLevel'];
  step: number;
  totalSteps: number;
};

export type ShareCardFacts = ShareResultFacts | ShareCurrentBoardFacts;

export type ShareCardCopy = {
  entry: string;
  shareResult: string;
  shareCurrentBoard: string;
  title: string;
  share: string;
  preparing: string;
  retry: string;
  failed: string;
  shareFailed: string;
  mistakes: (count: number) => string;
  hints: (count: number) => string;
  replayBadge: (step: number) => string;
  currentBoardLine: string;
  finalBoardLine: string;
  badge: {
    newRecord: string;
  };
  line: Record<ShareCardLine, string>;
  challenge: string;
  currentBoardChallenge: string;
  finalBoardChallenge: string;
};

export type ShareCardLine =
  | 'perfect'
  | 'no_hints'
  | 'no_mistakes'
  | 'completed';

export function shareCardFactsFromCompletedGame(
  state: GameState,
  isNewRecord = false,
): ShareResultFacts | null {
  if (
    state.status !== 'completed' ||
    !Array.isArray(state.values) ||
    state.values.length !== 81 ||
    !Array.isArray(state.givens) ||
    state.givens.length !== 81 ||
    state.values.some(value => value === null)
  ) {
    return null;
  }
  return {
    kind: 'result',
    isNewRecord,
    boardSnapshot: { givens: state.givens, values: state.values },
    difficultyLevel: state.difficultyLevel,
    elapsedMs: state.timer.elapsedMs,
    mistakes: state.errorCount,
    hints: state.hintUseCount,
  };
}

export function shareCardFactsFromReplayFrame(
  state: GameState,
  snapshot: UndoSnapshot,
  step: number,
  totalSteps: number,
): ShareCurrentBoardFacts | null {
  if (
    state.status !== 'completed' ||
    !Array.isArray(snapshot.values) ||
    snapshot.values.length !== 81 ||
    !Array.isArray(state.givens) ||
    state.givens.length !== 81
  ) {
    return null;
  }
  return {
    kind: 'current_board',
    boardSnapshot: { givens: state.givens, values: snapshot.values },
    difficultyLevel: state.difficultyLevel,
    step,
    totalSteps,
  };
}

export function shareCardLine(facts: ShareResultFacts): ShareCardLine {
  if (facts.mistakes === 0 && facts.hints === 0) return 'perfect';
  if (facts.hints === 0) return 'no_hints';
  if (facts.mistakes === 0) return 'no_mistakes';
  return 'completed';
}

export function formatShareTime(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const SHARE_CARD_COPY: Record<ProductLocale, ShareCardCopy> = {
  en: {
    entry: 'Share',
    shareResult: 'Share Result',
    shareCurrentBoard: 'Share Current Board',
    title: 'Share card',
    share: 'Share image',
    preparing: 'Preparing image…',
    retry: 'Try again',
    failed: 'Could not prepare the image.',
    shareFailed: 'Could not open sharing. Try again.',
    mistakes: count => `${count} ${count === 1 ? 'mistake' : 'mistakes'}`,
    hints: count =>
      count === 0 ? 'No hints' : `${count} ${count === 1 ? 'hint' : 'hints'}`,
    replayBadge: step => `Replay · Step ${step}`,
    currentBoardLine: 'Can you find the next move?',
    finalBoardLine: 'Puzzle solved',
    badge: {
      newRecord: 'New record',
    },
    line: {
      perfect: 'Solved without mistakes or hints',
      no_hints: 'Solved with no hints',
      no_mistakes: 'Solved without mistakes',
      completed: 'Puzzle solved',
    },
    challenge: 'Can you beat my time?',
    currentBoardChallenge: 'Can you solve from here?',
    finalBoardChallenge: 'This is how it ended.',
  },
  ja: {
    entry: '共有',
    shareResult: '結果を共有',
    shareCurrentBoard: '現在の盤面を共有',
    title: '共有カード',
    share: '画像を共有',
    preparing: '画像を準備中…',
    retry: 'もう一度試す',
    failed: '画像を作成できませんでした。',
    shareFailed: '共有を開けませんでした。もう一度お試しください。',
    mistakes: count => `ミス ${count}回`,
    hints: count => (count === 0 ? 'ヒントなし' : `ヒント ${count}回`),
    replayBadge: step => `リプレイ · 手順 ${step}`,
    currentBoardLine: '次の一手がわかる？',
    finalBoardLine: 'パズルをクリア',
    badge: {
      newRecord: '新記録',
    },
    line: {
      perfect: 'ミスもヒントもなしでクリア',
      no_hints: 'ヒントなしでクリア',
      no_mistakes: 'ミスなしでクリア',
      completed: 'パズルをクリア',
    },
    challenge: 'このタイムを超えられる？',
    currentBoardChallenge: 'ここから解ける？',
    finalBoardChallenge: 'この盤面でクリアしました。',
  },
  de: {
    entry: 'Teilen',
    shareResult: 'Ergebnis teilen',
    shareCurrentBoard: 'Aktuelles Brett teilen',
    title: 'Teilkarte',
    share: 'Bild teilen',
    preparing: 'Bild wird erstellt…',
    retry: 'Erneut versuchen',
    failed: 'Das Bild konnte nicht erstellt werden.',
    shareFailed: 'Teilen konnte nicht geöffnet werden. Bitte erneut versuchen.',
    mistakes: count => `${count} Fehler`,
    hints: count =>
      count === 0
        ? 'Keine Tipps'
        : `${count} ${count === 1 ? 'Tipp' : 'Tipps'}`,
    replayBadge: step => `Replay · Schritt ${step}`,
    currentBoardLine: 'Findest du den nächsten Zug?',
    finalBoardLine: 'Rätsel gelöst',
    badge: {
      newRecord: 'Neuer Rekord',
    },
    line: {
      perfect: 'Ohne Fehler und Tipps gelöst',
      no_hints: 'Ohne Tipps gelöst',
      no_mistakes: 'Ohne Fehler gelöst',
      completed: 'Rätsel gelöst',
    },
    challenge: 'Schaffst du es schneller?',
    currentBoardChallenge: 'Kannst du von hier aus lösen?',
    finalBoardChallenge: 'So endete das Rätsel.',
  },
  'zh-Hans': {
    entry: '分享',
    shareResult: '分享结果',
    shareCurrentBoard: '分享当前棋盘',
    title: '分享卡',
    share: '分享图片',
    preparing: '正在生成图片…',
    retry: '重试',
    failed: '图片生成失败。',
    shareFailed: '无法打开分享面板，请重试。',
    mistakes: count => `${count} 次错误`,
    hints: count => (count === 0 ? '未用提示' : `${count} 次提示`),
    replayBadge: step => `复盘 · 第 ${step} 步`,
    currentBoardLine: '你能找到下一步吗？',
    finalBoardLine: '已完成这道数独',
    badge: {
      newRecord: '新纪录',
    },
    line: {
      perfect: '零错误、零提示完成',
      no_hints: '不靠提示完成',
      no_mistakes: '零错误完成',
      completed: '完成了这道数独',
    },
    challenge: '你能比我更快吗？',
    currentBoardChallenge: '你能从这里解出来吗？',
    finalBoardChallenge: '这是这一局的最终棋盘。',
  },
};
