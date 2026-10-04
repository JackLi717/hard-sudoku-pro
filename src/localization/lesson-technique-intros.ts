import type { LessonLocale } from '../domain/lessons/contracts';
import type { TechniqueCode } from '../domain/hints/techniques';

type Introduction = Partial<Record<TechniqueCode, string>>;

/** Short catalog introductions, separate from any validated example or lesson. */
export const LESSON_TECHNIQUE_INTROS: Readonly<
  Record<LessonLocale, Introduction>
> = {
  en: {
    fullHouse: 'Find the one missing digit in a row, column, or box.',
    nakedSingle: 'Find a cell with only one possible digit left.',
    hiddenSingle: 'Find the only cell in a region that can hold a digit.',
    'lockedCandidates.pointing':
      'A digit confined to one line inside a box can be removed from the rest of that line.',
    'lockedCandidates.claiming':
      'A digit confined to one box along a line can be removed from the rest of that box.',
    lockedPair:
      'Two cells shared by a line and a box reserve the same two digits in both regions.',
    nakedPair:
      'Two cells with the same two candidates reserve those digits in their shared region.',
    hiddenPair:
      'Two digits confined to two cells let you remove other candidates from those cells.',
    lockedTriple:
      'Three cells shared by a line and a box reserve three digits in both regions.',
    nakedTriple:
      'Three cells whose candidates use only three digits reserve them in a region.',
    hiddenTriple:
      'Three digits confined to three cells exclude other candidates from those cells.',
    nakedQuad:
      'Four cells whose candidates use only four digits reserve them in a region.',
    hiddenQuad:
      'Four digits confined to four cells exclude other candidates from those cells.',
    xWing:
      'Two rows and two columns form a rectangle that rules out a digit elsewhere.',
    swordfish: 'Three base lines restrict one digit to three cover lines.',
    finnedXWing:
      'An extra candidate beside an X-Wing corner limits where it can eliminate.',
    sashimiXWing:
      'A missing X-Wing corner and a nearby fin still allow a local elimination.',
    skyscraper:
      'Two parallel strong links eliminate a digit seen by both outer ends.',
    twoStringKite:
      'A row and column strong link meet in a box and constrain a shared target.',
    emptyRectangle:
      'A box cross with an empty center joins an outside strong link.',
    turbotFish:
      'Two strong links joined by a weak link rule out a shared target.',
  },
  'zh-Hans': {
    fullHouse: '一行、一列或一宫只缺一个数字时，找出最后一格。',
    nakedSingle: '一个格子只剩一个可填数字时，就能确定它。',
    hiddenSingle: '一个数字在行、列或宫中只剩一个可填位置。',
    'lockedCandidates.pointing':
      '某数字在一宫内只位于同一行或列，可排除该行或列宫外的候选。',
    'lockedCandidates.claiming':
      '某数字在一行或列中只落于同一宫，可排除该宫其余位置的候选。',
    lockedPair: '行或列与宫共有的两格锁住两个数字，可同时影响这两个区域。',
    nakedPair: '同一区域的两格只含相同两个候选，可排除其他格中的这两个数字。',
    hiddenPair: '两个数字在同一区域只出现在两格中，可去掉这两格的其他候选。',
    lockedTriple: '行或列与宫共有的三格锁住三个数字，可同时影响这两个区域。',
    nakedTriple: '同一区域三格的候选合起来只有三个数字，可排除其他格中的它们。',
    hiddenTriple: '三个数字在同一区域只出现在三格中，可去掉这三格的其他候选。',
    nakedQuad: '同一区域四格的候选合起来只有四个数字，可排除其他格中的它们。',
    hiddenQuad: '四个数字在同一区域只出现在四格中，可去掉这四格的其他候选。',
    xWing: '同一数字在两行与两列间形成矩形，可排除其他位置的候选。',
    swordfish: '三条基础线把同一数字限制在三条覆盖线内。',
    finnedXWing: 'X-Wing 一角旁多出的鱼鳍，将排除范围限制在能看见鱼鳍的位置。',
    sashimiXWing: 'X-Wing 缺少一角，但缺角旁的鱼鳍仍能支持局部排除。',
    skyscraper: '两条平行强链的一端对齐，可排除同时看见两个外端的候选。',
    twoStringKite: '一条行强链与一条列强链在宫内弱连接，可排除共同目标。',
    emptyRectangle: '宫内候选组成中心无候选的十字，配合宫外强链完成排除。',
    turbotFish: '两条强链以弱链连接，可排除同时看见两个外端的候选。',
  },
  ja: {
    fullHouse: '行・列・ボックスで最後に残った数字を見つけます。',
    nakedSingle: '候補が1つだけ残ったマスを見つけます。',
    hiddenSingle: 'ある数字を置ける場所が領域内で1つだけのマスを探します。',
    'lockedCandidates.pointing':
      'ボックス内で一列に限られた候補を、その列の外側から除外します。',
    'lockedCandidates.claiming':
      '行や列で一つのボックスに限られた候補を、そのボックスの他のマスから除外します。',
    lockedPair:
      '行または列とボックスに共通する2マスが、2数字を両方の領域で確保します。',
    nakedPair: '同じ2候補だけを持つ2マスが、その領域の2数字を確保します。',
    hiddenPair: '2数字を置ける2マスから、ほかの候補を除外します。',
    lockedTriple:
      '行または列とボックスに共通する3マスが、3数字を両方の領域で確保します。',
    nakedTriple:
      '3マスの候補が合計3数字なら、その領域のほかのマスから除外できます。',
    hiddenTriple: '3数字を置ける3マスから、ほかの候補を除外します。',
    nakedQuad:
      '4マスの候補が合計4数字なら、その領域のほかのマスから除外できます。',
    hiddenQuad: '4数字を置ける4マスから、ほかの候補を除外します。',
    xWing: '2行と2列にできる長方形から、同じ数字の候補を除外します。',
    swordfish: '3本の基準線にある一つの数字を3本の対象線に限定します。',
    finnedXWing:
      'X-Wing の角のそばにあるヒレにより、除外できる場所が限られます。',
    sashimiXWing:
      'X-Wing の角が一つ欠けても、近くのヒレから局所的に除外できます。',
    skyscraper: '平行な2本の強リンクの外端を両方見る候補を除外します。',
    twoStringKite:
      '行と列の強リンクがボックスでつながり、共通の対象を除外します。',
    emptyRectangle:
      '中心に候補のないボックス内の十字と外側の強リンクを使います。',
    turbotFish: '弱リンクでつながる2本の強リンクが共通の対象を除外します。',
  },
  de: {
    fullHouse:
      'Finde die letzte fehlende Zahl in einer Zeile, Spalte oder einem Block.',
    nakedSingle: 'Finde eine Zelle, in der nur noch eine Zahl möglich ist.',
    hiddenSingle: 'Finde die einzige Stelle für eine Zahl in einer Einheit.',
    'lockedCandidates.pointing':
      'Ist eine Zahl im Block auf eine Zeile oder Spalte begrenzt, fällt sie dort außerhalb des Blocks weg.',
    'lockedCandidates.claiming':
      'Ist eine Zahl in einer Zeile oder Spalte auf einen Block begrenzt, fällt sie im Rest des Blocks weg.',
    lockedPair:
      'Zwei gemeinsame Zellen einer Linie und eines Blocks reservieren dort dieselben zwei Zahlen.',
    nakedPair:
      'Zwei Zellen mit denselben zwei Kandidaten reservieren diese Zahlen in ihrer Einheit.',
    hiddenPair:
      'Zwei Zahlen kommen nur in zwei Zellen vor; andere Kandidaten dieser Zellen entfallen.',
    lockedTriple:
      'Drei gemeinsame Zellen einer Linie und eines Blocks reservieren dort drei Zahlen.',
    nakedTriple:
      'Die Kandidaten von drei Zellen umfassen nur drei Zahlen und reservieren sie in der Einheit.',
    hiddenTriple:
      'Drei Zahlen kommen nur in drei Zellen vor; andere Kandidaten dieser Zellen entfallen.',
    nakedQuad:
      'Die Kandidaten von vier Zellen umfassen nur vier Zahlen und reservieren sie in der Einheit.',
    hiddenQuad:
      'Vier Zahlen kommen nur in vier Zellen vor; andere Kandidaten dieser Zellen entfallen.',
    xWing:
      'Zwei Zeilen und zwei Spalten bilden ein Rechteck, das andere Kandidaten ausschließt.',
    swordfish: 'Drei Basislinien begrenzen eine Zahl auf drei Decklinien.',
    finnedXWing:
      'Ein zusätzlicher Kandidat neben einer X-Wing-Ecke begrenzt die möglichen Ausschlüsse.',
    sashimiXWing:
      'Eine fehlende X-Wing-Ecke und eine Flosse erlauben noch einen lokalen Ausschluss.',
    skyscraper:
      'Zwei parallele starke Verbindungen schließen ein gemeinsames Ziel aus.',
    twoStringKite:
      'Eine starke Zeilen- und Spaltenverbindung treffen sich in einem Block.',
    emptyRectangle:
      'Ein Kreuz ohne Kandidat im Zentrum verbindet sich mit einem äußeren starken Paar.',
    turbotFish:
      'Zwei starke Verbindungen mit schwacher Verbindung schließen ein gemeinsames Ziel aus.',
  },
};
