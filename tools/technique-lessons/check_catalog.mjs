// Validate the exact runtime reader and every localized proof before export.
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(compiled.outputText, filename);
};
const {
  decodeLessonCatalog,
} = require('../../src/data/lessons/lesson-repository.ts');
const {
  validateContentAllocations,
} = require('../../src/domain/lessons/content-source.ts');

function check(catalogPath, allocationsPath) {
  const catalog = decodeLessonCatalog(
    JSON.parse(fs.readFileSync(catalogPath, 'utf8')),
  );
  const allocations = validateContentAllocations(
    JSON.parse(fs.readFileSync(allocationsPath, 'utf8')),
  );
  const lessonAllocations = new Map(
    allocations
      .filter(item => item.content_usage === 'lesson')
      .map(item => [item.content_id, item]),
  );
  if (lessonAllocations.size !== catalog.lessons.length) {
    throw new Error(
      'The allocation inventory must include exactly the exported lessons',
    );
  }
  for (const lesson of catalog.lessons) {
    const allocation = lessonAllocations.get(lesson.lesson_id);
    if (
      !allocation ||
      ['source_puzzle_id', 'puzzle_fingerprint', 'board_fingerprint'].some(
        field => allocation[field] !== lesson.example[field],
      ) ||
      JSON.stringify(allocation.candidate_masks) !==
        JSON.stringify(lesson.example.candidate_masks)
    ) {
      throw new Error(
        `Missing or inconsistent source allocation: ${lesson.lesson_id}`,
      );
    }
  }
  return {
    lessonCount: catalog.lessons.length,
    techniqueCount: new Set(
      catalog.lessons.map(lesson => lesson.technique_code),
    ).size,
    sourceFamilies: new Set(
      catalog.lessons.map(lesson => lesson.example.source_family),
    ).size,
  };
}

try {
  const [catalogPath, allocationsPath] = process.argv.slice(2);
  if (!catalogPath || !allocationsPath || process.argv.length !== 4) {
    throw new Error(
      'usage: node check_catalog.mjs <catalog.json> <content-allocations.json>',
    );
  }
  process.stdout.write(
    `${JSON.stringify(check(catalogPath, allocationsPath))}\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
