export const REQUIRED_STAGES = [
  'oracle-controls', 'game-regressions', 'typecheck', 'native-build',
  'catalog-outcomes', 'candidate-restoration', 'hint-assistance',
  'segment-lifecycle', 'opportunity-deduplication', 'opportunity-processes-39',
  'durable-hint-exposure', 'seeded-gameplay', 'seeded-native-replay',
  'seeded-protocol-audit',
];

export function allRequiredStagesPassed(stages) {
  return stages.length === REQUIRED_STAGES.length && REQUIRED_STAGES.every(name => {
    const matches = stages.filter(stage => stage.name === name);
    return matches.length === 1 && matches[0].status === 'passed';
  });
}
