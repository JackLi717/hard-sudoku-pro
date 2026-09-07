type LintMessage = { message: string; ruleId: string | null };
type LintResult = { messages: readonly LintMessage[] };
type EslintRunner = {
  lintText(
    source: string,
    options: { filePath: string },
  ): Promise<readonly LintResult[]>;
};

const { ESLint } = require('eslint') as {
  ESLint: new (options: { cwd: string; useEslintrc: boolean }) => EslintRunner;
};

const themeBoundaryMessage =
  'Display surfaces must inherit the current app theme via useAppTheme(); only the app root selects a theme.';

const linter = new ESLint({ cwd: process.cwd(), useEslintrc: true });

test.each([
  ['./theme.tsx', 'src/ui/theme-boundary-probe.tsx'],
  ['../ui/theme.tsx', 'src/debug/theme-boundary-probe.tsx'],
  ['../theme.ts', 'src/ui/screens/theme-boundary-probe.tsx'],
  ['../../ui/theme.ts', 'src/ui/technique-growth/theme-boundary-probe.tsx'],
  [
    '../../../ui/theme',
    'src/ui/technique-growth/nested/theme-boundary-probe.tsx',
  ],
  [
    '../../../../ui/theme.tsx',
    'src/ui/technique-growth/nested/deeper/theme-boundary-probe.tsx',
  ],
])(
  'blocks ThemeProvider imported through the %s path spelling',
  async (source, filePath) => {
    const [result] = await linter.lintText(
      `import { ThemeProvider } from '${source}';\nexport const provider = ThemeProvider;`,
      { filePath },
    );

    expect(result.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'no-restricted-imports',
          message: expect.stringContaining(themeBoundaryMessage),
        }),
      ]),
    );
  },
);

test('allows useAppTheme through a typed extension path', async () => {
  const [result] = await linter.lintText(
    "import { useAppTheme } from '../ui/theme.tsx';\nexport const theme = useAppTheme;",
    { filePath: 'src/debug/theme-boundary-probe.tsx' },
  );

  expect(
    result.messages.filter(
      message => message.ruleId === 'no-restricted-imports',
    ),
  ).toHaveLength(0);
});
