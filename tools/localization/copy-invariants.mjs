const VARIABLE = /\{\{\w+\}\}|\{\w+\}/g;

export function variableNames(value) {
  return [...new Set(value.match(VARIABLE) ?? [])].sort();
}

export function variablesPreserved(source, translation) {
  return (
    JSON.stringify(variableNames(source)) ===
    JSON.stringify(variableNames(translation))
  );
}

/** This catches erased labels, not general semantic correctness. */
export function erasedProse(source, translation) {
  const prose = source.replace(VARIABLE, '');
  return (
    /\b[A-Za-z]{2,}\b/.test(prose) &&
    !/\p{L}/u.test(translation.replace(VARIABLE, ''))
  );
}

export function lostTechniqueAcronyms(source, translation) {
  return ['BUG', 'AIC'].filter(acronym => {
    const pattern = new RegExp(`(?<![A-Za-z])${acronym}(?![A-Za-z])`);
    return pattern.test(source) && !pattern.test(translation);
  });
}
