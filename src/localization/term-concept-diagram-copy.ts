import type { LessonLocale } from '../domain/lessons/contracts';
import type { TermConcept, TermScene } from '../data/lessons/term-concepts';
import { TERM_CONCEPT_COPY, conceptText } from './term-concept-copy';

const SUMMARY_OVERRIDES: Record<
  LessonLocale,
  Partial<Record<TermConcept, string>>
> = {
  'zh-Hans': {
    atLeastOne:
      '一组候选至少一处成立，意味着它们不能全部为假，但不代表每一处都为真。',
    peer: '与某格同行、同列或同宫的其他格，都是它的同伴格。',
    lockedCandidate:
      '某数字在一个区域中的所有候选集中在它与另一区域的交会处时，可以排除另一区域交会处之外的同数字候选。',
    fish: '鱼形利用同一个数字在几条行、列之间的位置限制，排除其他位置的同数字候选。',
    fishCover:
      '覆盖线是容纳基线上全部同数字候选的交叉方向行或列，普通鱼的两种线数量相同。',
    bivalue: '只剩两种候选数字的空格，最终必须填入其中一种。',
    endpoint:
      '链的端点是两端最外侧的候选；以强链开始和结束的交替链保证其中至少一个成立。',
    groupNode:
      '处于同一交会区域的同数字候选可作为一个分组节点，组为真表示其中至少一处成立。',
  },
  en: {
    atLeastOne:
      'At least one candidate in a group must be true, but this does not mean every candidate is true.',
    peer: 'Other cells sharing a row, column or box with a cell are its peers.',
    lockedCandidate:
      'If all candidates of a digit in one region lie in its intersection with another, that digit can be excluded from the rest of the other region.',
    fish: 'Fish use the position constraints of one digit across rows and columns to exclude that digit elsewhere.',
    fishCover:
      'Cover lines contain all same-digit base candidates in the crossing direction; a basic fish has equally many bases and covers.',
    bivalue:
      'A cell with exactly two candidates must eventually contain one of them.',
    endpoint:
      'Endpoints are the outermost candidates of a chain; a chain alternating from strong link to strong link guarantees at least one is true.',
    groupNode:
      'Same-digit candidates in one intersection can form a group node; a true group means at least one member is true.',
  },
  ja: {
    atLeastOne:
      'グループ内の少なくとも一候補が真で、すべて偽にはなれませんが、すべて真という意味ではありません。',
    peer: 'あるマスと行・列・ブロックを共有する他のマスが、そのマスのピアです。',
    lockedCandidate:
      'ある領域の同数字候補が別の領域との交差部分だけにあると、別の領域の交差部分以外からその候補を除外できます。',
    fish: 'フィッシュは一つの数字の行と列における位置制約から、他の位置の同じ候補を除外します。',
    fishCover:
      'ベース上の同数字候補をすべて含む交差方向の行や列がカバー線で、基本フィッシュでは両方の線数が同じです。',
    bivalue: '候補がちょうど二つ残るマスには、最終的にどちらか一方が入ります。',
    endpoint:
      '端点はチェーンの最も外側の候補で、強リンクで始まり強リンクで終わる交替チェーンでは少なくとも一方が真です。',
    groupNode:
      '同じ交差領域にある同数字候補を一つのグループ節点とし、グループが真なら少なくとも一候補が真です。',
  },
  de: {
    atLeastOne:
      'Mindestens ein Kandidat einer Gruppe muss wahr sein, aber nicht jeder Kandidat muss wahr sein.',
    peer: 'Andere Felder in derselben Zeile, Spalte oder demselben Block sind die Peers eines Feldes.',
    lockedCandidate:
      'Liegen alle Kandidaten einer Ziffer in einem Gebiet im Schnitt mit einem anderen, ist diese Ziffer im übrigen Teil des anderen Gebiets ausgeschlossen.',
    fish: 'Fische nutzen die Positionsbeschränkungen einer Ziffer in Zeilen und Spalten, um sie an anderen Stellen auszuschließen.',
    fishCover:
      'Decklinien enthalten alle gleichzahligen Basis-Kandidaten in der kreuzenden Richtung; ein einfacher Fisch hat gleich viele Basis- und Decklinien.',
    bivalue:
      'Ein Feld mit genau zwei Kandidaten muss schließlich eine dieser Ziffern enthalten.',
    endpoint:
      'Endpunkte sind die äußersten Kandidaten einer Kette; beginnt und endet eine Wechselkette mit einer starken Verbindung, ist mindestens einer wahr.',
    groupNode:
      'Gleichzahlige Kandidaten in einem Schnittgebiet können einen Gruppenknoten bilden; eine wahre Gruppe hat mindestens ein wahres Mitglied.',
  },
};

/** A definition that can be read without entering the guide. */
export function conceptSummary(
  locale: LessonLocale,
  concept: TermConcept,
): string {
  const definition = TERM_CONCEPT_COPY[locale][concept].definition;
  return (
    SUMMARY_OVERRIDES[locale][concept] ??
    definition.match(/^.*?(?:。|[.!?](?:\s|$))/u)?.[0].trim() ??
    definition
  );
}

const CAPTIONS: Record<LessonLocale, Record<TermConcept, string>> = {
  'zh-Hans': {
    candidate: '{cells} 仍为空，格内的小数字 {digits} 表示可能填入的数字。',
    peer: '{reference} 是参考格；标出的 {count} 个其他格与它共享{regions}，与格内数字无关。',
    elimination:
      '{placed} 已填入 {digit}，所以与它共享{regions}的 {target} 不能再填 {digit}。',
    nakedSet:
      '{regions}中标出的 {count} 格，全部候选合起来只有 {digits} 这 {digitCount} 种。',
    hiddenSet:
      '在{regions}中，数字 {digits} 只能落在标出的 {count} 格；格内其他候选不改变这一关系。',
    lockedCandidate:
      '{sources}中的候选 {digit} 全部集中在与{affected}的交会处，因此 {target} 的 {digit} 可排除。',
    bivalue: '{cells} 内只剩 {digits} 两种候选，最终必须填入其中一种。',
    bilocation: '在{regions}中，数字 {digit} 只剩 {cells} 这两个位置。',
    strongLink:
      '图中 {cells} 的候选 {digits} 不能同时不成立：一端为假，另一端就必须为真。',
    weakLink: '图中 {cells} 的候选 {digits} 不能同时成立，但可以同时不成立。',
    fish: '{bases}中的候选 {digit} 全部只落在{covers}；这几条覆盖线在基线之外的 {target} 不能再填 {digit}。这四个候选所在的交点，就是这个 X-Wing 的四角。',
    fishBase:
      '蓝色的{bases}是起点：逐条检查，其中所有的 {digit} 都在图中标出。',
    fishCover:
      '{bases}中的全部候选 {digit} 都在琥珀色的{covers}中，基线与覆盖线各有 {baseCount} 条。',
    fishFin:
      '{fins} 的青色 {digit} 在覆盖线外，是鱼鳍；{target} 位于覆盖线、基线之外且看见全部鱼鳍，因此可排除 {digit}。',
    alternatingChain:
      '这条链连接 {count} 格的候选 {digit}，依次经过强链、弱链，再继续交替。',
    endpoint:
      '{first} 和 {last} 是链的两端；两端连接强链，因此至少一个候选 {digit} 成立。',
    chainTarget:
      '{target} 同时看见端点 {first} 和 {last}，所以不能保留候选 {digit}。',
    loop: '图中 {count} 格的候选 {digit} 沿强弱关系连接，最后一段回到起点。',
    colorState:
      '图中的候选 {digit} 沿强链交替标成 A、B，两种标记代表相反的真假状态。',
    colorComponent:
      '图中的候选 {digit} 由强链连成 {componentCount} 个分量；相同字母只有在同一分量内才表示同一状态。',
    uniqueness:
      '四个标出格展示局部候选关系；整题只有一个解的保证须来自题目来源，这张图不能证明它。',
    deadlyRectangle:
      '{cells} 跨两行、两列和两个宫，都只剩 {digits}；互换两数会形成另一种局部填法。',
    groupNode: '{group} 的候选 {digit} 同行或同列且同宫，用 G 表示这一组。',
    atLeastOne:
      '若组外 {target} 的 {digit} 不成立，组内 {group} 至少有一格必须填 {digit}。',
    assumption:
      '{cells} 的小数字 {digit} 仍是候选，将它暂时当作真只是推演，没有实际填入。',
    exhaustiveBranches:
      '{cells} 有 {digitCount} 种候选 {digits}，图中检查了对应的 {checked} 条分支。',
    commonConclusion:
      '{branchCount} 条分支都排除 {target} 的 {targetDigit}，所以这个排除不依赖选择哪条分支。',
  },
  en: {
    candidate: '{cells} is empty; the small {digits} denotes possible values.',
    peer: '{reference} is the reference cell; the {count} marked other cells share {regions} with it, regardless of digits.',
    elimination:
      '{placed} contains {digit}, so {target}, sharing {regions}, cannot also contain {digit}.',
    nakedSet:
      'The {count} marked cells in {regions} have only {digitCount} candidate digits in total: {digits}.',
    hiddenSet:
      'In {regions}, {digits} can occupy only the {count} marked cells, even though other notes are present.',
    lockedCandidate:
      'All {digit}s in {sources} lie in its intersection with {affected}; {digit} at {target} can be excluded.',
    bivalue:
      '{cells} has exactly the two candidates {digits}; one must eventually be placed.',
    bilocation: 'In {regions}, {digit} has only two positions: {cells}.',
    strongLink:
      'Candidates {digits} at {cells} cannot both be false: if one is false, the other must be true.',
    weakLink:
      'Candidates {digits} at {cells} cannot both be true, but may both be false.',
    fish: 'All {digit}s in {bases} lie in {covers}; {target}, on a cover outside the bases, cannot contain {digit}. These four candidates form the X-Wing’s four corners.',
    fishBase:
      'The blue {bases} are the starting lines; every {digit} on each is shown.',
    fishCover:
      'Every {digit} on {bases} lies in the amber {covers}; there are {baseCount} bases and as many covers.',
    fishFin:
      'The teal {digit} at {fins} is outside the covers: a fin; {target} is on a cover outside the bases and sees every fin, excluding {digit}.',
    alternatingChain:
      'The chain connects {digit}s in {count} cells, alternating strong and weak links.',
    endpoint:
      '{first} and {last} are endpoints with strong outer links; at least one {digit} is true.',
    chainTarget:
      '{target} sees both endpoints {first} and {last}, so its {digit} can be excluded.',
    loop: 'The {digit}s in {count} cells form a linked loop: the final link returns to the start.',
    colorState:
      'The {digit}s are labelled A and B alternately along strong links, representing opposite truth states.',
    colorComponent:
      'Strong links connect the {digit}s into {componentCount} components; matching letters mean the same state only within one component.',
    uniqueness:
      'The four marked cells show a local pattern; the puzzle source must guarantee uniqueness, which this diagram cannot prove.',
    deadlyRectangle:
      '{cells} span two rows, two columns and two boxes, with only {digits}; swapping the digits gives another local filling.',
    groupNode:
      'Candidates {digit} at {group} share a line and box; G represents this group.',
    atLeastOne:
      'If the outside {digit} at {target} is false, at least one cell in {group} must contain {digit}.',
    assumption:
      'The small {digit} at {cells} is still a candidate; assuming it true explores consequences without placing it.',
    exhaustiveBranches:
      '{cells} has {digitCount} candidates {digits}; the diagram checks {checked} corresponding branches.',
    commonConclusion:
      'All {branchCount} branches exclude {targetDigit} at {target}, regardless of which branch is chosen.',
  },
  ja: {
    candidate: '{cells} は空マスで、小さな {digits} が可能な数字を表します。',
    peer: '基準は {reference} です。他の強調された {count} マスは {regions} を共有し、数字には依存しません。',
    elimination:
      '{placed} に {digit} が入り、{regions} を共有する {target} には {digit} を入れられません。',
    nakedSet:
      '{regions} の強調された {count} マスには、合計で {digits} の {digitCount} 種類の候補しかありません。',
    hiddenSet:
      '{regions} で {digits} が入るのは強調された {count} マスだけで、他の候補があっても変わりません。',
    lockedCandidate:
      '{sources} の {digit} は {affected} との交差部分だけにあり、{target} の {digit} を除外できます。',
    bivalue:
      '{cells} には {digits} の二候補だけが残り、最後には一方が入ります。',
    bilocation: '{regions} の {digit} は {cells} の二位置だけにあります。',
    strongLink:
      '{cells} の候補 {digits} は同時に偽になれず、一方が偽なら他方が真です。',
    weakLink:
      '{cells} の候補 {digits} は同時に真になれませんが、同時に偽にはなれます。',
    fish: '{bases} の {digit} はすべて {covers} にあり、カバー上かつベース外の {target} に {digit} は入りません。四つの候補が X-Wing の四隅です。',
    fishBase: '青い {bases} が出発点で、各線の {digit} をすべて示しています。',
    fishCover:
      '{bases} の全候補 {digit} が琥珀色の {covers} にあり、両方の線数は {baseCount} 本です。',
    fishFin:
      '{fins} の青緑色の {digit} はカバー外のフィンです。{target} はカバー上かつベース外ですべてのフィンを見ており、{digit} を除外できます。',
    alternatingChain:
      '{count} マスの {digit} が強リンクと弱リンクで交互につながっています。',
    endpoint:
      '{first} と {last} が端点で、外側の強リンクにより少なくとも一方の {digit} が真です。',
    chainTarget:
      '{target} は端点 {first} と {last} を両方見ており、候補 {digit} を除外できます。',
    loop: '{count} マスの {digit} がリンクでつながり、最後のリンクが起点に戻ります。',
    colorState:
      '{digit} を強リンクに沿って A と B に交互に分け、反対の真偽状態を表します。',
    colorComponent:
      '{digit} は強リンクで {componentCount} 成分につながり、同じ文字は同じ成分内だけで同じ状態を意味します。',
    uniqueness:
      '強調された四マスは局所構造を示しますが、唯一解の保証は問題の出典から得る必要があり、この図では証明できません。',
    deadlyRectangle:
      '{cells} は二行・二列・二ブロックにあり、{digits} だけが残ります。数字の交換で別の局所的な埋め方になります。',
    groupNode:
      '{group} の {digit} は線とブロックを共有し、G がこのグループを表します。',
    atLeastOne:
      '外側の {target} の {digit} が偽なら、{group} の少なくとも一マスに {digit} が入ります。',
    assumption:
      '{cells} の小さな {digit} は候補のままで、真と仮定しても実際には入力しません。',
    exhaustiveBranches:
      '{cells} には {digits} の {digitCount} 候補があり、図では対応する {checked} 分岐を調べています。',
    commonConclusion:
      '{branchCount} 分岐がすべて {target} の {targetDigit} を除外し、どの分岐を選んでも変わりません。',
  },
  de: {
    candidate:
      '{cells} ist leer; die kleinen Ziffern {digits} zeigen mögliche Werte.',
    peer: '{reference} ist das Bezugsfeld; die {count} anderen markierten Felder teilen {regions} mit ihm, unabhängig von Ziffern.',
    elimination:
      '{placed} enthält {digit}; {target} teilt {regions} und kann deshalb nicht ebenfalls {digit} enthalten.',
    nakedSet:
      'Die {count} markierten Felder in {regions} enthalten insgesamt nur {digitCount} Ziffern: {digits}.',
    hiddenSet:
      'In {regions} können {digits} nur in den {count} markierten Feldern stehen, auch mit weiteren Notizen.',
    lockedCandidate:
      'Alle Kandidaten {digit} in {sources} liegen im Schnitt mit {affected}; {digit} in {target} ist ausgeschlossen.',
    bivalue:
      '{cells} hat genau die Kandidaten {digits}; einer davon muss eingetragen werden.',
    bilocation:
      'In {regions} gibt es für {digit} nur die beiden Positionen {cells}.',
    strongLink:
      'Die Kandidaten {digits} in {cells} können nicht beide falsch sein: Ist einer falsch, muss der andere wahr sein.',
    weakLink:
      'Die Kandidaten {digits} in {cells} können nicht beide wahr, aber beide falsch sein.',
    fish: 'Alle Kandidaten {digit} in {bases} liegen in {covers}; {target} auf einer Decklinie außerhalb der Basislinien kann keine {digit} enthalten. Die vier Kandidaten bilden die vier Ecken des X-Wings.',
    fishBase:
      'Die blauen {bases} sind der Ausgangspunkt; jede {digit} auf diesen Linien ist dargestellt.',
    fishCover:
      'Alle Kandidaten {digit} in {bases} liegen in den bernsteinfarbenen {covers}; beide Liniengruppen haben {baseCount} Linien.',
    fishFin:
      'Die türkise {digit} in {fins} liegt außerhalb der Decklinien und ist eine Flosse; {target} liegt auf einer Decklinie außerhalb der Basislinien und sieht alle Flossen, was {digit} ausschließt.',
    alternatingChain:
      'Die Kette verbindet die {digit}en in {count} Feldern abwechselnd mit starken und schwachen Verbindungen.',
    endpoint:
      '{first} und {last} sind Endpunkte mit starken äußeren Verbindungen; mindestens eine {digit} ist wahr.',
    chainTarget:
      '{target} sieht die Endpunkte {first} und {last}; seine {digit} kann ausgeschlossen werden.',
    loop: 'Die Kandidaten {digit} in {count} Feldern bilden eine Schleife; die letzte Verbindung führt zum Ausgangspunkt zurück.',
    colorState:
      'Die Kandidaten {digit} erhalten entlang starker Verbindungen abwechselnd A und B für entgegengesetzte Wahrheitszustände.',
    colorComponent:
      'Starke Verbindungen verbinden die {digit}en zu {componentCount} Komponenten; gleiche Buchstaben bedeuten nur innerhalb einer Komponente denselben Zustand.',
    uniqueness:
      'Die vier markierten Felder zeigen ein lokales Muster; Eindeutigkeit muss die Rätselquelle garantieren und kann hier nicht bewiesen werden.',
    deadlyRectangle:
      '{cells} liegen in zwei Zeilen, zwei Spalten und zwei Blöcken mit nur {digits}; Vertauschen ergibt eine andere lokale Belegung.',
    groupNode:
      'Die Kandidaten {digit} in {group} teilen eine Linie und einen Block; G bezeichnet diese Gruppe.',
    atLeastOne:
      'Ist die äußere {digit} in {target} falsch, muss mindestens ein Feld in {group} eine {digit} enthalten.',
    assumption:
      'Die kleine {digit} in {cells} ist weiterhin ein Kandidat; eine Annahme erkundet Folgen ohne Eintrag.',
    exhaustiveBranches:
      '{cells} hat {digitCount} Kandidaten {digits}; im Diagramm wurden {checked} entsprechende Zweige geprüft.',
    commonConclusion:
      'Alle {branchCount} Zweige schließen {targetDigit} in {target} aus, unabhängig vom gewählten Zweig.',
  },
};

const UNITS: Record<LessonLocale, Record<'row' | 'column' | 'box', string>> = {
  'zh-Hans': {
    row: '第 {index} 行',
    column: '第 {index} 列',
    box: '第 {index} 宫',
  },
  en: { row: 'row {index}', column: 'column {index}', box: 'box {index}' },
  ja: {
    row: '第 {index} 行',
    column: '第 {index} 列',
    box: '第 {index} ブロック',
  },
  de: { row: 'Zeile {index}', column: 'Spalte {index}', box: 'Block {index}' },
};

export function conceptDiagramVariables(
  locale: LessonLocale,
  scene: TermScene,
) {
  const separator = locale === 'en' || locale === 'de' ? ', ' : '、';
  const cell = (index: number) =>
    locale === 'zh-Hans' || locale === 'ja'
      ? `${Math.floor(index / 9) + 1} 行 ${(index % 9) + 1} 列`
      : `r${Math.floor(index / 9) + 1}c${(index % 9) + 1}`;
  const cells = (items: readonly number[]) =>
    [...new Set(items)].map(cell).join(separator);
  const regions = (role?: string) =>
    (scene.regions ?? [])
      .filter(mark => !role || mark.role === role)
      .map(mark =>
        conceptText(UNITS[locale][mark.region.kind], {
          index: mark.region.index + 1,
        }),
      )
      .join(separator);
  const focusCells = [...new Set(scene.focus.map(item => item.cell))];
  const digits = [...new Set(scene.focus.map(item => item.digit))].sort();
  const related = scene.relatedCells ?? focusCells;
  return {
    cells: cells(focusCells),
    digits: digits.join(separator),
    digit: scene.diagramDigit ?? digits[0] ?? scene.values[0]?.digit ?? '',
    related: cells(scene.relatedCells ?? []),
    count: related.length,
    digitCount: digits.length,
    reference:
      scene.referenceCell === undefined ? '' : cell(scene.referenceCell),
    regions: regions(),
    sources: regions('source'),
    affected: regions('affected'),
    bases: regions('fishBase'),
    covers: regions('fishCover'),
    baseCount:
      scene.regions?.filter(mark => mark.role === 'fishBase').length ?? 0,
    placed: cells(scene.values.map(item => item.cell)),
    target: scene.target ? cell(scene.target.cell) : '',
    targetDigit: scene.target?.digit ?? '',
    fins: cells(scene.fins?.map(item => item.cell) ?? []),
    first: scene.links?.length ? cell(scene.links[0].from) : '',
    last: scene.links?.length
      ? cell(scene.links[scene.links.length - 1].to)
      : '',
    group: cells(scene.group?.map(item => item.cell) ?? []),
    componentCount: new Set(scene.colors?.map(item => item.component)).size,
    checked: scene.checkedBranches ?? 0,
    branchCount: scene.branchResults?.length ?? 0,
  };
}

export function conceptDiagramCaption(
  locale: LessonLocale,
  concept: TermConcept,
  scene: TermScene,
): string {
  return conceptText(
    CAPTIONS[locale][concept],
    conceptDiagramVariables(locale, scene),
  );
}

const PEER_STEPS: Record<LessonLocale, readonly [string, string, string]> = {
  'zh-Hans': [
    '从参考格 {reference} 出发，只看位置，不需要填写数字。',
    '标出的 {count} 格与参考格共享{regions}；参考格自身不计入，重叠位置只计算一次。',
    '这些格都是参考格的同伴格，无论格内有没有数字；若参考格填入一个数字，它们就不能再填同一数字。',
  ],
  en: [
    'Start at reference cell {reference}; only positions matter, so no digits are needed.',
    'The {count} marked cells share {regions} with the reference; exclude the reference itself and count overlaps only once.',
    'These are the reference cell’s peers, with or without digits; placing a digit in the reference rules out that digit in every peer.',
  ],
  ja: [
    '基準マス {reference} から位置だけを見ます。数字は必要ありません。',
    '強調された {count} マスは {regions} を共有します。基準自身は除き、重複は一度だけ数えます。',
    '数字の有無にかかわらず、これらは基準マスのピアです。基準に数字を入れると、ピアには同じ数字を入れられません。',
  ],
  de: [
    'Beginne beim Bezugsfeld {reference}; nur Positionen zählen, Ziffern sind unnötig.',
    'Die {count} markierten Felder teilen {regions}; das Bezugsfeld zählt nicht mit, Überschneidungen zählen nur einmal.',
    'Diese Felder sind unabhängig von Ziffern die Peers des Bezugsfelds; ein dort eingetragener Wert ist in allen Peers ausgeschlossen.',
  ],
};
const FISH_STEPS: Record<LessonLocale, readonly [string, string, string]> = {
  'zh-Hans': [
    '先只看候选 {digit}：它在 {cells}。暂时不需要记住线的名称。',
    '选中的{bases}各需要填入一个 {digit}，而这些线的全部 {digit} 只落在{covers}。蓝色的起点叫基线。',
    '琥珀色交叉线叫覆盖线。这 {baseCount} 条基线要放入 {baseCount} 个 {digit}；同一条覆盖线不能放两个，因此每条覆盖线都会被基线中的一个 {digit} 占据。{target} 在覆盖线上、基线之外，所以可排除 {digit}。',
  ],
  en: [
    'Look only at candidate {digit}, at {cells}; the line names can wait.',
    'Each selected base, {bases}, needs a {digit}, and all their {digit}s lie in {covers}. Blue starting lines are called bases.',
    'Amber crossing lines are called covers. The {baseCount} bases need {baseCount} copies of {digit}. No cover can contain two, so each cover is occupied by a base {digit}. The target {target} lies on a cover outside the bases and loses {digit}.',
  ],
  ja: [
    '候補 {digit} の位置 {cells} だけを見ます。線の名前はまだ覚えなくて構いません。',
    '選んだ {bases} はそれぞれ {digit} を必要とし、全候補は {covers} に収まります。青い出発線がベースです。',
    '琥珀色の交差線がカバーです。{baseCount} 本のベースには {digit} が {baseCount} 個入ります。同じカバーに二つは入らないため、各カバーをベースの一候補が占め、ベース外の {target} から {digit} を除外できます。',
  ],
  de: [
    'Betrachte nur Kandidat {digit} in {cells}; die Liniennamen können warten.',
    'Jede gewählte Linie in {bases} braucht eine {digit}; alle liegen in {covers}. Die blauen Ausgangslinien heißen Basislinien.',
    'Die bernsteinfarbenen Kreuzlinien heißen Decklinien. Die {baseCount} Basislinien brauchen {baseCount} Mal {digit}. Keine Decklinie kann zwei enthalten, also belegt eine Basis-{digit} jede Decklinie. {target} liegt außerhalb der Basislinien auf einer Decklinie und verliert {digit}.',
  ],
};

export function conceptDiagramStep(
  locale: LessonLocale,
  concept: TermConcept,
  scene: TermScene,
  step: number,
): string | undefined {
  const steps =
    concept === 'peer'
      ? PEER_STEPS[locale]
      : concept === 'fish'
      ? FISH_STEPS[locale]
      : undefined;
  if (
    concept === 'fishBase' ||
    concept === 'fishCover' ||
    concept === 'fishFin'
  ) {
    const template =
      step === 0
        ? FISH_STEPS[locale][0]
        : step === 1
        ? FISH_BASE_STEP[locale]
        : concept === 'fishFin'
        ? `${CAPTIONS[locale].fishFin} ${FIN_CONCLUSION[locale]}`
        : CAPTIONS[locale][concept];
    return conceptText(template, conceptDiagramVariables(locale, scene));
  }
  return steps
    ? conceptText(steps[step], conceptDiagramVariables(locale, scene))
    : undefined;
}

const FISH_BASE_STEP: Record<LessonLocale, string> = {
  'zh-Hans':
    '从蓝色的{bases}开始，逐条找齐候选 {digit}；每条线最终都要填入一个 {digit}。这些选来检查的起点叫基线。',
  en: 'Start from the blue {bases} and find every {digit}; each line must eventually contain one {digit}. These selected starting lines are the bases.',
  ja: '青い {bases} から各線の {digit} をすべて探します。各線には最終的に一つの {digit} が入り、選んだ出発線がベースです。',
  de: 'Beginne mit den blauen {bases} und suche jede {digit}; jede Linie braucht schließlich eine {digit}. Diese Ausgangslinien heißen Basislinien.',
};
const FIN_CONCLUSION: Record<LessonLocale, string> = {
  'zh-Hans':
    '若全部鱼鳍都不成立，就恢复普通鱼，能排除 {target} 的 {digit}；若某个鱼鳍成立，{target} 又因为看见它而不能填 {digit}。两种情况都排除目标，所以只删除同时位于覆盖线、基线之外且能看见全部鱼鳍的目标。',
  en: 'If every fin is false, the ordinary fish excludes {digit} at {target}. If any fin is true, {target} sees it and cannot contain {digit} either. Both cases exclude only cover targets outside the bases that see every fin.',
  ja: 'すべてのフィンが偽なら通常のフィッシュが {target} の {digit} を除外します。どれかが真でも、{target} はそれを見るため {digit} を入れられません。両方のケースで除外できるのは、カバー上かつベース外ですべてのフィンを見る対象だけです。',
  de: 'Sind alle Flossen falsch, schließt der gewöhnliche Fisch {digit} in {target} aus. Ist eine Flosse wahr, sieht {target} sie und kann ebenfalls keine {digit} enthalten. Beide Fälle schließen nur Decklinien-Ziele außerhalb der Basislinien aus, die alle Flossen sehen.',
};

export function peerPracticeCaption(
  locale: LessonLocale,
  scene: TermScene,
): string {
  const templates: Record<LessonLocale, string> = {
    'zh-Hans':
      '比较参考格 {reference} 与 {related} 的位置：同行、同列或同宫吗？',
    en: 'Compare reference {reference} with {related}: do they share a row, column or box?',
    ja: '基準 {reference} と {related} は、行・列・ブロックを共有しますか？',
    de: 'Vergleiche das Bezugsfeld {reference} mit {related}: Teilen sie Zeile, Spalte oder Block?',
  };
  return conceptText(templates[locale], conceptDiagramVariables(locale, scene));
}
