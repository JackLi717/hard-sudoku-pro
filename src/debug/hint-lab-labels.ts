import { HintLabFixture, HINT_LAB_ALL_FIXTURES } from './hint-lab';

type Label = readonly [string, string, string, string];
const MODE_LABELS: Record<string, Label> = {
  direct: ['Direct pattern', '直接パターン', 'Direktes Muster', '直接结构'],
  color_trap: [
    'Sees both colors',
    '両色が見える',
    'Beide Farben sichtbar',
    '见两色排除',
  ],
  color_conflict: [
    'Same-color conflict',
    '同色の矛盾',
    'Gleichfarbiger Widerspruch',
    '同色冲突',
  ],
  multi_color: [
    'Two color components',
    '二つの彩色成分',
    'Zwei Farbkomponenten',
    '双染色分量',
  ],
  complex_color: [
    'Multiple color components',
    '複数の彩色成分',
    'Mehrere Farbkomponenten',
    '多染色分量',
  ],
  remote_pair: [
    'Alternating pairs',
    '交互のペア',
    'Abwechselnde Paare',
    '交替数对',
  ],
  avoidable: [
    'Avoidable rectangle',
    '回避可能な矩形',
    'Vermeidbares Rechteck',
    '可避免矩形',
  ],
  endpoints: [
    'Linked endpoints',
    '連結した端点',
    'Verbundene Endpunkte',
    '端点连接',
  ],
  contradiction: ['Contradiction', '矛盾', 'Widerspruch', '矛盾推理'],
  common: [
    'Branch agreement',
    '分岐の共通結論',
    'Gemeinsames Zweigergebnis',
    '分支共同结论',
  ],
};
const LAYOUT_LABELS: Record<string, Label> = {
  'strong-row': [
    'Row strong link',
    '行の強いリンク',
    'Starke Zeilenverbindung',
    '行强连接',
  ],
  'strong-column': [
    'Column strong link',
    '列の強いリンク',
    'Starke Spaltenverbindung',
    '列强连接',
  ],
  'strong-box': [
    'Box strong link',
    'ブロックの強いリンク',
    'Starke Blockverbindung',
    '宫强连接',
  ],
  'box-line': [
    'Box and line wings',
    'ブロックとラインの翼',
    'Flügel in Block und Linie',
    '宫线双翼',
  ],
  'row-column': [
    'Row and column wings',
    '行と列の翼',
    'Flügel in Zeile und Spalte',
    '行列双翼',
  ],
  'row-link': ['Row connection', '行の接続', 'Zeilenverbindung', '行连接'],
  'column-link': [
    'Column connection',
    '列の接続',
    'Spaltenverbindung',
    '列连接',
  ],
  linear: ['Linear path', '一本道', 'Linearer Pfad', '线性路径'],
  branched: ['Branching path', '分岐する経路', 'Verzweigter Pfad', '分叉路径'],
  cycle: ['Closed loop', '閉じたループ', 'Geschlossene Schleife', '闭环'],
  'corner-top-left': [
    'Top-left target',
    '左上の対象',
    'Ziel oben links',
    '左上目标角',
  ],
  'corner-top-right': [
    'Top-right target',
    '右上の対象',
    'Ziel oben rechts',
    '右上目标角',
  ],
  'corner-bottom-left': [
    'Bottom-left target',
    '左下の対象',
    'Ziel unten links',
    '左下目标角',
  ],
  'corner-bottom-right': [
    'Bottom-right target',
    '右下の対象',
    'Ziel unten rechts',
    '右下目标角',
  ],
  'roof-top': ['Upper roof', '上側のルーフ', 'Obere Dachseite', '上侧顶格'],
  'roof-bottom': ['Lower roof', '下側のルーフ', 'Untere Dachseite', '下侧顶格'],
  'minimum-density': [
    'Two candidates per base',
    '各ベースに候補が二つ',
    'Zwei Kandidaten je Basis',
    '每个基础区域两个候选',
  ],
  sparse: ['Sparse fish', '疎なフィッシュ', 'Dünn besetzter Fisch', '稀疏鱼形'],
  'mixed-density': [
    'Mixed fish density',
    '候補数が混在するフィッシュ',
    'Gemischte Fischdichte',
    '混合密度鱼形',
  ],
  'single-group': [
    'One candidate group',
    '単一の候補グループ',
    'Eine Kandidatengruppe',
    '单候选组',
  ],
  'multiple-groups': [
    'Multiple candidate groups',
    '複数の候補グループ',
    'Mehrere Kandidatengruppen',
    '多候选组',
  ],
  'endpoint-group': [
    'Group at an endpoint',
    '端点のグループ',
    'Gruppe am Endpunkt',
    '端点分组',
  ],
  'internal-group': [
    'Group within the chain',
    'チェーン内部のグループ',
    'Gruppe innerhalb der Kette',
    '链内分组',
  ],
  'single-fin': ['Single fin', '単一のフィン', 'Eine Flosse', '单鳍'],
  'multiple-fins': ['Multiple fins', '複数のフィン', 'Mehrere Flossen', '多鳍'],
  row: ['Row', '行', 'Zeile', '行'],
  column: ['Column', '列', 'Spalte', '列'],
  box: ['Box', 'ブロック', 'Block', '宫'],
  short: ['Short chain', '短いチェーン', 'Kurze Kette', '短链'],
  medium: ['Medium chain', '中程度のチェーン', 'Mittlere Kette', '中等链长'],
  long: ['Long chain', '長いチェーン', 'Lange Kette', '长链'],
  grouped: [
    'Grouped candidates',
    '候補グループ',
    'Kandidatengruppen',
    '分组候选',
  ],
  'multiple-premises': [
    'Multiple premises',
    '複数の前提',
    'Mehrere Voraussetzungen',
    '多前提',
  ],
};

export function hintLabExampleLabel(
  fixture: HintLabFixture,
  locale = 'en',
): string {
  const language = { en: 0, ja: 1, de: 2, 'zh-Hans': 3 }[locale] ?? 0;
  const examples = HINT_LAB_ALL_FIXTURES.filter(
    item => item.techniqueCode === fixture.techniqueCode,
  );
  const number = examples.findIndex(item => item.id === fixture.id) + 1;
  const mode =
    fixture.coverage?.mode || fixture.step.teaching?.mode || 'direct';
  const modeLabel =
    MODE_LABELS[mode]?.[language] ??
    ['Reasoning pattern', '推論パターン', 'Schlussmuster', '推理模式'][
      language
    ];
  const layouts = fixture.coverage?.layouts ?? [
    ...new Set(fixture.step.focusRegions.map(region => region.kind)),
  ];
  const layoutLabel = layouts
    .map(layout => {
      if (layout.startsWith('base-counts-')) {
        return `${
          [
            'Base candidate counts',
            'ベース領域の候補数',
            'Kandidaten je Basisbereich',
            '基础区域候选数量',
          ][language]
        } ${layout.slice(12)}`;
      }
      if (layout.startsWith('candidates-')) {
        return `${
          ['Candidate counts', '候補数', 'Kandidatenanzahl', '候选数量'][
            language
          ]
        } ${layout.slice(11)}`;
      }
      if (layout.startsWith('branches-')) {
        return `${
          ['Branches', '分岐', 'Zweige', '分支'][language]
        } ${layout.slice(9)}`;
      }
      if (layout.startsWith('components-')) {
        return `${
          ['Color components', '彩色成分', 'Farbkomponenten', '染色分量'][
            language
          ]
        } ${layout.slice(11)}`;
      }
      if (layout.startsWith('group-size-')) {
        return `${
          [
            'Candidates per group',
            'グループ内の候補数',
            'Kandidaten pro Gruppe',
            '组内候选数',
          ][language]
        } ${layout.slice(11)}`;
      }
      return LAYOUT_LABELS[layout]?.[language];
    })
    .filter(Boolean)
    .join('/');
  const resultLabel =
    fixture.step.placements.length > 0
      ? ['Placement', '配置', 'Eintragen', '填数'][language]
      : ['Elimination', '除外', 'Ausschluss', '删候选'][language];
  return `${
    ['Example', '例', 'Beispiel', '例'][language]
  } ${number} · ${modeLabel}${
    layoutLabel ? ` · ${layoutLabel}` : ''
  } · ${resultLabel}`;
}
