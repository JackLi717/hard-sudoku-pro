import type { CompletionKind } from '../../domain/game/contracts';
import type { DifficultyLevel } from '../../domain/hints/techniques';
import type { TranslationKey } from '../../localization/resources';

export type ResultTitleGroup =
  | 'new_best'
  | 'perfect'
  | 'first_completion'
  | 'independent'
  | 'hint_assisted'
  | 'generic';

export type ResultHonorKind = Exclude<ResultTitleGroup, 'generic'>;

export type ResultCopy = {
  key: TranslationKey;
  params?: Readonly<Record<string, string | number>>;
};

export type ResultHonor = {
  kind: ResultHonorKind;
  copy: ResultCopy;
};

export type ResultPresentation = {
  titleGroup: ResultTitleGroup;
  title: ResultCopy;
  encouragement: ResultCopy;
  honors: readonly ResultHonor[];
  quote: ResultCopy | null;
};

export type ResultPresentationFacts = {
  sessionId: string;
  difficultyLevel: DifficultyLevel;
  completionKind: CompletionKind | string | null;
  isFirstCompletion: boolean;
  isNewLevelBest: boolean;
  totalCompletions: number;
};

const titles: Readonly<Record<ResultTitleGroup, TranslationKey>> = {
  new_best: 'result.celebration.title.newBest',
  perfect: 'result.celebration.title.perfect',
  first_completion: 'result.celebration.title.firstCompletion',
  independent: 'result.celebration.title.independent',
  hint_assisted: 'result.celebration.title.hintAssisted',
  generic: 'result.celebration.title.generic',
};

const encouragements: Readonly<
  Record<ResultTitleGroup, readonly TranslationKey[]>
> = {
  new_best: [
    'result.celebration.encouragement.newBest.1',
    'result.celebration.encouragement.newBest.2',
    'result.celebration.encouragement.newBest.3',
    'result.celebration.encouragement.newBest.4',
    'result.celebration.encouragement.newBest.5',
    'result.celebration.encouragement.newBest.6',
    'result.celebration.encouragement.newBest.7',
    'result.celebration.encouragement.newBest.8',
  ],
  perfect: [
    'result.celebration.encouragement.perfect.1',
    'result.celebration.encouragement.perfect.2',
    'result.celebration.encouragement.perfect.3',
    'result.celebration.encouragement.perfect.4',
    'result.celebration.encouragement.perfect.5',
    'result.celebration.encouragement.perfect.6',
    'result.celebration.encouragement.perfect.7',
    'result.celebration.encouragement.perfect.8',
  ],
  first_completion: [
    'result.celebration.encouragement.firstCompletion.1',
    'result.celebration.encouragement.firstCompletion.2',
    'result.celebration.encouragement.firstCompletion.3',
    'result.celebration.encouragement.firstCompletion.4',
    'result.celebration.encouragement.firstCompletion.5',
    'result.celebration.encouragement.firstCompletion.6',
    'result.celebration.encouragement.firstCompletion.7',
    'result.celebration.encouragement.firstCompletion.8',
  ],
  independent: [
    'result.celebration.encouragement.independent.1',
    'result.celebration.encouragement.independent.2',
    'result.celebration.encouragement.independent.3',
    'result.celebration.encouragement.independent.4',
    'result.celebration.encouragement.independent.5',
    'result.celebration.encouragement.independent.6',
    'result.celebration.encouragement.independent.7',
    'result.celebration.encouragement.independent.8',
  ],
  hint_assisted: [
    'result.celebration.encouragement.hintAssisted.1',
    'result.celebration.encouragement.hintAssisted.2',
    'result.celebration.encouragement.hintAssisted.3',
    'result.celebration.encouragement.hintAssisted.4',
    'result.celebration.encouragement.hintAssisted.5',
    'result.celebration.encouragement.hintAssisted.6',
    'result.celebration.encouragement.hintAssisted.7',
    'result.celebration.encouragement.hintAssisted.8',
  ],
  generic: [
    'result.celebration.encouragement.generic.1',
    'result.celebration.encouragement.generic.2',
    'result.celebration.encouragement.generic.3',
    'result.celebration.encouragement.generic.4',
    'result.celebration.encouragement.generic.5',
    'result.celebration.encouragement.generic.6',
    'result.celebration.encouragement.generic.7',
    'result.celebration.encouragement.generic.8',
  ],
};

const honorKeys: Readonly<Record<ResultHonorKind, TranslationKey>> = {
  new_best: 'result.honor.newBest',
  first_completion: 'result.honor.firstCompletion',
  perfect: 'result.honor.perfect',
  independent: 'result.honor.independent',
  hint_assisted: 'result.honor.hintAssisted',
};

const quoteKeys: readonly TranslationKey[] = [
  'result.quote.1',
  'result.quote.2',
  'result.quote.3',
  'result.quote.4',
  'result.quote.5',
  'result.quote.6',
  'result.quote.7',
  'result.quote.8',
];

function stableIndex(seed: string, count: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2_147_483_647;
  }
  return hash % count;
}

function titleGroup(facts: ResultPresentationFacts): ResultTitleGroup {
  if (facts.isNewLevelBest) {
    return 'new_best';
  }
  if (facts.completionKind === 'perfect') {
    return 'perfect';
  }
  if (facts.isFirstCompletion) {
    return 'first_completion';
  }
  if (facts.completionKind === 'independent') {
    return 'independent';
  }
  if (facts.completionKind === 'hint_assisted') {
    return 'hint_assisted';
  }
  return 'generic';
}

function honors(facts: ResultPresentationFacts): readonly ResultHonor[] {
  const kinds: ResultHonorKind[] = [];
  if (facts.isNewLevelBest) {
    kinds.push('new_best');
  }
  if (facts.isFirstCompletion) {
    kinds.push('first_completion');
  }
  if (
    facts.completionKind === 'perfect' ||
    facts.completionKind === 'independent' ||
    facts.completionKind === 'hint_assisted'
  ) {
    kinds.push(facts.completionKind);
  }
  return kinds.slice(0, 3).map(kind => ({
    kind,
    copy: { key: honorKeys[kind] },
  }));
}

export function createResultPresentation(
  facts: ResultPresentationFacts,
): ResultPresentation {
  const group = titleGroup(facts);
  const params = { level: facts.difficultyLevel };
  const groupEncouragements = encouragements[group];
  const encouragement =
    groupEncouragements[
      stableIndex(
        `${facts.sessionId}:encouragement:${group}`,
        groupEncouragements.length,
      )
    ];
  const showQuote =
    Number.isInteger(facts.totalCompletions) &&
    facts.totalCompletions > 0 &&
    facts.totalCompletions % 4 === 0;
  const quote = showQuote
    ? quoteKeys[stableIndex(`${facts.sessionId}:quote`, quoteKeys.length)]
    : null;

  return {
    titleGroup: group,
    title: { key: titles[group], params },
    encouragement: { key: encouragement, params },
    honors: honors(facts),
    quote: quote ? { key: quote } : null,
  };
}
