export const TECHNIQUE_CATALOG = [
  ['fullHouse', 1, 'confirmed'],
  ['nakedSingle', 1, 'confirmed'],
  ['hiddenSingle', 1, 'confirmed'],
  ['lockedCandidates.pointing', 2, 'confirmed'],
  ['lockedCandidates.claiming', 2, 'confirmed'],
  ['lockedPair', 2, 'confirmed'],
  ['lockedTriple', 2, 'confirmed'],
  ['nakedPair', 2, 'confirmed'],
  ['hiddenPair', 2, 'confirmed'],
  ['nakedTriple', 3, 'confirmed'],
  ['hiddenTriple', 3, 'confirmed'],
  ['nakedQuad', 3, 'confirmed'],
  ['hiddenQuad', 3, 'confirmed'],
  ['xWing', 3, 'confirmed'],
  ['swordfish', 4, 'confirmed'],
  ['skyscraper', 4, 'confirmed'],
  ['twoStringKite', 4, 'confirmed'],
  ['turbotFish', 4, 'confirmed'],
  ['wWing', 4, 'confirmed'],
  ['xyWing', 4, 'confirmed'],
  ['xyzWing', 4, 'confirmed'],
  ['simpleColoring', 4, 'confirmed'],
  ['multiColoring', 4, 'confirmed'],
  ['remotePair', 4, 'confirmed'],
  ['emptyRectangle', 4, 'confirmed'],
  ['hiddenRectangle', 4, 'confirmed'],
  ['avoidableRectangle', 4, 'confirmed'],
  ['uniqueRectangle', 4, 'confirmed'],
  ['bugPlusOne', 4, 'confirmed'],
  ['finnedXWing', 4, 'confirmed'],
  ['sashimiXWing', 4, 'confirmed'],
  ['jellyfish', 5, 'confirmed'],
  ['xChain', 5, 'confirmed'],
  ['xyChain', 5, 'confirmed'],
  ['aic', 5, 'confirmed'],
  ['groupedAic', 5, 'confirmed'],
  ['complexColoring', 5, 'confirmed'],
  ['forcingChain', 5, 'confirmed'],
  ['forcingNet', 5, 'confirmed'],
] as const;

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type TechniqueCode = (typeof TECHNIQUE_CATALOG)[number][0];
export type TechniqueStatus = (typeof TECHNIQUE_CATALOG)[number][2];

export type TechniqueDefinition = {
  code: TechniqueCode;
  level: DifficultyLevel;
  status: TechniqueStatus;
  nameKey: `technique.${TechniqueCode}.name`;
  explanationKey: `hint.${TechniqueCode}`;
};

export const TECHNIQUES: readonly TechniqueDefinition[] = TECHNIQUE_CATALOG.map(
  ([code, level, status]) => ({
    code,
    level,
    status,
    nameKey: `technique.${code}.name`,
    explanationKey: `hint.${code}`,
  }),
);

export const FORBIDDEN_HINT_TECHNIQUES = [
  'guess',
  'backtracking',
  'trialAndError',
] as const;
