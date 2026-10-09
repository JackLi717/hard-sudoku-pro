import fs from 'node:fs';
import path from 'node:path';
import { collect, ROOT } from './collect.mjs';
import {
  erasedProse,
  lostTechniqueAcronyms,
  variablesPreserved,
} from './copy-invariants.mjs';

const source = collect({ includeBaseCopies: true });
const terminology = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'tools/localization/terminology.json'),
    'utf8',
  ),
);
const reviewed = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'tools/localization/reviewed-core-copy.json'),
    'utf8',
  ),
);
const coordinates = value =>
  [...value.matchAll(/\br[1-9]c[1-9]\b|\b[A-I][1-9]\b/g)]
    .map(match => match[0])
    .sort();
const errors = [];
// Existing editorial languages may repeat a variable for natural phrasing;
// all required variables must still be present, and no new ones may appear.
for (const row of source) {
  for (const copy of row.baseCopies) {
    for (const locale of ['en', 'ja', 'de', 'zh-Hans']) {
      const value = copy[locale];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${locale}: missing base copy at ${copy.context}`);
        continue;
      }
      if (!variablesPreserved(row.source, value))
        errors.push(`${locale}: changed base variables at ${copy.context}`);
      if (erasedProse(row.source, value))
        errors.push(`${locale}: erased base prose at ${copy.context}`);
    }
  }
}
for (const [locale, terms] of Object.entries(terminology)) {
  const catalog = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, `src/localization/generated/${locale}.json`),
      'utf8',
    ),
  );
  for (const { source: english } of source) {
    const text = catalog[english];
    if (typeof text !== 'string' || !text.trim()) {
      errors.push(`${locale}: missing ${english}`);
      continue;
    }
    // Repeating a parameter can be necessary to make a translated subject
    // unambiguous; dropping one or inventing a new parameter is never allowed.
    if (!variablesPreserved(english, text))
      errors.push(`${locale}: changed variables in ${english}`);
    if (erasedProse(english, text))
      errors.push(`${locale}: erased prose in ${english}`);
    for (const acronym of lostTechniqueAcronyms(english, text))
      errors.push(`${locale}: lost ${acronym} in ${english}`);
    if (
      JSON.stringify(coordinates(english)) !== JSON.stringify(coordinates(text))
    )
      errors.push(`${locale}: changed coordinates in ${english}`);
    if (!english.includes('\n') && text.includes('\n'))
      errors.push(`${locale}: changed string boundaries in ${english}`);
    if (/ZXQ\s*\d|QXZ|ZXS\s*\d|SXZ/.test(text))
      errors.push(`${locale}: unresolved translation marker in ${english}`);
    if (terms[english] && text !== terms[english])
      errors.push(`${locale}: terminology mismatch in ${english}`);
    if (reviewed[locale]?.[english] && text !== reviewed[locale][english])
      errors.push(`${locale}: reviewed copy changed in ${english}`);
  }
  if (catalog['{candidates} is true'] === catalog['{candidates} is false'])
    errors.push(`${locale}: true and false states have identical copy`);
}
if (errors.length) {
  console.error(errors.slice(0, 12).join('\n'));
  console.error(`${errors.length} translation errors`);
  process.exitCode = 1;
} else {
  if (process.argv.includes('--enable')) {
    fs.writeFileSync(
      path.join(ROOT, 'src/localization/generated/enabled-languages.json'),
      JSON.stringify(Object.keys(terminology), null, 2) + '\n',
    );
  }
  console.log(
    JSON.stringify({
      languages: 24,
      addedLanguages: Object.keys(terminology).length,
      sourceStrings: source.length,
      checkedTranslations: source.length * Object.keys(terminology).length,
    }),
  );
}
