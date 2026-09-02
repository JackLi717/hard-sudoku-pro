import React, { createContext, useContext, useMemo } from 'react';
import { StatusBarStyle, useColorScheme } from 'react-native';
import { ThemePreference } from '../application';

export const lightPalette = {
  background: '#F3F0E9',
  surface: '#FFFDF8',
  surfaceStrong: '#EAE4D8',
  ink: '#18201D',
  muted: '#66706A',
  line: '#A9B0AA',
  lineStrong: '#26312D',
  accent: '#176B57',
  accentSoft: '#D8EEE6',
  accentWarm: '#E9A23B',
  selected: '#B9DED1',
  peer: '#E6F2ED',
  sameDigit: '#CDE7DE',
  hintRegion: '#E7EFE4',
  hintDim: '#EFEEE9',
  hintMask: 'rgba(24, 29, 32, 0.62)',
  hintEstablished: '#FFF0B3',
  hintResult: '#FFE09A',
  hintCandidate: '#2563D6',
  hintCandidateText: '#FFFFFF',
  hintExcluded: '#D83B57',
  hintEvidence: '#DCE8FF',
  error: '#B73932',
  errorSoft: '#F8DEDB',
  white: '#FFFFFF',
  overlay: 'rgba(24, 32, 29, 0.82)',
  focus: '#2563D6',
  focusExact: '#BDD2FF',
  focusSoft: '#DCE8FF',
  focusText: '#FFFFFF',
} as const;

export type AppPalette = {
  [Key in keyof typeof lightPalette]: string;
};

export const darkPalette: AppPalette = {
  background: '#121714',
  surface: '#1B221F',
  surfaceStrong: '#252D29',
  ink: '#F2F5F1',
  muted: '#AAB5AE',
  line: '#66716A',
  lineStrong: '#D7DED9',
  accent: '#56B79B',
  accentSoft: '#23463C',
  accentWarm: '#F0B35C',
  selected: '#315E50',
  peer: '#1F382F',
  sameDigit: '#2B5145',
  hintRegion: '#263C34',
  hintDim: '#181D1B',
  hintMask: 'rgba(0, 0, 0, 0.62)',
  hintEstablished: '#6A541F',
  hintResult: '#755B1C',
  hintCandidate: '#4C83E7',
  hintCandidateText: '#FFFFFF',
  hintExcluded: '#FF6B83',
  hintEvidence: '#243A62',
  error: '#E0625B',
  errorSoft: '#4A2524',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.84)',
  focus: '#4C83E7',
  focusExact: '#31558F',
  focusSoft: '#243A62',
  focusText: '#FFFFFF',
};

// Legacy screens use the light palette until their phase 6 theme migration.
export const palette = lightPalette;

export type ResolvedTheme = 'light' | 'dark';

type ThemeValue = {
  mode: ResolvedTheme;
  palette: AppPalette;
  statusBarStyle: StatusBarStyle;
};

const DEFAULT_THEME: ThemeValue = {
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
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}): React.JSX.Element {
  const systemTheme = useColorScheme();
  const mode = resolveTheme(preference, systemTheme);
  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      palette: mode === 'dark' ? darkPalette : lightPalette,
      statusBarStyle: mode === 'dark' ? 'light-content' : 'dark-content',
    }),
    [mode],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeValue {
  return useContext(ThemeContext);
}
