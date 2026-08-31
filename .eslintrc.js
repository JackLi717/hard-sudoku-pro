module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: ['react', 'react-native'],
            patterns: ['**/data/**', '**/services/**'],
          },
        ],
      },
    },
    {
      files: ['src/domain/sudoku/board.ts'],
      rules: {
        'no-bitwise': 'off',
      },
    },
  ],
};
