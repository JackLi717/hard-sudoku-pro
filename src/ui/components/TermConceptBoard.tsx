import { LocalizedText as Text } from './LocalizedText';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { addCandidate } from '../../domain/sudoku/board';
import type { HintPageVisuals } from '../../domain/hints/presentation';
import type { Digit } from '../../domain/sudoku/contracts';
import type { TermScene } from '../../data/lessons/term-concepts';
import { useLocalization } from '../../localization';
import { TERM_CONCEPT_UI } from '../../localization/term-concept-copy';
import { useAppTheme } from '../theme';
import { SudokuBoard, type SudokuBoardState } from './SudokuBoard';

function boardState(scene: TermScene): SudokuBoardState {
  const values: (Digit | null)[] = Array(81).fill(null);
  const masks: number[] = Array(81).fill(0);
  for (const value of scene.values) values[value.cell] = value.digit;
  for (const candidate of scene.candidates) {
    if (values[candidate.cell] === null) {
      masks[candidate.cell] = addCandidate(
        masks[candidate.cell],
        candidate.digit,
      );
    }
  }
  return {
    values,
    givens: [...values],
    selectedCell: scene.referenceCell ?? null,
    incorrectCells: [],
    annotations: [],
    status: 'active',
    activeHint: null,
    candidates: {
      manualCandidates: masks,
      quickCandidates: masks,
      hintCandidates: masks,
      hintCandidateOrigin: 'quick',
      appliedHintSteps: [],
      inferenceEliminations: [],
      activeCandidateSource: 'quick',
      pencilMode: false,
      quickDraftGenerated: true,
      quickDraftBoardFingerprint: null,
      hintBoardFingerprint: null,
    },
  };
}

function visuals(scene: TermScene, phase: 0 | 1 | 2): HintPageVisuals {
  const fishRegions = scene.regions?.filter(
    mark => mark.role === 'fishBase' || mark.role === 'fishCover',
  );
  const regions =
    phase === 0
      ? []
      : phase === 1 && fishRegions?.length
      ? fishRegions.filter(mark => mark.role === 'fishBase')
      : scene.regions ?? [];
  return {
    diagramDigit: scene.diagramDigit,
    showFocusCells: phase > 0,
    showFocusRegions: phase > 0,
    showPremises: false,
    showEliminations: false,
    showPlacements: false,
    regionMarks: regions,
    focusCells:
      phase > 0
        ? [
            ...new Set([
              ...scene.focus.map(item => item.cell),
              ...(scene.relatedCells ?? []),
            ]),
          ]
        : [],
    candidateMarks:
      phase > 0
        ? scene.focus.map(item => ({ ...item, role: 'potential' as const }))
        : [],
    finCandidates: phase === 2 ? scene.fins : [],
    links: phase === 2 ? scene.links : [],
    colorMarks: phase > 0 ? scene.colors : [],
    showColorLegend: phase > 0 && Boolean(scene.colors?.length),
    candidateGroups:
      phase === 2 && scene.group ? [{ id: 1, candidates: scene.group }] : [],
    candidateGroupLabels:
      phase === 2 && scene.group ? [{ id: 1, label: 'G' }] : [],
    cellMarks:
      phase === 2 && scene.target
        ? [{ cell: scene.target.cell, role: 'eliminationTarget' }]
        : [],
  };
}

/** The same board, semantic marks, legends and active theme used by hint proofs. */
export function TermConceptBoard({
  scene,
  phase = 2,
  label,
}: {
  scene: TermScene;
  phase?: 0 | 1 | 2;
  label: string;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const { palette } = useAppTheme();
  const copy = TERM_CONCEPT_UI[locale];
  const colorStyles = useMemo(
    () =>
      StyleSheet.create({
        branch: {
          borderColor: palette.panelBorder,
          backgroundColor: palette.panelSurface,
        },
        text: { color: palette.ink },
      }),
    [palette],
  );
  const state = useMemo(() => boardState(scene), [scene]);
  const hintVisuals = useMemo(() => visuals(scene, phase), [scene, phase]);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={styles.container}
      testID="term-concept-board"
    >
      <SudokuBoard
        state={state}
        hintVisuals={hintVisuals}
        maxSize={360}
        disabled
        accessibilityHidden
        onSelectCell={() => {}}
        highlightSameDigit={false}
        highlightRegions={false}
        showHintLegend
        hintAnimations={false}
        hintSpotlight={false}
      />
      {scene.branchResults && phase === 2 ? (
        <View style={styles.branches} testID="term-branch-results">
          {scene.branchResults.map((removed, index) => (
            <View key={index} style={[styles.branch, colorStyles.branch]}>
              <Text style={[styles.branchText, colorStyles.text]}>
                {copy.branch} {String.fromCharCode(65 + index)} →{' '}
                {removed ? copy.removed : copy.remains}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {scene.checkedBranches !== undefined && phase === 2 ? (
        <View style={styles.branches} testID="term-checked-branches">
          {scene.focus.map((_, index) => (
            <View key={index} style={[styles.branch, colorStyles.branch]}>
              <Text style={[styles.branchText, colorStyles.text]}>
                {copy.branch} {String.fromCharCode(65 + index)} →{' '}
                {index < (scene.checkedBranches ?? 0)
                  ? copy.covered
                  : copy.notCovered}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    direction: 'ltr',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  branches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  branch: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  branchText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
