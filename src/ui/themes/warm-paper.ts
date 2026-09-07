import type { AppPalette, ResolvedTheme } from '../theme';
import { BoardTheme } from './board-theme';
import { AppTheme } from './app-theme';

const lightHintColors = {
  hintRegion: '#E7EEFC',
  hintDim: '#ECEEE9',
  hintMask: 'rgba(236, 238, 233, 0.55)',
  hintEstablished: '#D8EEE6',
  hintResult: '#D8EEE6',
  hintCandidate: '#2563D6',
  hintCandidateText: '#FFFFFF',
  hintExcluded: '#B7394F',
  hintEvidence: '#E7EEFC',
  assumption: '#7552AD',
  assumptionSoft: '#EFE9F7',
  hatch: '#B7BFB7',
  excludedSoft: '#F9E6E9',
  groupA: '#2563D6',
  groupB: '#7552AD',
};

const darkHintColors: typeof lightHintColors = {
  hintRegion: '#253B5C',
  hintDim: '#202823',
  hintMask: 'rgba(32, 40, 35, 0.55)',
  hintEstablished: '#23463C',
  hintResult: '#23463C',
  hintCandidate: '#8CB4FF',
  hintCandidateText: '#152643',
  hintExcluded: '#FF91A2',
  hintEvidence: '#253B5C',
  assumption: '#C5A6EE',
  assumptionSoft: '#352B46',
  hatch: '#56655B',
  excludedSoft: '#482A33',
  groupA: '#8CB4FF',
  groupB: '#C5A6EE',
};

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
  hintRegion: lightHintColors.hintRegion,
  hintDim: lightHintColors.hintDim,
  hintMask: lightHintColors.hintMask,
  hintEstablished: lightHintColors.hintEstablished,
  hintResult: lightHintColors.hintResult,
  hintCandidate: lightHintColors.hintCandidate,
  hintCandidateText: lightHintColors.hintCandidateText,
  hintExcluded: lightHintColors.hintExcluded,
  hintEvidence: lightHintColors.hintEvidence,
  error: '#B73932',
  errorSoft: '#F8DEDB',
  white: '#FFFFFF',
  modalBackdrop: 'rgba(24, 29, 32, 0.62)',
  overlay: 'rgba(24, 32, 29, 0.82)',
  focus: lightHintColors.hintCandidate,
  focusExact: '#BDD2FF',
  focusSoft: '#DCE8FF',
  focusText: lightHintColors.hintCandidateText,
} as const;

export const darkPalette: AppPalette = {
  background: '#121714',
  surface: '#1B221F',
  surfaceStrong: '#252D29',
  ink: '#F2F5F1',
  muted: '#AAB5AE',
  line: '#66716A',
  lineStrong: '#D7DED9',
  accent: '#77CDB0',
  accentSoft: '#23463C',
  accentWarm: '#F0B35C',
  selected: '#315E50',
  peer: '#1F382F',
  sameDigit: '#2B5145',
  hintRegion: darkHintColors.hintRegion,
  hintDim: darkHintColors.hintDim,
  hintMask: darkHintColors.hintMask,
  hintEstablished: darkHintColors.hintEstablished,
  hintResult: darkHintColors.hintResult,
  hintCandidate: darkHintColors.hintCandidate,
  hintCandidateText: darkHintColors.hintCandidateText,
  hintExcluded: darkHintColors.hintExcluded,
  hintEvidence: darkHintColors.hintEvidence,
  error: '#E0625B',
  errorSoft: '#4A2524',
  white: '#FFFFFF',
  modalBackdrop: 'rgba(0, 0, 0, 0.62)',
  overlay: 'rgba(0, 0, 0, 0.84)',
  focus: darkHintColors.hintCandidate,
  focusExact: '#31558F',
  focusSoft: '#243A62',
  focusText: darkHintColors.hintCandidateText,
};

/** The current warm-paper theme; shared app surfaces remain inherited. */
function createBoardTheme(base: AppPalette, mode: ResolvedTheme): BoardTheme {
  const colors = mode === 'dark' ? darkHintColors : lightHintColors;
  return {
    colors: {
      ...base,
      ...colors,
      focus: colors.hintCandidate,
      focusText: colors.hintCandidateText,
    },
    marks: {
      selectionWidth: 2,
      candidateRadius: 4,
      strikeWidth: 2,
      strikeAngle: '-40deg',
      hatchOpacity: 0.65,
      contextOpacity: 0.45,
    },
  };
}

export const warmPaperTheme: AppTheme = {
  id: 'warm-paper',
  name: '暖纸',
  appearances: {
    light: {
      palette: lightPalette,
      boardTheme: createBoardTheme(lightPalette, 'light'),
    },
    dark: {
      palette: darkPalette,
      boardTheme: createBoardTheme(darkPalette, 'dark'),
    },
  },
};
