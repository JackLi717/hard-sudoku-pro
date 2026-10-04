export const TERM_COURSES = [
  'candidates',
  'subsets',
  'bivalue',
  'links',
  'fish',
  'chains',
  'coloring',
  'uniqueness',
  'groups',
  'forcing',
] as const;

export type TermCourse = (typeof TERM_COURSES)[number];

export const PREMIUM_TERM_COURSES: ReadonlySet<TermCourse> = new Set([
  'uniqueness',
  'groups',
  'forcing',
]);

export type TermAnswer =
  | 'yes'
  | 'no'
  | 'naked'
  | 'hidden'
  | 'neither'
  | 'locked'
  | 'notLocked'
  | 'bivalue'
  | 'bilocation'
  | 'strong'
  | 'weak'
  | 'none'
  | 'basicFish'
  | 'finnedFish'
  | 'notFish'
  | 'valid'
  | 'invalid'
  | 'eliminate'
  | 'keep'
  | 'deadly'
  | 'notEnough'
  | 'atLeastOne'
  | 'notProven'
  | 'forced'
  | 'notForced';

export type TermMark = Readonly<{
  row: number;
  column: number;
  label: string;
}>;

export type TermQuestion = Readonly<{
  id: string;
  template: string;
  params: Readonly<Record<string, string | number>>;
  choices: readonly TermAnswer[];
  answer: TermAnswer;
  marks: readonly TermMark[];
}>;

const mark = (row: number, column: number, label: string): TermMark => ({
  row,
  column,
  label,
});

function arePeers(r1: number, c1: number, r2: number, c2: number): boolean {
  return (
    r1 === r2 ||
    c1 === c2 ||
    (Math.floor((r1 - 1) / 3) === Math.floor((r2 - 1) / 3) &&
      Math.floor((c1 - 1) / 3) === Math.floor((c2 - 1) / 3))
  );
}

function question(
  course: TermCourse,
  index: number,
  template: string,
  params: Record<string, string | number>,
  choices: readonly TermAnswer[],
  answer: TermAnswer,
  marks: readonly TermMark[],
): TermQuestion {
  return {
    id: `${course}-${index + 1}`,
    template,
    params,
    choices,
    answer,
    marks,
  };
}

const candidatePairs = [
  [1, 1, 1, 7],
  [2, 3, 8, 3],
  [1, 2, 3, 3],
  [1, 1, 5, 5],
  [4, 4, 8, 8],
  [9, 8, 9, 2],
  [2, 8, 7, 7],
  [1, 6, 8, 6],
  [5, 2, 7, 4],
  [6, 7, 4, 4],
] as const;

const peerQuestions = candidatePairs.map(([r1, c1, r2, c2], index) =>
  question(
    'candidates',
    index,
    'peer',
    { r1, c1, r2, c2 },
    ['yes', 'no'],
    arePeers(r1, c1, r2, c2) ? 'yes' : 'no',
    [mark(r1, c1, '7'), mark(r2, c2, '7')],
  ),
);

const eliminationPairs = [
  [1, 1, 1, 7],
  [2, 2, 5, 5],
  [5, 3, 7, 6],
  [8, 8, 9, 9],
] as const;
const candidates = [
  ...peerQuestions,
  ...eliminationPairs.map(([r1, c1, r2, c2], index) =>
    question(
      'candidates',
      index + peerQuestions.length,
      'elimination',
      { r1, c1, r2, c2, digit: index + 2 },
      ['eliminate', 'keep'],
      arePeers(r1, c1, r2, c2) ? 'eliminate' : 'keep',
      [mark(r1, c1, `${index + 2}!`), mark(r2, c2, `${index + 2}?`)],
    ),
  ),
];

const subsetModes = [
  'naked',
  'hidden',
  'neither',
  'naked',
  'hidden',
  'neither',
  'hidden',
  'naked',
  'neither',
  'naked',
] as const;
const subsetQuestions = subsetModes.map((mode, index) => {
  const a = (index % 8) + 1;
  const b = a + 1;
  const row = (index % 9) + 1;
  const extraA = [9, 8, 7, 6].find(digit => digit !== a && digit !== b)!;
  const extraB = [8, 9, 6, 7].find(
    digit => digit !== a && digit !== b && digit !== extraA,
  )!;
  const cells =
    mode === 'naked'
      ? [mark(row, 2, `${a}·${b}`), mark(row, 7, `${a}·${b}`)]
      : mode === 'hidden'
      ? [
          mark(row, 2, `${a}·${b}·${extraA}`),
          mark(row, 7, `${a}·${b}·${extraB}`),
        ]
      : [
          mark(row, 2, `${a}·${b}·${extraA}`),
          mark(row, 7, `${a}·${b}·${extraB}`),
          mark(row, 5, `${a}`),
        ];
  return question(
    'subsets',
    index,
    mode,
    { row, a, b },
    ['naked', 'hidden', 'neither'],
    mode,
    cells,
  );
});
const lockedQuestions = Array.from({ length: 4 }, (_, index) => {
  const row = index % 2 === 0 ? 2 : 5;
  const column = [1, 4, 7, 1][index];
  const targetColumn = column === 1 ? 5 : 2;
  const digit = index + 4;
  const locked = index % 2 === 0;
  return question(
    'subsets',
    index + subsetQuestions.length,
    locked ? 'locked' : 'notLocked',
    { row, column, targetColumn, digit },
    ['locked', 'notLocked'],
    locked ? 'locked' : 'notLocked',
    [
      mark(row, column, `${digit}`),
      mark(row, column + 1, `${digit}`),
      ...(!locked ? [mark(row + 1, column + 2, `${digit}`)] : []),
      mark(row, targetColumn, `${digit}?`),
    ],
  );
});
const subsets = [...subsetQuestions, ...lockedQuestions];

const bivalueModes = [
  'bivalue',
  'bilocation',
  'neither',
  'bilocation',
  'bivalue',
  'neither',
  'bivalue',
  'bilocation',
  'neither',
  'bilocation',
] as const;
const bivalue = bivalueModes.map((mode, index) => {
  const digit = (index % 8) + 1;
  const row = (index % 9) + 1;
  const cells =
    mode === 'bivalue'
      ? [mark(row, 3, `${digit}·${digit + 1}`)]
      : mode === 'bilocation'
      ? [mark(row, 2, `${digit}`), mark(row, 7, `${digit}`)]
      : [
          mark(row, 2, `${digit}`),
          mark(row, 5, `${digit}`),
          mark(row, 7, `${digit}`),
        ];
  return question(
    'bivalue',
    index,
    mode,
    { row, digit, next: digit + 1 },
    ['bivalue', 'bilocation', 'neither'],
    mode,
    cells,
  );
});

const linkModes = Array.from(
  { length: 20 },
  (_, index) =>
    (['houseTwo', 'houseThree', 'cellTwo', 'cellThree', 'unrelated'] as const)[
      index % 5
    ],
);
const links = linkModes.map((mode, index) => {
  const digit = (index % 8) + 1;
  const row = (index % 9) + 1;
  const extra = digit === 8 ? 1 : 9;
  const cells =
    mode === 'cellTwo'
      ? [mark(row, 4, `${digit}·${digit + 1}`)]
      : mode === 'cellThree'
      ? [mark(row, 4, `${digit}·${digit + 1}·${extra}`)]
      : mode === 'unrelated'
      ? [
          mark(row, 2, `${digit}`),
          mark(row === 9 ? 7 : row + 1, 7, `${digit + 1}`),
        ]
      : [
          mark(row, 2, `${digit}`),
          mark(row, 7, `${digit}`),
          ...(mode === 'houseThree' ? [mark(row, 5, `${digit}`)] : []),
        ];
  const answer =
    mode === 'houseTwo' || mode === 'cellTwo'
      ? 'strong'
      : mode === 'unrelated'
      ? 'none'
      : 'weak';
  return question(
    'links',
    index,
    mode,
    { row, digit, next: digit + 1, extra },
    ['strong', 'weak', 'none'],
    answer,
    cells,
  );
});

const fishModes = [
  'basicFish',
  'finnedFish',
  'notFish',
  'basicFish',
  'finnedFish',
  'notFish',
  'basicFish',
  'finnedFish',
  'notFish',
  'basicFish',
] as const;
const fish = fishModes.map((mode, index) => {
  const digit = (index % 9) + 1;
  const size = index % 3 === 0 ? 3 : 2;
  const baseRows = size === 2 ? [2, 6] : [2, 5, 8];
  const coverCols = size === 2 ? [2, 7] : [2, 5, 8];
  const cells = baseRows.flatMap((row, r) =>
    coverCols
      .filter((_, c) => size === 2 || (r + c) % 3 !== 2)
      .map(column => mark(row, column, `${digit}`)),
  );
  if (mode === 'finnedFish') cells.push(mark(baseRows[0], 3, `${digit}`));
  if (mode === 'notFish') cells.push(mark(baseRows[0], 9, `${digit}`));
  return question(
    'fish',
    index,
    mode,
    { digit, size, rows: baseRows.join('、'), columns: coverCols.join('、') },
    ['basicFish', 'finnedFish', 'notFish'],
    mode,
    cells,
  );
});

const chainModes = [
  'valid',
  'invalid',
  'valid',
  'invalid',
  'valid',
  'invalid',
  'valid',
  'invalid',
  'valid',
  'invalid',
] as const;
const chains = chainModes.map((mode, index) => {
  const sequence =
    mode === 'valid'
      ? 'S → W → S'
      : index % 4 === 1
      ? 'S → S → W'
      : 'W → S → W';
  return question(
    'chains',
    index,
    'sequence',
    { sequence },
    ['valid', 'invalid'],
    mode,
    [mark(2, 2, 'A'), mark(2, 7, 'B'), mark(7, 7, 'C'), mark(7, 2, 'D')],
  );
});

const coloringModes = [
  'trap',
  'conflict',
  'separate',
  'trap',
  'conflict',
  'none',
  'trap',
  'conflict',
  'none',
  'separate',
] as const;
const coloring = coloringModes.map((mode, index) =>
  question(
    'coloring',
    index,
    mode,
    { digit: (index % 9) + 1 },
    ['eliminate', 'keep'],
    mode === 'none' || mode === 'separate' ? 'keep' : 'eliminate',
    [mark(2, 2, 'A'), mark(2, 7, 'B'), mark(6, 4, 'A'), mark(7, 7, 'B')],
  ),
);

const uniquenessModes = [
  'deadly',
  'notEnough',
  'deadly',
  'notEnough',
  'deadly',
  'notEnough',
  'deadly',
  'notEnough',
  'deadly',
  'notEnough',
] as const;
const uniqueness = uniquenessModes.map((mode, index) => {
  const a = (index % 7) + 1;
  const b = a + 1;
  const secondRow = mode === 'deadly' ? 2 : 4;
  return question(
    'uniqueness',
    index,
    mode,
    { a, b },
    ['deadly', 'notEnough'],
    mode,
    [
      mark(1, 2, `${a}·${b}`),
      mark(1, 7, `${a}·${b}`),
      mark(secondRow, 2, `${a}·${b}`),
      mark(secondRow, 7, `${a}·${b}`),
    ],
  );
});

const groupModes = [
  'atLeastOne',
  'notProven',
  'atLeastOne',
  'notProven',
  'atLeastOne',
  'notProven',
  'atLeastOne',
  'notProven',
  'atLeastOne',
  'notProven',
] as const;
const groups = groupModes.map((mode, index) => {
  const digit = (index % 9) + 1;
  return question(
    'groups',
    index,
    mode,
    { digit },
    ['atLeastOne', 'notProven'],
    mode,
    [
      mark(3, 1, `${digit}`),
      mark(3, 2, `${digit}`),
      mark(3, 6, `${digit}`),
      ...(mode === 'notProven' ? [mark(3, 8, `${digit}`)] : []),
    ],
  );
});

const forcingModes = [
  'common',
  'different',
  'contradiction',
  'common',
  'different',
  'contradiction',
  'common',
  'different',
  'common',
  'contradiction',
] as const;
const forcing = forcingModes.map((mode, index) => {
  const digit = (index % 9) + 1;
  return question(
    'forcing',
    index,
    mode,
    { digit },
    ['forced', 'notForced'],
    mode === 'different' ? 'notForced' : 'forced',
    [mark(2, 2, 'A'), mark(2, 7, 'B'), mark(7, 4, `${digit}`)],
  );
});

export const TERM_QUESTIONS: Readonly<
  Record<TermCourse, readonly TermQuestion[]>
> = {
  candidates,
  subsets,
  bivalue,
  links,
  fish,
  chains,
  coloring,
  uniqueness,
  groups,
  forcing,
};
