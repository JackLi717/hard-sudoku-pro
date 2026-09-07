import { StyleSheet } from 'react-native';
import { BoardTheme } from './board-theme';

export function createBoardStyles(
  theme: BoardTheme,
  textScale = 1,
  boardSize = 366,
) {
  const { colors: palette, marks } = theme;
  const candidateSlotSize = boardSize / 27;
  const candidateFontSize = Math.max(
    9.5,
    Math.min(12 * textScale, candidateSlotSize - 2.5),
  );
  const candidateLineHeight = Math.min(
    candidateFontSize + 1.2,
    candidateSlotSize - 0.5,
  );

  return StyleSheet.create({
    boardContainer: { alignSelf: 'center' },
    fishBaseSwatch: { backgroundColor: palette.fishBase },
    fishCoverSwatch: { backgroundColor: palette.fishCover },
    fishLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 10,
      paddingBottom: 2,
    },
    fishLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    fishLegendSwatch: { width: 16, height: 12 },
    fishLegendText: {
      color: palette.ink,
      fontSize: 12 * textScale,
      flexShrink: 1,
    },
    board: {
      alignSelf: 'center',
      overflow: 'visible',
      position: 'relative',
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
    },
    selection: {
      position: 'absolute',
      inset: 2,
      borderWidth: marks.selectionWidth,
      borderColor: palette.focus,
      zIndex: 6,
    },
    cellRoleFill: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    value: {
      fontSize: 28 * textScale,
      fontVariant: ['tabular-nums'],
      lineHeight: 33 * textScale,
    },
    given: {
      color: palette.ink,
      fontWeight: '800',
    },
    player: {
      color: palette.accent,
      fontWeight: '600',
    },
    error: {
      color: palette.error,
      textDecorationLine: 'underline',
    },
    valueEvidence: {
      color: palette.hintCandidate,
      fontWeight: '900',
    },
    valueFocusContext: {
      color: palette.focus,
      fontWeight: '800',
    },
    unfocusedCandidate: { opacity: 0.35 },
    teachingColorFrame: { position: 'absolute', borderWidth: 2 },
    teachingColorRounded: { borderRadius: 5 },
    teachingGroupFrame: {
      position: 'absolute',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.hintCandidate,
    },
    teachingColorLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: palette.ink,
      backgroundColor: palette.surface,
      alignSelf: 'flex-start',
    },
    teachingGroupLabel: {
      fontSize: 9,
      color: palette.ink,
      backgroundColor: palette.surface,
      alignSelf: 'flex-end',
    },
    candidateGrid: {
      height: '100%',
      position: 'relative',
      width: '100%',
    },
    candidateSlot: {
      alignItems: 'center',
      height: '33.333333%',
      justifyContent: 'center',
      position: 'absolute',
      width: '33.333333%',
    },
    candidateFocusSlot: {
      backgroundColor: palette.focus,
      borderRadius: marks.candidateRadius,
    },
    candidateBadge: {
      alignItems: 'center',
      aspectRatio: 1,
      borderRadius: marks.candidateRadius,
      justifyContent: 'center',
      position: 'relative',
      width: '90%',
    },
    uniqueNoteBadge: {
      borderWidth: 1,
      borderColor: palette.focusText,
    },
    candidateDigit: {
      color: palette.muted,
      fontSize: candidateFontSize,
      fontVariant: ['tabular-nums'],
      lineHeight: candidateLineHeight,
      textAlign: 'center',
    },
    candidateFocusDigit: {
      color: palette.focusText,
      fontWeight: '900',
    },
    candidatePremise: {
      color: palette.hintCandidateText,
      fontWeight: '900',
    },
    candidatePremiseBadge: {
      backgroundColor: palette.hintCandidate,
    },
    candidateElimination: {
      color: palette.hintExcluded,
      backgroundColor: palette.excludedSoft,
      fontWeight: '900',
    },
    eliminationStrike: {
      backgroundColor: palette.hintExcluded,
      borderRadius: 1,
      height: marks.strikeWidth,
      transform: [{ rotate: marks.strikeAngle }],
      left: '-14%',
      position: 'absolute',
      top: '45%',
      width: '128%',
    },
    hypotheticalValue: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      margin: 3,
      borderRadius: 3,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    hypotheticalDigit: { color: palette.assumption },
    hypotheticalMark: {
      color: palette.ink,
      fontSize: 12 * textScale,
      fontWeight: '700',
      alignSelf: 'flex-start',
    },
    placementResult: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    placementMark: {
      color: palette.accent,
      fontSize: 12 * textScale,
      fontWeight: '900',
      marginRight: 1,
    },
    placementDigit: {
      color: palette.accent,
      fontSize: 24 * textScale,
      fontWeight: '900',
    },
    linkLayer: { ...StyleSheet.absoluteFill, zIndex: 3 },
    hintLink: { position: 'absolute', height: 2, borderRadius: 1 },
    diagramBox: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: palette.hintCandidate,
      zIndex: 5,
    },
    emptyRectangleHatch: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    emptyRectangleStripe: {
      position: 'absolute',
      left: '-50%',
      width: '200%',
      height: 1.5,
      backgroundColor: palette.hatch,
      opacity: marks.hatchOpacity,
      transform: [{ rotate: '-45deg' }],
    },
    diagramCandidate: {
      width: '74%',
      height: '74%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    diagramExcluded: {
      borderColor: palette.hintExcluded,
      backgroundColor: palette.excludedSoft,
    },
    diagramPlainDigit: { color: palette.hintCandidate },
    diagramCircle: {
      // Teaching diagrams use a true circle; the theme radius is for the
      // compact candidate badges rendered in the normal 3x3 note grid.
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: palette.hintCandidate,
      backgroundColor: palette.hintCandidate,
    },
    diagramDigit: {
      fontSize: 20 * textScale,
      color: palette.hintCandidateText,
      fontWeight: '600',
    },
    diagramStrike: {
      position: 'absolute',
      width: '90%',
      height: marks.strikeWidth,
      backgroundColor: palette.hintExcluded,
      transform: [{ rotate: marks.strikeAngle }],
    },
    diagramStrikePrior: {
      backgroundColor: palette.muted,
      opacity: marks.contextOpacity,
    },
    diagramHypothetical: {
      borderRadius: marks.candidateRadius,
      borderStyle: 'dashed',
    },
    kiteBackground: { opacity: marks.contextOpacity },
    hintLinkStructure: { opacity: 0.85 },
    hintLinkActive: { opacity: 0.9 },
    hintLinkTarget: { opacity: 0.3 },
    hintLinkContext: { opacity: 0.55 },
    stableSpotlight: { opacity: 1 },
    hintQuestion: { borderStyle: 'dashed' },
    hintSelectedQuestion: {
      borderStyle: 'solid',
      borderWidth: 3,
    },
    hintTarget: {
      borderColor: palette.hintCandidate,
      borderRadius: 2,
      borderWidth: 2,
      bottom: 3,
      left: 3,
      position: 'absolute',
      right: 3,
      top: 3,
    },
    spotlightMask: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 2,
    },
    spotlightMaskRun: {
      backgroundColor: palette.hintMask,
      position: 'absolute',
    },
    gridLine: {
      backgroundColor: palette.lineStrong,
      position: 'absolute',
      zIndex: 4,
    },
  });
}
