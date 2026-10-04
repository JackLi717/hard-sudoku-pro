import type { LessonLocale } from '../domain/lessons/contracts';
import type { TechniqueCode } from '../domain/hints/techniques';

export const ARTICLE_TECHNIQUES = [
  'fullHouse',
  'nakedSingle',
  'hiddenSingle',
  'lockedCandidates.pointing',
  'lockedCandidates.claiming',
  'lockedPair',
  'nakedPair',
  'hiddenPair',
  'lockedTriple',
  'nakedTriple',
  'hiddenTriple',
  'nakedQuad',
  'hiddenQuad',
  'xWing',
  'swordfish',
  'finnedXWing',
  'sashimiXWing',
  'skyscraper',
  'twoStringKite',
  'emptyRectangle',
  'turbotFish',
] as const satisfies readonly TechniqueCode[];

export type ArticleTechnique = (typeof ARTICLE_TECHNIQUES)[number];

export type TechniquePattern =
  | 'row'
  | 'column'
  | 'box'
  | 'cell'
  | 'kite'
  | 'strong-row'
  | 'strong-column'
  | 'skyscraper'
  | 'two-string-kite'
  | 'two-candidate-empty-rectangle';

export const ARTICLE_PATTERN_VARIANTS = {
  fullHouse: ['row', 'column', 'box'],
  nakedSingle: ['cell'],
  hiddenSingle: ['box', 'row', 'column'],
  'lockedCandidates.pointing': ['row', 'column'],
  'lockedCandidates.claiming': ['row', 'column'],
  lockedPair: ['row', 'column'],
  nakedPair: ['row', 'column', 'box'],
  hiddenPair: ['row', 'column', 'box'],
  lockedTriple: ['row', 'column'],
  nakedTriple: ['row', 'column', 'box'],
  hiddenTriple: ['row', 'column', 'box'],
  nakedQuad: ['row', 'column', 'box'],
  hiddenQuad: ['row', 'column', 'box'],
  xWing: ['row', 'column'],
  swordfish: ['row', 'column'],
  finnedXWing: ['row', 'column'],
  sashimiXWing: ['row', 'column'],
  skyscraper: ['row', 'column'],
  twoStringKite: ['kite'],
  emptyRectangle: ['strong-row', 'strong-column'],
  turbotFish: [
    'skyscraper',
    'two-string-kite',
    'two-candidate-empty-rectangle',
  ],
} as const satisfies Record<ArticleTechnique, readonly TechniquePattern[]>;

type Article = Readonly<{
  diagram: string;
  pattern: string;
  find: string;
  result: string;
  mistake: string;
}>;

export const TECHNIQUE_ARTICLE_COPY: Readonly<
  Record<LessonLocale, Record<ArticleTechnique, Article>>
> = {
  en: {
    fullHouse: {
      diagram: 'This row has one empty cell; 5 is the only missing digit.',
      pattern: 'A row, column, or box has exactly one empty cell.',
      find: 'Look for a nearly complete row, column, or box, then compare its filled digits with 1 through 9.',
      result: 'Fill the empty cell with the one missing digit.',
      mistake:
        'Count empty cells in the chosen region. A naked single may be the only candidate for a cell even when several cells are still empty.',
    },
    nakedSingle: {
      diagram:
        'After checking its row, column, and box, this cell can only be 5.',
      pattern:
        'Only one digit remains possible in a cell after the Sudoku rules are applied.',
      find: 'Pick an empty cell and rule out digits already placed in its row, column, and box, or inspect its pencil marks.',
      result: 'Fill the cell with its sole remaining candidate.',
      mistake:
        'The cell need not be the last empty one in a region. A hidden single instead asks where one digit can go within a region.',
    },
    hiddenSingle: {
      diagram: 'In this box, 5 has only one possible cell.',
      pattern:
        'A digit has only one possible cell in a row, column, or box. The cell may still show other candidates.',
      find: 'Choose one digit and scan a box, row, or column. Rule out cells that see an already placed copy of that digit.',
      result: 'Put the digit in the only remaining cell of that region.',
      mistake:
        'A naked single has one candidate in a cell. A hidden single has one place for a digit in a region. Check every cell in that region before placing it.',
    },
    'lockedCandidates.pointing': {
      diagram:
        'The 7s in this box stay on one row; 7 goes from that row outside the box.',
      pattern:
        'Within a box, every possible place for one digit lies on the same row or column.',
      find: 'Scan one digit at a time inside a box. Look for its remaining positions lining up on one row or column.',
      result:
        'Remove that digit from the rest of the row or column outside the box.',
      mistake:
        'The digit need not be fixed to one cell. Every possible place inside the box must share the line. Claiming starts from a row or column and removes candidates elsewhere in a box.',
    },
    'lockedCandidates.claiming': {
      diagram: 'All 7s in this row lie in one box; other 7s in that box go.',
      pattern:
        'All possible places for one digit in a row or column lie inside the same box.',
      find: 'Choose a digit and scan a row or column. Check whether its remaining positions all fall in one box.',
      result:
        'Remove that digit from other cells in the box, outside the selected row or column.',
      mistake:
        'The selected line must have no possible place for that digit in another box. Pointing starts from a box and removes candidates along a line outside it.',
    },
    lockedPair: {
      diagram:
        'The 2–8 pair shares a row and a box; both digits leave the rest of each.',
      pattern:
        'Two cells in the intersection of a row and box, or column and box, each contain only the same two candidates.',
      find: 'Find a naked pair, then check whether both cells also share a box as well as their row or column.',
      result: 'Remove both digits from all other cells in both shared regions.',
      mistake:
        'A pair sharing only one region is a naked pair. Both cells must have exactly the two candidates; an extra candidate breaks the lock.',
    },
    nakedPair: {
      diagram:
        'Two cells in one row contain only 2 and 8; other cells in that row cannot contain them.',
      pattern:
        'Two cells in the same row, column, or box each contain only the same two candidates.',
      find: 'With candidates visible, find a two-candidate cell and check the rest of its row, column, and box for an identical partner.',
      result:
        'Remove both digits from the other cells in every region shared by the pair.',
      mistake:
        'Two cells merely containing the same two digits are not enough if either has a third candidate. A hidden pair is identified by where two digits can go, not by two cells having only those digits.',
    },
    hiddenPair: {
      diagram:
        'In this row, 2 and 8 occur only in two cells; other candidates leave those cells.',
      pattern:
        'Within one row, column, or box, two digits can appear only in the same two cells.',
      find: 'Scan a region one digit at a time. Find two digits whose possible cells are exactly the same pair.',
      result:
        'Keep those two digits in the paired cells and remove any other candidates from them.',
      mistake:
        'The paired cells may have extra candidates before elimination. A naked pair starts with cells containing only the two digits.',
    },
    lockedTriple: {
      diagram:
        'Three cells share a row and box and use only 2, 5, and 8; both regions lose them elsewhere.',
      pattern:
        'Three cells in a row–box or column–box intersection contain only three digits between them.',
      find: 'Check the three cells where a row or column crosses a box. Look for a combined set of exactly three candidates.',
      result:
        'Remove those three digits from every other cell in the shared line and box.',
      mistake:
        'The three cells need not have identical candidates. Every candidate in them must belong to the same three-digit set.',
    },
    nakedTriple: {
      diagram:
        'Three cells in this row use only 2, 5, and 8; other cells in the row lose them.',
      pattern:
        'Three cells in one row, column, or box contain only three digits between them.',
      find: 'With candidates visible, compare groups of three cells in one region and count their distinct candidates.',
      result: 'Remove those three digits from the other cells in that region.',
      mistake:
        'The cells do not need identical candidate lists. The union must contain exactly three digits, with no fourth candidate in any selected cell.',
    },
    hiddenTriple: {
      diagram:
        'In this row, 2, 5, and 8 occur only in three cells; other candidates leave those cells.',
      pattern:
        'Within one row, column, or box, three digits are confined to the same three cells.',
      find: 'Scan three digits in one region and see whether all their possible positions fit within just three cells.',
      result: 'Remove every other candidate from those three cells.',
      mistake:
        'Each digit need not appear in all three cells. A naked triple is found by counting candidates inside three cells, not positions for three digits.',
    },
    nakedQuad: {
      diagram:
        'Four cells in this row use only 1, 2, 3, and 4; other cells lose those digits.',
      pattern:
        'Four cells in one row, column, or box contain only four digits between them.',
      find: 'Compare four cells with short candidate lists in one region. Their combined set must contain exactly four digits.',
      result: 'Remove those four digits from every other cell in that region.',
      mistake:
        'A quad is not four identical candidate lists. No selected cell may contain a fifth digit, and all four cells must share one region.',
    },
    hiddenQuad: {
      diagram:
        'In this row, 1, 2, 3, and 4 fit only in four cells; extra candidates leave those cells.',
      pattern:
        'Within one row, column, or box, four digits have possible positions only in the same four cells.',
      find: 'Choose four digits in one region and check whether all their remaining positions fit within four cells.',
      result: 'Remove any other candidates from those four cells.',
      mistake:
        'The four cells can show extra candidates at first. Check positions for the four digits across the whole region, not only the marked cells.',
    },
    xWing: {
      diagram:
        'In two rows, 6 is confined to the same two columns; other 6s in those columns go.',
      pattern:
        'For one digit, two rows each have possible positions only in the same two columns. The row and column roles can be reversed.',
      find: 'Choose a digit and compare rows with exactly two possible cells for it. Look for another row using the same two columns.',
      result:
        'Remove that digit from other cells in those two columns, outside the two selected rows.',
      mistake:
        'A rectangle drawn through any four candidates is not enough. Check that the digit has no other possible cell in either selected row. For a column-based X-Wing, check the selected columns instead.',
    },
    swordfish: {
      diagram:
        'Three rows confine 6 to three columns; other 6s in those columns go.',
      pattern:
        'For one digit, all its positions in three rows fit within the same three columns. Rows and columns can be exchanged.',
      find: 'Scan one digit across rows with two or three candidates. Find three rows whose combined candidate columns number exactly three.',
      result:
        'Remove that digit from the three cover columns outside the selected rows.',
      mistake:
        'The candidates need not form nine corners. Check every position in each selected row: no candidate may lie outside the three cover columns.',
    },
    finnedXWing: {
      diagram:
        'An extra 6 is the fin beside one corner; a 6 seeing both the fin and the X-Wing cover is removed.',
      pattern:
        'An X-Wing has an extra candidate in one base row or column. The fin lies in the same box as a base corner.',
      find: 'Find two base rows and two cover columns, then look for an extra candidate beside one corner in its box.',
      result:
        'Remove the digit only where the target shares a cover column with the X-Wing and sees the fin in its box.',
      mistake:
        'Do not clear the entire cover column. The target must see the fin; verify all base candidates and the shared box.',
    },
    sashimiXWing: {
      diagram:
        'One X-Wing corner is missing; a fin beside it still rules out a 6 seen by the fin on the cover.',
      pattern:
        'Two base rows or columns use two cover lines, but one corner is absent. An extra candidate acts as a fin beside the missing corner.',
      find: 'Find three X-Wing corners and a fin on the base line with the missing corner, in the same box as that corner.',
      result:
        'Remove the digit only from a cover-line target that also sees the fin.',
      mistake:
        'Three corners alone do not justify an elimination. Confirm the fin and check that the target sees it; do not mark the missing corner as a candidate.',
    },
    skyscraper: {
      diagram:
        'Two row links for 6 share a column at one end. At least one far end is true, so a 6 seeing both far ends goes.',
      pattern:
        'Two strong links for one digit lie on parallel rows or columns. One end of each link shares a crossing line.',
      find: 'Find two rows with exactly two candidates for one digit. Align one candidate from each row in a column, then inspect the other two ends.',
      result: 'Remove the digit from any cell that sees both unaligned ends.',
      mistake:
        'The aligned ends need not be in the same box. Each base line must have exactly two candidates; a target must see both unaligned ends.',
    },
    twoStringKite: {
      diagram:
        'A row link and a column link meet weakly in one box. At least one far end holds 6, so their shared target loses 6.',
      pattern:
        'One strong row link and one strong column link use the same digit. One end from each link lies in a common box.',
      find: 'Choose a digit and find a row and a column with exactly two candidates each. Look for one end of each inside the same box.',
      result: 'Remove the digit from a cell that sees both remaining ends.',
      mistake:
        'The two box ends must be different cells; the far ends do not need to share a region. The target must see both far ends.',
    },
    emptyRectangle: {
      diagram:
        'The box candidates for 6 lie on a row–column cross with an empty center. An outside strong link constrains the other arm.',
      pattern:
        'Inside one box, a digit is confined to a row and column crossing at a cell without that digit. An outside strong link connects to one arm.',
      find: 'Scan a box for a row–column cross with an empty center, then find a strong link outside the box along one arm.',
      result:
        'Remove the digit where the other arm meets the far end of the outside link.',
      mistake:
        'The crossing center must not contain the candidate. Check all candidates in the box and both ends of the outside strong link.',
    },
    turbotFish: {
      diagram:
        'Two strong links for 6 are joined by a weak link. At least one outer end is true, so a target seeing both loses 6.',
      pattern:
        'Two strong links for one digit connect through a weak link; the shape may resemble a skyscraper, a kite, or an empty rectangle.',
      find: 'Trace two strong links and their weak connection. Identify the two outer endpoints before looking for a shared target.',
      result:
        'Remove the digit from any candidate that sees both outer endpoints.',
      mistake:
        'Two highlighted pairs are not enough without a valid weak connection. A candidate seeing only one outer end cannot be removed.',
    },
  },
  'zh-Hans': {
    fullHouse: {
      diagram: '这一行只空一格，缺少的数字是 5。',
      pattern: '一行、一列或一宫只剩一个空格。',
      find: '先找快填满的行、列或宫，再对照 1 到 9，找出唯一缺少的数字。',
      result: '把缺少的数字填进最后一个空格。',
      mistake:
        '先确认所选区域确实只空一格。裸单是某格只剩一个候选数，所在区域仍可能有多个空格。',
    },
    nakedSingle: {
      diagram: '检查同行、同列和同宫后，这格只剩 5 可填。',
      pattern: '按照数独规则排除后，一个格子只剩一个可填数字。',
      find: '选一个空格，排除同行、同列、同宫已经出现的数字，或直接查看它的候选数。',
      result: '把唯一剩下的数字填入该格。',
      mistake:
        '这格不必是某个区域的最后一个空格。隐单则看某个数字在一个区域里是否只剩一个位置。',
    },
    hiddenSingle: {
      diagram: '在这个宫里，数字 5 只剩一个可填位置。',
      pattern:
        '某个数字在一行、一列或一宫中只有一个可填位置；那一格本身可能还有其他候选数。',
      find: '选定一个数字，逐个查看行、列或宫。已有的相同数字会排除它所经过的行、列和宫中的位置。',
      result: '把这个数字填入该区域唯一剩下的格子。',
      mistake:
        '裸单看的是“一格只剩一个候选”；隐单看的是“一个数字在区域里只剩一处”。落子前要检查该区域的所有格子。',
    },
    'lockedCandidates.pointing': {
      diagram: '宫内的 7 都在同一行；这一行宫外的 7 可以排除。',
      pattern: '一个数字在某宫内所有可能的位置，都落在同一行或同一列。',
      find: '一次看一个数字，在每个宫中寻找排成同一行或同一列的剩余位置。',
      result: '从这行或列的宫外格子中，排除该数字。',
      mistake:
        '不需要确定它究竟落在哪一格，但宫内所有可能位置必须在同一条线上。Claiming 则从行或列出发，排除宫内其他位置。',
    },
    'lockedCandidates.claiming': {
      diagram: '这一行所有候选 7 都在同一宫；宫内其他位置的 7 可排除。',
      pattern: '一个数字在某行或某列的所有可能位置，都落在同一宫里。',
      find: '选一个数字，逐行或逐列查看它的剩余位置是否全在同一宫。',
      result: '从这个宫内、不在所选行或列上的格子中排除该数字。',
      mistake:
        '这行或列在其他宫不能还有这个数字的候选。Pointing 则从宫出发，排除宫外同一行或列的候选。',
    },
    lockedPair: {
      diagram:
        '含 2、8 的两格同时属于同一行和宫；两个区域的其他格都可排除它们。',
      pattern:
        '两格各自都只含相同的两个候选数，而且同时属于同一行与宫，或同一列与宫。',
      find: '先找裸对，再检查这两格除同行或同列外，是否还在同一宫。',
      result: '从这两个共同区域的其他格中，排除这两个数字。',
      mistake:
        '只共享一个区域的是普通裸对。两格都必须恰好只有这两个候选，不能含第三个数字。',
    },
    nakedPair: {
      diagram: '同一行的两格都只含 2、8；这一行的其他格可排除它们。',
      pattern: '同一行、列或宫中的两格，各自都只有相同的两个候选数。',
      find: '显示候选数后，先找只有两个候选的格子，再查看同行、同列和同宫有没有完全相同的另一格。',
      result: '从这两格共同所属区域的其他格中，排除这两个数字。',
      mistake:
        '只要其中一格还有第三个候选，就不是裸对。隐对看的是两个数字只能落在哪两格，而不是两格本身只剩什么数字。',
    },
    hiddenPair: {
      diagram: '这一行只有两格能填 2、8；把这两格中的其他候选排除。',
      pattern: '在同一行、列或宫中，两个数字都只能出现在相同的两格里。',
      find: '逐个数字查看一个区域，找出候选位置恰好落在同一对格子的两个数字。',
      result: '这两格保留这两个数字，排除格内的其他候选。',
      mistake:
        '排除前这两格可以还有其他候选；裸对则要求两格本来就只含那两个数字。',
    },
    lockedTriple: {
      diagram:
        '同一行与宫交会处的三格只含 2、5、8；两个区域的其他格可排除它们。',
      pattern: '同一行与宫、或列与宫交会处的三格，合起来只有三个候选数。',
      find: '查看行或列穿过一个宫的三格，比较它们合起来是否恰好只有三个候选数。',
      result: '从这条行或列以及这个宫的其他格中，排除这三个数字。',
      mistake:
        '三格的候选不必完全相同，但不能出现第四个数字；三个格子都必须位于交会处。',
    },
    nakedTriple: {
      diagram: '这一行的三格合起来只含 2、5、8；同行其他格可排除它们。',
      pattern: '同一行、列或宫中的三格，合起来只有三个候选数。',
      find: '显示候选数后，在一个区域里比较三格的候选，数一数合起来有几个不同数字。',
      result: '从该区域的其他格中，排除这三个数字。',
      mistake:
        '三格的候选不必一样；关键是合起来恰好三个数字，任一格都不能含第四个候选。',
    },
    hiddenTriple: {
      diagram: '这一行的 2、5、8 只出现在三格中；排除这三格里的其他候选。',
      pattern:
        '在同一行、列或宫中，三个数字的所有可能位置都只落在相同的三格里。',
      find: '在一个区域里选三个数字，检查它们的全部候选位置能否限制在三格内。',
      result: '从这三格中排除不属于这三个数字的其他候选。',
      mistake:
        '每个数字不必在三格里都出现。裸三看三格包含什么候选；隐三看三个数字能去哪些位置。',
    },
    nakedQuad: {
      diagram: '这一行的四格合起来只含 1、2、3、4；同行其他格可排除它们。',
      pattern: '同一行、列或宫中的四格，合起来只有四个候选数。',
      find: '在一个区域里找候选较少的四格，确认它们合起来恰好只有四个不同数字。',
      result: '从该区域的其他格中，排除这四个数字。',
      mistake:
        '不要求四格候选完全相同；但所选四格必须共享同一区域，且任何一格都不能有第五个数字。',
    },
    hiddenQuad: {
      diagram: '这一行的 1、2、3、4 只可能在四格中；排除这四格里的其他候选。',
      pattern:
        '在同一行、列或宫中，四个数字的所有可能位置都限制在相同的四格里。',
      find: '在一个区域里选四个数字，核对它们的全部候选位置是否只占四格。',
      result: '从这四格中排除其他候选，只保留这四个数字。',
      mistake:
        '开始时四格可以有多余候选。要检查整个区域里这四个数字的位置，不能只看标出的四格。',
    },
    xWing: {
      diagram: '两行中的 6 都只落在相同的两列；这两列的其他 6 可排除。',
      pattern:
        '对于同一个数字，两行各自的候选位置都只在相同的两列；行和列也可以对调。',
      find: '选一个数字，找出它只有两个候选位置的行，再看是否有另一行也落在相同的两列。',
      result: '从这两列的其他行中，排除该数字。',
      mistake:
        '看见四角像矩形还不够：选中的两行里不能有这个数字的其他候选。若从列开始寻找，就检查两列是否满足相同条件。',
    },
    swordfish: {
      diagram: '三行中数字 6 的候选只落在三列；这三列其他行的 6 可排除。',
      pattern: '同一数字在三条基础行的全部候选只占三列；行列可以对调。',
      find: '逐个数字观察候选数为两到三个的行，找出三行的候选合起来恰好只占三列。',
      result: '从三条覆盖列的其他行排除该数字。',
      mistake:
        '不要求九个交点都有候选，但必须检查三条基础行中没有落在覆盖列之外的候选。',
    },
    finnedXWing: {
      diagram:
        'X-Wing 一角旁多出的 6 是鱼鳍；与鱼鳍同宫、又位于覆盖列的目标 6 可排除。',
      pattern:
        '一个基础行或列比 X-Wing 多一个候选；鱼鳍与对应的矩形角位于同一宫。',
      find: '先找两条基础行和两条覆盖列，再检查一角旁的同宫额外候选。',
      result: '只排除同时位于覆盖列且能看见鱼鳍的目标候选。',
      mistake:
        '不能清空整条覆盖列。目标必须能看见鱼鳍，还要核对两条基础行的全部候选。',
    },
    sashimiXWing: {
      diagram: 'X-Wing 缺少一个角，缺角旁的鱼鳍仍可排除同宫覆盖列上的 6。',
      pattern:
        '两条基础行或列与两条覆盖线形成缺一角的结构；缺角旁另有一个鱼鳍候选。',
      find: '找三个矩形角，再找缺角所在基础线上的同宫鱼鳍。',
      result: '只排除位于覆盖线且能看见鱼鳍的目标候选。',
      mistake:
        '三个角本身不足以排除。必须确认鱼鳍和目标的同宫关系；缺失的角不能画成候选。',
    },
    skyscraper: {
      diagram:
        '两行各有一条数字 6 的强链，一端同列；另一端至少有一处为真，同时看见这两端的 6 可排除。',
      pattern:
        '同一数字在两条平行的行或列各有两个候选，其中一端共用一条交叉线。',
      find: '找出某数字恰有两个候选的两行，核对两行各有一端同列，再看另外两端。',
      result: '排除同时能看见两条强链外端的该数字候选。',
      mistake:
        '同列的一端不必同宫；两条基础线都必须恰有两个候选，目标必须同时看见两个外端。',
    },
    twoStringKite: {
      diagram:
        '一条行强链和一条列强链在同宫弱连接；两个远端至少一处为真，同时看见它们的 6 可排除。',
      pattern: '同一数字分别在一行和一列形成强链；两条强链各有一端位于同一宫。',
      find: '逐个数字寻找恰有两个候选的行和列，再检查两条链是否各有一端落在同一宫。',
      result: '排除同时能看见两个远端的该数字候选。',
      mistake:
        '同宫连接的是两个不同格；远端不必同区，但目标必须同时看见两个远端。',
    },
    emptyRectangle: {
      diagram:
        '宫内的 6 只在行列十字两臂，中心却没有 6；宫外强链配合另一臂，可排除交会目标。',
      pattern:
        '某数字在一宫内只分布于一行和一列，十字中心没有该候选；宫外还有一条接到其中一臂的强链。',
      find: '先在宫内找中心为空候选的行列十字，再沿其中一臂寻找宫外的强链。',
      result: '排除另一臂与宫外强链远端共同约束的候选。',
      mistake:
        '十字中心不能含该候选；要检查宫内所有位置及宫外强链的两端，不能只看四格的形状。',
    },
    turbotFish: {
      diagram:
        '两条数字 6 的强链以弱链相连；两个外端至少一处为真，同时看见两端的 6 可排除。',
      pattern:
        '同一数字的两条强链之间有一条弱连接，可呈摩天楼、双线风筝或空矩形形状。',
      find: '先确认两条强链及其中间的弱连接，再找出两条链各自的外端。',
      result: '排除同时能看见两个外端的该数字候选。',
      mistake:
        '只有两对高亮候选还不够，必须有有效的中间弱连接；只看见一个外端的目标不能排除。',
    },
  },
  ja: {
    fullHouse: {
      diagram: 'この行には空きマスが一つだけで、足りない数字は 5 です。',
      pattern: '行・列・ボックスに空きマスが一つだけ残っています。',
      find: 'ほぼ埋まった行・列・ボックスを探し、1 から 9 のうち足りない数字を確認します。',
      result: '最後の空きマスに、足りない数字を入れます。',
      mistake:
        'その領域に空きマスが本当に一つだけか確認します。Naked Single は、周囲に空きマスが複数あっても成立します。',
    },
    nakedSingle: {
      diagram: '行・列・ボックスを確認すると、このマスに入るのは 5 だけです。',
      pattern: '数独のルールで除外すると、一つのマスに候補が一つだけ残ります。',
      find: '空きマスを選び、同じ行・列・ボックスにある数字を除外するか、そのマスの候補を見ます。',
      result: '唯一残った数字をそのマスに入れます。',
      mistake:
        'そのマスが領域の最後の空きマスである必要はありません。Hidden Single は、ある数字の行き先が領域内で一つだけの場合です。',
    },
    hiddenSingle: {
      diagram: 'このボックスで、5 を置けるマスは一つだけです。',
      pattern:
        'ある数字を置けるマスが、行・列・ボックスの中で一つだけです。そのマスには他の候補が残っていても構いません。',
      find: '数字を一つ選び、行・列・ボックスを調べます。既に置かれた同じ数字によって使えないマスを除きます。',
      result: 'その領域で唯一残ったマスに数字を入れます。',
      mistake:
        'Naked Single は一つのマスに候補が一つだけ。Hidden Single は領域内で数字の行き先が一つだけです。置く前に領域全体を確認します。',
    },
    'lockedCandidates.pointing': {
      diagram:
        'ボックス内の 7 は同じ行に並びます。その行のボックス外から 7 を除外できます。',
      pattern:
        'ボックス内で、ある数字を置けるマスがすべて同じ行か列にあります。',
      find: '数字を一つ選び、各ボックスで残る候補が同じ行または列に並ぶか調べます。',
      result: 'その行または列の、ボックス外のマスから数字を除外します。',
      mistake:
        'ボックス内で置くマスを一つに決める必要はありません。ただし、可能なマスはすべて同じ線上になければなりません。Claiming は行・列から出発します。',
    },
    'lockedCandidates.claiming': {
      diagram:
        'この行の 7 は一つのボックス内に限られます。ボックス内の他の 7 を除外できます。',
      pattern:
        '行または列で、ある数字を置けるマスがすべて一つのボックスにあります。',
      find: '数字を選び、行または列に残る候補が一つのボックスだけにあるか調べます。',
      result:
        'そのボックス内で、選んだ行または列にないマスから数字を除外します。',
      mistake:
        '選んだ行・列の他のボックスに候補が残っていてはいけません。Pointing はボックスから始め、外側の行・列から除外します。',
    },
    lockedPair: {
      diagram:
        '2 と 8 のペアは行とボックスを共有します。両方の領域の他のマスから除外できます。',
      pattern:
        '同じ行とボックス、または列とボックスにある2マスが、どちらも同じ2候補だけを持ちます。',
      find: 'Naked Pair を探し、その2マスが行・列だけでなく同じボックスにもあるか確認します。',
      result: '共有する二つの領域の、他のマスから両方の数字を除外します。',
      mistake:
        '一つの領域だけを共有する場合は通常の Naked Pair です。どちらかのマスに3つ目の候補があれば成立しません。',
    },
    nakedPair: {
      diagram:
        '同じ行の2マスは 2 と 8 だけを持ちます。その行の他のマスから除外できます。',
      pattern:
        '同じ行・列・ボックスにある2マスが、それぞれ同じ2数字だけを候補に持ちます。',
      find: '候補を表示し、2候補だけのマスを探します。同じ行・列・ボックスに、候補が完全に一致するもう一つのマスがあるか調べます。',
      result: '2マスが共に属する領域の、他のマスからその2数字を除外します。',
      mistake:
        'どちらかに3つ目の候補があれば Naked Pair ではありません。Hidden Pair は2数字を置ける場所から見つけます。',
    },
    hiddenPair: {
      diagram:
        'この行で 2 と 8 を置けるのは2マスだけです。そのマスの他の候補を除外します。',
      pattern:
        '同じ行・列・ボックス内で、2数字を置ける場所が同じ2マスだけです。',
      find: '一つの領域で数字ごとの候補位置を調べ、同じ2マスだけに現れる2数字を探します。',
      result: 'その2マスには2数字だけを残し、他の候補を除外します。',
      mistake:
        '除外前の2マスには余分な候補があっても構いません。Naked Pair は最初から2候補だけのマスを探します。',
    },
    lockedTriple: {
      diagram:
        '行とボックスが重なる3マスは 2・5・8 だけを使います。両方の領域から除外できます。',
      pattern:
        '行とボックス、または列とボックスの交差する3マスで、候補の合計が3数字だけです。',
      find: '行・列がボックスを通る3マスを調べ、候補を合わせてちょうど3数字か確認します。',
      result: 'その行・列とボックスの他のマスから、3数字を除外します。',
      mistake:
        '3マスの候補は同じでなくても構いませんが、4つ目の数字があってはいけません。3マスとも交差部分にある必要があります。',
    },
    nakedTriple: {
      diagram:
        'この行の3マスは 2・5・8 だけを使います。行の他のマスから除外できます。',
      pattern:
        '同じ行・列・ボックスの3マスにある候補が、合わせて3数字だけです。',
      find: '候補を表示し、一つの領域で3マスを選び、異なる候補が全部でいくつあるか数えます。',
      result: 'その領域の他のマスから、3数字を除外します。',
      mistake:
        '3マスの候補一覧が同じである必要はありません。合わせてちょうど3数字で、余分な候補がないことを確認します。',
    },
    hiddenTriple: {
      diagram:
        'この行で 2・5・8 を置けるのは3マスだけです。そのマスの他の候補を除外します。',
      pattern:
        '同じ行・列・ボックス内で、3数字の候補位置が3マスだけに限られます。',
      find: '一つの領域で3数字を選び、その候補位置が合わせて3マスに収まるか調べます。',
      result: 'その3マスから、選んだ3数字以外の候補を除外します。',
      mistake:
        '各数字が3マスすべてに現れる必要はありません。Naked Triple は3マス内の候補を数えます。',
    },
    nakedQuad: {
      diagram:
        'この行の4マスは 1・2・3・4 だけを使います。行の他のマスから除外できます。',
      pattern:
        '同じ行・列・ボックスの4マスにある候補が、合わせて4数字だけです。',
      find: '一つの領域で候補の少ない4マスを比べ、異なる候補がちょうど4数字か確認します。',
      result: 'その領域の他のマスから、4数字を除外します。',
      mistake:
        '4マスの候補が同じである必要はありません。全マスが同じ領域に属し、5つ目の数字を含まないことが条件です。',
    },
    hiddenQuad: {
      diagram:
        'この行で 1・2・3・4 を置けるのは4マスだけです。余分な候補を除外します。',
      pattern:
        '同じ行・列・ボックス内で、4数字の候補位置が4マスだけに限られます。',
      find: '一つの領域で4数字を選び、その候補位置が合わせて4マスに収まるか調べます。',
      result: 'その4マスから、選んだ4数字以外の候補を除外します。',
      mistake:
        '最初は4マスに余分な候補があっても構いません。領域全体で4数字の位置を確かめます。',
    },
    xWing: {
      diagram:
        '2つの行で 6 は同じ2列に限られます。その列の他の 6 を除外できます。',
      pattern:
        '一つの数字について、2つの行で候補がそれぞれ同じ2列に限られます。行と列を入れ替えても成立します。',
      find: '数字を選び、候補が2マスだけの行を探します。同じ2列に候補がある別の行を探します。',
      result: '選んだ2行以外で、その2列にある同じ数字の候補を除外します。',
      mistake:
        '4隅が長方形に見えるだけでは足りません。選んだ各行に他の候補がないことを確認します。列から探す場合は列について確認します。',
    },
    swordfish: {
      diagram:
        '3つの行で 6 の候補が3列に限られ、その列の他の 6 を除外できます。',
      pattern:
        '同じ数字について、3つの基準行にある候補の列が合わせて3列だけになります。行と列は入れ替えられます。',
      find: '一つの数字について候補が2～3マスの行を探し、3行の候補が合計3列に収まるか確認します。',
      result: '選んだ3行以外で、その3列にある同じ数字を除外します。',
      mistake:
        '9つの交点すべてに候補は不要ですが、基準行の外側の列に候補がないことを確認します。',
    },
    finnedXWing: {
      diagram:
        'X-Wing の角のそばにある余分な 6 がヒレです。ヒレと同じボックスにある対象を除外します。',
      pattern:
        'X-Wing の一方の基準行・列に余分な候補があり、対応する角と同じボックスにあります。',
      find: '2本の基準線と2本の対象線を探し、角のそばに同じボックス内の余分な候補があるか確認します。',
      result: '対象線上で、ヒレと同じボックスにある候補だけを除外します。',
      mistake:
        '対象線全体を消してはいけません。対象がヒレを見ていることと、基準線の全候補を確認します。',
    },
    sashimiXWing: {
      diagram:
        'X-Wing の角が一つ欠けています。そばのヒレが見える対象の 6 を除外できます。',
      pattern:
        '2本の基準線と2本の対象線で一角が欠け、欠けた角のそばにヒレがあります。',
      find: '3つの角を見つけ、欠けた角の基準線上で同じボックスにあるヒレを探します。',
      result: '対象線上でヒレが見える候補だけを除外します。',
      mistake:
        '3つの角だけでは除外できません。ヒレと対象の関係を確認し、欠けた角を候補として描かないでください。',
    },
    skyscraper: {
      diagram:
        '2本の行の強リンクは一端が同じ列に並びます。反対側の両端を見ている 6 を除外できます。',
      pattern:
        '同じ数字の強リンクが平行な2行または2列にあり、片側の端が同じ交差線上にあります。',
      find: '同じ数字の候補が2つだけの行を2本探し、片側が同じ列か確認します。',
      result: 'そろっていない側の両端を見ている候補を除外します。',
      mistake:
        '2本の基準線にはそれぞれ候補がちょうど2つ必要です。対象は両方の外端を見ていなければなりません。',
    },
    twoStringKite: {
      diagram:
        '行と列の強リンクが一つのボックスで弱くつながり、両方の遠い端を見る 6 が除外されます。',
      pattern:
        '同じ数字の行と列に強リンクがあり、それぞれの片端が同じボックス内にあります。',
      find: '候補が2つだけの行と列を探し、それぞれの片端が同じボックスにあるか確認します。',
      result: '残った2つの端を両方とも見ている候補を除外します。',
      mistake:
        'ボックス内の2端は別のマスです。対象は遠い両端を見ている必要があります。',
    },
    emptyRectangle: {
      diagram:
        'ボックス内の 6 は中心に候補がない行と列の十字に限られ、外側の強リンクで対象を除外できます。',
      pattern:
        '一つのボックス内で数字は一行と一列の十字に限られ、交点には候補がありません。外側の強リンクが一方の腕につながります。',
      find: '候補のない交点を持つ十字を探し、一方の腕に接するボックス外の強リンクを確認します。',
      result: 'もう一方の腕と強リンクの遠端が制約する候補を除外します。',
      mistake:
        '十字の中心に候補があってはいけません。ボックス内の全候補と外側の強リンクを確認します。',
    },
    turbotFish: {
      diagram:
        '2本の強リンクが弱リンクでつながり、外端の両方を見る 6 を除外できます。',
      pattern:
        '同じ数字の2本の強リンクが弱リンクでつながります。摩天楼、二本の糸の凧、空の長方形の形があります。',
      find: '2本の強リンクと中間の弱リンクをたどり、両方の外端を確認します。',
      result: '外端の両方を見ている候補を除外します。',
      mistake:
        '強リンクが2本あるだけでは足りません。中間の弱リンクと対象から両端への視線を確かめます。',
    },
  },
  de: {
    fullHouse: {
      diagram:
        'In dieser Zeile ist nur eine Zelle frei; die fehlende Zahl ist 5.',
      pattern:
        'In einer Zeile, Spalte oder einem Block ist genau eine Zelle leer.',
      find: 'Suche eine fast vollständige Einheit und vergleiche ihre Zahlen mit 1 bis 9.',
      result: 'Trage die einzige fehlende Zahl in die freie Zelle ein.',
      mistake:
        'Prüfe, ob wirklich nur eine Zelle in der Einheit leer ist. Ein Naked Single kann auch bei mehreren freien Zellen auftreten.',
    },
    nakedSingle: {
      diagram:
        'Nach dem Prüfen von Zeile, Spalte und Block bleibt für diese Zelle nur 5.',
      pattern:
        'Nach Anwendung der Sudoku-Regeln bleibt in einer Zelle nur eine mögliche Zahl.',
      find: 'Wähle eine leere Zelle. Schließe Zahlen aus ihrer Zeile, Spalte und ihrem Block aus oder prüfe ihre Kandidaten.',
      result: 'Trage den einzigen verbleibenden Kandidaten in die Zelle ein.',
      mistake:
        'Die Zelle muss nicht die letzte freie in einer Einheit sein. Beim Hidden Single bleibt für eine Zahl nur ein Platz in einer Einheit.',
    },
    hiddenSingle: {
      diagram: 'In diesem Block passt die 5 nur in eine Zelle.',
      pattern:
        'Für eine Zahl bleibt in einer Zeile, Spalte oder einem Block nur eine mögliche Zelle. Diese Zelle darf noch andere Kandidaten haben.',
      find: 'Wähle eine Zahl und prüfe einen Block, eine Zeile oder Spalte. Bereits gesetzte gleiche Zahlen schließen andere Zellen aus.',
      result:
        'Trage die Zahl in die einzige verbleibende Zelle dieser Einheit ein.',
      mistake:
        'Beim Naked Single bleibt in einer Zelle nur ein Kandidat. Beim Hidden Single bleibt für eine Zahl in einer Einheit nur ein Platz. Prüfe vorher die ganze Einheit.',
    },
    'lockedCandidates.pointing': {
      diagram:
        'Alle 7er im Block liegen in einer Zeile; außerhalb des Blocks fallen dort die 7er weg.',
      pattern:
        'In einem Block liegen alle möglichen Plätze für eine Zahl in derselben Zeile oder Spalte.',
      find: 'Prüfe eine Zahl nach der anderen. Suche in einem Block nach Kandidaten, die alle in einer Zeile oder Spalte liegen.',
      result:
        'Entferne die Zahl aus dem Rest dieser Zeile oder Spalte außerhalb des Blocks.',
      mistake:
        'Die genaue Zelle muss noch nicht feststehen. Alle möglichen Plätze im Block müssen aber auf derselben Linie liegen. Claiming beginnt dagegen bei einer Zeile oder Spalte.',
    },
    'lockedCandidates.claiming': {
      diagram:
        'Alle 7er dieser Zeile liegen in einem Block; andere 7er in diesem Block entfallen.',
      pattern:
        'In einer Zeile oder Spalte liegen alle möglichen Plätze für eine Zahl im selben Block.',
      find: 'Wähle eine Zahl und prüfe, ob ihre Kandidaten in einer Zeile oder Spalte alle in einem Block liegen.',
      result:
        'Entferne die Zahl aus den anderen Zellen dieses Blocks außerhalb der gewählten Zeile oder Spalte.',
      mistake:
        'In den anderen Blöcken der gewählten Zeile oder Spalte darf kein Kandidat übrig sein. Pointing beginnt beim Block und wirkt nach außen.',
    },
    lockedPair: {
      diagram:
        'Das Paar 2 und 8 teilt Zeile und Block; beide Zahlen entfallen in den übrigen Zellen beider Einheiten.',
      pattern:
        'Zwei Zellen im Schnittpunkt von Zeile und Block oder Spalte und Block enthalten jeweils nur dieselben zwei Kandidaten.',
      find: 'Finde ein Naked Pair und prüfe, ob beide Zellen neben der Zeile oder Spalte auch denselben Block teilen.',
      result:
        'Entferne beide Zahlen aus allen anderen Zellen der beiden gemeinsamen Einheiten.',
      mistake:
        'Teilen die Zellen nur eine Einheit, ist es ein gewöhnliches Naked Pair. Ein dritter Kandidat hebt die Sperre auf.',
    },
    nakedPair: {
      diagram:
        'Zwei Zellen einer Zeile enthalten nur 2 und 8; in den anderen Zellen der Zeile entfallen beide.',
      pattern:
        'Zwei Zellen in derselben Zeile, Spalte oder demselben Block enthalten jeweils nur die gleichen zwei Kandidaten.',
      find: 'Suche mit sichtbaren Kandidaten eine Zelle mit zwei Möglichkeiten und in ihren Einheiten eine zweite Zelle mit genau denselben Kandidaten.',
      result:
        'Entferne beide Zahlen aus den anderen Zellen jeder gemeinsamen Einheit des Paars.',
      mistake:
        'Hat eine der Zellen noch einen dritten Kandidaten, ist es kein Naked Pair. Beim Hidden Pair sucht man die einzigen Plätze für zwei Zahlen.',
    },
    hiddenPair: {
      diagram:
        'In dieser Zeile kommen 2 und 8 nur in zwei Zellen vor; dort entfallen andere Kandidaten.',
      pattern:
        'In einer Zeile, Spalte oder einem Block können zwei Zahlen nur in denselben zwei Zellen stehen.',
      find: 'Prüfe die Plätze einzelner Zahlen in einer Einheit. Suche zwei Zahlen mit genau denselben zwei möglichen Zellen.',
      result:
        'Behalte in diesen zwei Zellen nur die beiden Zahlen und entferne alle anderen Kandidaten.',
      mistake:
        'Vor dem Entfernen dürfen die Zellen weitere Kandidaten enthalten. Ein Naked Pair beginnt mit zwei Zellen, die nur die beiden Zahlen haben.',
    },
    lockedTriple: {
      diagram:
        'Drei Zellen teilen Zeile und Block und enthalten nur 2, 5 und 8; in beiden Einheiten entfallen sie sonst.',
      pattern:
        'Drei Zellen im Schnittpunkt von Zeile und Block oder Spalte und Block enthalten zusammen nur drei Kandidaten.',
      find: 'Prüfe die drei Zellen, in denen eine Zeile oder Spalte einen Block kreuzt. Zusammen müssen sie genau drei Zahlen haben.',
      result:
        'Entferne diese Zahlen aus allen anderen Zellen der gemeinsamen Zeile oder Spalte und des Blocks.',
      mistake:
        'Die drei Zellen müssen nicht dieselben Kandidaten haben. Keine darf eine vierte Zahl enthalten, und alle müssen im Schnittpunkt liegen.',
    },
    nakedTriple: {
      diagram:
        'Drei Zellen dieser Zeile enthalten zusammen nur 2, 5 und 8; sonst entfallen sie in der Zeile.',
      pattern:
        'Drei Zellen einer Zeile, Spalte oder eines Blocks enthalten zusammen nur drei Kandidaten.',
      find: 'Vergleiche mit sichtbaren Kandidaten Dreiergruppen von Zellen in einer Einheit und zähle die verschiedenen Zahlen.',
      result: 'Entferne diese drei Zahlen aus den anderen Zellen der Einheit.',
      mistake:
        'Die Kandidatenlisten müssen nicht gleich sein. Zusammen dürfen sie genau drei Zahlen und keine vierte enthalten.',
    },
    hiddenTriple: {
      diagram:
        'In dieser Zeile passen 2, 5 und 8 nur in drei Zellen; dort entfallen andere Kandidaten.',
      pattern:
        'In einer Zeile, Spalte oder einem Block sind drei Zahlen auf dieselben drei Zellen beschränkt.',
      find: 'Wähle drei Zahlen in einer Einheit und prüfe, ob alle ihre möglichen Plätze in nur drei Zellen liegen.',
      result: 'Entferne alle anderen Kandidaten aus diesen drei Zellen.',
      mistake:
        'Nicht jede Zahl muss in jeder der drei Zellen vorkommen. Ein Naked Triple zählt Kandidaten in Zellen statt Plätze für Zahlen.',
    },
    nakedQuad: {
      diagram:
        'Vier Zellen dieser Zeile enthalten zusammen nur 1, 2, 3 und 4; sonst entfallen diese Zahlen.',
      pattern:
        'Vier Zellen einer Zeile, Spalte oder eines Blocks enthalten zusammen nur vier Kandidaten.',
      find: 'Vergleiche vier Zellen mit wenigen Kandidaten in einer Einheit. Zusammen müssen es genau vier Zahlen sein.',
      result:
        'Entferne diese vier Zahlen aus allen anderen Zellen der Einheit.',
      mistake:
        'Die vier Kandidatenlisten müssen nicht gleich sein. Alle Zellen müssen eine Einheit teilen und dürfen keine fünfte Zahl enthalten.',
    },
    hiddenQuad: {
      diagram:
        'In dieser Zeile passen 1, 2, 3 und 4 nur in vier Zellen; dort entfallen weitere Kandidaten.',
      pattern:
        'In einer Zeile, Spalte oder einem Block sind vier Zahlen auf dieselben vier Zellen beschränkt.',
      find: 'Wähle vier Zahlen in einer Einheit und prüfe, ob alle ihre möglichen Plätze in nur vier Zellen liegen.',
      result: 'Entferne alle anderen Kandidaten aus diesen vier Zellen.',
      mistake:
        'Anfangs dürfen die vier Zellen weitere Kandidaten enthalten. Prüfe die Plätze der vier Zahlen in der ganzen Einheit.',
    },
    xWing: {
      diagram:
        'In zwei Zeilen liegt die 6 jeweils nur in denselben zwei Spalten; andere 6er dort entfallen.',
      pattern:
        'Für eine Zahl liegen in zwei Zeilen alle Kandidaten jeweils in denselben zwei Spalten. Zeilen und Spalten lassen sich vertauschen.',
      find: 'Wähle eine Zahl und suche Zeilen mit genau zwei möglichen Zellen. Prüfe, ob eine zweite Zeile dieselben zwei Spalten benutzt.',
      result:
        'Entferne die Zahl aus anderen Zellen dieser zwei Spalten außerhalb der gewählten Zeilen.',
      mistake:
        'Ein Rechteck aus vier Kandidaten allein genügt nicht. In den gewählten Zeilen darf es keine weiteren Plätze für die Zahl geben. Bei der Spaltenvariante prüfst du die Spalten.',
    },
    swordfish: {
      diagram:
        'In drei Zeilen liegt die 6 nur in drei Spalten; andere 6er dort entfallen.',
      pattern:
        'Für eine Zahl liegen alle Kandidaten in drei Basiszeilen zusammen in genau drei Spalten. Zeilen und Spalten lassen sich vertauschen.',
      find: 'Suche für eine Zahl Zeilen mit zwei oder drei Kandidaten. Prüfe, ob drei Zeilen zusammen genau drei Spalten belegen.',
      result:
        'Entferne die Zahl aus diesen drei Spalten außerhalb der Basiszeilen.',
      mistake:
        'Nicht alle neun Schnittpunkte müssen Kandidaten enthalten. Prüfe aber jede Basiszeile auf weitere Kandidaten außerhalb der drei Spalten.',
    },
    finnedXWing: {
      diagram:
        'Eine zusätzliche 6 neben einer X-Wing-Ecke ist die Flosse; ein Ziel auf der Decklinie im selben Block entfällt.',
      pattern:
        'Eine Basiszeile oder Basisspalte eines X-Wing enthält einen zusätzlichen Kandidaten im Block einer Ecke.',
      find: 'Suche zwei Basislinien und zwei Decklinien und dann den zusätzlichen Kandidaten neben einer Ecke im selben Block.',
      result:
        'Entferne die Zahl nur von einem Ziel auf der Decklinie, das die Flosse im selben Block sieht.',
      mistake:
        'Nicht die ganze Decklinie leeren. Das Ziel muss die Flosse sehen; prüfe alle Kandidaten der Basislinien.',
    },
    sashimiXWing: {
      diagram:
        'Eine X-Wing-Ecke fehlt. Die Flosse daneben schließt eine 6 auf der Decklinie im selben Block aus.',
      pattern:
        'Zwei Basislinien und zwei Decklinien bilden ein Muster mit fehlender Ecke und einer Flosse daneben.',
      find: 'Suche drei Ecken und auf der Basislinie der fehlenden Ecke eine Flosse im selben Block.',
      result:
        'Entferne die Zahl nur auf einer Decklinie, wenn das Ziel die Flosse sieht.',
      mistake:
        'Drei Ecken allein reichen nicht. Prüfe Flosse und Ziel im selben Block und zeichne die fehlende Ecke nicht als Kandidaten ein.',
    },
    skyscraper: {
      diagram:
        'Zwei starke Zeilenpaare haben je ein Ende in derselben Spalte. Ein Ziel, das beide freien Enden sieht, verliert die 6.',
      pattern:
        'Zwei starke Verbindungen derselben Zahl liegen in parallelen Zeilen oder Spalten; je ein Ende liegt auf derselben Querlinie.',
      find: 'Suche zwei Zeilen mit genau zwei Kandidaten derselben Zahl und prüfe, ob je ein Ende in derselben Spalte liegt.',
      result:
        'Entferne die Zahl aus einer Zelle, die beide anderen Enden sieht.',
      mistake:
        'Jede Basislinie braucht genau zwei Kandidaten. Das Ziel muss beide äußeren Enden sehen.',
    },
    twoStringKite: {
      diagram:
        'Ein starkes Zeilenpaar und ein starkes Spaltenpaar sind im selben Block schwach verbunden; ihr gemeinsames Ziel verliert die 6.',
      pattern:
        'Eine Zeile und eine Spalte besitzen je eine starke Verbindung derselben Zahl. Je ein Ende liegt im selben Block.',
      find: 'Suche eine Zeile und eine Spalte mit je genau zwei Kandidaten und prüfe die beiden Enden im gemeinsamen Block.',
      result:
        'Entferne die Zahl aus einer Zelle, die beide äußeren Enden sieht.',
      mistake:
        'Die beiden Enden im Block sind verschiedene Zellen. Das Ziel muss beide entfernten Enden sehen.',
    },
    emptyRectangle: {
      diagram:
        'Die 6er im Block liegen auf einem Zeilen-Spalten-Kreuz ohne Kandidat im Zentrum; ein äußeres starkes Paar ermöglicht den Ausschluss.',
      pattern:
        'In einem Block liegen alle Kandidaten einer Zahl auf einer Zeile und einer Spalte, aber nicht an deren Schnittpunkt. Außerhalb verbindet ein starkes Paar einen Arm.',
      find: 'Suche ein Kreuz ohne Kandidat im Zentrum und danach eine starke Verbindung außerhalb des Blocks an einem Arm.',
      result:
        'Entferne den Kandidaten, den der andere Arm und das entfernte Ende der starken Verbindung gemeinsam begrenzen.',
      mistake:
        'Im Zentrum darf der Kandidat nicht stehen. Prüfe alle Kandidaten im Block und beide Enden der äußeren Verbindung.',
    },
    turbotFish: {
      diagram:
        'Zwei starke Verbindungen für die 6 sind schwach verbunden; ein Ziel, das beide äußeren Enden sieht, verliert die 6.',
      pattern:
        'Zwei starke Verbindungen derselben Zahl sind durch eine schwache Verbindung verbunden; die Form kann Wolkenkratzer, Drachen oder leeres Rechteck sein.',
      find: 'Verfolge beide starken Verbindungen und ihre schwache Verbindung. Bestimme dann die zwei äußeren Enden.',
      result:
        'Entferne die Zahl aus einem Kandidaten, der beide äußeren Enden sieht.',
      mistake:
        'Zwei hervorgehobene Paare genügen nicht: Prüfe die schwache Verbindung. Ein Ziel, das nur ein Ende sieht, bleibt bestehen.',
    },
  },
};

export const ARTICLE_LABELS: Readonly<
  Record<
    LessonLocale,
    Readonly<{
      open: string;
      pattern: string;
      find: string;
      result: string;
      mistake: string;
      diagram: string;
    }>
  >
> = {
  en: {
    open: 'Spot the pattern',
    pattern: 'Recognize the pattern',
    find: 'How to find it',
    result: 'What it allows',
    mistake: 'Avoid the mix-up',
    diagram: 'Pattern sketch',
  },
  'zh-Hans': {
    open: '识别技巧',
    pattern: '辨认模式',
    find: '如何寻找',
    result: '可以得出什么',
    mistake: '别看错了',
    diagram: '模式示意',
  },
  ja: {
    open: 'パターンを見分ける',
    pattern: '形を見分ける',
    find: '見つけ方',
    result: 'できること',
    mistake: '見間違いに注意',
    diagram: 'パターン図',
  },
  de: {
    open: 'Muster erkennen',
    pattern: 'Muster erkennen',
    find: 'So findest du es',
    result: 'Das folgt daraus',
    mistake: 'Verwechslung vermeiden',
    diagram: 'Musterskizze',
  },
};

export const ARTICLE_PATTERN_LABELS: Readonly<
  Record<LessonLocale, Record<TechniquePattern, string>>
> = {
  en: {
    row: 'Row',
    column: 'Column',
    box: 'Box',
    cell: 'Cell',
    kite: 'Row and column',
    'strong-row': 'Strong row',
    'strong-column': 'Strong column',
    skyscraper: 'Skyscraper',
    'two-string-kite': 'Two-string kite',
    'two-candidate-empty-rectangle': 'Empty rectangle',
  },
  'zh-Hans': {
    row: '行',
    column: '列',
    box: '宫',
    cell: '单格',
    kite: '行列交会',
    'strong-row': '行强链',
    'strong-column': '列强链',
    skyscraper: '摩天楼',
    'two-string-kite': '双线风筝',
    'two-candidate-empty-rectangle': '空矩形',
  },
  ja: {
    row: '行',
    column: '列',
    box: 'ボックス',
    cell: 'マス',
    kite: '行と列',
    'strong-row': '行の強リンク',
    'strong-column': '列の強リンク',
    skyscraper: 'スカイスクレイパー',
    'two-string-kite': '2ストリングカイト',
    'two-candidate-empty-rectangle': '空の長方形',
  },
  de: {
    row: 'Zeile',
    column: 'Spalte',
    box: 'Block',
    cell: 'Zelle',
    kite: 'Zeile und Spalte',
    'strong-row': 'Starke Zeile',
    'strong-column': 'Starke Spalte',
    skyscraper: 'Wolkenkratzer',
    'two-string-kite': 'Zwei-Linien-Drachen',
    'two-candidate-empty-rectangle': 'Leeres Rechteck',
  },
};

export const ARTICLE_PATTERN_SHORT_LABELS: Readonly<
  Record<LessonLocale, Record<TechniquePattern, string>>
> = {
  en: {
    row: 'Row',
    column: 'Col',
    box: 'Box',
    cell: 'Cell',
    kite: 'Kite',
    'strong-row': 'Row',
    'strong-column': 'Col',
    skyscraper: 'Sky',
    'two-string-kite': 'Kite',
    'two-candidate-empty-rectangle': 'ER',
  },
  'zh-Hans': {
    row: '行',
    column: '列',
    box: '宫',
    cell: '格',
    kite: '风筝',
    'strong-row': '行',
    'strong-column': '列',
    skyscraper: '摩天楼',
    'two-string-kite': '风筝',
    'two-candidate-empty-rectangle': '空矩形',
  },
  ja: {
    row: '行',
    column: '列',
    box: '枠',
    cell: 'マス',
    kite: 'カイト',
    'strong-row': '行',
    'strong-column': '列',
    skyscraper: 'SK',
    'two-string-kite': 'カイト',
    'two-candidate-empty-rectangle': 'ER',
  },
  de: {
    row: 'Z.',
    column: 'Sp.',
    box: 'Blk.',
    cell: 'Zelle',
    kite: 'Drache',
    'strong-row': 'Z.',
    'strong-column': 'Sp.',
    skyscraper: 'WK',
    'two-string-kite': 'Drache',
    'two-candidate-empty-rectangle': 'LR',
  },
};

/** Captions for alternative sketches; each article's existing diagram copy stays the default. */
export const ARTICLE_ALTERNATE_DIAGRAMS: Readonly<
  Record<
    LessonLocale,
    Record<ArticleTechnique, Partial<Record<TechniquePattern, string>>>
  >
> = {
  en: {
    fullHouse: {
      column: 'This column has one empty cell; 5 is the only missing digit.',
      box: 'This box has one empty cell; 5 is the only missing digit.',
    },
    nakedSingle: {},
    hiddenSingle: {
      row: 'In this row, 5 has only one possible cell.',
      column: 'In this column, 5 has only one possible cell.',
    },
    'lockedCandidates.pointing': {
      column:
        'The 7s in this box stay in one column; 7 goes from that column outside the box.',
    },
    'lockedCandidates.claiming': {
      column: 'All 7s in this column lie in one box; other 7s in that box go.',
    },
    lockedPair: {
      column:
        'The 2–8 pair shares a column and a box; both digits leave the rest of each.',
    },
    nakedPair: {
      column:
        'Two cells in one column contain only 2 and 8; other cells in that column cannot contain them.',
      box: 'Two cells in one box contain only 2 and 8; other cells in that box cannot contain them.',
    },
    hiddenPair: {
      column:
        'In this column, 2 and 8 occur only in two cells; other candidates leave those cells.',
      box: 'In this box, 2 and 8 occur only in two cells; other candidates leave those cells.',
    },
    lockedTriple: {
      column:
        'Three cells share a column and box and use only 2, 5, and 8; both regions lose them elsewhere.',
    },
    nakedTriple: {
      column:
        'Three cells in this column use only 2, 5, and 8; other cells in the column lose them.',
      box: 'Three cells in this box use only 2, 5, and 8; other cells in the box lose them.',
    },
    hiddenTriple: {
      column:
        'In this column, 2, 5, and 8 occur only in three cells; other candidates leave those cells.',
      box: 'In this box, 2, 5, and 8 occur only in three cells; other candidates leave those cells.',
    },
    nakedQuad: {
      column:
        'Four cells in this column use only 1, 2, 3, and 4; other cells lose those digits.',
      box: 'Four cells in this box use only 1, 2, 3, and 4; other cells lose those digits.',
    },
    hiddenQuad: {
      column:
        'In this column, 1, 2, 3, and 4 fit only in four cells; extra candidates leave those cells.',
      box: 'In this box, 1, 2, 3, and 4 fit only in four cells; extra candidates leave those cells.',
    },
    xWing: {
      column:
        'In two columns, 6 is confined to the same two rows; other 6s in those rows go.',
    },
    swordfish: {
      column:
        'Three columns confine 6 to three rows; other 6s in those rows go.',
    },
    finnedXWing: {
      column:
        'An extra 6 beside a column-based X-Wing corner is the fin; only a target seeing the fin goes.',
    },
    sashimiXWing: {
      column:
        'A column-based X-Wing has a missing corner and a fin; only a target seeing the fin goes.',
    },
    skyscraper: {
      column:
        'Two column links align at one end; remove 6 only where both outer ends can see it.',
    },
    twoStringKite: {},
    emptyRectangle: {
      'strong-column':
        'The box cross joins an outside strong column link; the other arm constrains the target.',
    },
    turbotFish: {
      'two-string-kite':
        'Two strong links form a kite with a weak box connection; a target sees both outer ends.',
      'two-candidate-empty-rectangle':
        'Two strong links form an empty rectangle; a target sees both outer ends.',
    },
  },
  'zh-Hans': {
    fullHouse: {
      column: '这一列只空一格，缺少的数字是 5。',
      box: '这一宫只空一格，缺少的数字是 5。',
    },
    nakedSingle: {},
    hiddenSingle: {
      row: '在这一行里，数字 5 只剩一个可填位置。',
      column: '在这一列里，数字 5 只剩一个可填位置。',
    },
    'lockedCandidates.pointing': {
      column: '宫内的 7 都在同一列；这一列宫外的 7 可以排除。',
    },
    'lockedCandidates.claiming': {
      column: '这一列所有候选 7 都在同一宫；宫内其他位置的 7 可排除。',
    },
    lockedPair: {
      column:
        '含 2、8 的两格同时属于同一列和宫；两个区域的其他格都可排除它们。',
    },
    nakedPair: {
      column: '同一列的两格都只含 2、8；这一列的其他格可排除它们。',
      box: '同一宫的两格都只含 2、8；这一宫的其他格可排除它们。',
    },
    hiddenPair: {
      column: '这一列只有两格能填 2、8；把这两格中的其他候选排除。',
      box: '这一宫只有两格能填 2、8；把这两格中的其他候选排除。',
    },
    lockedTriple: {
      column:
        '同一列与宫交会处的三格只含 2、5、8；两个区域的其他格可排除它们。',
    },
    nakedTriple: {
      column: '这一列的三格合起来只含 2、5、8；同列其他格可排除它们。',
      box: '这一宫的三格合起来只含 2、5、8；同宫其他格可排除它们。',
    },
    hiddenTriple: {
      column: '这一列的 2、5、8 只出现在三格中；排除这三格里的其他候选。',
      box: '这一宫的 2、5、8 只出现在三格中；排除这三格里的其他候选。',
    },
    nakedQuad: {
      column: '这一列的四格合起来只含 1、2、3、4；同列其他格可排除它们。',
      box: '这一宫的四格合起来只含 1、2、3、4；同宫其他格可排除它们。',
    },
    hiddenQuad: {
      column: '这一列的 1、2、3、4 只可能在四格中；排除这四格里的其他候选。',
      box: '这一宫的 1、2、3、4 只可能在四格中；排除这四格里的其他候选。',
    },
    xWing: {
      column: '两列中的 6 都只落在相同的两行；这两行的其他 6 可排除。',
    },
    swordfish: {
      column: '三列中数字 6 的候选只落在三行；这三行其他列的 6 可排除。',
    },
    finnedXWing: {
      column: '列式 X-Wing 的一角旁多出鱼鳍；只能排除同时能看见鱼鳍的目标 6。',
    },
    sashimiXWing: {
      column: '列式 X-Wing 缺少一角并带有鱼鳍；只能排除能看见鱼鳍的目标 6。',
    },
    skyscraper: {
      column: '两列的强链各有一端同处一行；只排除同时看见两个外端的 6。',
    },
    twoStringKite: {},
    emptyRectangle: {
      'strong-column': '宫内十字与宫外列强链配合，另一臂限制目标候选。',
    },
    turbotFish: {
      'two-string-kite': '两条强链形成双线风筝，目标同时看见两个外端。',
      'two-candidate-empty-rectangle':
        '两条强链形成空矩形，目标同时看见两个外端。',
    },
  },
  ja: {
    fullHouse: {
      column: 'この列には空きマスが一つだけで、足りない数字は 5 です。',
      box: 'このボックスには空きマスが一つだけで、足りない数字は 5 です。',
    },
    nakedSingle: {},
    hiddenSingle: {
      row: 'この行で、5 を置けるマスは一つだけです。',
      column: 'この列で、5 を置けるマスは一つだけです。',
    },
    'lockedCandidates.pointing': {
      column:
        'ボックス内の 7 は同じ列に並びます。その列のボックス外から 7 を除外できます。',
    },
    'lockedCandidates.claiming': {
      column:
        'この列の 7 は一つのボックス内に限られます。ボックス内の他の 7 を除外できます。',
    },
    lockedPair: {
      column:
        '2 と 8 のペアは列とボックスを共有します。両方の領域の他のマスから除外できます。',
    },
    nakedPair: {
      column:
        '同じ列の2マスは 2 と 8 だけを持ちます。その列の他のマスから除外できます。',
      box: '同じボックスの2マスは 2 と 8 だけを持ちます。そのボックスの他のマスから除外できます。',
    },
    hiddenPair: {
      column:
        'この列で 2 と 8 を置けるのは2マスだけです。そのマスの他の候補を除外します。',
      box: 'このボックスで 2 と 8 を置けるのは2マスだけです。そのマスの他の候補を除外します。',
    },
    lockedTriple: {
      column:
        '列とボックスが重なる3マスは 2・5・8 だけを使います。両方の領域から除外できます。',
    },
    nakedTriple: {
      column:
        'この列の3マスは 2・5・8 だけを使います。列の他のマスから除外できます。',
      box: 'このボックスの3マスは 2・5・8 だけを使います。他のマスから除外できます。',
    },
    hiddenTriple: {
      column:
        'この列で 2・5・8 を置けるのは3マスだけです。そのマスの他の候補を除外します。',
      box: 'このボックスで 2・5・8 を置けるのは3マスだけです。そのマスの他の候補を除外します。',
    },
    nakedQuad: {
      column:
        'この列の4マスは 1・2・3・4 だけを使います。列の他のマスから除外できます。',
      box: 'このボックスの4マスは 1・2・3・4 だけを使います。他のマスから除外できます。',
    },
    hiddenQuad: {
      column:
        'この列で 1・2・3・4 を置けるのは4マスだけです。余分な候補を除外します。',
      box: 'このボックスで 1・2・3・4 を置けるのは4マスだけです。余分な候補を除外します。',
    },
    xWing: {
      column:
        '2つの列で 6 は同じ2行に限られます。その行の他の 6 を除外できます。',
    },
    swordfish: {
      column:
        '3つの列で 6 の候補が3行に限られ、その行の他の 6 を除外できます。',
    },
    finnedXWing: {
      column:
        '列を基準にした X-Wing の角のそばにヒレがあり、ヒレが見える対象だけを除外します。',
    },
    sashimiXWing: {
      column:
        '列を基準にした X-Wing は一角が欠け、ヒレが見える対象だけを除外します。',
    },
    skyscraper: {
      column:
        '2本の列の強リンクは一端が同じ行に並び、両方の外端を見る 6 を除外します。',
    },
    twoStringKite: {},
    emptyRectangle: {
      'strong-column':
        'ボックス内の十字は外側の列の強リンクとつながり、もう一方の腕で対象を制約します。',
    },
    turbotFish: {
      'two-string-kite':
        '2本の強リンクは凧の形を作り、対象は両方の外端を見ています。',
      'two-candidate-empty-rectangle':
        '2本の強リンクは空の長方形を作り、対象は両方の外端を見ています。',
    },
  },
  de: {
    fullHouse: {
      column:
        'In dieser Spalte ist nur eine Zelle frei; die fehlende Zahl ist 5.',
      box: 'In diesem Block ist nur eine Zelle frei; die fehlende Zahl ist 5.',
    },
    nakedSingle: {},
    hiddenSingle: {
      row: 'In dieser Zeile passt die 5 nur in eine Zelle.',
      column: 'In dieser Spalte passt die 5 nur in eine Zelle.',
    },
    'lockedCandidates.pointing': {
      column:
        'Alle 7er im Block liegen in einer Spalte; außerhalb des Blocks fallen dort die 7er weg.',
    },
    'lockedCandidates.claiming': {
      column:
        'Alle 7er dieser Spalte liegen in einem Block; andere 7er in diesem Block entfallen.',
    },
    lockedPair: {
      column:
        'Das Paar 2 und 8 teilt Spalte und Block; beide Zahlen entfallen in den übrigen Zellen beider Einheiten.',
    },
    nakedPair: {
      column:
        'Zwei Zellen einer Spalte enthalten nur 2 und 8; in den anderen Zellen der Spalte entfallen beide.',
      box: 'Zwei Zellen eines Blocks enthalten nur 2 und 8; in den anderen Zellen des Blocks entfallen beide.',
    },
    hiddenPair: {
      column:
        'In dieser Spalte kommen 2 und 8 nur in zwei Zellen vor; dort entfallen andere Kandidaten.',
      box: 'In diesem Block kommen 2 und 8 nur in zwei Zellen vor; dort entfallen andere Kandidaten.',
    },
    lockedTriple: {
      column:
        'Drei Zellen teilen Spalte und Block und enthalten nur 2, 5 und 8; in beiden Einheiten entfallen sie sonst.',
    },
    nakedTriple: {
      column:
        'Drei Zellen dieser Spalte enthalten zusammen nur 2, 5 und 8; sonst entfallen sie in der Spalte.',
      box: 'Drei Zellen dieses Blocks enthalten zusammen nur 2, 5 und 8; sonst entfallen sie im Block.',
    },
    hiddenTriple: {
      column:
        'In dieser Spalte passen 2, 5 und 8 nur in drei Zellen; dort entfallen andere Kandidaten.',
      box: 'In diesem Block passen 2, 5 und 8 nur in drei Zellen; dort entfallen andere Kandidaten.',
    },
    nakedQuad: {
      column:
        'Vier Zellen dieser Spalte enthalten zusammen nur 1, 2, 3 und 4; sonst entfallen diese Zahlen.',
      box: 'Vier Zellen dieses Blocks enthalten zusammen nur 1, 2, 3 und 4; sonst entfallen diese Zahlen.',
    },
    hiddenQuad: {
      column:
        'In dieser Spalte passen 1, 2, 3 und 4 nur in vier Zellen; dort entfallen weitere Kandidaten.',
      box: 'In diesem Block passen 1, 2, 3 und 4 nur in vier Zellen; dort entfallen weitere Kandidaten.',
    },
    xWing: {
      column:
        'In zwei Spalten liegt die 6 jeweils nur in denselben zwei Zeilen; andere 6er dort entfallen.',
    },
    swordfish: {
      column:
        'In drei Spalten liegt die 6 nur in drei Zeilen; andere 6er dort entfallen.',
    },
    finnedXWing: {
      column:
        'Neben einer Ecke des spaltenbasierten X-Wing liegt eine Flosse; nur ein Ziel, das sie sieht, entfällt.',
    },
    sashimiXWing: {
      column:
        'Beim spaltenbasierten X-Wing fehlt eine Ecke und daneben liegt eine Flosse; nur ein Ziel, das sie sieht, entfällt.',
    },
    skyscraper: {
      column:
        'Zwei starke Spaltenpaare haben je ein Ende in derselben Zeile; nur das gemeinsame Ziel der äußeren Enden verliert die 6.',
    },
    twoStringKite: {},
    emptyRectangle: {
      'strong-column':
        'Das Kreuz im Block verbindet sich mit einem starken Spaltenpaar außerhalb; der andere Arm begrenzt das Ziel.',
    },
    turbotFish: {
      'two-string-kite':
        'Zwei starke Verbindungen bilden einen Drachen; das Ziel sieht beide äußeren Enden.',
      'two-candidate-empty-rectangle':
        'Zwei starke Verbindungen bilden ein leeres Rechteck; das Ziel sieht beide äußeren Enden.',
    },
  },
};
