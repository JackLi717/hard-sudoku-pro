module.exports = {
  overrides: [
    {
      files: ['public/sw.js'],
      env: { serviceworker: true },
    },
    {
      files: ['tests/**/*.mjs'],
      parser: 'espree',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      env: { node: true, es2022: true },
    },
  ],
};
