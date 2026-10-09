// Collect the exact English copy used by the app, including generated lesson text.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
export const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../..',
);

require.extensions['.ts'] = (module, filename) => {
  if (filename.endsWith('/localization/catalog.ts')) {
    module.exports = { localizeCopies: base => base };
    return;
  }
  const code = fs.readFileSync(filename, 'utf8');
  // Export private copy tables for inspection without changing production exports.
  const source = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
  );
  const names = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      let init = node.initializer;
      while (
        init &&
        (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))
      )
        init = init.expression;
      if (
        init &&
        ts.isCallExpression(init) &&
        init.expression.getText(source) === 'localizeCopies'
      )
        init = init.arguments[0];
      if (init && ts.isObjectLiteralExpression(init)) {
        const keys = init.properties.map(p =>
          p.name?.getText(source).replace(/['"]/g, ''),
        );
        if (keys.includes('en') && keys.includes('ja') && keys.includes('de')) {
          if (ts.isSourceFile(node.parent.parent.parent))
            names.push(node.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const output = ts.transpileModule(
    code + names.map(n => `\nexports.__copy_${n} = ${n};`).join(''),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  module._compile(output.outputText, filename);
};

export function collect({ includeBaseCopies = false } = {}) {
  const pairs = new Map();
  const contexts = new Map();
  const baseCopies = new Map();
  const add = (en, zh, context, copies = {}) => {
    if (!/[A-Za-z]/.test(en)) return;
    pairs.set(en, typeof zh === 'string' ? zh : en);
    if (!contexts.has(en)) contexts.set(en, []);
    contexts.get(en).push(context);
    if (includeBaseCopies) {
      if (!baseCopies.has(en)) baseCopies.set(en, []);
      baseCopies.get(en).push({ context, ...copies });
    }
  };
  function walk(en, zh, context, copies = {}) {
    if (typeof en === 'string') add(en, zh, context, copies);
    else if (typeof en === 'function') {
      for (const value of [0, 1, '{value}'])
        add(
          en(value),
          zh?.(value),
          context + '.function',
          Object.fromEntries(
            Object.entries(copies).map(([locale, copy]) => [
              locale,
              copy?.(value),
            ]),
          ),
        );
    } else if (en && typeof en === 'object') {
      for (const [key, value] of Object.entries(en))
        walk(
          value,
          zh?.[key],
          context + '.' + key,
          Object.fromEntries(
            Object.entries(copies).map(([locale, copy]) => [
              locale,
              copy?.[key],
            ]),
          ),
        );
    }
  }
  const files = fs
    .readdirSync(path.join(ROOT, 'src/localization'))
    .filter(
      n => n.endsWith('.ts') && !['locales.ts', 'catalog.ts'].includes(n),
    );
  for (const relative of [
    ...files.map(n => 'src/localization/' + n),
    'src/ui/screens/share-card-presentation.ts',
  ]) {
    const mod = require(path.join(ROOT, relative));
    const source = ts.createSourceFile(
      relative,
      fs.readFileSync(path.join(ROOT, relative), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function nested(node) {
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        !ts.isSourceFile(node.parent.parent.parent)
      ) {
        let init = node.initializer;
        while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))
          init = init.expression;
        if (
          ts.isCallExpression(init) &&
          init.expression.getText(source) === 'localizeCopies'
        )
          init = init.arguments[0];
        if (
          ts.isObjectLiteralExpression(init) &&
          init.properties.some(p => p.name?.getText(source) === 'en')
        ) {
          const copies = Function('return (' + init.getText(source) + ')')();
          walk(
            copies.en,
            copies['zh-Hans'],
            relative + ':' + node.name.getText(source),
            copies,
          );
        }
      }
      ts.forEachChild(node, nested);
    }
    nested(source);
    for (const [name, copies] of Object.entries(mod)) {
      if (name.startsWith('__copy_'))
        walk(copies.en, copies['zh-Hans'], relative + ':' + name, copies);
    }
  }
  // These tables are plain objects inside components. Evaluate only their literal initializers.
  for (const relative of [
    'src/ui/screens/PracticeBoardExercise.tsx',
    'src/ui/screens/TechniqueExerciseListScreen.tsx',
  ]) {
    const filename = path.join(ROOT, relative);
    const code = fs.readFileSync(filename, 'utf8');
    const source = ts.createSourceFile(
      filename,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const bindings = {};
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        let init = node.initializer;
        while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))
          init = init.expression;
        if (
          ts.isCallExpression(init) &&
          init.expression.getText(source) === 'localizeCopies'
        )
          init = init.arguments[0];
        if (
          ts.isObjectLiteralExpression(init) &&
          init.properties.some(p => p.name?.getText(source) === 'en')
        ) {
          const copies = Function(
            ...Object.keys(bindings),
            'return (' + init.getText(source) + ')',
          )(...Object.values(bindings));
          bindings[node.name.getText(source)] = copies;
          walk(
            copies.en,
            copies['zh-Hans'],
            relative + ':' + node.name.getText(source),
            copies,
          );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const relative of [
    'tools/technique-lessons/manifest.json',
    'tools/technique-lessons/preview-manifest.json',
  ]) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value.texts?.en)
        walk(value.texts.en, value.texts['zh-Hans'], relative, value.texts);
      for (const child of Object.values(value)) visit(child);
    }
    visit(data);
  }
  return [...pairs].map(([source, chinese]) => ({
    source,
    chinese,
    contexts: contexts.get(source),
    ...(includeBaseCopies ? { baseCopies: baseCopies.get(source) } : {}),
  }));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const rows = collect();
  const output = process.argv[2];
  if (output) fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n');
  console.log(
    JSON.stringify({
      strings: rows.length,
      characters: rows.reduce((sum, row) => sum + row.source.length, 0),
    }),
  );
}
