module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['src/ui/**/*.{ts,tsx}', 'src/debug/**/*.{ts,tsx}'],
      excludedFiles: [
        'src/ui/theme.tsx',
        'src/ui/themes/**',
        'src/ui/HardSudokuApp.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/theme', '**/theme.ts', '**/theme.tsx'],
                importNames: [
                  'palette',
                  'lightPalette',
                  'darkPalette',
                  'ThemeProvider',
                ],
                message:
                  'Display surfaces must inherit the current app theme via useAppTheme(); only the app root selects a theme.',
              },
              {
                group: [
                  '**/themes/warm-paper',
                  '**/themes/warm-paper.ts',
                  '**/themes/warm-paper.tsx',
                ],
                message:
                  'Display surfaces must inherit the current app theme via useAppTheme(); only the app root selects a theme.',
              },
            ],
          },
        ],
      },
    },
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
