import React, { createContext, useContext, useMemo } from 'react';
import { StatusBarStyle, useColorScheme } from 'react-native';
import { ThemePreference } from '../application';
import { BoardTheme } from './themes/board-theme';
import { lightPalette, warmPaperTheme } from './themes/warm-paper';
import { AppTheme } from './themes/app-theme';

export { lightPalette, darkPalette } from './themes/warm-paper';
export type AppPalette = { [Key in keyof typeof lightPalette]: string };

export type ResolvedTheme = 'light' | 'dark';

type ThemeValue = {
  themeId: string;
  boardTheme: BoardTheme;
  mode: ResolvedTheme;
  palette: AppPalette;
  statusBarStyle: StatusBarStyle;
};

const DEFAULT_THEME: ThemeValue = {
  themeId: warmPaperTheme.id,
  boardTheme: warmPaperTheme.appearances.light.boardTheme,
  mode: 'light',
  palette: lightPalette,
  statusBarStyle: 'dark-content',
};

const ThemeContext = createContext<ThemeValue>(DEFAULT_THEME);

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ReturnType<typeof useColorScheme>,
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemTheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({
  preference,
  children,
  theme = warmPaperTheme,
}: {
  preference: ThemePreference;
  theme?: AppTheme;
  children: React.ReactNode;
}): React.JSX.Element {
  const systemTheme = useColorScheme();
  const mode = resolveTheme(preference, systemTheme);
  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      themeId: theme.id,
      boardTheme: theme.appearances[mode].boardTheme,
      palette: theme.appearances[mode].palette,
      statusBarStyle: mode === 'dark' ? 'light-content' : 'dark-content',
    }),
    [mode, theme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeValue {
  return useContext(ThemeContext);
}
