import { hintLabExampleLabel } from '../src/debug/hint-lab-labels';
import { HintLabFixture } from '../src/debug/hint-lab';
import rawFixtures from '../src/debug/generated/hint-lab-fixtures.json';

// Test display vocabulary independently of generated-catalog acceptance.
jest.mock('../src/debug/hint-lab', () => ({ HINT_LAB_ALL_FIXTURES: [] }));

const source = rawFixtures.fixtures[0];
const fixture = { ...source, step: source.engineResult.step } as HintLabFixture;

test.each([
  [
    'en',
    [
      'Single fin',
      'Multiple fins',
      'Color components 4',
      'Candidates per group 2',
      'Candidates per group 3',
    ],
  ],
  [
    'ja',
    [
      '単一のフィン',
      '複数のフィン',
      '彩色成分 4',
      'グループ内の候補数 2',
      'グループ内の候補数 3',
    ],
  ],
  [
    'de',
    [
      'Eine Flosse',
      'Mehrere Flossen',
      'Farbkomponenten 4',
      'Kandidaten pro Gruppe 2',
      'Kandidaten pro Gruppe 3',
    ],
  ],
  ['zh-Hans', ['单鳍', '多鳍', '染色分量 4', '组内候选数 2', '组内候选数 3']],
] as const)(
  '%s translates fin, component and group variants',
  (locale, expected) => {
    const layouts = [
      'single-fin',
      'multiple-fins',
      'components-4',
      'group-size-2',
      'group-size-3',
    ];
    const label = hintLabExampleLabel(
      {
        ...fixture,
        coverage: {
          mode: 'direct',
          layouts,
          result: 'placement',
          targetCount: 1,
        },
      },
      locale,
    );
    for (const fragment of expected) expect(label).toContain(fragment);
    for (const tag of layouts) expect(label).not.toContain(tag);
  },
);

test.each([
  [
    'en',
    [
      'One candidate group',
      'Multiple candidate groups',
      'Group at an endpoint',
      'Group within the chain',
    ],
  ],
  [
    'ja',
    [
      '単一の候補グループ',
      '複数の候補グループ',
      '端点のグループ',
      'チェーン内部のグループ',
    ],
  ],
  [
    'de',
    [
      'Eine Kandidatengruppe',
      'Mehrere Kandidatengruppen',
      'Gruppe am Endpunkt',
      'Gruppe innerhalb der Kette',
    ],
  ],
  ['zh-Hans', ['单候选组', '多候选组', '端点分组', '链内分组']],
] as const)(
  '%s translates candidate group count and location',
  (locale, expected) => {
    const layouts = [
      'single-group',
      'multiple-groups',
      'endpoint-group',
      'internal-group',
    ];
    const label = hintLabExampleLabel(
      {
        ...fixture,
        coverage: {
          mode: 'direct',
          layouts,
          result: 'placement',
          targetCount: 1,
        },
      },
      locale,
    );
    for (const fragment of expected) expect(label).toContain(fragment);
    for (const tag of layouts) expect(label).not.toContain(tag);
  },
);

test.each([
  [
    'en',
    [
      'Row strong link',
      'Column strong link',
      'Box strong link',
      'Box and line wings',
      'Row and column wings',
      'Row connection',
      'Column connection',
      'Linear path',
      'Branching path',
      'Closed loop',
      'Top-left target',
      'Top-right target',
      'Bottom-left target',
      'Bottom-right target',
      'Upper roof',
      'Lower roof',
      'Sparse fish',
      'Mixed fish density',
      'Base candidate counts 2-2-3',
    ],
  ],
  [
    'ja',
    [
      '行の強いリンク',
      '列の強いリンク',
      'ブロックの強いリンク',
      'ブロックとラインの翼',
      '行と列の翼',
      '行の接続',
      '列の接続',
      '一本道',
      '分岐する経路',
      '閉じたループ',
      '左上の対象',
      '右上の対象',
      '左下の対象',
      '右下の対象',
      '上側のルーフ',
      '下側のルーフ',
      '疎なフィッシュ',
      '候補数が混在するフィッシュ',
      'ベース領域の候補数 2-2-3',
    ],
  ],
  [
    'de',
    [
      'Starke Zeilenverbindung',
      'Starke Spaltenverbindung',
      'Starke Blockverbindung',
      'Flügel in Block und Linie',
      'Flügel in Zeile und Spalte',
      'Zeilenverbindung',
      'Spaltenverbindung',
      'Linearer Pfad',
      'Verzweigter Pfad',
      'Geschlossene Schleife',
      'Ziel oben links',
      'Ziel oben rechts',
      'Ziel unten links',
      'Ziel unten rechts',
      'Obere Dachseite',
      'Untere Dachseite',
      'Dünn besetzter Fisch',
      'Gemischte Fischdichte',
      'Kandidaten je Basisbereich 2-2-3',
    ],
  ],
  [
    'zh-Hans',
    [
      '行强连接',
      '列强连接',
      '宫强连接',
      '宫线双翼',
      '行列双翼',
      '行连接',
      '列连接',
      '线性路径',
      '分叉路径',
      '闭环',
      '左上目标角',
      '右上目标角',
      '左下目标角',
      '右下目标角',
      '上侧顶格',
      '下侧顶格',
      '稀疏鱼形',
      '混合密度鱼形',
      '基础区域候选数量 2-2-3',
    ],
  ],
] as const)('%s translates geometric variants', (locale, expected) => {
  const layouts = [
    'strong-row',
    'strong-column',
    'strong-box',
    'box-line',
    'row-column',
    'row-link',
    'column-link',
    'linear',
    'branched',
    'cycle',
    'corner-top-left',
    'corner-top-right',
    'corner-bottom-left',
    'corner-bottom-right',
    'roof-top',
    'roof-bottom',
    'sparse',
    'mixed-density',
    'base-counts-2-2-3',
  ];
  const label = hintLabExampleLabel(
    {
      ...fixture,
      coverage: {
        mode: 'direct',
        layouts,
        result: 'placement',
        targetCount: 1,
      },
    },
    locale,
  );
  for (const fragment of expected) expect(label).toContain(fragment);
  for (const tag of layouts) expect(label).not.toContain(tag);
});

test.each([
  ['en', 'Two candidates per base'],
  ['ja', '各ベースに候補が二つ'],
  ['de', 'Zwei Kandidaten je Basis'],
  ['zh-Hans', '每个基础区域两个候选'],
])('%s distinguishes minimum fish density', (locale, expected) => {
  expect(
    hintLabExampleLabel(
      {
        ...fixture,
        coverage: {
          mode: 'direct',
          layouts: ['minimum-density'],
          result: 'placement',
          targetCount: 1,
        },
      },
      locale,
    ),
  ).toContain(expected);
});
