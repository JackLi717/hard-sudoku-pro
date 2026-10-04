import type { LessonLocale } from '../domain/lessons/contracts';

export type BasicCourse = 'how-to-play' | 'certainty' | 'next-cell';
export const BASIC_COURSES: readonly BasicCourse[] = [
  'how-to-play',
  'certainty',
  'next-cell',
];
type PageCopy = { title: string; body: string };
type BasicCopy = {
  group: string;
  titles: Record<BasicCourse, string>;
  pages: Record<BasicCourse, readonly PageCopy[]>;
  previous: string;
  next: string;
  done: string;
  replay: string;
  nextFrame: string;
  notesMeaning: string;
  row: string;
  column: string;
  box: string;
  select: string;
  enter: string;
  pencil: string;
  note: string;
  hint: string;
  board: string;
  progress: string;
};
export const BASIC_LESSON_COPY: Record<LessonLocale, BasicCopy> = {
  'zh-Hans': {
    group: '基础入门',
    titles: {
      'how-to-play': '如何玩数独',
      certainty: '确定后再填',
      'next-cell': '下一步填哪里',
    },
    previous: '上一页',
    next: '下一页',
    done: '完成',
    replay: '重播演示',
    nextFrame: '下一步演示',
    notesMeaning: '小数字代表可能性，还不是确定的答案。',
    row: '行',
    column: '列',
    box: '宫',
    select: '先点击一个空格',
    enter: '再点击数字 6',
    pencil: '打开笔记',
    note: '依次记下 1、2、7',
    hint: '卡住了？试试提示，寻找下一步。',
    board: '教学棋盘',
    progress: '第 {current} 页，共 {total} 页',
    pages: {
      'how-to-play': [
        {
          title: '认识行、列、宫',
          body: '在空格中填入 1–9。每一行、每一列、每一个 3×3 宫，数字都不能重复。',
        },
        {
          title: '填入一个数字',
          body: '先选择空格，再点击数字键。题目给出的数字保持不变，你填写的数字用不同颜色显示。',
        },
        {
          title: '记下可能的数字',
          body: '还不能确定时，打开“笔记”，再点击数字。格内的小数字代表可能性，还不是答案。',
        },
        {
          title: '需要时查看提示',
          body: '遇到困难时，点击“提示”，寻找下一步的思路。',
        },
      ],
      certainty: [
        {
          title: '这一格能填什么？',
          body: '观察高亮的行、列和宫。这个格子目前还有 {a}、{b} 两种可能，暂时不能确定。',
        },
        {
          title: '先记下来，不急着选',
          body: '我们的题目只有一个完整解，但候选数不等于答案。先把 {a}、{b} 记下来，看看其他位置。',
        },
        {
          title: '换一格，寻找确定的数字',
          body: '观察新选中的格子：同行、同列和同宫已出现的数字，排除了其他可能，因此这里只能填 {digit}。',
        },
        {
          title: '再回来看看',
          body: '填入 {digit} 后，原来的格子不能再填 {digit}，所以只剩下 {remaining}。',
        },
        {
          title: '确定后再填',
          body: '先解决有依据能确定的位置，再回来处理暂时不确定的格子。每填入一个数字，都可能带来新的线索。',
        },
      ],
      'next-cell': [
        {
          title: '先选一个数字',
          body: '不知道从哪里开始？可以先观察出现较多的数字。这里我们选择 {digit}，看看它还缺在哪些宫。',
        },
        {
          title: '看看这个宫',
          body: '这个宫还没有 {digit}。标出的已有数字排除了打叉的位置：同行或同列不能再出现 {digit}。',
        },
        {
          title: '只剩一个位置',
          body: '这个宫必须有一个 {digit}。排除不能填的位置后，只剩高亮的这一格，因此可以确定填入 {digit}。',
        },
        {
          title: '用同样的方法再找一次',
          body: '再看另一个缺少 {digit} 的宫。根据已有的 {digit} 排除位置，这个宫也只剩一个可放的位置。',
        },
        {
          title: '继续观察，寻找下一步',
          body: '逐宫观察同一个数字。暂时没有发现，就换一个数字继续寻找；有明确依据时再填入。',
        },
      ],
    },
  },
  en: {
    group: 'Getting started',
    titles: {
      'how-to-play': 'How to Play',
      certainty: 'Be Sure Before You Fill',
      'next-cell': 'Which Cell to Fill Next',
    },
    previous: 'Previous',
    next: 'Next',
    done: 'Done',
    replay: 'Replay demo',
    nextFrame: 'Next demo step',
    notesMeaning: 'Notes are possibilities, not confirmed answers.',
    row: 'Row',
    column: 'Column',
    box: 'Box',
    select: 'Tap an empty cell',
    enter: 'Then tap 6',
    pencil: 'Turn on Notes',
    note: 'Add notes 1, 2 and 7',
    hint: 'Stuck? Try a hint to find your next step.',
    board: 'Teaching board',
    progress: 'Page {current} of {total}',
    pages: {
      'how-to-play': [
        {
          title: 'Rows, columns and boxes',
          body: 'Fill the empty cells with 1–9. Every row, column and 3×3 box must contain each digit without repeats.',
        },
        {
          title: 'Enter a digit',
          body: 'Select an empty cell, then tap a digit. Given digits stay fixed; your entries appear in a different color.',
        },
        {
          title: 'Note the possibilities',
          body: 'When you are unsure, turn on Notes and tap digits. These small numbers are possibilities, not confirmed answers.',
        },
        {
          title: 'Find help when you need it',
          body: 'When you get stuck, tap Hint for help finding your next step.',
        },
      ],
      certainty: [
        {
          title: 'What can go here?',
          body: 'Look at the highlighted row, column and box. Both {a} and {b} are still possible here; we cannot decide yet.',
        },
        {
          title: 'Make a note and keep looking',
          body: 'Our puzzles have one complete solution, but a candidate is not an answer. Note {a} and {b}, then look elsewhere.',
        },
        {
          title: 'Find a cell you can determine',
          body: 'In this new cell, the digits already in its row, column and box rule out every possibility except {digit}.',
        },
        {
          title: 'Now look back',
          body: 'Once {digit} is filled, the original cell can no longer contain {digit}. Only {remaining} remains.',
        },
        {
          title: 'Be sure before you fill',
          body: 'Solve a cell you can justify, then return to the uncertain ones. Each confirmed digit can reveal a new clue.',
        },
      ],
      'next-cell': [
        {
          title: 'Start with one digit',
          body: 'Not sure where to look? Try a digit that already appears often. Here we choose {digit} and look for boxes still missing it.',
        },
        {
          title: 'Look inside this box',
          body: 'This box needs a {digit}. The marked digits rule out the crossed cells: a row or column cannot repeat {digit}.',
        },
        {
          title: 'Only one place remains',
          body: 'The box must contain a {digit}. After ruling out the other positions, only the highlighted cell remains.',
        },
        {
          title: 'Use the same method again',
          body: 'Look at another box missing {digit}. The existing {digit}s rule out positions until only one place remains here too.',
        },
        {
          title: 'Keep looking for your next step',
          body: 'Scan the boxes for the same digit. If you find no clear move, try another digit. Fill a cell when you can explain why.',
        },
      ],
    },
  },
  ja: {
    group: 'はじめの一歩',
    titles: {
      'how-to-play': '数独の遊び方',
      certainty: '確かめてから入れる',
      'next-cell': '次はどこに入れる？',
    },
    previous: '前へ',
    next: '次へ',
    done: '完了',
    replay: 'もう一度見る',
    nextFrame: '次の動作',
    notesMeaning: '小さな数字は候補であり、確定した答えではありません。',
    row: '行',
    column: '列',
    box: 'ブロック',
    select: '空いているマスをタップ',
    enter: '次に 6 をタップ',
    pencil: 'メモをオンにする',
    note: '1・2・7 をメモする',
    hint: '困ったらヒントで次の一手を探しましょう。',
    board: '学習用の盤面',
    progress: '{total} ページ中 {current} ページ',
    pages: {
      'how-to-play': [
        {
          title: '行・列・ブロック',
          body: '空いているマスに 1〜9 を入れます。各行、各列、各 3×3 ブロックには同じ数字を重複させずに入れます。',
        },
        {
          title: '数字を入れる',
          body: '空いているマスを選んでから、数字をタップします。最初からある数字は変わらず、自分で入れた数字は別の色で表示されます。',
        },
        {
          title: '候補をメモする',
          body: 'まだ決まらないときは「メモ」をオンにして数字をタップします。小さな数字は可能性を表し、確定した答えではありません。',
        },
        {
          title: '必要なときはヒントを',
          body: '行き詰まったら「ヒント」をタップして、次の一手の考え方を確認しましょう。',
        },
      ],
      certainty: [
        {
          title: 'ここには何が入る？',
          body: '強調された行・列・ブロックを見ましょう。ここにはまだ {a} と {b} の可能性があり、決められません。',
        },
        {
          title: 'メモして、ほかを見よう',
          body: 'このアプリの問題の完成形は一つですが、候補は答えではありません。{a} と {b} をメモして、ほかの場所を探しましょう。',
        },
        {
          title: '確定できるマスを探そう',
          body: '新しく選んだマスの行・列・ブロックにある数字を確認すると、{digit} 以外は入れられません。',
        },
        {
          title: '元のマスに戻ろう',
          body: '{digit} を入れると、元のマスには {digit} を入れられなくなります。残るのは {remaining} だけです。',
        },
        {
          title: '確かめてから入れる',
          body: '理由を説明できるマスを埋めてから、迷っていたマスに戻りましょう。確定した数字が新しい手がかりになります。',
        },
      ],
      'next-cell': [
        {
          title: '一つの数字に注目',
          body: 'どこから始めるか迷ったら、盤面に多くある数字に注目しましょう。ここでは {digit} がまだないブロックを探します。',
        },
        {
          title: 'このブロックを見よう',
          body: 'このブロックには {digit} が必要です。印を付けた数字と同じ行や列には {digit} を入れられないので、×のマスを除外できます。',
        },
        {
          title: '残る場所は一つ',
          body: 'このブロックには必ず {digit} が入ります。ほかの位置を除外すると、強調されたマスだけが残ります。',
        },
        {
          title: '同じ方法でもう一度',
          body: '{digit} がまだない別のブロックも見ましょう。すでにある {digit} から位置を除外すると、ここでも一つだけ残ります。',
        },
        {
          title: '次の一手を探し続けよう',
          body: '同じ数字について各ブロックを見ていきます。見つからなければ別の数字へ。理由が分かったマスに入れましょう。',
        },
      ],
    },
  },
  de: {
    group: 'Erste Schritte',
    titles: {
      'how-to-play': 'So spielst du Sudoku',
      certainty: 'Erst sicher, dann eintragen',
      'next-cell': 'Welches Feld kommt als Nächstes?',
    },
    previous: 'Zurück',
    next: 'Weiter',
    done: 'Fertig',
    replay: 'Demo wiederholen',
    nextFrame: 'Nächster Demo-Schritt',
    notesMeaning: 'Notizen sind Möglichkeiten, keine sicheren Antworten.',
    row: 'Zeile',
    column: 'Spalte',
    box: 'Block',
    select: 'Tippe auf ein leeres Feld',
    enter: 'Tippe dann auf 6',
    pencil: 'Notizen einschalten',
    note: '1, 2 und 7 notieren',
    hint: 'Du kommst nicht weiter? Nutze einen Hinweis.',
    board: 'Lernraster',
    progress: 'Seite {current} von {total}',
    pages: {
      'how-to-play': [
        {
          title: 'Zeilen, Spalten und Blöcke',
          body: 'Fülle die leeren Felder mit 1–9. Jede Zeile, jede Spalte und jeder 3×3-Block enthält jede Ziffer genau einmal.',
        },
        {
          title: 'Eine Ziffer eintragen',
          body: 'Wähle ein leeres Feld und tippe dann auf eine Ziffer. Vorgaben bleiben unverändert; deine Einträge haben eine andere Farbe.',
        },
        {
          title: 'Möglichkeiten notieren',
          body: 'Wenn du noch unsicher bist, schalte Notizen ein und tippe auf Ziffern. Die kleinen Zahlen sind Möglichkeiten, keine bestätigten Antworten.',
        },
        {
          title: 'Hilfe für den nächsten Schritt',
          body: 'Wenn du nicht weiterkommst, tippe auf Hinweis, um einen Ansatz für deinen nächsten Schritt zu finden.',
        },
      ],
      certainty: [
        {
          title: 'Was passt in dieses Feld?',
          body: 'Betrachte die markierte Zeile, Spalte und den Block. Hier sind noch {a} und {b} möglich. Noch können wir nicht entscheiden.',
        },
        {
          title: 'Notieren und weitersuchen',
          body: 'Unsere Rätsel haben genau eine vollständige Lösung. Ein Kandidat ist aber noch keine Antwort. Notiere {a} und {b} und suche an anderer Stelle.',
        },
        {
          title: 'Ein bestimmbares Feld finden',
          body: 'Die vorhandenen Ziffern in Zeile, Spalte und Block des neuen Feldes schließen alle Möglichkeiten außer {digit} aus.',
        },
        {
          title: 'Jetzt zurück zum ersten Feld',
          body: 'Nach dem Eintragen von {digit} ist {digit} im ersten Feld nicht mehr möglich. Nur {remaining} bleibt übrig.',
        },
        {
          title: 'Erst sicher, dann eintragen',
          body: 'Löse ein Feld mit einer klaren Begründung und kehre dann zu den offenen Fragen zurück. Jede sichere Ziffer kann neue Hinweise liefern.',
        },
      ],
      'next-cell': [
        {
          title: 'Mit einer Ziffer beginnen',
          body: 'Du weißt nicht, wo du anfangen sollst? Wähle eine häufige Ziffer. Hier suchen wir nach Blöcken, in denen {digit} noch fehlt.',
        },
        {
          title: 'Diesen Block betrachten',
          body: 'Dieser Block braucht eine {digit}. Die markierten Ziffern schließen die durchkreuzten Felder aus: In einer Zeile oder Spalte darf {digit} nicht doppelt vorkommen.',
        },
        {
          title: 'Nur ein Platz bleibt',
          body: 'Der Block muss eine {digit} enthalten. Nach dem Ausschließen der anderen Positionen bleibt nur das hervorgehobene Feld.',
        },
        {
          title: 'Die Methode wiederholen',
          body: 'Betrachte einen weiteren Block ohne {digit}. Mithilfe der vorhandenen {digit} werden Positionen ausgeschlossen, bis auch hier nur eine bleibt.',
        },
        {
          title: 'Den nächsten Schritt suchen',
          body: 'Prüfe die Blöcke für dieselbe Ziffer. Findest du keinen sicheren Zug, wähle eine andere Ziffer. Trage sie ein, wenn du es begründen kannst.',
        },
      ],
    },
  },
};
export function basicText(
  text: string,
  params: Record<string, number>,
): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(params[key] ?? match),
  );
}
