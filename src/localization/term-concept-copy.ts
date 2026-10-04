import type { LessonLocale } from '../domain/lessons/contracts';
import type { TermConcept } from '../data/lessons/term-concepts';

export type ConceptText = Readonly<{
  title: string;
  definition: string;
  find: string;
  mistake: string;
  question: string;
  questionWhenValid?: string;
  questionWhenInvalid?: string;
}>;

type ConceptUi = Readonly<{
  group: string;
  intro: string;
  definition: string;
  find: string;
  mistake: string;
  article: string;
  example: string;
  practice: string;
  observe: string;
  verify: string;
  conclude: string;
  yes: string;
  no: string;
  correct: string;
  retry: string;
  next: string;
  finish: string;
  back: string;
  questions: string;
  page: string;
  diagram: string;
  branch: string;
  removed: string;
  remains: string;
}>;

export const TERM_CONCEPT_UI: Record<LessonLocale, ConceptUi> = {
  'zh-Hans': {
    group: '核心概念',
    intro: '先看清图中的对象，再跟着步骤验证条件。',
    definition: '概念',
    find: '如何寻找',
    mistake: '容易误判',
    article: '图文讲解',
    example: '分步例题',
    practice: '识别练习',
    observe: '观察候选',
    verify: '核对条件',
    conclude: '得出结论',
    yes: '成立',
    no: '不成立',
    correct: '判断正确',
    retry: '再核对图中的条件',
    next: '下一题',
    finish: '完成',
    back: '返回',
    questions: '第 {current} 题，共 {total} 题',
    page: '步骤 {current}/{total}',
    diagram: '教学棋盘 · 局部候选示意',
    branch: '分支',
    removed: '目标排除',
    remains: '目标保留',
  },
  en: {
    group: 'Core Concepts',
    intro:
      'Read the marked candidates, then verify the condition step by step.',
    definition: 'Definition',
    find: 'How to find it',
    mistake: 'Common mistake',
    article: 'Illustrated guide',
    example: 'Worked example',
    practice: 'Recognition practice',
    observe: 'Observe candidates',
    verify: 'Verify the condition',
    conclude: 'Draw the conclusion',
    yes: 'Yes',
    no: 'No',
    correct: 'Correct',
    retry: 'Check the diagram again',
    next: 'Next',
    finish: 'Done',
    back: 'Back',
    questions: 'Question {current} of {total}',
    page: 'Step {current}/{total}',
    diagram: 'Teaching board · local candidate diagram',
    branch: 'Branch',
    removed: 'target removed',
    remains: 'target remains',
  },
  ja: {
    group: '基本概念',
    intro: '候補を見て、条件を一歩ずつ確認します。',
    definition: '定義',
    find: '探し方',
    mistake: 'よくある誤り',
    article: '図解',
    example: '段階的な例',
    practice: '見分ける練習',
    observe: '候補を見る',
    verify: '条件を確認',
    conclude: '結論を出す',
    yes: '成立',
    no: '不成立',
    correct: '正解',
    retry: '図の条件を再確認',
    next: '次へ',
    finish: '完了',
    back: '戻る',
    questions: '{total} 問中 {current} 問',
    page: '手順 {current}/{total}',
    diagram: '学習盤 · 局所候補の図',
    branch: '分岐',
    removed: '対象を除外',
    remains: '対象が残る',
  },
  de: {
    group: 'Grundbegriffe',
    intro:
      'Lies die markierten Kandidaten und prüfe die Bedingung Schritt für Schritt.',
    definition: 'Begriff',
    find: 'So findest du es',
    mistake: 'Häufiger Fehler',
    article: 'Erklärung mit Diagramm',
    example: 'Beispiel in Schritten',
    practice: 'Erkennen üben',
    observe: 'Kandidaten ansehen',
    verify: 'Bedingung prüfen',
    conclude: 'Schluss ziehen',
    yes: 'Ja',
    no: 'Nein',
    correct: 'Richtig',
    retry: 'Diagramm noch einmal prüfen',
    next: 'Weiter',
    finish: 'Fertig',
    back: 'Zurück',
    questions: 'Frage {current} von {total}',
    page: 'Schritt {current}/{total}',
    diagram: 'Lehrdiagramm · lokale Kandidaten',
    branch: 'Zweig',
    removed: 'Ziel entfernt',
    remains: 'Ziel bleibt',
  },
};

const zh: Record<TermConcept, ConceptText> = {
  candidate: {
    title: '候选数',
    definition:
      '空格里仍可能填写的数字叫候选数。它只是可能性，不是已经确定的答案。',
    find: '先看格子是否为空，再检查同行、同列、同宫已有的数字；没有被这些数字排除的才保留为候选。',
    mistake:
      '格内小数字是笔记；已填的大数字不是候选。局部示意图只显示本题需要检查的候选。',
    question: '高亮的小数字是尚未确定的候选数吗？',
  },
  peer: {
    title: '同伴格',
    definition:
      '与一个格子同行、同列或同宫的格子，叫它的同伴格。两个格子若互为同伴格，就互相看见，不能同时填入相同数字。',
    find: '从第一格出发，检查另一格是否与它同行、同列或同宫；符合任一项就是同伴格。',
    mistake:
      '距离近或斜对角相邻，不一定互相看见。不同宫的两个格子，也可能因同行或同列成为同伴格。',
    question: '高亮的两个格子互为同伴格吗？',
  },
  elimination: {
    title: '候选排除',
    definition:
      '某数字已填入后，能看见它的空格不能再填同一数字，可以删去相应候选。',
    find: '从已填数字出发，找同行、同列、同宫中仍写着同一数字的候选。',
    mistake:
      '候选数之间的冲突不等于其中一个已确定；必须有已填值或其他已证明的条件才能排除。',
    question: '已填数字能排除高亮的同数字候选吗？',
  },
  nakedSet: {
    title: '裸结构',
    definition:
      '同一区域中，N 个格子合起来恰好只有 N 种候选数字。这些数字只能占据这 N 格。',
    find: '先选同一行、列或宫里的格子，再数它们全部候选的并集；两格两数是最简单的裸对。',
    mistake: '两格都有同一对数字但其中还有第三种候选时，不是裸对。',
    question: '高亮两格在同一行构成裸对吗？',
  },
  hiddenSet: {
    title: '隐结构',
    definition:
      '同一区域里，N 个数字只能出现在 N 个格子，即使这些格子还写着其他候选，也形成隐结构。',
    find: '固定数字，逐格数它们在整行、整列或整宫中的所有可去位置。',
    mistake:
      '只检查高亮两格不够；如果区域里还有第三格含其中的数字，隐对就不成立。',
    question: '高亮的两个数字在这一行形成隐对吗？',
  },
  lockedCandidate: {
    title: '锁定候选',
    definition:
      '某数字在一个宫里只剩同一行或同一列的位置，就被锁在这条线上；这条线在宫外的同数字候选可排除。',
    find: '先逐宫统计一个数字的全部位置，再检查它们是否落在同一行或列。',
    mistake: '宫内只要还存在另一行或另一列的可能位置，就不能进行这种排除。',
    question: '高亮宫里的候选被锁在同一行了吗？',
  },
  bivalue: {
    title: '双候选格',
    definition:
      '一个空格恰好只剩两种候选数字，叫双候选格。两个数字中必有一个最终填入该格。',
    find: '逐格查看真实候选列表，数同一个格内剩余的数字。',
    mistake:
      '某格突出显示两个数字，不表示它只有两个候选；还要查看有没有第三个。',
    question: '高亮格是双候选格吗？',
  },
  bilocation: {
    title: '双位置与共轭对',
    definition:
      '同一个数字在一行、列或宫恰好只剩两个位置，这两个位置叫共轭对。',
    find: '固定一个数字，沿整个区域数它所有未被排除的位置。',
    mistake:
      '数的是一个数字的两个位置，不是一个格里的两个数字；第三处会破坏双位置。',
    question: '高亮数字在标出的行里构成双位置吗？',
  },
  strongLink: {
    title: '强链',
    definition:
      '两端不能同时为假：如果一端不成立，另一端必须成立。双位置和双候选格都能产生这种关系。',
    find: '先固定一个数字与区域并数到恰好两处，或检查一个格是否恰好只有两个候选。',
    mistake:
      '两端互相看见还不够；若有第三种可能，它们可以同时为假，就不是强链。',
    question: '高亮两端能构成强链吗？',
  },
  weakLink: {
    title: '弱链',
    definition:
      '两端不能同时为真：一端成立就排除另一端。同一数字的两个候选若互相看见，就满足这一点。',
    find: '检查同一数字的两个候选是否共享行、列或宫，也可检查同一格里的不同数字。',
    mistake:
      '弱链不保证至少一端为真；互不相关的两处不能硬画弱链。强链也可按弱链方向使用。',
    question: '高亮两端至少存在弱链吗？',
  },
  fishBase: {
    title: '鱼形基线 · Base',
    definition:
      '鱼形从选定的同一数字和方向开始。选来提供全部相关候选的行或列，叫基线；图中用蓝色标出。',
    find: '固定数字后选两条基线做 X-Wing，或三条做剑鱼；逐条核对这几条线上的全部候选。',
    mistake:
      '基线不是任意画出的两条线。若某条基线还有未计入的候选，后续覆盖关系会改变。',
    question: '蓝色两条基线的全部候选能由同一对覆盖线承接吗？',
  },
  fishCover: {
    title: '鱼形覆盖线 · Cover',
    definition:
      '用来接住基线全部候选的横向相交线叫覆盖线；图中用琥珀色标出。基础鱼的基线数与覆盖线数相同。',
    find: '先找齐基线上的所有同数字候选，再逐列或逐行统计它们落入多少条覆盖线。',
    mistake:
      '不能只看漂亮的四角；基线只要漏出一个落在覆盖线外的候选，基础鱼条件就未满足。',
    question: '琥珀色两条覆盖线接住了蓝色基线上的全部候选吗？',
  },
  fishFin: {
    title: '鱼鳍 · Fin',
    definition:
      '基线上的额外候选落在覆盖线外、贴近鱼角时形成鱼鳍；图中用青色标出。鱼鳍是额外可能性，不是已填值。',
    find: '先画出基线与覆盖线，再找覆盖线外的额外候选，检查它与鱼角是否同宫以及目标是否同时看见鱼鳍。',
    mistake:
      '有鱼鳍时不能按普通鱼形排除整条覆盖线；目标还须能看见鱼鳍，才能排除。',
    question: '高亮的额外候选处在与鱼角相连的同一宫吗？',
  },
  alternatingChain: {
    title: '交替链',
    definition: '强链与弱链按顺序交替连接，形成可以逐端传递真假关系的链。',
    find: '从已验证的强链出发，每到一个节点确认下一段是否有正确的弱或强关系。',
    mistake:
      '棋盘上的线条不是证明；任一段关系不成立或顺序不交替，整条链都不能使用。',
    question: '图中的强链和弱链交替吗？',
  },
  endpoint: {
    title: '链的端点',
    definition:
      '链最外侧的两个候选叫端点。以强链开始和结束的交替链，可证明两个端点至少有一个为真。',
    find: '沿整条链确认强弱顺序，再指出第一段和最后一段外侧的候选。',
    mistake: '只看到两端互相看见或链看起来闭合，都不足以代替端点推理。',
    question: '图中两端有“至少一端为真”的保证吗？',
  },
  chainTarget: {
    title: '链的排除目标',
    definition:
      '如果目标候选同时看见两个“至少一真”的端点，它就不能为真，可以排除。',
    find: '先证明端点关系，再检查目标是否能同时看见两个端点。',
    mistake: '目标只看见其中一端时，另一端仍可能为真，不能排除目标。',
    question: '圈出的目标同时看见两个端点吗？',
  },
  loop: {
    title: '闭环',
    definition:
      '一条链沿候选间的强弱关系回到出发节点，形成闭环。闭环还要检查每段强弱条件。',
    find: '沿链逐段走一圈，确认最后一段回到最初候选且所有节点与关系都成立。',
    mistake: '图形像四边形不等于闭环；没有最后一段连接，就仍是开链。',
    question: '图中最后一段也连回起点，形成闭环吗？',
  },
  colorState: {
    title: '双色状态',
    definition: '沿同一数字的强链交替赋予 A、B 两色，代表互相相反的真假状态。',
    find: '从一对双位置出发，沿每条已验证的强链交替标色。',
    mistake: 'A、B 是假设状态，不是确定答案；同一强链两端不应标成同一种颜色。',
    question: '图中的双色标注遵守强链两端相反吗？',
  },
  colorComponent: {
    title: '染色分量',
    definition:
      '通过强链连在一起的同数字候选属于一个染色分量；不同分量的 A 色不代表同一状态。',
    find: '从一个起点沿已验证的强链扩展，直到没有新的候选可连接，再另起分量。',
    mistake: '颜色相同但没有强链路径时，不能把两个分量合并推理。',
    question: '两处标色候选属于同一个连通分量吗？',
  },
  uniqueness: {
    title: '唯一解前提',
    definition:
      '唯一性推理假定一道有效题目只有一个完整解；这必须是题目或产品明确保证的前提。',
    find: '使用唯一性技巧前先确认题目来源保证唯一解，再核对局部结构。',
    mistake:
      '局部候选图本身无法证明整题唯一解，不能把希望只有一解当作逻辑前提。',
    question: '能否把唯一解当作已知前提？',
    questionWhenValid: '题目已保证唯一解；这里能把唯一解当作已知前提吗？',
    questionWhenInvalid: '题目没有保证唯一解；仅凭局部图能把唯一解当作前提吗？',
  },
  deadlyRectangle: {
    title: '致命矩形',
    definition:
      '四个格子跨两行、两列、两个宫，若都只剩同一对数字，交换这对数字会形成第二种完成方式。',
    find: '找两行两列的四角，确认恰好跨两个宫，再检查四格是否都只有相同两候选。',
    mistake: '跨四个宫时交换可能破坏宫约束；仅有矩形外形还不构成致命矩形。',
    question: '图中四格满足两宫致命矩形的形状条件吗？',
  },
  groupNode: {
    title: '分组候选节点',
    definition:
      '同一数字的几个候选处在共同交会区域时，可合成一个逻辑节点；组为真表示其中至少一处为真。',
    find: '固定数字，找同行或同列且同宫的候选，再检查它们能否作为一个共同作用的组。',
    mistake: '两处数字相同却分散在不同宫，不应随意当成同一个交会组。',
    question: '高亮两处候选能合成一个交会区域分组节点吗？',
  },
  atLeastOne: {
    title: '至少一处成立',
    definition:
      '一个区域必须放入某数字。如果组外唯一位置为假，组内至少有一处必须为真。',
    find: '先列出区域里这个数字的全部位置，再排除组外位置，检查组内是否成为唯一剩余可能。',
    mistake: '组为真不等于组内每处都真；漏掉另一处组外候选会使结论失效。',
    question: '若组外 c6 不成立，组内是否至少一处为真？',
  },
  assumption: {
    title: '假设',
    definition:
      '假设是暂时把一个尚未确定的候选当作真来探索后果，并没有真的填入棋盘。',
    find: '从真实候选中选一个起点，单独记录由它推出的结果。',
    mistake:
      '不要把假设当作已确定的填数；只有证明矛盾或所有分支都一致后才可得出结论。',
    question: '高亮数字仍是可供推演的候选，而非已填答案吗？',
  },
  exhaustiveBranches: {
    title: '穷尽分支',
    definition:
      '分支必须覆盖起点的全部可能性；双候选格可分成两条分支，三候选格不能只检查其中两条。',
    find: '先数起点全部候选，再为每个可能值建立一条互斥分支。',
    mistake: '漏掉第三种可能，即使前两条分支都得出同样结果，也还没有完整证明。',
    question: '高亮的两条分支覆盖了这个格子的全部可能吗？',
  },
  commonConclusion: {
    title: '共同结论',
    definition:
      '从穷尽的每条可行分支都得到同一结果时，这个结果才是无条件成立的共同结论。',
    find: '分别写下每条分支的后果，只取所有分支都支持的那个结果。',
    mistake: '只在一条分支里排除目标，不能把它当作共同结论。',
    question: '两条分支的结果足以得出共同结论吗？',
    questionWhenValid: '两条穷尽分支都排除圈出的目标；该排除是共同结论吗？',
    questionWhenInvalid: '只有一条分支排除圈出的目标；该排除是共同结论吗？',
  },
};

const en: Record<TermConcept, ConceptText> = {
  candidate: {
    title: 'Candidates',
    definition:
      'A candidate is a digit that may still fit in an empty cell. It is a possibility, not a placed answer.',
    find: 'Check that the cell is empty, then rule out digits already placed in its row, column and box.',
    mistake:
      'A small note is a candidate; a large placed digit is not. The local diagram shows only relevant notes.',
    question: 'Is the highlighted small digit still a candidate?',
  },
  peer: {
    title: 'Peers',
    definition:
      'Two cells see each other when they share a row, column or 3×3 box.',
    find: 'From one cell, check the other against its row, column and box.',
    mistake:
      'Nearby or diagonal does not imply visibility. Cells in different boxes can still share a row or column.',
    question: 'Do the highlighted cells see each other?',
  },
  elimination: {
    title: 'Candidate elimination',
    definition:
      'A placed digit removes that digit from every empty cell that sees it.',
    find: 'Start at a placed value and inspect matching candidates in its row, column and box.',
    mistake:
      'Two unresolved candidates conflicting does not tell you which to remove.',
    question: 'Can the placed value remove the highlighted candidate?',
  },
  nakedSet: {
    title: 'Naked sets',
    definition:
      'In one region, N cells together contain exactly N candidate digits. Those digits are reserved for those cells.',
    find: 'Choose cells in one row, column or box and count the union of all their candidates.',
    mistake:
      'A pair is not naked if either chosen cell still has a third digit.',
    question: 'Do the highlighted cells form a naked pair?',
  },
  hiddenSet: {
    title: 'Hidden sets',
    definition:
      'In one region, N digits occur in only N cells, even if those cells contain other notes.',
    find: 'Choose the digits and count every place they can occupy across the whole region.',
    mistake: 'A third place for either digit breaks the hidden pair.',
    question: 'Do the highlighted digits form a hidden pair in this row?',
  },
  lockedCandidate: {
    title: 'Locked candidates',
    definition:
      'If all positions for a digit in a box lie on one row or column, the digit is locked to that line and can be removed outside the box on that line.',
    find: 'For one digit, inspect all positions in a box and check whether they share one row or column.',
    mistake: 'A remaining position on another line prevents the lock.',
    question: 'Are the box candidates locked to one row?',
  },
  bivalue: {
    title: 'Bivalue cells',
    definition:
      'A bivalue cell has exactly two candidate digits. One of those two will fill it.',
    find: 'Count all candidates inside one empty cell.',
    mistake: 'Highlighting two notes does not prove a third is absent.',
    question: 'Is the highlighted cell bivalue?',
  },
  bilocation: {
    title: 'Bilocations and conjugate pairs',
    definition:
      'When a digit has exactly two places in a row, column or box, those positions form a conjugate pair.',
    find: 'Fix one digit and count all its positions throughout the chosen region.',
    mistake:
      'Count one digit in two cells, not two digits in one cell. A third place breaks the pair.',
    question: 'Does the digit have exactly two places in the marked row?',
  },
  strongLink: {
    title: 'Strong links',
    definition:
      'The two ends cannot both be false: if one is false, the other must be true. Bilocations and bivalue cells can provide this relation.',
    find: 'Verify that a digit has only two positions in a region, or a cell has only two candidates.',
    mistake:
      'Seeing each other is insufficient. A third possibility allows both ends to be false.',
    question: 'Do the highlighted ends form a strong link?',
  },
  weakLink: {
    title: 'Weak links',
    definition:
      'The ends cannot both be true: if one is true, the other must be false.',
    find: 'Check same-digit candidates that see each other, or distinct digits in one cell.',
    mistake:
      'A weak link does not require either end to be true. Unrelated candidates have no link.',
    question: 'Do the highlighted ends have at least a weak link?',
  },
  fishBase: {
    title: 'Fish base lines',
    definition:
      'Base lines are the chosen rows or columns that supply all candidates for one digit in a fish. They are blue in the teaching board.',
    find: 'Choose one digit and two base lines for an X-Wing, or three for a Swordfish. Check every candidate on each line.',
    mistake:
      'Two attractive lines are not enough if an uncounted candidate remains on a base line.',
    question: 'Can the blue base lines use the same two cover lines?',
  },
  fishCover: {
    title: 'Fish cover lines',
    definition:
      'Cover lines catch all candidates on the base lines. They are amber in the board; a basic fish has equally many bases and covers.',
    find: 'After listing every base candidate, count the crossing rows or columns containing them.',
    mistake:
      'A candidate outside the covers breaks the basic fish even if the corners look right.',
    question:
      'Do the amber cover lines catch every candidate on the blue bases?',
  },
  fishFin: {
    title: 'Fish fins',
    definition:
      'An extra base candidate outside the covers near a fish corner is a fin. It is shown in teal and is still only a possibility.',
    find: 'Draw bases and covers, locate extras outside them, then check the nearby corner box and target visibility.',
    mistake:
      'A finned fish cannot remove every cover candidate like a basic fish; the target must see the fin.',
    question:
      'Is the highlighted extra in a corner box where it can serve as a fin?',
  },
  alternatingChain: {
    title: 'Alternating chains',
    definition:
      'A chain alternates strong and weak links to pass truth constraints from node to node.',
    find: 'Start with a verified strong link and check each successive link and node.',
    mistake:
      'A drawn line is not proof. One invalid or out-of-order link breaks the chain.',
    question: 'Do the shown links alternate strong and weak?',
  },
  endpoint: {
    title: 'Chain endpoints',
    definition:
      'The outer candidates are endpoints. In an alternating chain beginning and ending with strong links, at least one endpoint must be true.',
    find: 'Check the full link order, then identify the candidates outside the first and last links.',
    mistake:
      'Endpoint visibility or a chain-like shape does not replace the link proof.',
    question: 'Must at least one highlighted endpoint be true?',
  },
  chainTarget: {
    title: 'Chain elimination targets',
    definition:
      'A candidate seeing both endpoints, of which at least one must be true, cannot itself be true.',
    find: 'Prove the endpoint relation first, then check the target against each endpoint separately.',
    mistake:
      'Seeing only one endpoint leaves the other possible and proves no elimination.',
    question: 'Does the marked target see both endpoints?',
  },
  loop: {
    title: 'Closed loops',
    definition:
      'A chain becomes a loop when its final link returns to the starting candidate. Every link still needs verification.',
    find: 'Follow the links all the way around and verify the closing relation.',
    mistake:
      'A rectangular shape without the final link remains an open chain.',
    question: 'Does the last link close the loop at its start?',
  },
  colorState: {
    title: 'Two-color states',
    definition:
      'Along strong links for one digit, alternate labels A and B. They represent opposite possible truth states.',
    find: 'Start at a bilocation and alternate colors over verified strong links.',
    mistake:
      'Colors are hypothetical, not placed values. Both ends of a strong link should not share one color.',
    question: 'Do the colors alternate correctly across the strong link?',
  },
  colorComponent: {
    title: 'Coloring components',
    definition:
      'Candidates connected by a path of strong links form one component. The letter A in a different component is an independent state.',
    find: 'Extend coloring along verified strong links until no new candidate connects, then start a new component.',
    mistake:
      'Matching color labels alone cannot join two disconnected components.',
    question: 'Do these colored candidates belong to one connected component?',
  },
  uniqueness: {
    title: 'The uniqueness premise',
    definition:
      'Uniqueness reasoning assumes the puzzle has one complete solution. The puzzle source must guarantee that premise.',
    find: 'Before using a uniqueness technique, confirm the puzzle is promised to have one solution.',
    mistake:
      'A local candidate sketch cannot prove uniqueness of the entire puzzle.',
    question: 'May uniqueness be used as a known premise?',
    questionWhenValid:
      'The puzzle guarantees one solution. May uniqueness be used as a premise?',
    questionWhenInvalid:
      'No uniqueness guarantee is given. Can this local sketch establish the premise?',
  },
  deadlyRectangle: {
    title: 'Deadly rectangles',
    definition:
      'Four cells in two rows, columns and boxes, each with only the same pair, could swap that pair and create a second completion.',
    find: 'Check the four corners, exactly two boxes, and the same two candidates in all four cells.',
    mistake:
      'Four boxes can block the swap; a rectangle outline alone is insufficient.',
    question: 'Do these four cells have the required two-box rectangle shape?',
  },
  groupNode: {
    title: 'Grouped candidate nodes',
    definition:
      'Candidates of one digit in a shared intersection can act as one logical node. A true group means at least one member is true.',
    find: 'Fix a digit and find positions sharing both a line and a box.',
    mistake:
      'Same-digit candidates scattered across boxes are not one intersection group.',
    question: 'Can the highlighted candidates form one intersection group?',
  },
  atLeastOne: {
    title: 'At least one in a group',
    definition:
      'A region must contain a digit. If its only outside position is false, at least one member of the group is true.',
    find: 'List every position for the digit in the region, rule out the outside position, and check for other outside places.',
    mistake:
      'A true group does not mean every member is true. A missed outside candidate breaks the conclusion.',
    question: 'If outside c6 is false, must at least one group member be true?',
  },
  assumption: {
    title: 'Assumptions',
    definition:
      'An assumption temporarily treats an unresolved candidate as true to explore consequences. It is not a placed answer.',
    find: 'Choose a real candidate and record only consequences that follow from that temporary state.',
    mistake:
      'Do not treat an assumption as confirmed. Conclusions need contradiction or agreement across branches.',
    question:
      'Is the highlighted digit still a candidate that can be assumed, rather than a placed answer?',
  },
  exhaustiveBranches: {
    title: 'Exhaustive branches',
    definition:
      'Branches must cover every possible starting value. A bivalue cell has two branches; a three-value cell needs three.',
    find: 'Count all starting candidates and make one exclusive branch for each possible value.',
    mistake:
      'Omitting a third value leaves a gap, even if the first two branches agree.',
    question:
      'Do the two highlighted branches cover every possibility in this cell?',
  },
  commonConclusion: {
    title: 'Common conclusions',
    definition:
      'A result supported by every viable exhaustive branch holds without choosing a branch.',
    find: 'Track each branch separately and keep only results they all share.',
    mistake: 'A target removed in just one branch is not a common conclusion.',
    question: 'Do the branch results force a common conclusion?',
    questionWhenValid:
      'Both exhaustive branches remove the marked target. Is removal a common conclusion?',
    questionWhenInvalid:
      'Only one branch removes the marked target. Is removal a common conclusion?',
  },
};

const item = (
  title: string,
  definition: string,
  find: string,
  mistake: string,
  question: string,
  questionWhenValid?: string,
  questionWhenInvalid?: string,
): ConceptText => ({
  title,
  definition,
  find,
  mistake,
  question,
  questionWhenValid,
  questionWhenInvalid,
});

const ja: Record<TermConcept, ConceptText> = {
  candidate: item(
    '候補',
    '空きマスにまだ入る可能性がある数字です。確定した答えではありません。',
    '同じ行・列・ブロックの確定数字で除外されない数字を探します。',
    '大きく置かれた数字は候補ではありません。',
    '強調された小さな数字は候補ですか？',
  ),
  peer: item(
    '見える関係',
    '同じ行・列・ブロックを共有する二マスは互いに見えます。',
    '一方の行・列・ブロックに他方が入るか確認します。',
    '近いだけ、斜めなだけでは見えません。',
    '強調された二マスは互いに見えますか？',
  ),
  elimination: item(
    '候補の除外',
    '確定数字と見える空きマスから同じ数字の候補を消せます。',
    '確定数字から行・列・ブロックを追います。',
    '未確定の二候補が衝突するだけではどちらも消せません。',
    '確定数字によって強調候補を除外できますか？',
  ),
  nakedSet: item(
    'ネイキッド集合',
    '同じ領域の N マスに候補が合計 N 種類しかない構造です。',
    '同じ行・列・ブロックの選んだマスで候補の種類を数えます。',
    '第三の数字が残る二マスはネイキッドペアではありません。',
    '強調二マスはネイキッドペアですか？',
  ),
  hiddenSet: item(
    'ヒドゥン集合',
    'N 個の数字の位置が一領域で N マスだけに限られる構造です。',
    '数字を固定し、領域全体の置き場所を数えます。',
    '第三のマスに同じ数字があればペアは成立しません。',
    '強調数字はこの行でヒドゥンペアですか？',
  ),
  lockedCandidate: item(
    'ロックされた候補',
    'ブロック内の数字の全位置が同じ行・列なら、その線のブロック外から除外できます。',
    'ブロック内の同数字の全位置を確認します。',
    '別の行・列にも位置があるならロックできません。',
    'このブロックの候補は一行にロックされていますか？',
  ),
  bivalue: item(
    '二候補マス',
    '一マスに候補がちょうど二つだけ残った状態です。',
    '同じマスの候補をすべて数えます。',
    '二つが目立っていても第三候補があれば二候補ではありません。',
    '強調マスは二候補ですか？',
  ),
  bilocation: item(
    '二位置・共役ペア',
    '一数字が一つの行・列・ブロックで二カ所だけに残る状態です。',
    '一数字を決めて領域全体の位置を数えます。',
    '三番目の位置があれば共役ペアではありません。',
    '強調数字はこの行で二位置ですか？',
  ),
  strongLink: item(
    '強リンク',
    '両端が同時に偽にはなれず、一方が偽なら他方は真です。',
    '一数字が領域内で二位置だけか、一マスが二候補だけか調べます。',
    '第三の可能性があれば両端が偽になり得ます。',
    '強調された両端は強リンクですか？',
  ),
  weakLink: item(
    '弱リンク',
    '両端が同時に真にはなれません。一方が真なら他方は偽です。',
    '同数字の二候補が互いに見えるか確認します。',
    '弱リンクは片方が必ず真とは意味しません。無関係な候補はリンクなしです。',
    '強調された両端に弱リンクはありますか？',
  ),
  fishBase: item(
    'フィッシュのベース線',
    '同数字の候補を供給する選択した行・列です。青色で示します。',
    '数字を固定し、選んだ線上の全候補を数えます。',
    '見落とした候補があるとベースの条件が変わります。',
    '青い二本のベース線の候補は二本のカバー線に収まりますか？',
  ),
  fishCover: item(
    'フィッシュのカバー線',
    'ベース候補をすべて受ける交差方向の線です。琥珀色で示します。',
    'ベース上の全候補が何本の交差線に入るか数えます。',
    'カバー外の候補を一つでも見落とすと基本フィッシュではありません。',
    '琥珀色の二本のカバー線はベース候補を全部覆いますか？',
  ),
  fishFin: item(
    'フィン',
    'カバー線の外で魚の角に近い余分な候補です。青緑色で示します。',
    'ベースとカバーを確かめ、外側の候補と角のブロックを確認します。',
    'フィン付きでは普通のフィッシュと同じ広さを除外できません。',
    '強調された余分な候補は角と同じブロックにありますか？',
  ),
  alternatingChain: item(
    '交替チェーン',
    '強リンクと弱リンクが順番に交替する候補の鎖です。',
    '強リンクから始め、各節点と次のリンクを確認します。',
    '線が描かれているだけでは証明にならず、交替が崩れると使えません。',
    'リンクは強弱交替していますか？',
  ),
  endpoint: item(
    'チェーンの端点',
    '鎖の外側の二候補です。両端が強リンクなら少なくとも一方が真です。',
    '全リンクを確認し、最初と最後の外側を探します。',
    '見た目だけでは端点の真偽を決められません。',
    '端点の少なくとも一方は真ですか？',
  ),
  chainTarget: item(
    'チェーンの除外対象',
    '少なくとも一方が真である二端点を両方見る候補は除外できます。',
    '端点の証明後、対象が両方を見るか別々に確認します。',
    '片方だけを見る対象は除外できません。',
    '対象は両端点を見ていますか？',
  ),
  loop: item(
    '閉ループ',
    '最後のリンクが出発候補に戻るチェーンです。',
    'すべてのリンクをたどり、最後の接続を確認します。',
    '四角に見えても閉じるリンクがなければ開いたチェーンです。',
    '最後のリンクは始点に戻りますか？',
  ),
  colorState: item(
    '二色の状態',
    '強リンクを進むごとに A と B を交互に付け、反対の状態を表します。',
    '二位置から始め、確認した強リンクをたどります。',
    '色は確定値ではありません。強リンクの両端を同色にしません。',
    '二色は強リンク上で正しく交替していますか？',
  ),
  colorComponent: item(
    '色の連結成分',
    '強リンク経路でつながる候補が一成分です。別成分の A は独立です。',
    'リンクでつながる範囲を最後まで広げます。',
    '同じ色名だけで別成分を合併してはいけません。',
    '二候補は同じ成分に属しますか？',
  ),
  uniqueness: item(
    '唯一解の前提',
    '唯一性の推論には完成解が一つという保証が必要です。',
    '問題の出所が唯一解を保証するか確認します。',
    '局所的な候補図だけで問題全体の唯一性は証明できません。',
    '唯一解を前提にできますか？',
    '問題が唯一解を保証しています。前提にできますか？',
    '唯一解の保証がありません。局所図だけで前提にできますか？',
  ),
  deadlyRectangle: item(
    '致命的長方形',
    '二行・二列・二ブロックの四マスに同じ二候補だけがあると交換可能です。',
    '四隅の候補と二ブロック条件を確認します。',
    '四ブロックなら交換がブロック制約を破る場合があります。',
    '四マスは二ブロックの形ですか？',
  ),
  groupNode: item(
    'グループ候補ノード',
    '交差領域の同数字候補を一つの論理ノードにまとめます。',
    '同じ行または列とブロックを共有する候補を探します。',
    '違うブロックの候補を一つの交差グループにしません。',
    '強調候補は一つのグループになりますか？',
  ),
  atLeastOne: item(
    '少なくとも一つ成立',
    '領域外の唯一の位置が偽なら、グループ内の少なくとも一つが真です。',
    '数字の全位置を列挙し、グループ外に他の位置がないか確認します。',
    'グループが真でも全員が真ではありません。外側の見落としに注意します。',
    '外側 c6 が偽ならグループの一つは真ですか？',
  ),
  assumption: item(
    '仮定',
    '未確定の候補を一時的に真として結果を調べる操作です。',
    '実在する候補を選び、その枝の結果だけを記録します。',
    '仮定は確定した入力ではありません。',
    '強調数字は確定値ではなく仮定可能な候補ですか？',
  ),
  exhaustiveBranches: item(
    '網羅した分岐',
    '出発点の全候補について分岐します。三候補なら二枝では足りません。',
    '出発マスの候補をすべて数え、一つずつ枝を作ります。',
    '第三の候補を見落とすと証明は完成しません。',
    '二枝は全可能性を網羅していますか？',
  ),
  commonConclusion: item(
    '共通の結論',
    'すべての可能な分岐で同じ結果なら、条件なしにその結果が成立します。',
    '枝ごとの結果を分けて記録し、共通部分を探します。',
    '一枝だけの除外を共通結論にしてはいけません。',
    '分岐の結果は共通結論を示しますか？',
    '両枝が対象を除外します。共通結論ですか？',
    '一枝だけが対象を除外します。共通結論ですか？',
  ),
};

const de: Record<TermConcept, ConceptText> = {
  candidate: item(
    'Kandidaten',
    'Eine noch mögliche Ziffer in einem leeren Feld, kein gesetzter Wert.',
    'Prüfe die gesetzten Ziffern in Zeile, Spalte und Block.',
    'Große gesetzte Ziffern sind keine Kandidaten.',
    'Ist die markierte kleine Ziffer ein Kandidat?',
  ),
  peer: item(
    'Sichtbeziehung',
    'Zwei Felder sehen sich, wenn sie Zeile, Spalte oder 3×3-Block teilen.',
    'Vergleiche die Zeile, Spalte und den Block beider Felder.',
    'Nähe oder Diagonale genügt nicht.',
    'Sehen sich die markierten Felder?',
  ),
  elimination: item(
    'Kandidaten entfernen',
    'Eine gesetzte Ziffer entfernt denselben Kandidaten in allen sichtbaren Feldern.',
    'Gehe vom gesetzten Wert durch Zeile, Spalte und Block.',
    'Zwei ungelöste Kandidaten zeigen noch nicht, welcher falsch ist.',
    'Entfernt der gesetzte Wert den markierten Kandidaten?',
  ),
  nakedSet: item(
    'Nackte Mengen',
    'N Felder einer Einheit enthalten zusammen genau N mögliche Ziffern.',
    'Zähle alle verschiedenen Kandidaten der gewählten Felder.',
    'Ein dritter Kandidat zerstört ein nacktes Paar.',
    'Bilden die markierten Felder ein nacktes Paar?',
  ),
  hiddenSet: item(
    'Versteckte Mengen',
    'N Ziffern haben in einer Einheit nur N mögliche Felder, auch wenn dort weitere Notizen stehen.',
    'Zähle alle Plätze der Ziffern in der ganzen Einheit.',
    'Ein dritter Platz zerstört das versteckte Paar.',
    'Bilden die Ziffern in dieser Zeile ein verstecktes Paar?',
  ),
  lockedCandidate: item(
    'Gesperrte Kandidaten',
    'Liegen alle Blockplätze einer Ziffer in einer Linie, kann sie außerhalb des Blocks aus dieser Linie entfernt werden.',
    'Prüfe sämtliche Plätze der Ziffer im Block.',
    'Ein Platz in einer anderen Linie verhindert die Sperre.',
    'Sind die Kandidaten im Block auf eine Zeile gesperrt?',
  ),
  bivalue: item(
    'Bivalue-Feld',
    'Ein leeres Feld hat genau zwei Kandidaten.',
    'Zähle alle Kandidaten in einem Feld.',
    'Zwei markierte Notizen beweisen nicht, dass keine dritte existiert.',
    'Hat das markierte Feld genau zwei Kandidaten?',
  ),
  bilocation: item(
    'Bilocation und konjugiertes Paar',
    'Eine Ziffer hat in einer Zeile, Spalte oder einem Block genau zwei Plätze.',
    'Zähle die Plätze einer festen Ziffer in der ganzen Einheit.',
    'Ein dritter Platz verhindert das konjugierte Paar.',
    'Hat diese Ziffer in der Zeile genau zwei Plätze?',
  ),
  strongLink: item(
    'Starke Verbindung',
    'Beide Enden können nicht zugleich falsch sein: Ist eines falsch, ist das andere wahr.',
    'Suche genau zwei Plätze einer Ziffer oder zwei Kandidaten eines Feldes.',
    'Eine dritte Möglichkeit lässt beide Enden falsch sein.',
    'Bilden die markierten Enden eine starke Verbindung?',
  ),
  weakLink: item(
    'Schwache Verbindung',
    'Beide Enden können nicht zugleich wahr sein.',
    'Prüfe, ob gleichzahlige Kandidaten sich sehen.',
    'Schwach heißt nicht, dass mindestens eines wahr sein muss.',
    'Besteht zwischen den Enden eine schwache Verbindung?',
  ),
  fishBase: item(
    'Fisch-Basislinien',
    'Die gewählten Zeilen oder Spalten liefern alle Kandidaten einer Ziffer. Blau markiert.',
    'Prüfe alle Kandidaten auf jeder gewählten Linie.',
    'Ein übersehener Kandidat verändert den Fisch.',
    'Passen alle Kandidaten der blauen Basislinien in zwei Decklinien?',
  ),
  fishCover: item(
    'Fisch-Decklinien',
    'Decklinien fangen alle Kandidaten der Basislinien auf. Bernsteinfarben markiert.',
    'Zähle die kreuzenden Linien für alle Basis-Kandidaten.',
    'Ein Kandidat außerhalb der Decklinien verhindert den Basis-Fisch.',
    'Decken die zwei bernsteinfarbenen Decklinien alle Basis-Kandidaten ab?',
  ),
  fishFin: item(
    'Fischflosse',
    'Ein zusätzlicher Basis-Kandidat außerhalb der Decklinien nahe einer Ecke. Türkis markiert.',
    'Prüfe die zusätzliche Position, den Eckblock und das Ziel.',
    'Mit einer Flosse darf nicht wie bei einem einfachen Fisch überall entfernt werden.',
    'Liegt der markierte zusätzliche Kandidat im passenden Eckblock?',
  ),
  alternatingChain: item(
    'Wechselkette',
    'Starke und schwache Verbindungen wechseln in einer Kandidatenkette ab.',
    'Prüfe von einer starken Verbindung aus jedes folgende Glied.',
    'Eine gezeichnete Linie ohne gültige Beziehung ist kein Beweis.',
    'Wechseln starke und schwache Glieder ab?',
  ),
  endpoint: item(
    'Kettenenden',
    'Die äußeren Kandidaten sind Enden. Bei stark beginnender und endender Wechselkette ist mindestens eines wahr.',
    'Prüfe die Reihenfolge aller Glieder und markiere die äußeren Kandidaten.',
    'Die Form der Kette allein beweist die Endenaussage nicht.',
    'Ist mindestens eines der Enden sicher wahr?',
  ),
  chainTarget: item(
    'Ausschlussziel einer Kette',
    'Ein Ziel, das beide unvermeidlichen Enden sieht, kann nicht wahr sein.',
    'Prüfe die Sicht des Ziels auf jedes Ende getrennt.',
    'Nur ein sichtbares Ende reicht nicht.',
    'Sieht das Ziel beide Enden?',
  ),
  loop: item(
    'Geschlossene Schleife',
    'Das letzte Kettenglied verbindet sich wieder mit dem Startkandidaten.',
    'Folge allen Gliedern und prüfe die schließende Verbindung.',
    'Eine rechteckige Form ohne letzte Verbindung bleibt offen.',
    'Schließt das letzte Glied die Schleife?',
  ),
  colorState: item(
    'Zweifarbige Zustände',
    'Entlang starker Verbindungen wechseln A und B als entgegengesetzte Zustände.',
    'Beginne bei zwei Positionen und färbe entlang geprüfter starker Glieder.',
    'Farben sind keine gesetzten Werte; starke Enden brauchen unterschiedliche Farben.',
    'Wechseln die Farben an der starken Verbindung richtig?',
  ),
  colorComponent: item(
    'Farbkomponenten',
    'Eine durch starke Verbindungen verbundene Menge ist eine Komponente. A in anderen Komponenten ist unabhängig.',
    'Erweitere die Färbung nur entlang geprüfter starker Glieder.',
    'Gleiche Buchstaben verbinden getrennte Komponenten nicht.',
    'Gehören beide Kandidaten zu einer Komponente?',
  ),
  uniqueness: item(
    'Eindeutigkeitsannahme',
    'Eindeutigkeitslogik setzt voraus, dass das ganze Rätsel genau eine Lösung hat.',
    'Prüfe, ob die Rätselquelle eine Lösung garantiert.',
    'Ein lokales Diagramm beweist die Eindeutigkeit nicht.',
    'Darf Eindeutigkeit vorausgesetzt werden?',
    'Genau eine Lösung ist garantiert. Darf dies vorausgesetzt werden?',
    'Keine Garantie liegt vor. Genügt das lokale Bild als Beweis?',
  ),
  deadlyRectangle: item(
    'Tödliches Rechteck',
    'Vier Felder in zwei Zeilen, Spalten und Blöcken mit demselben Paar könnten vertauscht werden.',
    'Prüfe vier Ecken, genau zwei Blöcke und dasselbe Kandidatenpaar.',
    'Bei vier Blöcken kann der Tausch scheitern.',
    'Erfüllen diese Felder die Zwei-Block-Bedingung?',
  ),
  groupNode: item(
    'Gruppierter Kandidatenknoten',
    'Kandidaten einer Ziffer im gemeinsamen Schnitt können ein logischer Knoten sein.',
    'Suche Kandidaten, die Linie und Block teilen.',
    'Kandidaten in verschiedenen Blöcken sind kein solcher Schnittknoten.',
    'Bilden die markierten Kandidaten einen Gruppenknoten?',
  ),
  atLeastOne: item(
    'Mindestens eines wahr',
    'Ist der einzige Platz außerhalb einer Gruppe falsch, muss mindestens ein Gruppenmitglied wahr sein.',
    'Liste alle Plätze der Ziffer auf und prüfe weitere Außenplätze.',
    'Wahrheit der Gruppe bedeutet nicht Wahrheit aller Mitglieder.',
    'Ist bei falschem c6 mindestens ein Gruppenmitglied wahr?',
  ),
  assumption: item(
    'Annahme',
    'Ein ungelöster Kandidat wird vorübergehend als wahr betrachtet, ohne ihn einzutragen.',
    'Wähle einen echten Kandidaten und verfolge seine Folgen getrennt.',
    'Eine Annahme ist keine bestätigte Zahl.',
    'Ist die markierte Ziffer noch ein Kandidat für eine Annahme?',
  ),
  exhaustiveBranches: item(
    'Vollständige Zweige',
    'Jeder mögliche Startwert braucht einen Zweig; bei drei Kandidaten reichen zwei nicht.',
    'Zähle alle Kandidaten am Start und bilde je einen Zweig.',
    'Ein ausgelassener dritter Wert lässt die Beweisführung offen.',
    'Decken die zwei Zweige alle Möglichkeiten ab?',
  ),
  commonConclusion: item(
    'Gemeinsamer Schluss',
    'Ein Ergebnis aller möglichen Zweige gilt unabhängig von ihrer Auswahl.',
    'Notiere Folgen je Zweig und suche das gemeinsame Ergebnis.',
    'Eine Entfernung aus nur einem Zweig ist kein gemeinsamer Schluss.',
    'Ergeben die Zweige einen gemeinsamen Schluss?',
    'Beide Zweige entfernen das Ziel. Ist das ein gemeinsamer Schluss?',
    'Nur ein Zweig entfernt das Ziel. Ist das ein gemeinsamer Schluss?',
  ),
};

export const TERM_CONCEPT_COPY: Record<
  LessonLocale,
  Readonly<Record<TermConcept, ConceptText>>
> = { 'zh-Hans': zh, en, ja, de };

/** The last demonstration step names the concrete condition visible on the board. */
export const TERM_EXAMPLE_CONCLUSION: Record<
  LessonLocale,
  Readonly<Record<TermConcept, string>>
> = {
  'zh-Hans': {
    candidate:
      '高亮格仍为空，格内的小数字 2 是一种可能填法；它是候选数，不是答案。',
    peer: '高亮两格位于同一行，互为同伴格；同一数字不能同时填在这两格。',
    elimination: '已填的 2 与目标候选在同一行，目标格里的候选 2 可以删除。',
    nakedSet: '两格合起来只有 2 和 3 两种候选，数字必须占据这两格，构成裸对。',
    hiddenSet:
      '2 和 3 在标出的一行中只出现于这两格；其他候选不妨碍它们构成隐对。',
    lockedCandidate:
      '宫内的 2 都位于蓝色行；因此同一行、宫外的目标候选 2 可以排除。',
    bivalue: '高亮格只有 2、3 两个候选，正好是一个双候选格。',
    bilocation:
      '这行里的 2 只剩两处，二者构成双位置；删去一端就必须保留另一端。',
    strongLink: '这一行的 2 只剩高亮两处，两端不能同时为假，所以是强链。',
    weakLink: '高亮两处是同一行的 2，不能同时为真，因此至少有弱链。',
    fishBase: '蓝色两行给出数字 2 的四个候选，这两行就是鱼形的基线。',
    fishCover: '蓝色基线上的四个 2 全部落在琥珀色两列，这两列就是覆盖线。',
    fishFin:
      '青色的 2 位于覆盖线外，与左上鱼角同宫，因此是鱼鳍；目标还须能看见鱼鳍。',
    alternatingChain: '强链、弱链、强链依次连接四个候选，形成交替链。',
    endpoint: '强—弱—强链的首尾是端点；任一端为假时，另一端必须为真。',
    chainTarget:
      '目标 2 与两个端点都在同一列；端点至少一真，因此目标 2 可排除。',
    loop: '前三段走完后，最后一段接回起点，整条链闭合。',
    colorState: '强链两端分别标为 A 与 B；颜色表示互斥的可能状态，不是填入值。',
    colorComponent: '两色候选通过强链相连，属于同一个染色分量。',
    uniqueness:
      '局部棋盘不能证明唯一解；只有题目来源保证唯一解时，才能使用唯一性推理。',
    deadlyRectangle:
      '四格跨两行两列、恰好两个宫，且都只有同一候选对，形成致命矩形。',
    groupNode: '标出的一组 2 同时处于同一行与同一宫，可作为一个整体节点。',
    atLeastOne:
      '这行的 2 只有组内两处和组外一处；组外候选若为假，组内至少一处为真。',
    assumption: '高亮的 2 尚未确定，可以暂时假设为真，再追踪这一分支的结果。',
    exhaustiveBranches:
      '起点格只有 2 和 3 两种候选，分别检查两种情况就覆盖了全部可能。',
    commonConclusion: '两个起始分支都排除同一个目标时，这个排除才是共同结论。',
  },
  en: {
    candidate:
      'The highlighted cell is empty, and its small 2 is still a possible value.',
    peer: 'The highlighted cells share a row, so the same digit cannot occupy both.',
    elimination:
      'The placed 2 shares a row with the target 2, so that candidate can be removed.',
    nakedSet: 'The two cells contain only 2 and 3 between them: a naked pair.',
    hiddenSet:
      'In this row, 2 and 3 occur only in the two marked cells: a hidden pair.',
    lockedCandidate:
      'All 2s in the box lie on one row, so the target 2 outside the box can be removed.',
    bivalue: 'The marked cell has exactly the two candidates 2 and 3.',
    bilocation:
      'This row has only two places for 2; one must be true if the other is false.',
    strongLink:
      'Only the two highlighted positions can hold 2 in this row: a strong link.',
    weakLink:
      'The two highlighted 2s share a row and cannot both be true: a weak link.',
    fishBase:
      'The blue rows supply all four candidates for this fish; they are its base lines.',
    fishCover:
      'The amber columns cover every base candidate; they are the cover lines.',
    fishFin:
      'The teal 2 lies outside the covers but shares a box with a fish corner: a fin.',
    alternatingChain:
      'Strong, weak, strong links connect the four candidates in alternation.',
    endpoint:
      'The outer candidates are endpoints; in this chain at least one must be true.',
    chainTarget:
      'The target sees both endpoints, one of which must be true, so it can be removed.',
    loop: 'After the first three links, the final link returns to the starting candidate.',
    colorState:
      'A and B alternate across the strong link; colors are possible states, not placed values.',
    colorComponent:
      'The two colors are joined by a strong link, so they share one component.',
    uniqueness:
      'A local diagram cannot prove uniqueness; the puzzle source must guarantee it.',
    deadlyRectangle:
      'Four cells span two rows, columns, and boxes with the same candidate pair.',
    groupNode:
      'The marked 2s share a row and a box, so they can form one grouped node.',
    atLeastOne:
      'If the only outside 2 is false, at least one 2 inside the group must be true.',
    assumption:
      'The marked 2 is unresolved; assume it true temporarily and trace that branch.',
    exhaustiveBranches:
      'The starting cell has only 2 and 3, so two branches cover every value.',
    commonConclusion:
      'An elimination is common only when both starting branches reach it.',
  },
  ja: {
    candidate: '強調マスは空で、小さな 2 はまだ入り得る候補です。',
    peer: '二つのマスは同じ行にあり、同じ数字を同時には置けません。',
    elimination:
      '確定した 2 と対象の 2 は同じ行にあるため、対象候補を消せます。',
    nakedSet: '二マスの候補の和集合は 2 と 3 だけなので、裸ペアです。',
    hiddenSet:
      'この行で 2 と 3 が入れるのは印の二マスだけなので、隠れペアです。',
    lockedCandidate:
      'ブロック内の 2 は一行に限られ、ブロック外の対象 2 を消せます。',
    bivalue: '印のマスには 2 と 3 の二候補だけがあります。',
    bilocation: 'この行の 2 は二か所だけで、一方が偽なら他方が真です。',
    strongLink: 'この行の 2 は印の二か所だけなので、強リンクです。',
    weakLink: '同じ行の二つの 2 は同時に真になれず、弱リンクです。',
    fishBase: '青い二行がフィッシュの候補を供給するベース線です。',
    fishCover: '琥珀色の二列がベース上の候補をすべて覆うカバー線です。',
    fishFin: '青緑の 2 はカバーの外で魚の角と同じブロックにあり、フィンです。',
    alternatingChain:
      '強・弱・強の順に四候補がつながり、交替チェーンになります。',
    endpoint: '鎖の両端の少なくとも一方は必ず真です。',
    chainTarget:
      '対象は両端点を見ており、少なくとも一端が真なので除外できます。',
    loop: '最後のリンクが開始候補に戻り、鎖が閉じます。',
    colorState:
      '強リンクの両端で A と B が交替します。色は確定値ではありません。',
    colorComponent: '二色は強リンクでつながり、一つの連結成分です。',
    uniqueness:
      '局所図では唯一解を証明できず、問題の出所による保証が必要です。',
    deadlyRectangle:
      '四マスは二行・二列・二ブロックにあり、同じ候補ペアを持ちます。',
    groupNode: '印の 2 は同じ行とブロックを共有し、一つのグループになります。',
    atLeastOne: '外側の唯一の 2 が偽なら、グループ内の少なくとも一つが真です。',
    assumption: '印の 2 は未確定なので、仮に真として結果を調べられます。',
    exhaustiveBranches:
      '開始マスの候補は 2 と 3 だけで、二枝で全可能性を覆います。',
    commonConclusion:
      '二つの枝が同じ対象を除外したときだけ共通結論になります。',
  },
  de: {
    candidate:
      'Das markierte Feld ist leer; die kleine 2 ist noch ein möglicher Wert.',
    peer: 'Die Felder liegen in derselben Zeile und können nicht beide dieselbe Ziffer tragen.',
    elimination:
      'Die gesetzte 2 liegt in derselben Zeile wie die Ziel-2; diese fällt weg.',
    nakedSet:
      'Die zwei Felder enthalten zusammen nur 2 und 3: ein nacktes Paar.',
    hiddenSet:
      'In dieser Zeile stehen 2 und 3 nur in den zwei markierten Feldern.',
    lockedCandidate:
      'Alle 2er im Block liegen in einer Zeile; die Ziel-2 außerhalb fällt weg.',
    bivalue: 'Das markierte Feld hat genau die zwei Kandidaten 2 und 3.',
    bilocation:
      'In dieser Zeile gibt es nur zwei Plätze für 2; einer muss wahr sein.',
    strongLink:
      'Nur die zwei markierten Plätze erlauben hier die 2: eine starke Verbindung.',
    weakLink:
      'Die zwei 2er teilen eine Zeile und können nicht beide wahr sein.',
    fishBase:
      'Die blauen Zeilen liefern die Kandidaten des Fisches: seine Basislinien.',
    fishCover: 'Die bernsteinfarbenen Spalten decken alle Basiskandidaten ab.',
    fishFin:
      'Die türkise 2 liegt außerhalb der Decklinien im Block einer Fischecke.',
    alternatingChain:
      'Stark, schwach, stark verbindet vier Kandidaten im Wechsel.',
    endpoint:
      'Von den äußeren Kandidaten dieser Kette muss mindestens einer wahr sein.',
    chainTarget:
      'Das Ziel sieht beide Enden; da eines wahr sein muss, fällt es weg.',
    loop: 'Das letzte Glied kehrt zum Startkandidaten zurück und schließt die Schleife.',
    colorState:
      'A und B wechseln am starken Glied; Farben sind Zustände, keine Werte.',
    colorComponent:
      'Die zwei Farben sind durch ein starkes Glied verbunden: eine Komponente.',
    uniqueness:
      'Das lokale Bild beweist keine Eindeutigkeit; die Rätselquelle muss sie garantieren.',
    deadlyRectangle:
      'Vier Felder teilen zwei Zeilen, Spalten und Blöcke mit demselben Paar.',
    groupNode:
      'Die markierten 2er teilen Zeile und Block und bilden einen Gruppenknoten.',
    atLeastOne:
      'Ist die einzige äußere 2 falsch, muss mindestens eine 2 der Gruppe wahr sein.',
    assumption:
      'Die markierte 2 ist offen und darf versuchsweise als wahr gelten.',
    exhaustiveBranches:
      'Das Startfeld hat nur 2 und 3; zwei Zweige decken alles ab.',
    commonConclusion:
      'Ein Ausschluss ist gemeinsam, wenn beide Zweige ihn ergeben.',
  },
};

export function conceptText(
  template: string,
  params: Record<string, number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(params[key] ?? match),
  );
}
