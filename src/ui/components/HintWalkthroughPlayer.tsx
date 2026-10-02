import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { HintStep } from '../../domain/hints/contracts';
import type { HintPresentation } from '../../domain/hints/presentation';
import type {
  Board,
  CandidateGrid,
  CandidateRef,
  CellIndex,
} from '../../domain/sudoku/contracts';
import { createBoardFingerprint } from '../../domain/sudoku/board';
import { fitSquareWithin } from '../layout/adaptive-layout';
import { AppPalette, useAppTheme } from '../theme';
import {
  SudokuBoard,
  SudokuBoardHintLegend,
  SudokuBoardState,
} from './SudokuBoard';

/** A validated, immutable starting position; no solution or game session. */
export type HintWalkthroughSnapshot = Readonly<{
  id: string;
  values: Board;
  givens: Board;
  candidateMasks: CandidateGrid;
  step: HintStep;
}>;

export type HintWalkthroughLabels = Readonly<{
  step: string;
  back: string;
  next: string;
  restart: string;
}>;

export type HintWalkthroughPlayerProps = {
  snapshot: HintWalkthroughSnapshot;
  presentation: HintPresentation;
  /** The caller owns playback state, including reset when changing examples. */
  pageIndex: number;
  onPageChange(pageIndex: number): void;
  labels: HintWalkthroughLabels;
  /** Only these candidates may request a different proof from the caller. */
  targets?: readonly CandidateRef[];
  onSelectTarget?(target: CandidateRef): void;
  proofSupplement?: React.ReactNode;
  /** Surrounding catalog, course or acceptance UI remains caller-owned. */
  renderHeader?(sideBySide: boolean): React.ReactNode;
  renderFooter?(sideBySide: boolean): React.ReactNode;
  testID?: string;
};

type LayoutSize = { width: number; height: number };
const EMPTY_LAYOUT: LayoutSize = { width: 0, height: 0 };

export function hintWalkthroughWorkspaceLayout(width: number, height: number) {
  // Use the safe-area container, including in split-screen, on either platform.
  const sideBySide = width > height && width >= 720 && height >= 240;
  const infoWidth = sideBySide
    ? Math.min(520, Math.max(300, (width - 52) * 0.42))
    : 0;
  return {
    sideBySide,
    infoWidth,
    boardPaneWidth: sideBySide ? width - 52 - infoWidth : width,
  };
}

export function hintWalkthroughBoardMaxSize(
  paneWidth: number,
  availableHeight: number,
  sideBySide: boolean,
): number {
  return fitSquareWithin({
    availableWidth: paneWidth,
    availableHeight,
    horizontalInset: sideBySide ? 8 : 32,
    verticalInset: 16,
    maxSize: sideBySide ? 620 : 700,
  });
}

function measuredSize(event: LayoutChangeEvent): LayoutSize {
  const { width, height } = event.nativeEvent.layout;
  return { width, height };
}

function sameSize(first: LayoutSize, second: LayoutSize) {
  return first.width === second.width && first.height === second.height;
}

function walkthroughBoardState(
  snapshot: HintWalkthroughSnapshot,
): SudokuBoardState {
  const fingerprint = createBoardFingerprint(snapshot.values);
  // Preserve the board's existing focus and hint-layer conventions.
  const firstGivenCell = snapshot.givens.findIndex(value => value !== null);
  return {
    values: [...snapshot.values],
    givens: [...snapshot.givens],
    selectedCell: firstGivenCell === -1 ? null : firstGivenCell,
    incorrectCells: [],
    annotations: [],
    status: 'active',
    activeHint: snapshot.step,
    candidates: {
      manualCandidates: [...snapshot.candidateMasks],
      quickCandidates: [...snapshot.candidateMasks],
      hintCandidates: [...snapshot.candidateMasks],
      hintCandidateOrigin: 'quick',
      appliedHintSteps: [],
      inferenceEliminations: [],
      activeCandidateSource: 'quick',
      pencilMode: false,
      quickDraftGenerated: true,
      quickDraftBoardFingerprint: fingerprint,
      hintBoardFingerprint: fingerprint,
    },
  };
}

/** Read-only proof playback. All navigation and target changes are requests. */
export function HintWalkthroughPlayer({
  snapshot,
  presentation,
  pageIndex,
  onPageChange,
  labels,
  targets,
  onSelectTarget,
  proofSupplement,
  renderHeader,
  renderFooter,
  testID = 'hint-walkthrough',
}: HintWalkthroughPlayerProps): React.JSX.Element {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const state = useMemo(() => walkthroughBoardState(snapshot), [snapshot]);
  const [workspaceSize, setWorkspaceSize] = useState(EMPTY_LAYOUT);
  const [boardPaneSize, setBoardPaneSize] = useState(EMPTY_LAYOUT);
  const workspace = hintWalkthroughWorkspaceLayout(
    workspaceSize.width,
    workspaceSize.height,
  );
  const { sideBySide } = workspace;
  const onWorkspaceLayout = (event: LayoutChangeEvent) => {
    const next = measuredSize(event);
    setWorkspaceSize(current => (sameSize(current, next) ? current : next));
  };
  const onBoardPaneLayout = (event: LayoutChangeEvent) => {
    const next = measuredSize(event);
    setBoardPaneSize(current => (sameSize(current, next) ? current : next));
  };
  // Cap stale measurements during rotation until the pane reports its new size.
  const boardMaxSize = hintWalkthroughBoardMaxSize(
    Math.min(boardPaneSize.width, workspace.boardPaneWidth),
    sideBySide
      ? Math.min(boardPaneSize.height, workspaceSize.height)
      : workspaceSize.width > workspaceSize.height
      ? workspaceSize.height
      : Infinity,
    sideBySide,
  );
  const page = presentation.pages[pageIndex];
  if (!Number.isInteger(pageIndex) || !page) {
    throw new Error('Hint walkthrough requires an existing presentation page');
  }
  const selectCell = (cell: CellIndex) => {
    const target = targets?.find(candidate => candidate.cell === cell);
    if (target) onSelectTarget?.(target);
  };
  const board =
    boardMaxSize > 0 ? (
      <SudokuBoard
        key={snapshot.id}
        disabled={!targets?.length || !onSelectTarget}
        hintAnimations
        hintAnimationDurationMs={140}
        hintVisuals={page.visuals}
        maxSize={boardMaxSize}
        onSelectCell={selectCell}
        showHintLegend={!sideBySide}
        state={state}
      />
    ) : null;
  const proof = (
    <View style={[styles.proofCard, sideBySide && styles.proofCardLandscape]}>
      <Text style={styles.proofStep} testID={`${testID}-proof-step`}>
        {labels.step} {pageIndex + 1} / {presentation.pages.length}
      </Text>
      <Text style={styles.proofTitle}>{page.title}</Text>
      <Text style={styles.proofBody}>{page.body}</Text>
      {proofSupplement}
      {sideBySide ? (
        <View
          style={styles.walkthroughSideLegend}
          testID={`${testID}-walkthrough-side-legend`}
        >
          <SudokuBoardHintLegend hintVisuals={page.visuals} width="100%" />
        </View>
      ) : null}
      <View style={styles.pageButtons}>
        <Pressable
          key={`back:${pageIndex}`}
          disabled={pageIndex === 0}
          onPress={() => onPageChange(Math.max(0, pageIndex - 1))}
          style={[styles.smallButton, pageIndex === 0 && styles.buttonDisabled]}
        >
          <Text style={styles.smallButtonText}>{labels.back}</Text>
        </Pressable>
        {pageIndex < presentation.pages.length - 1 ? (
          <Pressable
            key={`next:${pageIndex}`}
            onPress={() => onPageChange(pageIndex + 1)}
            style={styles.primarySmall}
          >
            <Text style={styles.primarySmallText}>{labels.next}</Text>
          </Pressable>
        ) : (
          <Pressable
            key="restart"
            onPress={() => onPageChange(0)}
            style={styles.primarySmall}
          >
            <Text style={styles.primarySmallText}>{labels.restart}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
  const header = renderHeader?.(sideBySide);
  const footer = renderFooter?.(sideBySide);
  return (
    <View
      onLayout={onWorkspaceLayout}
      style={styles.workspace}
      testID={`${testID}-workspace`}
    >
      {sideBySide ? (
        <View
          style={styles.workspaceLandscape}
          testID={`${testID}-landscape-layout`}
        >
          <View
            onLayout={onBoardPaneLayout}
            style={styles.boardPaneLandscape}
            testID={`${testID}-landscape-board`}
          >
            {board}
          </View>
          <ScrollView
            contentContainerStyle={styles.infoContentLandscape}
            showsVerticalScrollIndicator={false}
            style={[styles.infoScrollLandscape, { width: workspace.infoWidth }]}
            testID={`${testID}-landscape-info`}
          >
            {header}
            {proof}
            {footer}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.stackedContent}>
          {header}
          <View
            style={styles.stackedWorkspace}
            testID={`${testID}-portrait-layout`}
          >
            <View
              onLayout={onBoardPaneLayout}
              style={styles.boardPane}
              testID={`${testID}-stacked-board`}
            >
              {board}
            </View>
            <View style={styles.detailPane}>
              {proof}
              {footer}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    stackedContent: { paddingBottom: 40 },
    workspace: { flex: 1 },
    stackedWorkspace: {},
    workspaceLandscape: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 20,
      paddingHorizontal: 16,
    },
    boardPane: { alignItems: 'center', paddingHorizontal: 16 },
    boardPaneLandscape: {
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    detailPane: {},
    infoScrollLandscape: {
      alignSelf: 'stretch',
      flexGrow: 0,
      flexShrink: 0,
    },
    infoContentLandscape: {
      gap: 12,
      paddingBottom: 16,
    },
    proofCard: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      margin: 14,
      padding: 16,
    },
    proofCardLandscape: { margin: 0 },
    proofStep: { color: palette.accent, fontSize: 10, fontWeight: '900' },
    proofTitle: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 9,
    },
    proofBody: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 6,
      minHeight: 63,
    },
    walkthroughSideLegend: {
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 8,
      paddingTop: 4,
      width: '100%',
    },
    pageButtons: { flexDirection: 'row', gap: 7, marginTop: 15 },
    smallButton: {
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    smallButtonText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
    primarySmall: {
      backgroundColor: palette.accent,
      borderRadius: 10,
      marginLeft: 'auto',
      paddingHorizontal: 17,
      paddingVertical: 9,
    },
    primarySmallText: { color: palette.white, fontSize: 12, fontWeight: '800' },
    buttonDisabled: { opacity: 0.35 },
  });
}
