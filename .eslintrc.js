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
            paths: ['../theme', './theme', '../ui/theme', '../../ui/theme'].map(
              name => ({
                name,
                importNames: [
                  'palette',
                  'lightPalette',
                  'darkPalette',
                  'ThemeProvider',
                ],
                message:
                  'Display surfaces must inherit the current app theme via useAppTheme(); only the app root selects a theme.',
              }),
            ),
            patterns: ['**/themes/warm-paper'],
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
