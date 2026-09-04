import type { ProductLocale } from '../application';
import {
  ENGLISH_HINT_PRESENTATION_COPY,
  HintPresentationCopy,
  HintTechniqueTemplate,
} from '../domain/hints/presentation';
import type { TechniqueCode } from '../domain/hints/techniques';

const japaneseTechniques = {
  fullHouse: {
    name: 'フルハウス',
    observe: '{regions}で未確定の数字は1つだけです。',
  },
  nakedSingle: {
    name: 'ネイキッドシングル',
    observe: '強調されたマスに残る候補は1つだけです：{premises}。',
  },
  hiddenSingle: {
    name: 'ヒドゥンシングル',
    observe: '{regions}で{targetDigit}を置ける場所を確認します。',
  },
  'lockedCandidates.pointing': {
    name: 'ロック候補・ポインティング',
    observe:
      '1つのボックス内で、{premises}が同じ行または列に限定されています。',
  },
  'lockedCandidates.claiming': {
    name: 'ロック候補・クレーミング',
    observe:
      '1つの行または列で、{premises}が同じボックス内に限定されています。',
  },
  lockedPair: {
    name: 'ロックペア',
    observe: '{regions}の2マスが同じ2数字に限定されています。',
  },
  lockedTriple: {
    name: 'ロックトリプル',
    observe: '{regions}の3マスが同じ3数字に限定されています。',
  },
  nakedPair: {
    name: 'ネイキッドペア',
    observe: '強調された2マスが{regions}内の2数字を占有します。',
  },
  hiddenPair: {
    name: 'ヒドゥンペア',
    observe: '{regions}内で2数字を置けるのは強調された2マスだけです。',
  },
  nakedTriple: {
    name: 'ネイキッドトリプル',
    observe: '強調された3マスが{regions}内の3数字を占有します。',
  },
  hiddenTriple: {
    name: 'ヒドゥントリプル',
    observe: '{regions}内で3数字を置けるのは強調された3マスだけです。',
  },
  nakedQuad: {
    name: 'ネイキッドクアッド',
    observe: '強調された4マスが{regions}内の4数字を占有します。',
  },
  hiddenQuad: {
    name: 'ヒドゥンクアッド',
    observe: '{regions}内で4数字を置けるのは強調された4マスだけです。',
  },
  xWing: {
    name: 'X-Wing',
    observe: '1つの数字が{regions}をまたぐ長方形の四隅を作っています。',
  },
  swordfish: {
    name: 'ソードフィッシュ',
    observe: '1つの数字が対応する3行または3列に限定されています。',
  },
  skyscraper: {
    name: 'スカイスクレーパー',
    observe: '2つの強リンクが、同じ対象を見る2つの屋上を作っています。',
  },
  twoStringKite: {
    name: '2ストリング・カイト',
    observe: '行のリンクと列のリンクが1つのボックスを介してつながっています。',
  },
  turbotFish: {
    name: 'ターボットフィッシュ',
    observe: '2つの強リンクが弱リンクを介して共通の対象につながっています。',
  },
  wWing: {
    name: 'W-Wing',
    observe: '同じ候補を持つ2値マスが強リンクで結ばれています。',
  },
  xyWing: {
    name: 'XY-Wing',
    observe: '2値のピボットが、外側の共通数字を持つ2つのウイングを結びます。',
  },
  xyzWing: {
    name: 'XYZ-Wing',
    observe: '3候補のピボットと2つのウイングが1数字を共有します。',
  },
  simpleColoring: {
    name: 'シンプルカラーリング',
    observe: '強リンクによって1つの数字が交互の2色に分かれます。',
  },
  multiColoring: {
    name: 'マルチカラーリング',
    observe: '同じ数字に対する複数のカラー連鎖が互いに作用します。',
  },
  remotePair: {
    name: 'リモートペア',
    observe: '同じ2数字を持つ2値マスの連鎖が交互に続きます。',
  },
  emptyRectangle: {
    name: 'エンプティレクタングル',
    observe: 'ボックス内の候補が空の長方形の交点を作っています。',
  },
  hiddenRectangle: {
    name: 'ヒドゥンレクタングル',
    observe: '強リンクが曖昧になり得る長方形を解消します。',
  },
  avoidableRectangle: {
    name: 'アボイダブルレクタングル',
    observe: '入力済み数字と候補が、そのままでは2解を作ります。',
  },
  uniqueRectangle: {
    name: 'ユニークレクタングル',
    observe: '4マスが2解を生む危険な長方形を作りかけています。',
  },
  bugPlusOne: {
    name: 'BUG + 1',
    observe: '未確定マスは、強調された1マスを除いてすべて2候補です。',
  },
  finnedXWing: {
    name: 'フィンドX-Wing',
    observe: 'X-Wingに、1つのボックス内に限定された余分な候補があります。',
  },
  sashimiXWing: {
    name: 'サシミX-Wing',
    observe: '1つの欠けた角をフィンで補う、X-Wingに近い形です。',
  },
  jellyfish: {
    name: 'ジェリーフィッシュ',
    observe: '1つの数字が対応する4行または4列に限定されています。',
  },
  xChain: {
    name: 'Xチェーン',
    observe: '1つの数字の候補を、強リンクと弱リンクが交互に結びます。',
  },
  xyChain: {
    name: 'XYチェーン',
    observe: '2値マスの連鎖が、両端の同じ数字を結びます。',
  },
  aic: {
    name: '交互推論チェーン',
    observe: '候補の強リンクと弱リンクが交互に続き、結論を確定します。',
  },
  groupedAic: {
    name: 'グループAIC',
    observe: '候補のグループが交互推論チェーンに参加します。',
  },
  complexColoring: {
    name: '複合カラーリング',
    observe: '複数の色付き連結成分が、強調された結果を確定します。',
  },
  forcingChain: {
    name: 'フォーシングチェーン',
    observe: '1つの候補から分かれる各分岐が同じ結論に到達します。',
  },
  forcingNet: {
    name: 'フォーシングネット',
    observe: '複数の分岐が、避けられない1つの結果に収束します。',
  },
} satisfies Readonly<Record<TechniqueCode, HintTechniqueTemplate>>;

const japanese: HintPresentationCopy = {
  emptyRectangle: {
    overviewTitle: 'ボックス内の候補を見る',
    overviewBody:
      '{box}の候補{digit}は、すべて{row}と{column}にあります。枠内の丸を見てください。',
    emptyTitle: '空の長方形を見つける',
    emptyBody:
      'ボックス内で、ある数字の候補が1本の行と1本の列に集まっています。その行と列の外にある4マスにはその候補がなく、「空の長方形」を作ります。この図では、候補{digit}のない4マスを斜線で示しています。',
    drainTitle: '片側の候補がなくなる',
    drainBody:
      '仮定のもとでは{near}が{digit}になります。{drained}は同じ{toBox}にあるため、{digit}を置けません。{box}のこちら側には候補{digit}がなくなります。',
    conflictTitle: '最初の仮定と矛盾する',
    singleConflictBody:
      '{box}には{digit}が必要で、残るのは{remaining}だけです。ここが{digit}になりますが、仮定した{target}と同じ{conflictRegion}なので、{digit}が2つできてしまいます。',
    groupConflictBody:
      '{box}の{digit}は{remaining}のどこかに必要です。でも全てのマスが仮定した{target}と同じ{conflictRegion}にあり、どこにも置けません。このボックスに{digit}の場所がなくなってしまいます。',
    conclusionTitle: '最初の仮定は成り立たない',
    conclusionBody:
      '{targets}に{digit}を置くという仮定は矛盾します。この候補を消し、仮定で置いた数字は元に戻します。',
  },
  turbotFish: {
    overviewTitle: '4つの候補のつながりを見る',
    overviewBody:
      '丸で囲まれた候補{digit}をたどります。枠付きのマスに{digit}を置けるか調べましょう。',
    pairTitle: '{region}では2か所だけ',
    pairBody:
      '{region}で{digit}を置けるのは{end}と{inner}だけです。どちらか一方は必ず{digit}になります。',
    assumeTitle: '仮に置いて考える',
    assumeBody:
      '{target}を{digit}と仮定します。「?」付きの数字は推論用で、確定した答えではありません。',
    excludeTitle: 'この2か所には置けない',
    excludeBody:
      '{end}は{target}と同じ{region}にあるので、{digit}にはできません。',
    forceTitle: '残る場所は1つだけ',
    forceBody:
      '{end}には{digit}を置けないので、{region}では{inner}だけが残ります。この仮定のもとでは、ここが{digit}になります。',
    conflictTitle: '同じ数字が重なってしまう',
    conflictBody:
      '{end}には{digit}を置けないため、{region}では{inner}が{digit}になります。でも{firstInner}と{inner}は同じ{conflictRegion}にあり、{digit}が2つになってしまいます。',
    conclusionTitle: '最初の仮定は成り立たない',
    conclusionBody:
      'この仮定では{conflictRegion}に{digit}が2つできてしまいます。{targets}の候補{digit}を消せます。仮定で置いた数字はすべて元に戻します。',
  },
  twoStringKite: {
    overviewTitle: 'まずカイト全体を見る',
    overviewBody:
      '強調された候補{digit}をたどります。2本の実線は行と列の候補の組を結び、内側の2つの候補は同じボックスにあります。枠付きのマスをこれから調べます。',
    rowTitle: 'この行では2か所だけ',
    rowBody:
      '{row}行目で{digit}を置けるのは{rowEnd}と{rowBase}だけです。どちらかに必ず{digit}が入ります。ここでは他の候補は考えません。',
    columnTitle: 'この列でも2か所だけ',
    columnBody:
      '{column}列目で{digit}を置けるのは{columnEnd}と{columnBase}だけです。どちらかに必ず{digit}が入ります。',
    assumeTitle: '仮に置いてみると',
    assumeBody:
      'もし{target}が{digit}だったらどうなるでしょうか。「?」付きの数字は仮のものです。答えが決まったわけではありません。',
    excludeTitle: 'この仮定から考える',
    excludeBody:
      '{end}は{target}と同じ{region}にあるので、{digit}にはできません。',
    forceTitle: '行の候補が1か所に',
    forceBody:
      '{rowEnd}は{digit}ではないので、{row}行目で残るのは{rowBase}だけです。この仮定では、そこが{digit}になります。',
    conflictTitle: '同じ数字が重なります',
    conflictBody:
      '{columnEnd}は{digit}ではないので、{column}列目の{digit}は{columnBase}に入ります。でも{rowBase}と{columnBase}は同じ第{box}ボックスです。1つのボックスに{digit}は2つ置けません。',
    conclusionTitle: 'この候補を消せる理由',
    conclusionBody:
      '仮に置くと、同じボックスに{digit}が2つできてしまいます。だから最初の仮定は成り立ちません。{targets}から候補{digit}を消せます。',
  },
  techniques: japaneseTechniques,
  candidateFallback: '強調された候補',
  candidateEntry: '{cell}の{digit}',
  candidateSeparator: '、',
  digitFallback: '強調された数字',
  cellFallback: '強調されたマス',
  regionFallback: '強調された領域',
  regionRow: '{index}行',
  regionColumn: '{index}列',
  regionBox: 'ボックス{index}',
  regionSeparator: '、',
  evidenceCandidates: 'このページでは{premises}を追加で確認します。',
  evidenceValues: '確定数字による根拠は{evidence}です。',
  evidenceCells: '{cells}に注目します。',
  progressRestrictedSet:
    '{evidence} これらは限定数字集合の一部です。残りの部分集合の根拠を加える間、この強調を保ちます。',
  progressFish:
    '{evidence} これは関係する行と列の交点の1つです。残りのフィッシュ位置を加える間、この強調を保ちます。',
  progressWing:
    '{evidence} これはピボットとウイング構造の一部です。残りのウイングの根拠を加える間、この強調を保ちます。',
  progressRectangle:
    '{evidence} これは4マスの長方形の一部です。残りの角を加える間、この強調を保ちます。',
  progressChain:
    '{evidence} これは次のリンク区間です。残りの連鎖の根拠を加える間、この強調を保ちます。',
  progressGeneric:
    '{evidence} 残りの{technique}の根拠を加える間、この部分の強調を保ちます。',
  constraintPointing:
    '{evidence} 元のボックス内で数字{digits}を置けるのは、交差する同じ線上の{cells}だけです。',
  constraintClaiming:
    '{evidence} 元の行または列で数字{digits}を置けるのは、交差するボックス内の{cells}だけです。',
  constraintNakedSubset:
    '{evidence} {regions}の強調マスには数字{digits}しか入らないため、それらの数字はこのマス群に確保されます。',
  constraintHiddenSubset:
    '{evidence} {regions}で数字{digits}を置けるのは強調マスだけなので、このマス群はそれらの数字に確保されます。',
  constraintFish:
    '{evidence} 数字{digits}の強調候補は対応する行と列の交点に限定され、{technique}が成立します。',
  constraintStrongPairs:
    '{evidence} 数字{digits}の候補が、強調された交点で結ばれた2つの強いペアを作るため、外側の端点の少なくとも一方は真です。',
  constraintWWing:
    '{evidence} 同じ2候補マスが強いペアで結ばれているため、両方のウイングで外側の共通候補が偽になることはありません。',
  constraintWing:
    '{evidence} ピボットがどちらの値でも、強調されたウイングの一方には外側の共通数字が入ります。',
  constraintColoring:
    '{evidence} 数字{digits}の強リンクにより、強調された色の連結成分で真偽が交互になります。',
  constraintRemotePair:
    '{evidence} 同じ2数字が強調された2値連鎖で交互になるため、両端は反対の値を取ります。',
  constraintEmptyRectangle:
    '{evidence} ボックス内の数字{digits}の候補が1つの行列交差に限定され、外側の2候補を結びます。',
  constraintUniqueRectangle:
    '{evidence} この長方形で2数字を交換できると、別の解が生まれてしまいます。',
  constraintAvoidableRectangle:
    '{evidence} 入力済み数字と強調候補が交換可能な長方形を完成させると、別の解が生まれます。',
  constraintBugPlusOne:
    '{evidence} 他の未確定マスはすべて2候補です。強調された余分な候補だけが、行・列・ボックスに必要な候補数を復元できます。',
  constraintXChain:
    '{evidence} 数字{digits}の候補が強リンクと弱リンクを交互にたどります。一方の端が偽なら、もう一方の端は真です。',
  constraintXYChain:
    '{evidence} 各2値マスが次のマスへ含意を渡すため、両端の同じ数字のどちらかは真です。',
  constraintAic:
    '{evidence} 弱リンクと強リンクを交互にたどると、強調された端点の一方が必ず真になります。',
  constraintForcingChain:
    '{evidence} この分岐で候補を強制的に伝播すると、もう一方の分岐と同じ強調された結論に到達します。',
  constraintForcingNet:
    '{evidence} このネットの分岐で候補を強制的に伝播すると、すべての可能な分岐が同じ強調された結論に収束します。',
  constraintSingle:
    '{evidence} 強調された根拠から{technique}の結果が確定します。',
  singleCandidate: '{cells}に残る候補は{candidates}だけです。',
  valueBlocksFallback: '確定済みの数字により、強調されたマスを除外できます。',
  valueBlocks:
    '{evidenceCell}の{digit}により、{focusCells}から{digit}を除外できます。',
  titleObserve: '注目する場所',
  titleConclusion: '結論',
  titleRuleOut: '1つのグループを除外',
  titleFollowLink: 'リンクをたどる',
  titleReason: 'ここから分かること',
  titleApply: '1手を適用',
  resultPlacement: 'このパターンにより{placements}が確定します。',
  resultElimination:
    'このパターンでは真になれないため、{eliminations}を削除できます。',
  applyPlacement: '{placements}を入力します。この操作は1回で元に戻せます。',
  applyElimination:
    '{eliminations}を削除します。すべての削除は1回で元に戻せます。',
  observeAccessibility: '{regions}を確認します。{premises}。',
};

const germanTechniques = {
  fullHouse: {
    name: 'Full House',
    observe: 'In {regions} fehlt nur noch eine Zahl.',
  },
  nakedSingle: {
    name: 'Nackter Single',
    observe: 'In der markierten Zelle bleibt nur ein Kandidat: {premises}.',
  },
  hiddenSingle: {
    name: 'Versteckter Single',
    observe: 'Prüfe, wo {targetDigit} in {regions} noch stehen kann.',
  },
  'lockedCandidates.pointing': {
    name: 'Gesperrte Kandidaten · Pointing',
    observe:
      'In einem Block sind {premises} auf dieselbe Zeile oder Spalte beschränkt.',
  },
  'lockedCandidates.claiming': {
    name: 'Gesperrte Kandidaten · Claiming',
    observe:
      'In einer Zeile oder Spalte sind {premises} auf denselben Block beschränkt.',
  },
  lockedPair: {
    name: 'Gesperrtes Paar',
    observe:
      'Zwei Zellen in {regions} sind auf dieselben zwei Zahlen beschränkt.',
  },
  lockedTriple: {
    name: 'Gesperrtes Tripel',
    observe:
      'Drei Zellen in {regions} sind auf dieselben drei Zahlen beschränkt.',
  },
  nakedPair: {
    name: 'Nacktes Paar',
    observe: 'Das markierte Paar reserviert zwei Zahlen in {regions}.',
  },
  hiddenPair: {
    name: 'Verstecktes Paar',
    observe: 'Zwei Zahlen kommen in {regions} nur im markierten Paar vor.',
  },
  nakedTriple: {
    name: 'Nacktes Tripel',
    observe: 'Drei markierte Zellen reservieren drei Zahlen in {regions}.',
  },
  hiddenTriple: {
    name: 'Verstecktes Tripel',
    observe:
      'Drei Zahlen kommen in {regions} nur in drei markierten Zellen vor.',
  },
  nakedQuad: {
    name: 'Nacktes Quartett',
    observe: 'Vier markierte Zellen reservieren vier Zahlen in {regions}.',
  },
  hiddenQuad: {
    name: 'Verstecktes Quartett',
    observe:
      'Vier Zahlen kommen in {regions} nur in vier markierten Zellen vor.',
  },
  xWing: {
    name: 'X-Wing',
    observe: 'Eine Zahl bildet die Ecken eines Rechtecks über {regions}.',
  },
  swordfish: {
    name: 'Swordfish',
    observe: 'Eine Zahl ist auf drei passende Zeilen oder Spalten beschränkt.',
  },
  skyscraper: {
    name: 'Skyscraper',
    observe:
      'Zwei starke Verknüpfungen bilden Dächer mit einem gemeinsamen Ziel.',
  },
  twoStringKite: {
    name: 'Two-String Kite',
    observe:
      'Eine Zeilen- und eine Spaltenverknüpfung treffen sich über einen Block.',
  },
  turbotFish: {
    name: 'Turbot Fish',
    observe:
      'Zwei starke Verknüpfungen führen über eine schwache zu einem gemeinsamen Ziel.',
  },
  wWing: {
    name: 'W-Wing',
    observe:
      'Zwei gleiche bivalue Zellen sind durch eine starke Verknüpfung verbunden.',
  },
  xyWing: {
    name: 'XY-Wing',
    observe:
      'Ein bivalue Drehpunkt verbindet zwei Flügel mit derselben äußeren Zahl.',
  },
  xyzWing: {
    name: 'XYZ-Wing',
    observe:
      'Ein Drehpunkt mit drei Kandidaten und zwei Flügel teilen eine Zahl.',
  },
  simpleColoring: {
    name: 'Einfaches Färben',
    observe: 'Starke Verknüpfungen teilen eine Zahl in zwei wechselnde Farben.',
  },
  multiColoring: {
    name: 'Mehrfachfärbung',
    observe: 'Getrennte Farbketten derselben Zahl beeinflussen einander.',
  },
  remotePair: {
    name: 'Entferntes Paar',
    observe:
      'Eine Kette gleicher bivalue Zellen wechselt zwischen zwei Zahlen.',
  },
  emptyRectangle: {
    name: 'Leeres Rechteck',
    observe:
      'Kandidaten in einem Block bilden den Schnittpunkt eines leeren Rechtecks.',
  },
  hiddenRectangle: {
    name: 'Verstecktes Rechteck',
    observe:
      'Starke Verknüpfungen lösen ein möglicherweise mehrdeutiges Rechteck auf.',
  },
  avoidableRectangle: {
    name: 'Vermeidbares Rechteck',
    observe:
      'Eingetragene Zahlen und Kandidaten würden sonst zwei Lösungen bilden.',
  },
  uniqueRectangle: {
    name: 'Eindeutiges Rechteck',
    observe:
      'Vier Zellen würden ein tödliches Rechteck mit zwei Lösungen bilden.',
  },
  bugPlusOne: {
    name: 'BUG + 1',
    observe: 'Jede ungelöste Zelle ist bivalue, außer einer markierten Zelle.',
  },
  finnedXWing: {
    name: 'Finned X-Wing',
    observe:
      'Ein X-Wing besitzt einen zusätzlichen Kandidaten innerhalb eines Blocks.',
  },
  sashimiXWing: {
    name: 'Sashimi X-Wing',
    observe:
      'Ein beinahe vollständiger X-Wing ersetzt eine fehlende Ecke durch eine Flosse.',
  },
  jellyfish: {
    name: 'Jellyfish',
    observe: 'Eine Zahl ist auf vier passende Zeilen oder Spalten beschränkt.',
  },
  xChain: {
    name: 'X-Kette',
    observe:
      'Starke und schwache Verknüpfungen verbinden Kandidaten derselben Zahl abwechselnd.',
  },
  xyChain: {
    name: 'XY-Kette',
    observe:
      'Eine Kette bivalue Zellen verbindet gleiche Zahlen an den Endpunkten.',
  },
  aic: {
    name: 'Alternierende Inferenzkette',
    observe:
      'Starke und schwache Kandidatenverknüpfungen wechseln sich ab und erzwingen eine Folgerung.',
  },
  groupedAic: {
    name: 'Gruppierte AIC',
    observe:
      'Gruppierte Kandidaten nehmen an einer alternierenden Inferenzkette teil.',
  },
  complexColoring: {
    name: 'Komplexes Färben',
    observe:
      'Mehrere verknüpfte Farbkomponenten erzwingen das markierte Ergebnis.',
  },
  forcingChain: {
    name: 'Erzwingungskette',
    observe: 'Jeder Zweig eines Kandidaten erreicht dieselbe Folgerung.',
  },
  forcingNet: {
    name: 'Erzwingungsnetz',
    observe:
      'Mehrere verknüpfte Zweige laufen in einem unvermeidbaren Ergebnis zusammen.',
  },
} satisfies Readonly<Record<TechniqueCode, HintTechniqueTemplate>>;

const german: HintPresentationCopy = {
  emptyRectangle: {
    overviewTitle: 'Die Kandidaten im Block ansehen',
    overviewBody:
      'In {box} liegen alle Kandidaten für {digit} in {row} und {column}. Folge den Kreisen im umrahmten Block.',
    emptyTitle: 'Das leere Rechteck erkennen',
    emptyBody:
      'In einem Block liegen alle Kandidaten einer Zahl in einer Zeile und einer Spalte. Die vier Felder außerhalb dieser Zeile und Spalte enthalten keinen Kandidaten dieser Zahl und bilden das leere Rechteck. Hier sind die vier Felder ohne Kandidaten {digit} schraffiert.',
    drainTitle: 'Eine Seite des Blocks fällt weg',
    drainBody:
      'Unter unserer Annahme ist {near} eine {digit}. {drained} liegen in derselben {toBox} und können daher nicht {digit} sein. Auf dieser Seite von {box} bleibt keine {digit}.',
    conflictTitle: 'Die Annahme führt zum Widerspruch',
    singleConflictBody:
      '{box} braucht weiterhin eine {digit}. Nur {remaining} bleibt übrig und muss {digit} sein. Aber dieses Feld liegt mit unserem angenommenen {target} in {conflictRegion}. Dort stünde die {digit} zweimal!',
    groupConflictBody:
      'In {box} muss die {digit} in einem der Felder {remaining} stehen. Alle liegen aber mit unserem angenommenen {target} in {conflictRegion}. Keines kann {digit} sein: Der Block hat keinen Platz mehr für die {digit}!',
    conclusionTitle: 'Die ursprüngliche Annahme stimmt nicht',
    conclusionBody:
      'Die Annahme einer {digit} in {targets} führt zum Widerspruch. Entferne diesen Kandidaten und nimm alle angenommenen Zahlen zurück.',
  },
  turbotFish: {
    overviewTitle: 'Vier verbundene Kandidaten',
    overviewBody:
      'Folge den vier eingekreisten Kandidaten für {digit}. Wir prüfen das umrahmte Feld.',
    pairTitle: 'Zwei Plätze in {region}',
    pairBody:
      'In {region} kann die {digit} nur in {end} oder {inner} stehen. Eines der beiden Felder muss die {digit} enthalten.',
    assumeTitle: 'Eine Annahme ausprobieren',
    assumeBody:
      'Angenommen, {target} wäre {digit}. Zahlen mit ? gehören zu dieser Annahme und sind noch keine sicheren Ergebnisse.',
    excludeTitle: 'Diese zwei Kandidaten fallen weg',
    excludeBody:
      '{end} liegt mit {target} in {region} und kann deshalb nicht auch {digit} sein.',
    forceTitle: 'Nur noch ein Platz übrig',
    forceBody:
      '{end} kann nicht {digit} sein. In {region} bleibt nur {inner}. Unter dieser Annahme muss dort {digit} stehen.',
    conflictTitle: 'Die gleiche Zahl steht zweimal da',
    conflictBody:
      '{end} kann nicht {digit} sein, also muss in {region} die {digit} in {inner} stehen. Aber {firstInner} und {inner} liegen beide in {conflictRegion}. Dort stünde die {digit} zweimal!',
    conclusionTitle: 'Die Annahme kann nicht stimmen',
    conclusionBody:
      'Die Annahme erzeugt zwei gleiche Zahlen {digit} in {conflictRegion}. Entferne den Kandidaten {digit} aus {targets}. Alle angenommenen Zahlen werden zurückgenommen.',
  },
  twoStringKite: {
    overviewTitle: 'Zuerst den ganzen Kite ansehen',
    overviewBody:
      'Folge den markierten Kandidaten für {digit}. Die durchgezogenen Linien verbinden je ein Paar in einer Zeile und einer Spalte. Die beiden inneren Kandidaten liegen im selben Block. Das umrahmte Feld prüfen wir gleich.',
    rowTitle: 'Zwei Plätze in dieser Zeile',
    rowBody:
      'In Zeile {row} passt die {digit} nur in {rowEnd} oder {rowBase}. In einem der beiden Felder muss sie stehen. Andere Kandidaten sind hier nicht wichtig.',
    columnTitle: 'Auch hier nur zwei Plätze',
    columnBody:
      'In Spalte {column} passt die {digit} nur in {columnEnd} oder {columnBase}. Eines dieser Felder muss also die {digit} enthalten.',
    assumeTitle: 'Was wäre, wenn …?',
    assumeBody:
      'Nehmen wir an, in {target} steht eine {digit}. Zahlen mit ? gehören nur zu dieser Annahme. Sie sind noch keine sicheren Antworten.',
    excludeTitle: 'Was folgt aus der Annahme?',
    excludeBody:
      '{end} und {target} liegen beide in {region}. Deshalb kann in {end} nicht auch eine {digit} stehen.',
    forceTitle: 'In der Zeile bleibt ein Platz',
    forceBody:
      '{rowEnd} fällt für die {digit} weg. In Zeile {row} bleibt nur {rowBase}. Unter unserer Annahme muss dort also die {digit} stehen.',
    conflictTitle: 'Das führt zu einem Widerspruch',
    conflictBody:
      'Weil {columnEnd} wegfällt, muss die {digit} in Spalte {column} in {columnBase} stehen. Doch {rowBase} und {columnBase} liegen beide in Block {box}. Zwei gleiche Zahlen in einem Block sind nicht erlaubt.',
    conclusionTitle: 'Darum lässt sich die Zahl streichen',
    conclusionBody:
      'Die Zahl {digit} würde zweimal im selben Block stehen. Deshalb kann die Annahme nicht stimmen. Die {digit} lässt sich aus {targets} streichen.',
  },
  techniques: germanTechniques,
  candidateFallback: 'die markierten Kandidaten',
  candidateEntry: '{digit} in {cell}',
  candidateSeparator: ', ',
  digitFallback: 'die markierten Zahlen',
  cellFallback: 'die markierten Zellen',
  regionFallback: 'der markierte Bereich',
  regionRow: 'Zeile {index}',
  regionColumn: 'Spalte {index}',
  regionBox: 'Block {index}',
  regionSeparator: ', ',
  evidenceCandidates: 'Auf dieser Seite kommt {premises} hinzu.',
  evidenceValues: 'Der Beleg durch gesetzte Zahlen ist {evidence}.',
  evidenceCells: 'Betrachte {cells}.',
  progressRestrictedSet:
    '{evidence} Diese Kandidaten gehören zur beschränkten Zahlenmenge. Sie bleiben markiert, während die restlichen Belege hinzukommen.',
  progressFish:
    '{evidence} Diese Kandidaten zeigen eine beteiligte Zeilen-Spalten-Kreuzung. Sie bleibt markiert, während die restlichen Fish-Positionen hinzukommen.',
  progressWing:
    '{evidence} Diese Kandidaten zeigen einen Teil der Drehpunkt-Flügel-Struktur. Sie bleiben markiert, während die restlichen Flügel hinzukommen.',
  progressRectangle:
    '{evidence} Diese Kandidaten zeigen einen Teil des Rechtecks aus vier Zellen. Sie bleiben markiert, während die restlichen Ecken hinzukommen.',
  progressChain:
    '{evidence} Diese Kandidaten bilden den nächsten Kettenabschnitt. Er bleibt markiert, während die restlichen Kettenglieder hinzukommen.',
  progressGeneric:
    '{evidence} Dieser Teil bleibt markiert, während die restlichen Belege für {technique} hinzukommen.',
  constraintPointing:
    '{evidence} Im Ausgangsblock ist die Zahl {digits} auf {cells} entlang derselben Schnittlinie beschränkt.',
  constraintClaiming:
    '{evidence} In der Ausgangslinie ist die Zahl {digits} auf {cells} innerhalb des geschnittenen Blocks beschränkt.',
  constraintNakedSubset:
    '{evidence} Die markierten Zellen in {regions} können nur {digits} enthalten. Diese Zahlen sind daher für diese Zellen reserviert.',
  constraintHiddenSubset:
    '{evidence} In {regions} können {digits} nur in den markierten Zellen vorkommen. Diese Zellen sind daher für diese Zahlen reserviert.',
  constraintFish:
    '{evidence} Für die Zahl {digits} sind die markierten Kandidaten auf passende Zeilen-Spalten-Kreuzungen beschränkt. Damit steht das Muster {technique}.',
  constraintStrongPairs:
    '{evidence} Diese Kandidaten der Zahl {digits} bilden zwei starke Paare, die über den markierten Schnitt verbunden sind. Mindestens ein äußerer Endpunkt ist wahr.',
  constraintWWing:
    '{evidence} Die gleichen bivalue Zellen sind durch ein starkes Paar verbunden. Der gemeinsame äußere Kandidat kann daher nicht in beiden Flügeln falsch sein.',
  constraintWing:
    '{evidence} Unabhängig vom Wert des Drehpunkts enthält einer der markierten Flügel die gemeinsame äußere Zahl.',
  constraintColoring:
    '{evidence} Starke Verknüpfungen der Zahl {digits} wechseln die Wahrheitswerte über die markierten Farbkomponenten.',
  constraintRemotePair:
    '{evidence} Dieselben zwei Zahlen wechseln entlang der markierten bivalue Kette. Die Endpunkte müssen daher unterschiedliche Werte annehmen.',
  constraintEmptyRectangle:
    '{evidence} Die Blockkandidaten der Zahl {digits} sind auf ein Zeilen-Spalten-Kreuz beschränkt, das die beiden äußeren Kandidaten verbindet.',
  constraintUniqueRectangle:
    '{evidence} Im markierten Rechteck könnten die beiden Zahlen sonst vertauscht werden und eine zweite Lösung erzeugen.',
  constraintAvoidableRectangle:
    '{evidence} Zusammen mit den markierten Kandidaten würden diese Einträge ein vertauschbares Rechteck und damit eine zweite Lösung bilden.',
  constraintBugPlusOne:
    '{evidence} Jede andere ungelöste Zelle ist bivalue. Nur der zusätzliche markierte Kandidat stellt die nötigen Kandidatenanzahlen in Zeile, Spalte und Block wieder her.',
  constraintXChain:
    '{evidence} Kandidaten der Zahl {digits} wechseln zwischen starken und schwachen Verknüpfungen. Ist ein Endpunkt falsch, muss der andere wahr sein.',
  constraintXYChain:
    '{evidence} Jede bivalue Zelle gibt die Folgerung an die nächste weiter. Daher muss eine der gleichen Zahlen an den Endpunkten wahr sein.',
  constraintAic:
    '{evidence} Die abwechselnden schwachen und starken Verknüpfungen machen einen der markierten Endpunkte unvermeidbar.',
  constraintForcingChain:
    '{evidence} Dieser Zweig setzt erzwungene Kandidaten fort und erreicht dieselbe markierte Folgerung wie der andere Zweig.',
  constraintForcingNet:
    '{evidence} Dieser Netzzweig setzt erzwungene Kandidaten fort. Alle möglichen Zweige laufen in derselben markierten Folgerung zusammen.',
  constraintSingle:
    '{evidence} Die markierten Belege bestätigen das Ergebnis von {technique}.',
  singleCandidate: 'Für {cells} bleibt nur {candidates}.',
  valueBlocksFallback: 'Eine gesetzte Zahl schließt die markierten Zellen aus.',
  valueBlocks:
    '{digit} in {evidenceCell} schließt {digit} aus {focusCells} aus.',
  titleObserve: 'Wo du suchen solltest',
  titleConclusion: 'Schlussfolgerung',
  titleRuleOut: 'Eine Gruppe ausschließen',
  titleFollowLink: 'Der Verknüpfung folgen',
  titleReason: 'Was daraus folgt',
  titleApply: 'Einen Schritt anwenden',
  resultPlacement: '{placements} wird durch dieses Muster erzwungen.',
  resultElimination:
    '{eliminations} kann entfernt werden, weil es in diesem Muster nicht wahr sein kann.',
  applyPlacement:
    'Setze mit diesem Schritt {placements}. Die Aktion bleibt als ein Zug rückgängig machbar.',
  applyElimination:
    'Entferne mit diesem Schritt {eliminations}. Alle Entfernungen bleiben als ein Zug rückgängig machbar.',
  observeAccessibility: 'Betrachte {regions}. {premises}.',
};

const simplifiedChineseTechniques = {
  fullHouse: {
    name: '满宫唯一数',
    observe: '{regions}中只缺少一个数字。',
  },
  nakedSingle: {
    name: '唯一候选数',
    observe: '高亮单元格只剩一个候选数：{premises}。',
  },
  hiddenSingle: {
    name: '隐性唯一数',
    observe: '观察数字{targetDigit}在{regions}中还能填在哪里。',
  },
  'lockedCandidates.pointing': {
    name: '锁定候选数 · 宫指向',
    observe: '在一个宫内，{premises}被限制在同一行或同一列。',
  },
  'lockedCandidates.claiming': {
    name: '锁定候选数 · 行列占位',
    observe: '在一行或一列中，{premises}被限制在同一个宫内。',
  },
  lockedPair: {
    name: '锁定数对',
    observe: '{regions}中的两个单元格被限制为相同的两个数字。',
  },
  lockedTriple: {
    name: '锁定三数组',
    observe: '{regions}中的三个单元格被限制为相同的三个数字。',
  },
  nakedPair: {
    name: '显性数对',
    observe: '高亮的两个单元格占用{regions}中的两个数字。',
  },
  hiddenPair: {
    name: '隐性数对',
    observe: '在{regions}中，两个数字只会出现在高亮的两个单元格内。',
  },
  nakedTriple: {
    name: '显性三数组',
    observe: '高亮的三个单元格占用{regions}中的三个数字。',
  },
  hiddenTriple: {
    name: '隐性三数组',
    observe: '在{regions}中，三个数字只会出现在高亮的三个单元格内。',
  },
  nakedQuad: {
    name: '显性四数组',
    observe: '高亮的四个单元格占用{regions}中的四个数字。',
  },
  hiddenQuad: {
    name: '隐性四数组',
    observe: '在{regions}中，四个数字只会出现在高亮的四个单元格内。',
  },
  xWing: {
    name: 'X-Wing（X翼）',
    observe: '同一个数字在{regions}中形成一个矩形的四个角。',
  },
  swordfish: {
    name: 'Swordfish（剑鱼）',
    observe: '同一个数字被限制在相互对应的三行或三列中。',
  },
  skyscraper: {
    name: 'Skyscraper（摩天楼）',
    observe: '两个强链形成摩天楼结构，两个楼顶共同影响一个目标。',
  },
  twoStringKite: {
    name: 'Two-String Kite（双线风筝）',
    observe: '一个行强链和一个列强链通过同一个宫连接。',
  },
  turbotFish: {
    name: 'Turbot Fish（涡轮鱼）',
    observe: '两个强链通过一个弱链连接到共同目标。',
  },
  wWing: {
    name: 'W-Wing（W翼）',
    observe: '两个候选数相同的双值单元格由一个强链连接。',
  },
  xyWing: {
    name: 'XY-Wing（XY翼）',
    observe: '一个双值枢轴连接两个共享外侧数字的翼。',
  },
  xyzWing: {
    name: 'XYZ-Wing（XYZ翼）',
    observe: '一个三候选枢轴和两个翼共享同一个数字。',
  },
  simpleColoring: {
    name: '简单染色',
    observe: '强链把同一个数字分成两种交替颜色。',
  },
  multiColoring: {
    name: '多重染色',
    observe: '同一个数字的多条独立染色链相互作用。',
  },
  remotePair: {
    name: '远程数对',
    observe: '一串候选数相同的双值单元格在两个数字间交替。',
  },
  emptyRectangle: {
    name: '空矩形',
    observe: '一个宫内的候选数形成空矩形交点。',
  },
  hiddenRectangle: {
    name: '隐性矩形',
    observe: '强链消除了一个可能产生歧义的矩形。',
  },
  avoidableRectangle: {
    name: '可避免矩形',
    observe: '已填数字和候选数若保持当前结构，将形成两个解。',
  },
  uniqueRectangle: {
    name: '唯一矩形',
    observe: '四个单元格将形成一个会产生双解的致命矩形。',
  },
  bugPlusOne: {
    name: 'BUG + 1',
    observe: '除一个高亮单元格外，所有未解单元格都只有两个候选数。',
  },
  finnedXWing: {
    name: 'Finned X-Wing（鳍X翼）',
    observe: '一个X翼结构多出一个被限制在同一宫内的候选数。',
  },
  sashimiXWing: {
    name: 'Sashimi X-Wing（刺身X翼）',
    observe: '一个接近X翼的结构用鳍替代缺失的一角。',
  },
  jellyfish: {
    name: 'Jellyfish（水母）',
    observe: '同一个数字被限制在相互对应的四行或四列中。',
  },
  xChain: {
    name: 'X链',
    observe: '同一个数字的候选数通过强链和弱链交替连接。',
  },
  xyChain: {
    name: 'XY链',
    observe: '一串双值单元格连接两端相同的候选数字。',
  },
  aic: {
    name: '交替推理链',
    observe: '候选数的强链和弱链交替出现，迫使结论成立。',
  },
  groupedAic: {
    name: '分组交替推理链',
    observe: '成组候选数参与一条交替推理链。',
  },
  complexColoring: {
    name: '复杂染色',
    observe: '多个相连的染色分量共同迫使高亮结果成立。',
  },
  forcingChain: {
    name: '强制链',
    observe: '从一个候选数出发的每个分支都会得到相同结论。',
  },
  forcingNet: {
    name: '强制网',
    observe: '多个相连分支汇聚到同一个无法避免的结果。',
  },
} satisfies Readonly<Record<TechniqueCode, HintTechniqueTemplate>>;

const simplifiedChinese: HintPresentationCopy = {
  emptyRectangle: {
    overviewTitle: '先看宫内的候选分布',
    overviewBody:
      '{box}的候选{digit}全部落在{row}和{column}上。先看边框里圈出的候选。',
    emptyTitle: '识别空矩形',
    emptyBody:
      '在一个宫内，某个数字的候选只分布在一行和一列上。行列之外的四个格子不含这个候选，构成“空矩形”。图中用斜纹标出了这四个没有候选{digit}的格子。',
    drainTitle: '宫里这一侧的候选被排除',
    drainBody:
      '按这个假设，{near}是{digit}。{drained}与它同在{toBox}，所以不能再填{digit}。{box}这一侧的候选{digit}没有了。',
    conflictTitle: '这里与最初的假设冲突',
    singleConflictBody:
      '{box}仍然必须有一个{digit}，现在只剩{remaining}。它被迫是{digit}，却与最初假设的{target}同在{conflictRegion}——这里出现了两个{digit}！',
    groupConflictBody:
      '{box}仍然必须在{remaining}中放一个{digit}。但这些格子都与假设的{target}同在{conflictRegion}，全都不能填{digit}，这个宫就无处放{digit}了！',
    conclusionTitle: '最初的假设不成立',
    conclusionBody:
      '假设{targets}填{digit}会产生矛盾，所以划掉这个候选，其他假设全部撤回。',
  },
  turbotFish: {
    overviewTitle: '先看四个候选的连接',
    overviewBody:
      '先看四个圆圈里的候选{digit}。我们要检查：方框里的格子能不能填{digit}？',
    pairTitle: '{region}只有两个位置',
    pairBody:
      '{region}只能在{end}、{inner}中选一个位置填{digit}。其中一个必须是{digit}。',
    assumeTitle: '先试一个假设',
    assumeBody:
      '假设{target}填{digit}。带“?”的数字只用于推演，还不是确定答案。',
    excludeTitle: '这两个位置都不能再填',
    excludeBody: '{end}与{target}同在{region}，所以不能再填{digit}。',
    forceTitle: '这里被迫填入这个数',
    forceBody:
      '{end}不能填{digit}，{region}便只剩{inner}。按这个假设，这里必须填{digit}。',
    conflictTitle: '同一区域出现了两个相同的数',
    conflictBody:
      '{end}不能填{digit}，{region}便只剩{inner}。它与{firstInner}同在{conflictRegion}——这里出现了两个{digit}！',
    conclusionTitle: '最初的假设不成立',
    conclusionBody:
      '这个假设会让{conflictRegion}出现两个{digit}，所以不能成立。划掉{targets}的候选{digit}，其他假设全部撤回。',
  },
  twoStringKite: {
    overviewTitle: '先看整个风筝',
    overviewBody:
      '先看数字{digit}的几个关键位置。两条实线分别连接同一行、同一列的两个位置，中间两个候选数同在一个宫。方框标出的是接下来要检查的格子。',
    rowTitle: '这一行只有两个位置',
    rowBody:
      '第{row}行里，只有{rowEnd}和{rowBase}能填{digit}，所以其中一个必须是{digit}。格子里可能还有别的候选数，这里只看{digit}。',
    columnTitle: '这一列也只有两个位置',
    columnBody:
      '第{column}列里，只有{columnEnd}和{columnBase}能填{digit}，所以其中一个必须是{digit}。',
    assumeTitle: '先试一个假设',
    assumeBody:
      '假设{target}填{digit}，会发生什么？带“?”的数字只是推理中的假设，还不是确定的答案。',
    excludeTitle: '按这个假设，先排除候选',
    excludeBody: '{end}和{target}同在{region}，所以不能再填{digit}。',
    forceTitle: '这一行只剩一个位置',
    forceBody:
      '{rowEnd}不能填{digit}，第{row}行就只剩{rowBase}能填。因此，按这个假设，{rowBase}必须是{digit}。',
    conflictTitle: '同一个宫出现了两个相同的数',
    conflictBody:
      '{columnEnd}不能填{digit}，第{column}列就只剩{columnBase}能填。但{rowBase}和{columnBase}同在第{box}宫。一个宫里不能有两个{digit}，这里出现了冲突。',
    conclusionTitle: '所以，这个候选数可以删掉',
    conclusionBody:
      '假设填入{digit}，就会让同一个宫出现两个{digit}，所以这个假设不成立。可以从{targets}删去候选数{digit}。',
  },
  techniques: simplifiedChineseTechniques,
  candidateFallback: '高亮候选数',
  candidateEntry: '{cell}中的{digit}',
  candidateSeparator: '、',
  digitFallback: '高亮数字',
  cellFallback: '高亮单元格',
  regionFallback: '高亮区域',
  regionRow: '第{index}行',
  regionColumn: '第{index}列',
  regionBox: '第{index}宫',
  regionSeparator: '、',
  evidenceCandidates: '这一步加入{premises}。',
  evidenceValues: '作为排除依据的已填数字是{evidence}。',
  evidenceCells: '关注{cells}。',
  progressRestrictedSet:
    '{evidence} 这些候选数属于受限数字集合的一部分；继续保留高亮，再加入其余子集依据。',
  progressFish:
    '{evidence} 这些候选数确定了一个相关的行列交点；继续保留高亮，再加入其余鱼形位置。',
  progressWing:
    '{evidence} 这些候选数确定了枢轴与翼结构的一部分；继续保留高亮，再加入其余翼的依据。',
  progressRectangle:
    '{evidence} 这些候选数确定了四格矩形的一部分；继续保留高亮，再加入其余角。',
  progressChain:
    '{evidence} 这些候选数构成下一段链；继续保留高亮，再加入其余链条依据。',
  progressGeneric:
    '{evidence} 继续保留这一部分的高亮，再加入{technique}的其余依据。',
  constraintPointing:
    '{evidence} 在来源宫内，数字{digits}只能位于同一条交叉线上的{cells}。',
  constraintClaiming:
    '{evidence} 在来源行或列中，数字{digits}只能位于交叉宫内的{cells}。',
  constraintNakedSubset:
    '{evidence} {regions}中的高亮单元格只能包含数字{digits}，因此这些数字被这组单元格占用。',
  constraintHiddenSubset:
    '{evidence} 在{regions}中，数字{digits}只能出现在高亮单元格内，因此这组单元格被这些数字占用。',
  constraintFish:
    '{evidence} 对于数字{digits}，高亮候选数被限制在对应的行列交点上，因此{technique}结构成立。',
  constraintStrongPairs:
    '{evidence} 数字{digits}的这些候选数形成两组强链，并由高亮交点连接；两个外侧端点中至少一个必须成立。',
  constraintWWing:
    '{evidence} 两个相同的双值单元格通过一组强链相连，因此两个翼中的共同外侧候选数不能同时为假。',
  constraintWing:
    '{evidence} 无论枢轴取哪个值，其中一个高亮翼都必须包含它们共享的外侧数字。',
  constraintColoring:
    '{evidence} 数字{digits}的强链使真假状态在高亮染色分量之间交替。',
  constraintRemotePair:
    '{evidence} 相同的两个数字沿高亮双值链交替，因此链的两个端点必须取相反的值。',
  constraintEmptyRectangle:
    '{evidence} 宫内数字{digits}的候选数被限制在一个行列十字交点上，从而连接两个高亮的外部候选数。',
  constraintUniqueRectangle:
    '{evidence} 否则高亮矩形中的两个数字可以互换，从而产生第二个解。',
  constraintAvoidableRectangle:
    '{evidence} 这些已填数字与高亮候选数会组成一个可互换矩形，从而产生第二个解。',
  constraintBugPlusOne:
    '{evidence} 其他未解单元格都只有两个候选数；只有这个额外的高亮候选数能恢复行、列和宫所需的候选数计数。',
  constraintXChain:
    '{evidence} 数字{digits}的候选数沿强链和弱链交替；如果一个端点为假，另一个端点就必须为真。',
  constraintXYChain:
    '{evidence} 每个双值单元格把推论传递给下一个单元格，因此两个端点的同名候选数至少有一个为真。',
  constraintAic:
    '{evidence} 沿弱链和强链交替推导后，其中一个高亮端点必然成立。',
  constraintForcingChain:
    '{evidence} 这个分支传播所有被迫成立的候选数，并得到与另一个分支相同的高亮结论。',
  constraintForcingNet:
    '{evidence} 强制网的这个分支传播所有被迫成立的候选数；每个可能分支最终都汇聚到相同的高亮结论。',
  constraintSingle: '{evidence} 高亮依据确定了{technique}的结果。',
  singleCandidate: '{cells}只剩下{candidates}。',
  valueBlocksFallback: '一个已填数字排除了高亮单元格。',
  valueBlocks: '{evidenceCell}中的{digit}排除了{focusCells}中的候选数{digit}。',
  titleObserve: '观察位置',
  titleConclusion: '结论',
  titleRuleOut: '排除一组位置',
  titleFollowLink: '沿链推导',
  titleReason: '推理结果',
  titleApply: '应用一步',
  resultPlacement: '根据这个结构，{placements}必须成立。',
  resultElimination: '因为不可能在这个结构中成立，所以可以删除{eliminations}。',
  applyPlacement: '应用这一步，填入{placements}。本次操作可以一次撤销。',
  applyElimination:
    '应用这一步，删除{eliminations}。所有删除作为一次操作撤销。',
  observeAccessibility: '观察{regions}。{premises}。',
};

export const HINT_PRESENTATION_COPIES: Readonly<
  Record<ProductLocale, HintPresentationCopy>
> = {
  en: ENGLISH_HINT_PRESENTATION_COPY,
  ja: japanese,
  de: german,
  'zh-Hans': simplifiedChinese,
};
