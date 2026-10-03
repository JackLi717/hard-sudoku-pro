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
  },
};
