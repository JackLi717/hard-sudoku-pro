import type { HintRegionMark } from '../../domain/hints/presentation';
import type {
  CandidateRef,
  Digit,
  RegionRef,
} from '../../domain/sudoku/contracts';
import type { TermConcept, TermScene } from './term-concepts';

export type SetSize = 2 | 3 | 4;
export type SetUnit = 'row' | 'column' | 'box';
export type LockedPattern =
  | 'pointing-row'
  | 'pointing-column'
  | 'claiming-row'
  | 'claiming-column';

const ref = (row: number, column: number, digit: number): CandidateRef => ({
  cell: row * 9 + column,
  digit: digit as Digit,
});

function mappedCell(cell: number, symmetry: number): number {
  const row = Math.floor(cell / 9);
  const column = cell % 9;
  const transformed: readonly [number, number][] = [
    [row, column],
    [column, row],
    [8 - row, 8 - column],
    [8 - column, 8 - row],
    [row, 8 - column],
    [8 - row, column],
    [column, 8 - row],
    [8 - column, row],
  ];
  const [nextRow, nextColumn] = transformed[symmetry % transformed.length];
  return nextRow * 9 + nextColumn;
}

function mappedRegion(region: RegionRef, symmetry: number): RegionRef {
  if (region.kind === 'box') {
    const center =
      (Math.floor(region.index / 3) * 3 + 1) * 9 + (region.index % 3) * 3 + 1;
    const mapped = mappedCell(center, symmetry);
    return {
      kind: 'box',
      index: Math.floor(mapped / 27) * 3 + Math.floor((mapped % 9) / 3),
    };
  }
  const first = mappedCell(
    region.kind === 'row' ? region.index * 9 : region.index,
    symmetry,
  );
  const last = mappedCell(
    region.kind === 'row' ? region.index * 9 + 8 : 72 + region.index,
    symmetry,
  );
  return Math.floor(first / 9) === Math.floor(last / 9)
    ? { kind: 'row', index: Math.floor(first / 9) }
    : { kind: 'column', index: first % 9 };
}

/** Sudoku symmetries preserve rows, columns, boxes, and every marked relation. */
export function transformTermScene(
  scene: TermScene,
  symmetry: number,
): TermScene {
  const candidate = (item: CandidateRef): CandidateRef => ({
    ...item,
    cell: mappedCell(item.cell, symmetry),
  });
  return {
    ...scene,
    values: scene.values.map(candidate),
    candidates: scene.candidates.map(candidate),
    focus: scene.focus.map(candidate),
    referenceCell:
      scene.referenceCell === undefined
        ? undefined
        : mappedCell(scene.referenceCell, symmetry),
    relatedCells: scene.relatedCells?.map(cell => mappedCell(cell, symmetry)),
    regions: scene.regions?.map(mark => ({
      ...mark,
      region: mappedRegion(mark.region, symmetry),
    })),
    fins: scene.fins?.map(candidate),
    links: scene.links?.map(link => ({
      ...link,
      from: mappedCell(link.from, symmetry),
      to: mappedCell(link.to, symmetry),
    })),
    colors: scene.colors?.map(item => ({
      ...item,
      cell: mappedCell(item.cell, symmetry),
    })),
    group: scene.group?.map(candidate),
    target: scene.target ? candidate(scene.target) : undefined,
  };
}

function setCells(size: SetSize, unit: SetUnit): number[] {
  const rowColumns =
    size === 2 ? [0, 4] : size === 3 ? [0, 3, 6] : [0, 2, 4, 6];
  const boxCells =
    size === 2 ? [0, 10] : size === 3 ? [0, 10, 20] : [0, 1, 10, 20];
  if (unit === 'box') return boxCells;
  const rowCells = rowColumns.map(column => 9 + column);
  return unit === 'column'
    ? rowCells.map(cell => mappedCell(cell, 1))
    : rowCells;
}

function setRegion(unit: SetUnit): HintRegionMark {
  return {
    region: {
      kind: unit,
      index: unit === 'box' ? 0 : 1,
    },
    role: 'source',
  };
}

function outsideSetCell(selected: readonly number[], unit: SetUnit): number {
  const possibilities =
    unit === 'box'
      ? [2, 9, 18, 19, 11, 1, 20]
      : unit === 'row'
      ? [17, 16, 15, 14, 13, 12]
      : [73, 64, 55, 46, 37, 28];
  return possibilities.find(cell => !selected.includes(cell))!;
}

/** The selected N cells use N digits (naked) or hold every place for N digits (hidden). */
export function setConceptScene(
  concept: 'nakedSet' | 'hiddenSet',
  size: SetSize,
  unit: SetUnit,
  valid: boolean,
): TermScene {
  const cells = setCells(size, unit);
  const digits = Array.from({ length: size }, (_, index) => index + 2);
  const pairAt = (index: number) => [
    ref(Math.floor(cells[index] / 9), cells[index] % 9, digits[index]),
    ref(
      Math.floor(cells[index] / 9),
      cells[index] % 9,
      digits[(index + 1) % size],
    ),
  ];
  const focus = cells.flatMap((_, index) => pairAt(index));
  const outside = outsideSetCell(cells, unit);
  const candidates =
    concept === 'nakedSet'
      ? valid
        ? focus
        : [...focus, { cell: cells[size - 1], digit: 8 as Digit }]
      : [
          ...focus,
          ...cells.map(cell => ({ cell, digit: 8 as Digit })),
          { cell: outside, digit: (valid ? 9 : digits[0]) as Digit },
        ];
  return {
    values: [],
    candidates,
    focus,
    regions: [setRegion(unit)],
  };
}

export function setQuestionScene(
  concept: 'nakedSet' | 'hiddenSet',
  index: number,
  valid: boolean,
): TermScene {
  const scenario = Math.floor(index / 2);
  const size = (2 + Math.floor(scenario / 3)) as SetSize;
  const unit = (['row', 'column', 'box'] as const)[scenario % 3];
  return transformTermScene(
    setConceptScene(concept, size, unit, valid),
    ([0, 2, 4, 5] as const)[(scenario + (valid ? 0 : 1)) % 4],
  );
}

export function relationConceptScene(
  concept: 'peer' | 'elimination',
  unit: SetUnit,
  valid: boolean,
): TermScene {
  const first = ref(1, 1, 2);
  const second =
    unit === 'row'
      ? ref(valid ? 1 : 5, 5, 2)
      : unit === 'column'
      ? ref(5, valid ? 1 : 5, 2)
      : ref(valid ? 2 : 5, valid ? 2 : 5, 2);
  const region: RegionRef =
    unit === 'row'
      ? { kind: 'row', index: 1 }
      : unit === 'column'
      ? { kind: 'column', index: 1 }
      : { kind: 'box', index: 0 };
  if (concept === 'peer')
    return {
      values: [],
      candidates: [],
      focus: [],
      referenceCell: first.cell,
      relatedCells: [second.cell],
      regions: [{ region, role: 'source' }],
    };
  return {
    values: [first],
    candidates: [second],
    focus: [second],
    regions: [{ region, role: 'source' }],
    target: second,
  };
}

export function linkConceptScene(
  concept: 'bilocation' | 'strongLink' | 'weakLink',
  unit: SetUnit | 'cell',
  valid: boolean,
): TermScene {
  const first = ref(1, 1, 2);
  if (unit === 'cell') {
    const second =
      concept === 'weakLink' && !valid ? ref(5, 5, 3) : ref(1, 1, 3);
    const third = ref(1, 1, 4);
    return {
      values: [],
      candidates:
        concept === 'weakLink'
          ? valid
            ? [first, second, third]
            : [first, second]
          : valid
          ? [first, second]
          : [first, ref(1, 1, 3), third],
      focus: [first, second],
    };
  }
  const second =
    unit === 'row'
      ? ref(1, 5, 2)
      : unit === 'column'
      ? ref(5, 1, 2)
      : ref(2, 2, 2);
  const third =
    unit === 'row'
      ? ref(1, 8, 2)
      : unit === 'column'
      ? ref(8, 1, 2)
      : ref(0, 2, 2);
  const unrelated = ref(5, 5, 2);
  const actualSecond = concept === 'weakLink' && !valid ? unrelated : second;
  const region: RegionRef =
    unit === 'row'
      ? { kind: 'row', index: 1 }
      : unit === 'column'
      ? { kind: 'column', index: 1 }
      : { kind: 'box', index: 0 };
  return {
    values: [],
    candidates:
      concept === 'weakLink'
        ? valid
          ? [first, second, third]
          : [first, unrelated]
        : valid
        ? [first, second]
        : [first, second, third],
    focus: [first, actualSecond],
    regions: [{ region, role: 'source' }],
    links: valid
      ? [
          {
            from: first.cell,
            to: second.cell,
            kind: concept === 'weakLink' ? 'peer' : 'pair',
          },
        ]
      : concept === 'weakLink'
      ? []
      : [{ from: first.cell, to: second.cell, kind: 'peer' }],
  };
}

export function lockedConceptScene(
  pattern: LockedPattern,
  valid: boolean,
): TermScene {
  const candidates = [ref(1, 0, 2), ref(1, 1, 2)];
  const pointing = pattern.startsWith('pointing');
  const target = pointing ? ref(1, 5, 2) : ref(0, 2, 2);
  const extra = pointing ? ref(2, 2, 2) : ref(1, 5, 2);
  const rowRegion: HintRegionMark = {
    region: { kind: 'row', index: 1 },
    role: pointing ? 'affected' : 'source',
  };
  const boxRegion: HintRegionMark = {
    region: { kind: 'box', index: 0 },
    role: pointing ? 'source' : 'affected',
  };
  const base: TermScene = {
    values: [],
    candidates: [...candidates, target, ...(!valid ? [extra] : [])],
    focus: candidates,
    regions: [boxRegion, rowRegion],
    target,
    diagramDigit: 2,
  };
  return pattern.endsWith('column') ? transformTermScene(base, 1) : base;
}

export function fishConceptScene(
  concept: 'fish' | 'fishBase' | 'fishCover' | 'fishFin',
  size: SetSize,
  valid: boolean,
): TermScene {
  const baseRows = size === 2 ? [1, 5] : [1, 4, 7];
  const coverColumns = size === 2 ? [1, 7] : [1, 4, 7];
  const positions =
    size === 2
      ? [
          [1, 1],
          [1, 7],
          [5, 1],
          [5, 7],
        ]
      : [
          [1, 1],
          [1, 4],
          [4, 4],
          [4, 7],
          [7, 1],
          [7, 7],
        ];
  const fish = positions.map(([row, column]) => ref(row, column, 2));
  const regions: HintRegionMark[] = [
    ...baseRows.map(index => ({
      region: { kind: 'row' as const, index },
      role: 'fishBase' as const,
    })),
    ...coverColumns.map(index => ({
      region: { kind: 'column' as const, index },
      role: 'fishCover' as const,
    })),
  ];
  if (concept === 'fishFin') {
    const fin = ref(1, 2, 2);
    const target = ref(0, valid ? 1 : 7, 2);
    return {
      values: [],
      candidates: [...fish, fin, target],
      focus: [...fish, fin],
      regions,
      fins: [fin],
      target,
      diagramDigit: 2,
    };
  }
  const extra = ref(1, 3, 2);
  return {
    values: [],
    candidates: [
      ...(valid ? fish : [...fish, extra]),
      ...(concept === 'fish' ? [ref(0, 1, 2)] : []),
    ],
    focus: fish,
    regions,
    target: concept === 'fish' ? ref(0, 1, 2) : undefined,
    diagramDigit: 2,
  };
}

export function chainConceptScene(
  concept: 'alternatingChain' | 'endpoint' | 'chainTarget' | 'loop',
  length: 4 | 6,
  valid: boolean,
): TermScene {
  const coordinates =
    length === 4
      ? [
          [1, 1],
          [1, 6],
          [5, 6],
          [5, 1],
        ]
      : [
          [1, 1],
          [1, 6],
          [4, 6],
          [4, 3],
          [7, 3],
          [7, 1],
        ];
  const nodes = coordinates.map(([row, column]) => ref(row, column, 2));
  const links = nodes.slice(1).map((node, index) => ({
    from: nodes[index].cell,
    to: node.cell,
    kind:
      index % 2 === 0 &&
      !(
        index === 0 &&
        !valid &&
        concept !== 'chainTarget' &&
        concept !== 'loop'
      )
        ? ('pair' as const)
        : ('peer' as const),
  }));
  if (concept === 'loop' && valid)
    links.push({
      from: nodes[nodes.length - 1].cell,
      to: nodes[0].cell,
      kind: 'peer',
    });
  const target = ref(valid ? 0 : 1, valid ? 1 : 8, 2);
  const extra = ref(1, 3, 2);
  return {
    values: [],
    candidates: [
      ...nodes,
      ...(concept === 'endpoint' && !valid ? [extra] : []),
      ...(concept === 'chainTarget' ? [target] : []),
    ],
    focus: concept === 'chainTarget' ? [...nodes, target] : nodes,
    links,
    target: concept === 'chainTarget' ? target : undefined,
    diagramDigit: 2,
  };
}

export function colorConceptScene(
  concept: 'colorState' | 'colorComponent',
  length: 2 | 3 | 4,
  valid: boolean,
): TermScene {
  const coordinates = [
    [1, 1],
    [1, 5],
    [4, 5],
    [4, 2],
  ];
  const nodes = coordinates
    .slice(0, length)
    .map(([row, column]) => ref(row, column, 2));
  const split = concept === 'colorComponent' && !valid;
  const colors = nodes.map((node, index) => ({
    ...node,
    component: split && index >= Math.ceil(length / 2) ? 1 : 0,
    color:
      concept === 'colorState' && !valid && index === length - 1
        ? (((length - 2) % 2) as 0 | 1)
        : ((index % 2) as 0 | 1),
  }));
  const links = nodes
    .slice(1)
    .flatMap((node, index) =>
      split && index + 1 === Math.ceil(length / 2)
        ? []
        : [{ from: nodes[index].cell, to: node.cell, kind: 'pair' as const }],
    );
  return {
    values: [],
    candidates: nodes,
    focus: nodes,
    colors,
    links,
    diagramDigit: 2,
  };
}

export function groupConceptScene(
  concept: 'groupNode' | 'atLeastOne',
  size: 2 | 3,
  valid: boolean,
): TermScene {
  const group = Array.from({ length: size }, (_, column) => ref(2, column, 2));
  const outside = ref(2, 5, 2);
  const remote = ref(2, 4, 2);
  const extra = ref(2, 7, 2);
  const selected =
    concept === 'groupNode' && !valid ? [group[0], remote] : group;
  return {
    values: [],
    candidates: [
      ...group,
      outside,
      ...(concept === 'groupNode' && !valid ? [remote] : []),
      ...(concept === 'atLeastOne' && !valid ? [extra] : []),
    ],
    focus: selected,
    group: concept === 'groupNode' && !valid ? undefined : group,
    target: concept === 'atLeastOne' ? outside : undefined,
    regions: [{ region: { kind: 'row', index: 2 }, role: 'source' }],
    diagramDigit: 2,
  };
}

export function branchConceptScene(
  concept: 'exhaustiveBranches' | 'commonConclusion',
  size: SetSize,
  valid: boolean,
): TermScene {
  const start = Array.from({ length: size }, (_, index) =>
    ref(1, 1, index + 2),
  );
  const target = ref(5, 5, 2);
  return {
    values: [],
    candidates: [...start, ...(concept === 'commonConclusion' ? [target] : [])],
    focus: start,
    target: concept === 'commonConclusion' ? target : undefined,
    branchResults:
      concept === 'commonConclusion'
        ? start.map((_, index) => valid || index < size - 1)
        : undefined,
    checkedBranches:
      concept === 'exhaustiveBranches' ? size - (valid ? 0 : 1) : undefined,
  };
}

export function rectangleConceptScene(
  valid: boolean,
  variant: number,
): TermScene {
  const invalidExtra = !valid && variant % 2 === 1;
  const lowerRow = !valid && !invalidExtra ? 4 : 1;
  const corners = [
    ref(0, 1, 2),
    ref(0, 7, 2),
    ref(lowerRow, 1, 2),
    ref(lowerRow, 7, 2),
  ];
  const candidates = corners.flatMap(item => [
    item,
    { ...item, digit: 3 as Digit },
  ]);
  if (invalidExtra) candidates.push({ ...corners[0], digit: 4 as Digit });
  return {
    values: [],
    candidates,
    focus: candidates,
    regions: [
      { region: { kind: 'row', index: 0 }, role: 'source' },
      { region: { kind: 'row', index: lowerRow }, role: 'source' },
    ],
  };
}

export function simpleConceptScene(
  concept: 'candidate' | 'bivalue' | 'assumption',
  variant: number,
  valid: boolean,
): TermScene {
  const notes = Array.from({ length: 2 + (variant % 3) }, (_, index) =>
    ref(1, 1, index + 2),
  );
  const focus = notes[0];
  if (concept === 'bivalue') {
    const candidates = valid
      ? notes.slice(0, 2)
      : variant % 2 === 0
      ? notes.slice(0, 1)
      : [notes[0], notes[1], ref(1, 1, 4)];
    return { values: [], candidates, focus: candidates };
  }
  return valid
    ? { values: [], candidates: notes, focus: [focus] }
    : { values: [focus], candidates: [], focus: [focus] };
}

export function conceptQuestionCount(concept: TermConcept): number {
  return concept === 'nakedSet' || concept === 'hiddenSet'
    ? 18
    : concept === 'strongLink' || concept === 'weakLink'
    ? 16
    : 12;
}
