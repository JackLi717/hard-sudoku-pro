import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OfflineGameSnapshot, ProductLocale } from '../application';
import {
  CompletionKind,
  CreditResource,
  GameDefinition,
  createGameSession,
} from '../domain';
import { DifficultyLevel } from '../domain/hints/techniques';
import { CompletionReward } from '../domain/game/progression';
import { WalletBalance } from '../data/user/user-repository';
import { useLocalization } from '../localization';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { AppPalette, useAppTheme } from '../ui/theme';

export type CompletionPreviewScenarioId =
  | 'free-perfect-first'
  | 'free-independent'
  | 'hint-assisted'
  | 'premium-normal'
  | 'premium-partial-cap'
  | 'premium-full-cap'
  | 'replay'
  | 'new-best'
  | 'not-best';

export type CompletionPreviewScenario = {
  id: CompletionPreviewScenarioId;
  label: string;
  description: string;
  snapshot: OfflineGameSnapshot;
};

type PreviewCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  close: string;
  back: string;
  previewOnly: string;
  scenarios: Readonly<
    Record<CompletionPreviewScenarioId, { label: string; description: string }>
  >;
};

const englishCopy: PreviewCopy = {
  eyebrow: 'DEVELOPMENT ONLY',
  title: 'Completion screen preview',
  subtitle:
    'Choose a fixed settlement scenario. Preview actions never change games, rewards, progress, or balances.',
  close: 'Close preview',
  back: 'Back to scenarios',
  previewOnly: 'Preview only — no game action was performed.',
  scenarios: {
    'free-perfect-first': {
      label: 'Free · perfect first completion',
      description: 'No mistakes, no assistance, and no Premium replenishment.',
    },
    'free-independent': {
      label: 'Free · independent completion',
      description:
        'Completed without smart hints, with ordinary play statistics.',
    },
    'hint-assisted': {
      label: 'Hint-assisted completion',
      description: 'Completed after using smart hints and a quick pencil.',
    },
    'premium-normal': {
      label: 'Premium · normal replenishment',
      description:
        'Both rewards are credited without reaching the inventory cap.',
    },
    'premium-partial-cap': {
      label: 'Premium · partially full',
      description:
        'One balance is full and the other receives only its remaining space.',
    },
    'premium-full-cap': {
      label: 'Premium · inventory full',
      description:
        'Both balances are already at 99, so the actual reward is zero.',
    },
    replay: {
      label: 'Repeat completion',
      description:
        'A previously completed puzzle receives no first-completion reward.',
    },
    'new-best': {
      label: 'New level best',
      description:
        'The completion time is strictly faster than the previous level best.',
    },
    'not-best': {
      label: 'No new best',
      description: 'The completion time does not beat the previous level best.',
    },
  },
};

const chineseCopy: PreviewCopy = {
  eyebrow: '仅开发模式',
  title: '完成页预览',
  subtitle: '选择固定结算场景。预览操作不会修改对局、奖励、进度或余额。',
  close: '关闭预览',
  back: '返回场景选择',
  previewOnly: '当前仅为预览，没有执行真实游戏操作。',
  scenarios: {
    'free-perfect-first': {
      label: '免费版 · 完美首次完成',
      description: '无错误、未使用辅助，也没有 Premium 补给。',
    },
    'free-independent': {
      label: '免费版 · 独立完成',
      description: '未使用智能提示，包含常规对局统计。',
    },
    'hint-assisted': {
      label: '提示辅助完成',
      description: '使用智能提示和快速铅笔后完成。',
    },
    'premium-normal': {
      label: 'Premium · 正常补给',
      description: '两种奖励正常入账，均未达到库存上限。',
    },
    'premium-partial-cap': {
      label: 'Premium · 部分满仓',
      description: '一种余额已满，另一种只补到剩余容量。',
    },
    'premium-full-cap': {
      label: 'Premium · 全部满仓',
      description: '两种余额均已达到 99，实际入账奖励为零。',
    },
    replay: {
      label: '重复完成',
      description: '题目以前已经完成，不再获得首次完成奖励。',
    },
    'new-best': {
      label: '刷新等级纪录',
      description: '本次用时严格快于此前的同难度最佳成绩。',
    },
    'not-best': {
      label: '未刷新等级纪录',
      description: '本次用时没有超过此前的同难度最佳成绩。',
    },
  },
};

const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const puzzle = `0${solution.slice(1)}`;

function copyFor(locale: ProductLocale): PreviewCopy {
  return locale === 'zh-Hans' ? chineseCopy : englishCopy;
}

function wallet(
  quickPencil: number,
  smartHint: number,
): Readonly<Record<CreditResource, WalletBalance>> {
  return {
    quick_pencil: {
      resource: 'quick_pencil',
      balance: quickPencil,
      earnedTotal: quickPencil,
      spentTotal: 0,
    },
    smart_hint: {
      resource: 'smart_hint',
      balance: smartHint,
      earnedTotal: smartHint,
      spentTotal: 0,
    },
  };
}

type ScenarioFacts = {
  id: CompletionPreviewScenarioId;
  difficultyLevel: DifficultyLevel;
  completionKind: CompletionKind;
  elapsedMs: number;
  errorCount: number;
  hintUseCount: number;
  quickPencilUseCount: number;
  reward: CompletionReward;
  walletBefore: Readonly<Record<CreditResource, WalletBalance>>;
  walletAfter: Readonly<Record<CreditResource, WalletBalance>>;
  isNewLevelBest: boolean;
  previousLevelBestTimeMs: number | null;
  totalCompletions?: number;
};

function scenarioSnapshot(facts: ScenarioFacts): OfflineGameSnapshot {
  const definition: GameDefinition = {
    puzzleId: `completion-preview-${facts.id}`,
    contentVersion: 4,
    difficultyLevel: facts.difficultyLevel,
    puzzleFingerprint: puzzle,
    solutionFingerprint: solution,
  };
  const startedAtEpochMs = 1_000_000;
  const session = createGameSession({
    sessionId: `completion-preview-${facts.id}`,
    definition,
    startedAtEpochMs,
  });
  return {
    screen: 'result',
    session: {
      ...session,
      state: {
        ...session.state,
        status: 'completed',
        values: session.state.givens.map(
          (value, index) => value ?? Number(solution[index]),
        ) as typeof session.state.values,
        selectedCell: 0,
        timer: { elapsedMs: facts.elapsedMs, runningSinceEpochMs: null },
        errorCount: facts.errorCount,
        hintUseCount: facts.hintUseCount,
        quickPencilUseCount: facts.quickPencilUseCount,
        usedSmartHint: facts.hintUseCount > 0,
        completionKind: facts.completionKind,
        updatedAtEpochMs: startedAtEpochMs + facts.elapsedMs,
      },
    },
    puzzle: null,
    resumable: false,
    busy: false,
    message: null,
    replacementRequest: null,
    quickDraftConfirmation: false,
    wallet: facts.walletAfter,
    statistics: {
      attempts: 24,
      completions: facts.totalCompletions ?? 18,
      failures: 2,
      abandonments: 4,
      totalElapsedMs: 5_400_000,
      totalHintsUsed: 7,
      totalQuickPencilsUsed: 9,
    },
    completedByLevel: { 1: 5, 2: 4, 3: 4, 4: 3, 5: 2 },
    reward: facts.reward,
    completionResult: {
      isFirstCompletion: facts.reward.isFirstCompletion,
      isNewLevelBest: facts.isNewLevelBest,
      previousLevelBestTimeMs: facts.previousLevelBestTimeMs,
      reward: facts.reward,
      walletBefore: facts.walletBefore,
      walletAfter: facts.walletAfter,
    },
  };
}

export function createCompletionPreviewScenarios(
  locale: ProductLocale,
): readonly CompletionPreviewScenario[] {
  const copy = copyFor(locale);
  const freeReward: CompletionReward = {
    isFirstCompletion: true,
    premiumAtCompletion: false,
    quickPencil: 0,
    smartHint: 0,
  };
  const replayReward: CompletionReward = {
    isFirstCompletion: false,
    premiumAtCompletion: false,
    quickPencil: 0,
    smartHint: 0,
  };
  const facts: readonly ScenarioFacts[] = [
    {
      id: 'free-perfect-first',
      difficultyLevel: 1,
      completionKind: 'perfect',
      elapsedMs: 68_000,
      errorCount: 0,
      hintUseCount: 0,
      quickPencilUseCount: 0,
      reward: freeReward,
      walletBefore: wallet(3, 5),
      walletAfter: wallet(3, 5),
      isNewLevelBest: true,
      previousLevelBestTimeMs: null,
    },
    {
      id: 'free-independent',
      difficultyLevel: 2,
      completionKind: 'independent',
      elapsedMs: 193_000,
      errorCount: 1,
      hintUseCount: 0,
      quickPencilUseCount: 1,
      reward: freeReward,
      walletBefore: wallet(2, 5),
      walletAfter: wallet(2, 5),
      isNewLevelBest: false,
      previousLevelBestTimeMs: 180_000,
    },
    {
      id: 'hint-assisted',
      difficultyLevel: 3,
      completionKind: 'hint_assisted',
      elapsedMs: 315_000,
      errorCount: 0,
      hintUseCount: 2,
      quickPencilUseCount: 1,
      reward: freeReward,
      walletBefore: wallet(2, 3),
      walletAfter: wallet(2, 3),
      isNewLevelBest: false,
      previousLevelBestTimeMs: 260_000,
    },
    {
      id: 'premium-normal',
      difficultyLevel: 3,
      completionKind: 'independent',
      elapsedMs: 245_000,
      errorCount: 1,
      hintUseCount: 0,
      quickPencilUseCount: 2,
      reward: {
        isFirstCompletion: true,
        premiumAtCompletion: true,
        quickPencil: 1,
        smartHint: 3,
      },
      walletBefore: wallet(8, 12),
      walletAfter: wallet(9, 15),
      isNewLevelBest: true,
      previousLevelBestTimeMs: 300_000,
    },
    {
      id: 'premium-partial-cap',
      difficultyLevel: 5,
      completionKind: 'independent',
      elapsedMs: 720_000,
      errorCount: 2,
      hintUseCount: 0,
      quickPencilUseCount: 3,
      reward: {
        isFirstCompletion: true,
        premiumAtCompletion: true,
        quickPencil: 0,
        smartHint: 1,
      },
      walletBefore: wallet(99, 98),
      walletAfter: wallet(99, 99),
      isNewLevelBest: false,
      previousLevelBestTimeMs: 680_000,
    },
    {
      id: 'premium-full-cap',
      difficultyLevel: 5,
      completionKind: 'perfect',
      elapsedMs: 610_000,
      errorCount: 0,
      hintUseCount: 0,
      quickPencilUseCount: 0,
      reward: {
        isFirstCompletion: true,
        premiumAtCompletion: true,
        quickPencil: 0,
        smartHint: 0,
      },
      walletBefore: wallet(99, 99),
      walletAfter: wallet(99, 99),
      isNewLevelBest: true,
      previousLevelBestTimeMs: 680_000,
    },
    {
      id: 'replay',
      difficultyLevel: 2,
      completionKind: 'independent',
      elapsedMs: 205_000,
      errorCount: 1,
      hintUseCount: 0,
      quickPencilUseCount: 1,
      reward: replayReward,
      walletBefore: wallet(7, 11),
      walletAfter: wallet(7, 11),
      isNewLevelBest: false,
      previousLevelBestTimeMs: 180_000,
    },
    {
      id: 'new-best',
      difficultyLevel: 4,
      completionKind: 'perfect',
      elapsedMs: 360_000,
      errorCount: 0,
      hintUseCount: 0,
      quickPencilUseCount: 0,
      reward: replayReward,
      walletBefore: wallet(7, 11),
      walletAfter: wallet(7, 11),
      isNewLevelBest: true,
      previousLevelBestTimeMs: 420_000,
      totalCompletions: 20,
    },
    {
      id: 'not-best',
      difficultyLevel: 4,
      completionKind: 'independent',
      elapsedMs: 390_000,
      errorCount: 2,
      hintUseCount: 0,
      quickPencilUseCount: 2,
      reward: freeReward,
      walletBefore: wallet(6, 10),
      walletAfter: wallet(6, 10),
      isNewLevelBest: false,
      previousLevelBestTimeMs: 300_000,
    },
  ];
  return facts.map(item => ({
    id: item.id,
    label: copy.scenarios[item.id].label,
    description: copy.scenarios[item.id].description,
    snapshot: scenarioSnapshot(item),
  }));
}

export function CompletionResultPreview({
  onClose,
}: {
  onClose(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const copy = copyFor(locale);
  const scenarios = useMemo(
    () => createCompletionPreviewScenarios(locale),
    [locale],
  );
  const [selectedId, setSelectedId] =
    useState<CompletionPreviewScenarioId | null>(null);
  const [previewNotice, setPreviewNotice] = useState(false);
  const selected = scenarios.find(item => item.id === selectedId) ?? null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (selectedId) {
          setSelectedId(null);
          setPreviewNotice(false);
        } else {
          onClose();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose, selectedId]);

  if (selected) {
    const previewAction = () => setPreviewNotice(true);
    return (
      <View style={styles.resultRoot} testID="completion-preview-result">
        <View style={styles.previewBar}>
          <View style={styles.previewBarCopy}>
            <Text style={styles.previewBarEyebrow}>{copy.eyebrow}</Text>
            <Text numberOfLines={2} style={styles.previewBarTitle}>
              {selected.label}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSelectedId(null);
              setPreviewNotice(false);
            }}
            style={styles.barButton}
            testID="completion-preview-back"
          >
            <Text style={styles.barButtonText}>{copy.back}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.barButton}
            testID="completion-preview-close-result"
          >
            <Text style={styles.barButtonText}>{copy.close}</Text>
          </Pressable>
        </View>
        {previewNotice ? (
          <Text accessibilityLiveRegion="polite" style={styles.previewNotice}>
            {copy.previewOnly}
          </Text>
        ) : null}
        <View style={styles.resultContent}>
          <ResultScreen
            onNewGame={previewAction}
            onNext={previewAction}
            onOpenReplay={previewAction}
            onRetry={previewAction}
            onStartLevel={previewAction}
            snapshot={selected.snapshot}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.selectorContent}
      testID="completion-preview-selector"
    >
      <View style={styles.selectorHeader}>
        <View style={styles.selectorHeaderCopy}>
          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.closeButton}
          testID="completion-preview-close"
        >
          <Text style={styles.closeButtonText}>{copy.close}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
      <View style={styles.scenarioList}>
        {scenarios.map((scenario, index) => (
          <Pressable
            accessibilityHint={scenario.description}
            accessibilityLabel={scenario.label}
            accessibilityRole="button"
            key={scenario.id}
            onPress={() => setSelectedId(scenario.id)}
            style={({ pressed }) => [
              styles.scenario,
              index > 0 && styles.scenarioBorder,
              pressed && styles.pressed,
            ]}
            testID={`completion-preview-scenario-${scenario.id}`}
          >
            <View style={styles.scenarioCopy}>
              <Text style={styles.scenarioLabel}>{scenario.label}</Text>
              <Text style={styles.scenarioDescription}>
                {scenario.description}
              </Text>
            </View>
            <Text allowFontScaling={false} style={styles.arrow}>
              ›
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    selectorContent: {
      backgroundColor: palette.background,
      flexGrow: 1,
      paddingBottom: 32,
      paddingHorizontal: 22,
      paddingTop: 20,
    },
    selectorHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    selectorHeaderCopy: { flex: 1 },
    eyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    title: {
      color: palette.ink,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 5,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
      maxWidth: 620,
    },
    closeButton: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    closeButtonText: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: '700',
    },
    scenarioList: {
      backgroundColor: palette.surface,
      borderRadius: 18,
      marginTop: 22,
      overflow: 'hidden',
    },
    scenario: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 74,
      paddingHorizontal: 17,
      paddingVertical: 13,
    },
    scenarioBorder: {
      borderColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    scenarioCopy: { flex: 1 },
    scenarioLabel: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '800',
    },
    scenarioDescription: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3,
    },
    arrow: {
      color: palette.muted,
      fontSize: 24,
      marginLeft: 12,
    },
    pressed: { opacity: 0.68 },
    resultRoot: {
      backgroundColor: palette.background,
      flex: 1,
    },
    previewBar: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    previewBarCopy: { flex: 1 },
    previewBarEyebrow: {
      color: palette.accent,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },
    previewBarTitle: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },
    barButton: {
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      maxWidth: 112,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    barButtonText: {
      color: palette.ink,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    previewNotice: {
      backgroundColor: palette.hintResult,
      color: palette.ink,
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 14,
      paddingVertical: 8,
      textAlign: 'center',
    },
    resultContent: { flex: 1 },
  });
}
