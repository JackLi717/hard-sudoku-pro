import type { LessonLocale } from '../domain/lessons/contracts';
import type { TermAnswer, TermCourse } from '../data/lessons/term-courses';

type CourseCopy = {
  title: string;
  definition: string;
  find: string;
  mistake: string;
  templates: Record<string, string>;
  feedback: Partial<Record<TermAnswer, string>>;
};

type TermCopy = {
  group: string;
  definition: string;
  find: string;
  mistake: string;
  practice: string;
  diagram: string;
  next: string;
  finish: string;
  correct: string;
  retry: string;
  questionCount: string;
  answers: Record<TermAnswer, string>;
  courses: Record<TermCourse, CourseCopy>;
};

export function termText(
  template: string,
  params: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(params[key] ?? match),
  );
}

export const TERM_COURSE_COPY: Record<LessonLocale, TermCopy> = {
  'zh-Hans': {
    group: '术语基础',
    definition: '定义',
    find: '如何寻找',
    mistake: '容易看错',
    practice: '识别练习',
    diagram: '局部候选示意',
    next: '下一题',
    finish: '完成',
    correct: '判断正确',
    retry: '再看一看',
    questionCount: '第 {current} 题，共 {total} 题',
    answers: {
      yes: '能共视',
      no: '不能共视',
      naked: '裸结构',
      hidden: '隐结构',
      neither: '都不是',
      locked: '可以锁定排除',
      notLocked: '不能锁定排除',
      bivalue: '双候选格',
      bilocation: '双位置',
      strong: '强链接',
      weak: '只有弱链接',
      none: '没有链接',
      basicFish: '基础鱼',
      finnedFish: '带鳍鱼',
      notFish: '条件未核对',
      valid: '可以',
      invalid: '不可以',
      eliminate: '可以排除',
      keep: '不能排除',
      deadly: '形成致命结构',
      notEnough: '条件不足',
      atLeastOne: '至少一处为真',
      notProven: '尚不能确定',
      forced: '可以确定',
      notForced: '不能确定',
    },
    courses: {
      candidates: {
        title: '候选数、排除与共视',
        definition:
          '候选数是某格目前仍可能填写的数字。两格同行、同列或同宫，就能互相看见；同一数字不能同时填在这两格。',
        find: '先选一个目标候选，再沿它所在的行、列和宫检查其他位置。只依据真实共视关系排除，不要把候选当成已填答案。',
        mistake:
          '对角线相邻或看起来很近并不等于共视；还要检查两格是否真的共享行、列或宫。',
        templates: {
          peer: 'r{r1}c{c1} 与 r{r2}c{c2} 能互相看见吗？',
          elimination:
            'r{r1}c{c1} 已填 {digit}，能排除 r{r2}c{c2} 的候选 {digit} 吗？',
        },
        feedback: {
          yes: '两格共享行、列或宫。',
          no: '两格没有共享行、列或宫。',
          eliminate: '已填数字与目标共视，目标不能再填同一数字。',
          keep: '已填数字与目标不共视，仅凭它不能排除此候选。',
        },
      },
      subsets: {
        title: '裸、隐与锁定',
        definition:
          '裸结构从格子出发：N 格合起来只有 N 个候选。隐结构从数字出发：N 个数字在一个区域里只能落在 N 格。锁定还要求相关格子同时落在行或列与宫的交会处。',
        find: '找裸结构时数所选格里的不同候选；找隐结构时追踪所选数字在整个区域的所有位置。找锁定时检查宫内同一数字是否全落在一行或一列，再看交会区外能否排除。',
        mistake:
          '两格都含同一对数字，不代表裸对；两数字只在两格出现，也不要求那两格只有这两个候选。',
        templates: {
          naked: '第 {row} 行的两格都仅含 {a}、{b}。优先按哪种结构识别？',
          hidden:
            '第 {row} 行的 {a}、{b} 只在两格出现，那两格还有其他候选。属于哪种结构？',
          neither:
            '第 {row} 行两格含 {a}、{b} 且有额外候选，第三格还有 {a}。这两格成立哪种结构？',
          locked:
            '某宫内数字 {digit} 只在第 {row} 行 c{column} 起的相邻两格。能排除同一行宫外 c{targetColumn} 的 {digit} 吗？',
          notLocked:
            '某宫内数字 {digit} 除第 {row} 行两格外，下一行还有一处。能排除第 {row} 行宫外 c{targetColumn} 的 {digit} 吗？',
        },
        feedback: {
          naked: '两格合起来恰好只有两个候选。',
          hidden: '两个数字在整行里只剩这两个位置。',
          neither: '额外候选排除裸对，第三处又排除隐对。',
          locked: '该宫里的数字被锁在同一行，同行宫外可排除。',
          notLocked: '宫内另一行仍有位置，无法锁定到指定行。',
        },
      },
      bivalue: {
        title: '双候选格、双位置与共轭对',
        definition:
          '双候选格是一格恰好剩两个数字；双位置是同一数字在一行、列或宫恰好剩两处。后一对位置也叫共轭对。',
        find: '找双候选格就逐格数候选；找双位置就固定一个数字，逐行、列、宫统计它的可去位置。',
        mistake:
          '一格两候选和一区域里某数字两处，是两个不同的计数方向。三处不能冒充双位置。',
        templates: {
          bivalue: 'r{row}c3 恰好只有 {digit}、{next} 两个候选。它是什么？',
          bilocation: '数字 {digit} 在第 {row} 行只剩 c2、c7 两处。它是什么？',
          neither: '数字 {digit} 在第 {row} 行仍有 c2、c5、c7 三处。它是什么？',
        },
        feedback: {
          bivalue: '数的是同一格内的两种数字。',
          bilocation: '数的是同一数字在一个区域中的两个位置。',
          neither: '仍有第三处，不能称为双位置。',
        },
      },
      links: {
        title: '强链接与弱链接',
        definition:
          '强链接表示两端不能同时为假：一端不成立，另一端必成立。弱链接表示两端不能同时为真：一端成立，另一端必不成立。普通双候选格和同一数字的双位置都能提供强链接。',
        find: '先固定数字与区域，确认是不是只剩两处；也可检查一格是否恰好两候选。若同区还有第三处，同一数字的两端只能构成弱链接。',
        mistake:
          '强链接也可以作为弱链接使用，反过来不行。两处不共视、数字又不相同，不能随手画链接。',
        templates: {
          houseTwo:
            '数字 {digit} 在第 {row} 行恰好只剩 c2、c7；这两个候选是什么链接？',
          houseThree:
            '数字 {digit} 在第 {row} 行还可去 c2、c5、c7；只看 c2 与 c7 是什么链接？',
          cellTwo:
            'r{row}c4 恰好只有 {digit}、{next}；格内两个候选是什么链接？',
          cellThree:
            'r{row}c4 有 {digit}、{next}、{extra}；只看前两个是什么链接？',
          unrelated: '两个不同数字分处不同行列宫，彼此是什么链接？',
        },
        feedback: {
          strong: '恰好两种可能，不能两端同时为假。',
          weak: '两端不能同真，但第三种可能使它们可以同假。',
          none: '这两项既不互斥，也不能互相强迫。',
        },
      },
      fish: {
        title: '鱼形的基础线、覆盖线与鱼鳍',
        definition:
          '基础线是选定的行或列；覆盖线是垂直方向接住基础线全部目标候选的线。N 条基础线由 N 条覆盖线接住就是基础鱼。基础线多出的候选可能成为鱼鳍。',
        find: '固定一个数字和方向，先挑两到四条基础线，再数它们的全部候选落在几条覆盖线上。遇到鱼鳍还要核对目标是否看见所有鱼鳍。',
        mistake:
          '画出矩形或十字不够；必须核对基础线上的全部候选。缺角和鱼鳍不能当作普通基础鱼的角。',
        templates: {
          basicFish:
            '选 {size} 条基础行，数字 {digit} 的全部候选只落在 {size} 条覆盖列。属于什么？',
          finnedFish:
            '选 {size} 条基础行，数字 {digit} 另有一个落在覆盖列外、靠近鱼角的候选。先识别什么？',
          notFish:
            '只标出部分基础候选，另有一处落在覆盖列外；其他位置尚未核对。现在能给鱼形定型吗？',
        },
        feedback: {
          basicFish: '基础候选全部被等数量的覆盖线接住。',
          finnedFish: '额外候选是鱼鳍；仍需检查具体目标才能排除。',
          notFish: '基础行的全部候选尚未核对，不能确定鱼形类型或排除。',
        },
      },
      chains: {
        title: '交替链、端点、目标与闭环',
        definition:
          '交替链把强、弱链接依次连接。两端若由强链接约束，就能证明至少一个端点成立；同时看见两端的目标候选可被排除。链回到起点则形成闭环。',
        find: '从一条强链接开始，逐步确认下一条链接的类型与两个节点；最后检查端点及目标的共视关系。',
        mistake:
          '不能仅凭画出的折线推论；任何一条链接不成立、顺序不交替或目标只看见一端，都不能套用端点排除。',
        templates: {
          sequence:
            'S 表示强链接、W 表示弱链接。顺序为 {sequence}，能证明首尾至少一端为真吗？',
        },
        feedback: {
          valid: '强—弱—强交替，端点至少一真。',
          invalid: '需要交替且两端由强链接约束。',
        },
      },
      coloring: {
        title: '双色状态与连通分量',
        definition:
          '沿同一数字的强链接，把候选交替标为 A、B。一个连通分量里的两色代表相反状态；互不相连的分量必须分别推理。',
        find: '从某数字恰好两处的行、列或宫出发，沿每条已验证强链接交替标色，再检查目标是否同时看见两种状态，或同色是否冲突。',
        mistake:
          '颜色是假设状态，不是已经填入的答案。不同分量即使都叫 A，也不能当作同一个状态。',
        templates: {
          trap: '目标 {digit} 同时看见同一分量中的 A、B 两色候选，可以排除吗？',
          conflict: '同一分量的两处 A 色候选互相看见，A 状态可以排除吗？',
          none: '目标 {digit} 只看见 A，不看见 B。仅凭此能排除吗？',
          separate:
            '目标 {digit} 看见两个不同连通分量各自的 A 色。仅凭颜色相同能排除吗？',
        },
        feedback: {
          eliminate: '目标受两种必选状态约束，或同色状态发生冲突。',
          keep: '只看见一种颜色，或比较的是不同分量，不能据此排除。',
        },
      },
      uniqueness: {
        title: '唯一解与致命矩形',
        definition:
          '有效题目只有一个完整解。若四格分布在两行、两列和两个宫，且都只能取同一对数字，交换两数字可能得到第二个解；这叫致命矩形。',
        find: '找两行两列构成的四角，先核对它们恰好跨两个宫，再逐格检查那对数字及额外候选。',
        mistake:
          '四角形状本身不够。若跨四个宫、已有固定数字或存在其他限制，不能直接套用唯一性推理。',
        templates: {
          deadly:
            '四角都只有 {a}、{b}，分布在两行、两列、两个宫。是否形成致命结构？',
          notEnough:
            '四角都只有 {a}、{b}，但分别落在四个宫。能按致命矩形判断吗？',
        },
        feedback: {
          deadly: '这四角可在两宫内交换同一对数字。',
          notEnough: '跨四宫时，交换可能破坏宫约束。',
        },
      },
      groups: {
        title: '分组候选与“至少一个成立”',
        definition:
          '相邻的几个同数字候选可以合成一个逻辑节点。分组为真只表示其中至少一处为真，并不表示组内每处都为真。',
        find: '先核对同一数字在行、列或宫中的所有位置；若一部分位置落在共同交会区，可合为一组，再检查组外是否只剩一个位置。',
        mistake:
          '不能漏掉组外的第三处；组节点也不能被误读为“这些格全部填这个数”。',
        templates: {
          atLeastOne:
            '第 3 行数字 {digit} 只在 c1、c2、c6。若 c6 不成立，c1/c2 这一组能推出什么？',
          notProven:
            '第 3 行数字 {digit} 还可去 c8。仅知 c6 不成立，c1/c2 这一组能推出什么？',
        },
        feedback: {
          atLeastOne: '组外唯一位置为假，组内至少一处必须为真。',
          notProven: 'c8 仍可能成立，不能强迫该组为真。',
        },
      },
      forcing: {
        title: '假设、穷尽分支与共同结论',
        definition:
          '从覆盖全部可能性的假设分支分别推理。若每条可行分支都得到同一结论，该结论必成立；若某假设导致矛盾，它就不成立。',
        find: '先证明起点分支已经穷尽，再分别记录每条分支的后果；最后比较共同结果或指出具体矛盾。',
        mistake:
          '只检查一条分支、漏掉一种可能，或把某一分支的结论当成所有分支的结论，都不能完成证明。',
        templates: {
          common: '穷尽的两条分支都排除候选 {digit}。现在能确定排除吗？',
          different:
            '一条分支排除候选 {digit}，另一条仍保留它。现在能确定排除吗？',
          contradiction:
            '假设候选 {digit} 为真会产生明确矛盾。能确定它为假吗？',
        },
        feedback: {
          forced: '所有可能分支达成一致，或该假设被矛盾排除。',
          notForced: '仍有可行分支没有得到同一结论。',
        },
      },
    },
  },
  en: {
    group: 'Core concepts',
    definition: 'Definition',
    find: 'How to find it',
    mistake: 'Common mistake',
    practice: 'Recognition practice',
    diagram: 'Candidate sketch',
    next: 'Next question',
    finish: 'Done',
    correct: 'Correct',
    retry: 'Look again',
    questionCount: 'Question {current} of {total}',
    answers: {
      yes: 'They see each other',
      no: 'They do not see each other',
      naked: 'Naked set',
      hidden: 'Hidden set',
      neither: 'Neither',
      locked: 'Locked elimination',
      notLocked: 'Not locked',
      bivalue: 'Bivalue cell',
      bilocation: 'Bilocation',
      strong: 'Strong link',
      weak: 'Weak link only',
      none: 'No link',
      basicFish: 'Basic fish',
      finnedFish: 'Finned fish',
      notFish: 'Unverified',
      valid: 'Yes',
      invalid: 'No',
      eliminate: 'Eliminate',
      keep: 'Cannot eliminate',
      deadly: 'Deadly pattern',
      notEnough: 'Not enough',
      atLeastOne: 'At least one is true',
      notProven: 'Not proven',
      forced: 'Forced',
      notForced: 'Not forced',
    },
    courses: {
      candidates: {
        title: 'Candidates, elimination and sight',
        definition:
          'A candidate is a digit still possible in a cell. Two cells see each other when they share a row, column or box; the same digit cannot be placed in both.',
        find: 'Choose one target candidate, then inspect its row, column and box. Eliminate only through a real shared region; a candidate is not a placed answer.',
        mistake:
          'Nearby or diagonal cells do not necessarily see each other. Check for a shared row, column or box.',
        templates: {
          peer: 'Do r{r1}c{c1} and r{r2}c{c2} see each other?',
          elimination:
            'r{r1}c{c1} contains placed {digit}. Remove candidate {digit} at r{r2}c{c2}?',
        },
        feedback: {
          yes: 'The cells share a row, column or box.',
          no: 'They share none of those regions.',
          eliminate:
            'The placed digit sees the target, so it cannot be placed there too.',
          keep: 'The filled cell does not see the target; this fact alone cannot remove it.',
        },
      },
      subsets: {
        title: 'Naked, hidden and locked sets',
        definition:
          'A naked set starts with cells: N cells contain only N digits together. A hidden set starts with digits: N digits have only N places in a region. A locked set also lies at a row/column and box intersection.',
        find: 'For a naked set, count digits in chosen cells. For a hidden set, check every place for those digits in the region. For a lock, check whether all box positions lie in one row or column, then inspect the outside cells.',
        mistake:
          'Two cells sharing a pair are not necessarily a naked pair. A hidden pair may have extra candidates in its cells.',
        templates: {
          naked:
            'Two cells in row {row} each contain only {a} and {b}. Which set is shown?',
          hidden:
            'In row {row}, {a} and {b} occur only in two cells, which also have other candidates. Which set?',
          neither:
            'Two cells in row {row} have extra candidates, and a third cell still has {a}. Which set?',
          locked:
            'In one box, {digit} occurs only in two adjacent cells of row {row}, starting at c{column}. Remove {digit} at c{targetColumn} in that row outside the box?',
          notLocked:
            'In one box, {digit} also has a place in the next row. Remove it at row {row} c{targetColumn} outside the box?',
        },
        feedback: {
          naked: 'The two cells contain exactly two digits together.',
          hidden: 'Those two digits have only two places in the whole row.',
          neither:
            'Extras prevent a naked pair; the third place prevents a hidden pair.',
          locked:
            'All box positions lie in one row, so this digit is excluded from that row outside the box.',
          notLocked: 'A position in another row prevents this lock.',
        },
      },
      bivalue: {
        title: 'Bivalue cells, bilocations and conjugate pairs',
        definition:
          'A bivalue cell has exactly two candidates. A bilocation means one digit has exactly two positions in a row, column or box; those positions are a conjugate pair.',
        find: 'Count candidates within a cell for bivalue. For bilocation, choose a digit and count its positions across an entire region.',
        mistake:
          'These count in different directions. Three positions are not a bilocation.',
        templates: {
          bivalue: 'r{row}c3 has only {digit} and {next}. What is it?',
          bilocation:
            'Digit {digit} has only c2 and c7 in row {row}. What is this?',
          neither:
            'Digit {digit} still has c2, c5 and c7 in row {row}. What is this?',
        },
        feedback: {
          bivalue: 'Count two digits in one cell.',
          bilocation: 'Count two places for one digit in a region.',
          neither: 'The third place rules out bilocation.',
        },
      },
      links: {
        title: 'Strong and weak links',
        definition:
          'A strong link means both ends cannot be false: if one is false, the other is true. A weak link means both cannot be true. Bivalue cells and bilocations provide ordinary strong links.',
        find: 'Choose a digit and region and verify that it has exactly two places, or find a cell with exactly two candidates. A third possibility leaves only a weak link between a pair.',
        mistake:
          'A strong link can serve as a weak link, but not the reverse. Do not draw a link between unrelated candidates.',
        templates: {
          houseTwo:
            'Digit {digit} has only c2 and c7 in row {row}. What link joins them?',
          houseThree:
            'Digit {digit} has c2, c5 and c7 in row {row}. What joins just c2 and c7?',
          cellTwo:
            'r{row}c4 has only {digit} and {next}. What joins those candidates?',
          cellThree:
            'r{row}c4 has {digit}, {next} and {extra}. What joins the first two?',
          unrelated:
            'Two different digits in cells sharing no region: what link joins them?',
        },
        feedback: {
          strong: 'Exactly two possibilities cannot both be false.',
          weak: 'They cannot both be true, but a third possibility permits both false.',
          none: 'Neither exclusion nor implication connects them.',
        },
      },
      fish: {
        title: 'Fish bases, covers and fins',
        definition:
          'Base sets are the selected rows or columns. Perpendicular cover sets contain all their target candidates. N bases covered by N lines form a basic fish; an extra base candidate may be a fin.',
        find: 'Fix one digit and orientation. Select two to four bases, then count all cover lines needed. For a fin, also check that the target sees every fin.',
        mistake:
          'A drawn rectangle alone is insufficient. Check every base candidate; a missing corner or fin is not an ordinary fish corner.',
        templates: {
          basicFish:
            'All {digit}s in {size} base rows fit in {size} cover columns. What is this?',
          finnedFish:
            'A candidate {digit} lies outside those cover columns near a fish corner. Identify it first.',
          notFish:
            'Only some base candidates are shown, including one outside the covers. Can you classify the fish before checking the rest?',
        },
        feedback: {
          basicFish: 'An equal number of covers contains all base candidates.',
          finnedFish:
            'The extra candidate is a fin; target visibility still needs checking.',
          notFish:
            'The remaining base candidates are unchecked, so neither fish type nor elimination is proved.',
        },
      },
      chains: {
        title: 'Alternating chains, endpoints and loops',
        definition:
          'An alternating chain follows strong and weak links in turn. Strongly constrained ends prove at least one endpoint true; a target seeing both can lose that digit. A chain returning to its start is a loop.',
        find: 'Begin at a strong link. Verify each successive link and its endpoints, then check that the target sees both ends.',
        mistake:
          'A line drawn on the board is not proof. A broken link, wrong alternation or target seeing only one end invalidates the deduction.',
        templates: {
          sequence:
            'S is strong, W is weak. Link order: {sequence}. Is at least one endpoint true?',
        },
        feedback: {
          valid: 'Strong–weak–strong alternates and constrains the endpoints.',
          invalid: 'Links must alternate and both ends need strong inference.',
        },
      },
      coloring: {
        title: 'Two-color states and components',
        definition:
          'Follow strong links for one digit and alternate colors A and B. Within one connected component the colors are opposite states; separate components require separate reasoning.',
        find: 'Start at a region with exactly two positions for a digit, color along verified strong links, then inspect a target seeing both colors or a same-color conflict.',
        mistake:
          'A color is a hypothetical state, not a filled digit. The A label in two separate components does not mean the same state.',
        templates: {
          trap: 'Target {digit} sees both A and B in one component. Eliminate it?',
          conflict:
            'Two A candidates in one component see each other. Reject state A?',
          none: 'Target {digit} sees A but not B. Eliminate it on that fact alone?',
          separate:
            'Target {digit} sees A in each of two separate components. Does the matching color alone eliminate it?',
        },
        feedback: {
          eliminate:
            'Both required alternatives constrain the target, or one color conflicts with itself.',
          keep: 'One visible color, or matching labels in separate components, proves no elimination.',
        },
      },
      uniqueness: {
        title: 'Uniqueness and deadly rectangles',
        definition:
          'A valid puzzle has one full solution. Four cells in two rows, columns and boxes, all holding the same pair, may allow that pair to swap and create a second solution: a deadly rectangle.',
        find: 'Choose four rectangle corners. Verify that they occupy exactly two boxes, then inspect the pair and any extra candidates.',
        mistake:
          'Shape alone is insufficient. Four boxes, givens or further constraints can break the swap argument.',
        templates: {
          deadly:
            'Four corners have only {a} and {b} in two rows, columns and boxes. Deadly pattern?',
          notEnough:
            'Four corners have only {a} and {b}, but occupy four boxes. Deadly rectangle?',
        },
        feedback: {
          deadly: 'The pair could swap within the same two boxes.',
          notEnough: 'Four boxes can block the swap.',
        },
      },
      groups: {
        title: 'Grouped candidates and “at least one”',
        definition:
          'Several candidates of one digit may form one logical node. A true group means at least one member is true, not that every member is true.',
        find: 'Inspect all positions of a digit in a region. Combine positions in a shared intersection, then check how many outside positions remain.',
        mistake:
          'Do not omit another outside candidate or read a true group as every member being placed.',
        templates: {
          atLeastOne:
            'In row 3, {digit} is only in c1, c2 and c6. If c6 is false, what follows for c1/c2?',
          notProven:
            'Row 3 can also hold {digit} in c8. If c6 is false, what follows for c1/c2?',
        },
        feedback: {
          atLeastOne:
            'With the sole outside position false, at least one group member is true.',
          notProven: 'c8 may still be true, so the group is not forced.',
        },
      },
      forcing: {
        title: 'Assumptions, exhaustive branches and conclusions',
        definition:
          'Follow every possibility in an exhaustive split. A result common to all viable branches is forced; an assumption leading to contradiction is false.',
        find: 'Prove that the starting branches cover all options, record each consequence, then compare common effects or identify a precise contradiction.',
        mistake:
          'One branch is not enough. An omitted possibility or result from only one branch does not prove the conclusion.',
        templates: {
          common:
            'Both exhaustive branches eliminate candidate {digit}. Is its elimination forced?',
          different:
            'One branch eliminates {digit}; another keeps it. Is elimination forced?',
          contradiction:
            'Assuming candidate {digit} true creates a contradiction. Is it forced false?',
        },
        feedback: {
          forced: 'All branches agree, or the assumption contradicts a rule.',
          notForced: 'A viable branch does not support that result.',
        },
      },
    },
  },
  ja: {
    group: '用語の基礎',
    definition: '定義',
    find: '探し方',
    mistake: 'よくある間違い',
    practice: '見分ける練習',
    diagram: '候補の模式図',
    next: '次の問題',
    finish: '完了',
    correct: '正解',
    retry: 'もう一度確認',
    questionCount: '{total} 問中 {current} 問',
    answers: {
      yes: '互いに見える',
      no: '見えない',
      naked: 'ネイキッド',
      hidden: 'ヒドゥン',
      neither: 'どちらでもない',
      locked: 'ロックで除外',
      notLocked: 'ロック不可',
      bivalue: '二候補マス',
      bilocation: '二位置',
      strong: '強リンク',
      weak: '弱リンクのみ',
      none: 'リンクなし',
      basicFish: '基本フィッシュ',
      finnedFish: 'フィン付き',
      notFish: '条件未確認',
      valid: 'できる',
      invalid: 'できない',
      eliminate: '除外できる',
      keep: '除外できない',
      deadly: '致命的な形',
      notEnough: '条件不足',
      atLeastOne: '少なくとも一つ真',
      notProven: 'まだ不明',
      forced: '確定する',
      notForced: '確定しない',
    },
    courses: {
      candidates: {
        title: '候補・除外・見える関係',
        definition:
          '候補はマスにまだ入る可能性がある数字です。同じ行・列・ブロックを共有する二つのマスは互いに見え、同じ数字を両方には置けません。',
        find: '候補を一つ選び、その行・列・ブロックを調べます。実際に共有する領域だけを根拠に除外します。',
        mistake: '近いだけ、斜めに並ぶだけでは見える関係になりません。',
        templates: {
          peer: 'r{r1}c{c1} と r{r2}c{c2} は互いに見えますか？',
          elimination:
            'r{r1}c{c1} に {digit} が確定。r{r2}c{c2} の候補 {digit} を除外できますか？',
        },
        feedback: {
          yes: '行・列・ブロックのいずれかを共有します。',
          no: 'どの領域も共有しません。',
          eliminate: '確定数字と対象は同じ領域にあり、同じ数字を置けません。',
          keep: '確定数字は対象を見ないので、これだけでは除外できません。',
        },
      },
      subsets: {
        title: 'ネイキッド・ヒドゥン・ロック',
        definition:
          'ネイキッドは N マスの候補が合計 N 種類。ヒドゥンは N 個の数字の置き場所が一つの領域で N マスのみ。ロックは行または列とブロックの交差にも注目します。',
        find: 'ネイキッドはマスの候補、ヒドゥンは数字の位置を領域全体で数えます。ロックはブロック内の全位置が一行か一列に限られるかを調べます。',
        mistake:
          '同じ二数字を含むだけではペアにならず、ヒドゥンのマスには余分な候補があっても構いません。',
        templates: {
          naked: '行 {row} の二マスはそれぞれ {a}・{b} のみ。どの構造？',
          hidden:
            '行 {row} で {a}・{b} は二マスだけにあり、そのマスには他の候補もあります。どの構造？',
          neither:
            '行 {row} の二マスには余分な候補があり、第三のマスにも {a} があります。どの構造？',
          locked:
            '一つのブロック内の {digit} は行 {row} の c{column} から並ぶ二マスのみ。ブロック外の同じ行 c{targetColumn} から除外できますか？',
          notLocked:
            'ブロック内の {digit} は次の行にも一つあります。行 {row} のブロック外 c{targetColumn} から除外できますか？',
        },
        feedback: {
          naked: '二マスを合わせて二数字のみです。',
          hidden: '二数字の位置は行全体で二マスだけです。',
          neither: '余分な候補と第三の位置が両方の条件を壊します。',
          locked:
            'ブロック内の位置が同じ行に限られ、その行のブロック外から除外できます。',
          notLocked: '別の行にも位置があるためロックできません。',
        },
      },
      bivalue: {
        title: '二候補マス・二位置・共役ペア',
        definition:
          '二候補マスには候補がちょうど二つあります。二位置は一つの数字が行・列・ブロックでちょうど二マスにある状態で、共役ペアとも呼びます。',
        find: '二候補は一マス内を、二位置は数字を固定して領域全体を数えます。',
        mistake: '数える方向が違います。三位置は二位置ではありません。',
        templates: {
          bivalue: 'r{row}c3 の候補は {digit}・{next} のみ。何ですか？',
          bilocation: '行 {row} で数字 {digit} は c2・c7 のみ。何ですか？',
          neither:
            '行 {row} で数字 {digit} は c2・c5・c7 にあります。何ですか？',
        },
        feedback: {
          bivalue: '一マスの二数字を数えます。',
          bilocation: '一数字の二位置を領域で数えます。',
          neither: '第三の位置があります。',
        },
      },
      links: {
        title: '強リンクと弱リンク',
        definition:
          '強リンクの両端は同時に偽になれません。一方が偽なら他方は真です。弱リンクの両端は同時に真になれません。二候補マスや二位置は強リンクを作ります。',
        find: '一数字の位置が領域で二つだけか、一マスの候補が二つだけかを確認します。第三候補があれば、二つの間は弱リンクだけです。',
        mistake:
          '強リンクは弱リンクとして使えますが、その逆はできません。無関係な候補を結んではいけません。',
        templates: {
          houseTwo: '行 {row} で {digit} は c2・c7 のみ。両者のリンクは？',
          houseThree:
            '行 {row} で {digit} は c2・c5・c7。c2 と c7 のリンクは？',
          cellTwo: 'r{row}c4 は {digit}・{next} のみ。マス内のリンクは？',
          cellThree:
            'r{row}c4 は {digit}・{next}・{extra}。最初の二候補のリンクは？',
          unrelated:
            '領域を共有しない二マスの異なる数字にはどんなリンクがありますか？',
        },
        feedback: {
          strong: '二つしかなく、両方を偽にはできません。',
          weak: '同時には真になれませんが、第三候補があるので同時に偽にもなれます。',
          none: '排他関係も強制関係もありません。',
        },
      },
      fish: {
        title: 'フィッシュのベース・カバー・フィン',
        definition:
          'ベースは選んだ行または列で、カバーは候補を受け止める直交方向の線です。N 本のベースを N 本のカバーで覆うと基本フィッシュ。余分な候補がフィンになることがあります。',
        find: '数字と方向を一つ決め、二～四本のベースを選び、その全候補を覆う線を数えます。フィンがあれば対象がすべてのフィンを見られるか確認します。',
        mistake:
          '四角形だけでは不十分。ベース上の全候補を確認し、欠けた角やフィンを普通の角と数えないでください。',
        templates: {
          basicFish:
            '{size} 本のベース行の {digit} が {size} 本のカバー列に収まります。何ですか？',
          finnedFish:
            '{digit} の余分な候補がカバー列の外、角の近くにあります。まず何を識別しますか？',
          notFish:
            'ベース候補の一部とカバー外の候補だけが分かっています。残りを調べずに型を決められますか？',
        },
        feedback: {
          basicFish: '同数のカバーがベースの全候補を覆います。',
          finnedFish: '余分な候補はフィンです。対象との関係も確認します。',
          notFish:
            'ベース上の候補が未確認なので、型も除外もまだ証明できません。',
        },
      },
      chains: {
        title: '交互連鎖・端点・ループ',
        definition:
          '強リンクと弱リンクを交互につなぎます。端が強く制約されれば少なくとも一方は真となり、両端を見る対象を除外できます。出発点に戻る連鎖はループです。',
        find: '強リンクから始め、各リンクの種類と節点を確かめ、最後に対象が両端を見るか確認します。',
        mistake:
          '線を描くだけでは証明になりません。リンクの誤りや片方の端しか見ない対象には使えません。',
        templates: {
          sequence:
            'S は強リンク、W は弱リンク。順序 {sequence} で端点の一方は必ず真ですか？',
        },
        feedback: {
          valid: '強・弱・強の交互関係です。',
          invalid: '交互で、両端に強い推論が必要です。',
        },
      },
      coloring: {
        title: '二色状態と連結成分',
        definition:
          '一数字の強リンクに沿って A と B を交互に付けます。一つの連結成分内で二色は反対の状態です。別成分は別々に考えます。',
        find: '数字が二位置だけの領域から始め、確認済みの強リンクに沿って色を付け、対象が両色を見るか同色同士が衝突するか調べます。',
        mistake:
          '色は仮定であり確定数字ではありません。別成分の A を同じ状態とみなさないでください。',
        templates: {
          trap: '対象の {digit} は同じ成分の A と B を両方見ます。除外できますか？',
          conflict:
            '同じ成分の A 色二候補が互いに見えます。A 状態を否定できますか？',
          none: '対象の {digit} は A のみを見ます。これだけで除外できますか？',
          separate:
            '対象の {digit} は別々の連結成分の A を見ます。同じ色というだけで除外できますか？',
        },
        feedback: {
          eliminate: '両状態が対象を制約するか、同色が衝突します。',
          keep: '片色だけ、または別成分の同名色だけでは除外できません。',
        },
      },
      uniqueness: {
        title: '唯一解と致命的長方形',
        definition:
          '有効な問題の完成解は一つです。二行・二列・二ブロックの四マスが同じ二数字だけなら、交換して第二解になる恐れがあります。',
        find: '四角のマスを選び、二ブロックだけに入るかを確認してから、候補と余分な数字を調べます。',
        mistake:
          '形だけでは不十分。四ブロックにまたがる場合などは交換の理屈が使えません。',
        templates: {
          deadly:
            '四角が {a}・{b} のみで二行・二列・二ブロックにあります。致命的な形ですか？',
          notEnough:
            '四角が {a}・{b} のみでも四ブロックにあります。致命的な形ですか？',
        },
        feedback: {
          deadly: '同じ二ブロック内で数字を交換できます。',
          notEnough: '四ブロックでは交換がブロック条件を壊す可能性があります。',
        },
      },
      groups: {
        title: 'グループ候補と「少なくとも一つ」',
        definition:
          '同じ数字の複数候補を一つの論理節点にできます。グループが真とは、全員ではなく少なくとも一つが真という意味です。',
        find: '領域内の全位置を確認し、交差領域の候補をまとめた後、外側にいくつ残るかを調べます。',
        mistake:
          '外側の第三候補を見落としたり、グループ全員が真と読んだりしないでください。',
        templates: {
          atLeastOne:
            '行 3 の {digit} は c1・c2・c6 のみ。c6 が偽なら c1/c2 は？',
          notProven:
            '行 3 の {digit} は c8 にも入ります。c6 が偽なら c1/c2 は？',
        },
        feedback: {
          atLeastOne:
            '外側唯一の位置が偽なら、グループ内の少なくとも一つは真です。',
          notProven: 'c8 がまだ真になり得ます。',
        },
      },
      forcing: {
        title: '仮定・網羅分岐・共通結論',
        definition:
          'すべての可能性を網羅する分岐を別々に追います。すべての有効な分岐が同じ結論なら必然です。矛盾する仮定は偽です。',
        find: '出発時の分岐が網羅的か証明し、各結果を記録して共通点や具体的な矛盾を探します。',
        mistake:
          '一つの分岐だけの結果や、漏れのある分岐では結論を証明できません。',
        templates: {
          common: '網羅的な二分岐がどちらも候補 {digit} を除外。除外は確定？',
          different: '一方は {digit} を除外し、他方は残します。除外は確定？',
          contradiction: '候補 {digit} を真と仮定すると矛盾します。偽と確定？',
        },
        feedback: {
          forced: 'すべての分岐が一致するか、仮定が矛盾します。',
          notForced: '有効な別分岐は同じ結果を支持しません。',
        },
      },
    },
  },
  de: {
    group: 'Grundbegriffe',
    definition: 'Definition',
    find: 'So findest du es',
    mistake: 'Häufiger Fehler',
    practice: 'Erkennen üben',
    diagram: 'Kandidaten-Skizze',
    next: 'Nächste Frage',
    finish: 'Fertig',
    correct: 'Richtig',
    retry: 'Noch einmal prüfen',
    questionCount: 'Frage {current} von {total}',
    answers: {
      yes: 'Sie sehen sich',
      no: 'Sie sehen sich nicht',
      naked: 'Nackte Menge',
      hidden: 'Versteckte Menge',
      neither: 'Keines von beiden',
      locked: 'Gesperrter Ausschluss',
      notLocked: 'Nicht gesperrt',
      bivalue: 'Bivalue-Feld',
      bilocation: 'Zwei Positionen',
      strong: 'Starke Verbindung',
      weak: 'Nur schwache Verbindung',
      none: 'Keine Verbindung',
      basicFish: 'Basis-Fisch',
      finnedFish: 'Fisch mit Flosse',
      notFish: 'Ungeprüft',
      valid: 'Ja',
      invalid: 'Nein',
      eliminate: 'Entfernen',
      keep: 'Nicht entfernen',
      deadly: 'Tödliches Muster',
      notEnough: 'Nicht ausreichend',
      atLeastOne: 'Mindestens eins wahr',
      notProven: 'Nicht bewiesen',
      forced: 'Erzwungen',
      notForced: 'Nicht erzwungen',
    },
    courses: {
      candidates: {
        title: 'Kandidaten, Ausschluss und Sicht',
        definition:
          'Ein Kandidat ist eine noch mögliche Ziffer in einem Feld. Zwei Felder sehen sich, wenn sie Zeile, Spalte oder Block teilen; dieselbe Ziffer kann nicht in beiden stehen.',
        find: 'Wähle einen Kandidaten und prüfe seine Zeile, Spalte und seinen Block. Entferne nur bei echter gemeinsamer Einheit.',
        mistake:
          'Nähe oder Diagonale genügt nicht. Prüfe die gemeinsame Zeile, Spalte oder den Block.',
        templates: {
          peer: 'Sehen sich r{r1}c{c1} und r{r2}c{c2}?',
          elimination:
            'In r{r1}c{c1} steht {digit}. Kandidat {digit} in r{r2}c{c2} entfernen?',
        },
        feedback: {
          yes: 'Die Felder teilen eine Einheit.',
          no: 'Sie teilen keine Zeile, Spalte und keinen Block.',
          eliminate:
            'Die gesetzte Ziffer sieht das Ziel und kann dort nicht noch einmal stehen.',
          keep: 'Das gesetzte Feld sieht das Ziel nicht; daraus folgt keine Entfernung.',
        },
      },
      subsets: {
        title: 'Nackte, versteckte und gesperrte Mengen',
        definition:
          'Eine nackte Menge beginnt bei N Feldern mit zusammen nur N Ziffern. Eine versteckte Menge beginnt bei N Ziffern, die in einer Einheit nur N Plätze haben. Eine gesperrte Menge liegt zusätzlich am Schnitt von Linie und Block.',
        find: 'Zähle für nackte Mengen die Feldkandidaten, für versteckte Mengen alle Plätze einer Ziffer in der Einheit. Für eine Sperre prüfe, ob alle Blockpositionen in einer Zeile oder Spalte liegen.',
        mistake:
          'Ein gemeinsames Paar reicht nicht immer; versteckte Paare dürfen weitere Kandidaten in den Feldern haben.',
        templates: {
          naked:
            'Zwei Felder in Zeile {row} enthalten jeweils nur {a} und {b}. Welche Menge?',
          hidden:
            'In Zeile {row} stehen {a} und {b} nur in zwei Feldern mit weiteren Kandidaten. Welche Menge?',
          neither:
            'Zwei Felder in Zeile {row} haben Extras, und ein drittes enthält {a}. Welche Menge?',
          locked:
            'Im Block liegt {digit} nur in zwei Nachbarfeldern der Zeile {row} ab c{column}. In derselben Zeile außerhalb des Blocks bei c{targetColumn} entfernen?',
          notLocked:
            'Im Block hat {digit} auch in der nächsten Zeile einen Platz. Außerhalb des Blocks in Zeile {row} bei c{targetColumn} entfernen?',
        },
        feedback: {
          naked: 'Zwei Felder enthalten zusammen genau zwei Ziffern.',
          hidden:
            'Die beiden Ziffern haben in der ganzen Zeile nur zwei Plätze.',
          neither: 'Extras und dritter Platz verhindern beide Muster.',
          locked:
            'Alle Blockpositionen liegen in einer Zeile; außerhalb des Blocks kann die Ziffer dort weg.',
          notLocked: 'Ein Platz in einer anderen Zeile verhindert die Sperre.',
        },
      },
      bivalue: {
        title: 'Bivalue, Bilocation und konjugierte Paare',
        definition:
          'Ein Bivalue-Feld hat genau zwei Kandidaten. Bilocation bedeutet, dass eine Ziffer in einer Zeile, Spalte oder einem Block genau zwei Plätze hat; diese bilden ein konjugiertes Paar.',
        find: 'Für Bivalue zähle in einem Feld. Für Bilocation fixiere eine Ziffer und zähle ihre Plätze in der ganzen Einheit.',
        mistake:
          'Das sind zwei verschiedene Zählrichtungen. Drei Plätze sind keine Bilocation.',
        templates: {
          bivalue: 'r{row}c3 hat nur {digit} und {next}. Was ist das?',
          bilocation:
            'Ziffer {digit} hat in Zeile {row} nur c2 und c7. Was ist das?',
          neither:
            'Ziffer {digit} hat in Zeile {row} noch c2, c5 und c7. Was ist das?',
        },
        feedback: {
          bivalue: 'Zwei Ziffern in einem Feld.',
          bilocation: 'Zwei Plätze einer Ziffer in einer Einheit.',
          neither: 'Ein dritter Platz bleibt.',
        },
      },
      links: {
        title: 'Starke und schwache Verbindungen',
        definition:
          'Bei einer starken Verbindung können nicht beide Enden falsch sein: Ist eins falsch, ist das andere wahr. Bei einer schwachen Verbindung können nicht beide wahr sein. Bivalue und Bilocation liefern starke Verbindungen.',
        find: 'Prüfe, ob eine Ziffer in einer Einheit genau zwei Plätze oder ein Feld genau zwei Kandidaten hat. Eine dritte Möglichkeit lässt zwischen zwei Enden nur eine schwache Verbindung.',
        mistake:
          'Stark darf auch als schwach verwendet werden, umgekehrt nicht. Verbinde keine unabhängigen Kandidaten.',
        templates: {
          houseTwo:
            'Ziffer {digit} steht in Zeile {row} nur in c2 und c7. Welche Verbindung?',
          houseThree:
            'Ziffer {digit} steht in Zeile {row} in c2, c5 und c7. Verbindung zwischen c2 und c7?',
          cellTwo: 'r{row}c4 hat nur {digit} und {next}. Verbindung im Feld?',
          cellThree:
            'r{row}c4 hat {digit}, {next} und {extra}. Verbindung zwischen den ersten beiden?',
          unrelated:
            'Zwei verschiedene Ziffern in Feldern ohne gemeinsame Einheit: welche Verbindung?',
        },
        feedback: {
          strong: 'Genau zwei Möglichkeiten können nicht beide falsch sein.',
          weak: 'Beide können nicht wahr sein, aber eine dritte Möglichkeit erlaubt beide falsch.',
          none: 'Es gibt weder Ausschluss noch Folgerung.',
        },
      },
      fish: {
        title: 'Basislinien, Decklinien und Flossen',
        definition:
          'Basislinien sind ausgewählte Zeilen oder Spalten. Senkrechte Decklinien enthalten alle Zielkandidaten. N Basislinien mit N Decklinien bilden einen Basis-Fisch; ein zusätzlicher Kandidat kann eine Flosse sein.',
        find: 'Wähle eine Ziffer und Richtung, dann zwei bis vier Basislinien. Zähle alle nötigen Decklinien. Bei Flossen prüfe, ob das Ziel alle Flossen sieht.',
        mistake:
          'Ein Rechteck allein genügt nicht. Prüfe alle Kandidaten der Basislinien; eine fehlende Ecke oder Flosse ist keine normale Fisch-Ecke.',
        templates: {
          basicFish:
            'Alle {digit}er aus {size} Basiszeilen liegen in {size} Deckspalten. Was ist das?',
          finnedFish:
            'Ein zusätzlicher {digit}er liegt neben einer Ecke außerhalb der Deckspalten. Zuerst erkennen?',
          notFish:
            'Nur einige Basis-Kandidaten sind geprüft, einer liegt außerhalb der Decklinien. Ist der Fischtyp schon sicher?',
        },
        feedback: {
          basicFish: 'Gleich viele Decklinien enthalten alle Basis-Kandidaten.',
          finnedFish: 'Das Extra ist eine Flosse; prüfe noch das Ziel.',
          notFish:
            'Ohne alle Basis-Kandidaten sind weder Fischtyp noch Entfernung bewiesen.',
        },
      },
      chains: {
        title: 'Wechselketten, Enden, Ziele und Schleifen',
        definition:
          'Eine Kette wechselt starke und schwache Verbindungen ab. Sind die Enden stark gebunden, muss mindestens eines wahr sein; ein Ziel, das beide sieht, verliert die Ziffer. Rückkehr zum Start ergibt eine Schleife.',
        find: 'Beginne bei einer starken Verbindung, prüfe jeden folgenden Typ und seine Knoten sowie die Sicht des Ziels auf beide Enden.',
        mistake:
          'Eine gezeichnete Linie ist kein Beweis. Ein falsches Glied, fehlender Wechsel oder nur ein sichtbares Ende reichen nicht.',
        templates: {
          sequence:
            'S = stark, W = schwach. Folge: {sequence}. Ist mindestens ein Ende sicher wahr?',
        },
        feedback: {
          valid: 'Stark–schwach–stark wechselt und bindet die Enden.',
          invalid: 'Die Folge muss wechseln und stark enden.',
        },
      },
      coloring: {
        title: 'Zweifarbige Zustände und Komponenten',
        definition:
          'Entlang starker Verbindungen einer Ziffer werden A und B abwechselnd markiert. In einer verbundenen Komponente sind sie Gegen-Zustände; getrennte Komponenten bleiben getrennt.',
        find: 'Starte bei genau zwei Positionen einer Ziffer, färbe entlang geprüfter starker Verbindungen und prüfe Ziel oder Konflikt gleicher Farben.',
        mistake:
          'Farbe ist eine Annahme, keine gesetzte Ziffer. A in zwei getrennten Komponenten ist nicht derselbe Zustand.',
        templates: {
          trap: 'Ziel {digit} sieht A und B derselben Komponente. Entfernen?',
          conflict:
            'Zwei A-Kandidaten derselben Komponente sehen sich. A-Zustand verwerfen?',
          none: 'Ziel {digit} sieht A, aber nicht B. Schon entfernen?',
          separate:
            'Ziel {digit} sieht A in zwei getrennten Komponenten. Reicht die gleiche Farbe zur Entfernung?',
        },
        feedback: {
          eliminate:
            'Beide Alternativen binden das Ziel oder gleiche Farbe kollidiert.',
          keep: 'Eine Farbe allein oder gleiche Namen in getrennten Komponenten beweisen keine Entfernung.',
        },
      },
      uniqueness: {
        title: 'Eindeutigkeit und tödliche Rechtecke',
        definition:
          'Ein gültiges Rätsel hat eine Lösung. Vier Felder in zwei Zeilen, Spalten und Blöcken mit demselben Paar könnten vertauscht eine zweite Lösung ergeben: ein tödliches Rechteck.',
        find: 'Prüfe vier Rechteck-Ecken, ob sie genau zwei Blöcke belegen, und kontrolliere Paar sowie weitere Kandidaten.',
        mistake:
          'Die Form allein genügt nicht. Vier Blöcke oder andere Einschränkungen können den Tausch verhindern.',
        templates: {
          deadly:
            'Vier Ecken haben nur {a} und {b} in zwei Zeilen, Spalten und Blöcken. Tödlich?',
          notEnough:
            'Vier Ecken haben nur {a} und {b}, liegen aber in vier Blöcken. Tödlich?',
        },
        feedback: {
          deadly:
            'Das Paar könnte innerhalb derselben zwei Blöcke getauscht werden.',
          notEnough: 'Vier Blöcke können den Tausch verhindern.',
        },
      },
      groups: {
        title: 'Gruppenkandidaten und „mindestens eins“',
        definition:
          'Mehrere Kandidaten derselben Ziffer können ein logischer Knoten sein. Eine wahre Gruppe bedeutet mindestens ein wahres Mitglied, nicht alle.',
        find: 'Prüfe alle Plätze einer Ziffer in einer Einheit, fasse eine gemeinsame Schnittgruppe zusammen und zähle äußere Plätze.',
        mistake:
          'Übersehe keinen dritten äußeren Kandidaten und behandle nicht alle Gruppenmitglieder als gesetzt.',
        templates: {
          atLeastOne:
            'In Zeile 3 steht {digit} nur in c1, c2, c6. Wenn c6 falsch ist, was gilt für c1/c2?',
          notProven:
            'In Zeile 3 kann {digit} auch in c8 stehen. Wenn c6 falsch ist, was gilt für c1/c2?',
        },
        feedback: {
          atLeastOne:
            'Ist der einzige äußere Platz falsch, muss mindestens ein Gruppenmitglied wahr sein.',
          notProven: 'c8 kann noch wahr sein.',
        },
      },
      forcing: {
        title: 'Annahmen, vollständige Zweige und Schlüsse',
        definition:
          'Verfolge alle Möglichkeiten einer vollständigen Aufteilung. Ein Ergebnis aller möglichen Zweige ist erzwungen; eine Annahme mit Widerspruch ist falsch.',
        find: 'Beweise die Vollständigkeit der Zweige, notiere Folgen und vergleiche gemeinsame Ergebnisse oder konkrete Widersprüche.',
        mistake:
          'Ein Zweig oder eine lückenhafte Aufteilung beweist keinen gemeinsamen Schluss.',
        templates: {
          common:
            'Beide vollständigen Zweige entfernen Kandidat {digit}. Ist das erzwungen?',
          different:
            'Ein Zweig entfernt {digit}, ein anderer behält ihn. Erzwungen?',
          contradiction:
            'Annahme {digit} wahr führt zum Widerspruch. Ist {digit} sicher falsch?',
        },
        feedback: {
          forced:
            'Alle Zweige stimmen überein oder die Annahme widerspricht einer Regel.',
          notForced: 'Ein möglicher Zweig stützt den Schluss nicht.',
        },
      },
    },
  },
};
