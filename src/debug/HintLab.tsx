import { useScreenState, useScreenScroll } from '../ui/screen-state';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ENGLISH_HINT_PRESENTATION_COPY,
  CandidateRef,
  CellIndex,
  HintPresentationCopy,
  buildHintPresentation,
} from '../domain';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../localization';
import { SudokuBoard } from '../ui/components/SudokuBoard';
import { AppPalette, useAppTheme } from '../ui/theme';
import { hintLabExampleLabel } from './hint-lab-labels';
import {
  HINT_LAB_ALL_FIXTURES as HINT_LAB_FIXTURES,
  HintLabFixture,
  createHintLabSession,
} from './hint-lab';
import {
  HintLabRecord,
  HintLabStatus,
  HintLabStore,
  emptyHintLabRecord,
} from './hint-lab-store';

type HintLabProps = { onClose(): void };
type LabRoute = { kind: 'catalog' } | { kind: 'fixture'; index: number };

const TECHNIQUE_GROUPS = [
  ...new Set(HINT_LAB_FIXTURES.map(fixture => fixture.techniqueCode)),
].map(code =>
  HINT_LAB_FIXTURES.map((fixture, index) => ({ fixture, index })).filter(
    item => item.fixture.techniqueCode === code,
  ),
);

const STATUS_LABELS: Readonly<Record<HintLabStatus, string>> = {
  untested: 'Untested',
  passed: 'Passed',
  issue: 'Issue',
  retest: 'Retest',
};

function techniqueName(
  fixture: HintLabFixture,
  copy: HintPresentationCopy = ENGLISH_HINT_PRESENTATION_COPY,
): string {
  return copy.techniques[fixture.techniqueCode].name;
}

function buildReport(records: ReadonlyMap<string, HintLabRecord>): string {
  const lines = [
    '# Hint Lab Acceptance Report',
    '',
    `Fixtures: ${HINT_LAB_FIXTURES.length}`,
    `Passed: ${
      HINT_LAB_FIXTURES.filter(
        fixture => records.get(fixture.id)?.status === 'passed',
      ).length
    }`,
    '',
  ];
  for (const fixture of HINT_LAB_FIXTURES) {
    const record = records.get(fixture.id) ?? emptyHintLabRecord(fixture.id);
    lines.push(
      `- [${record.status === 'passed' ? 'x' : ' '}] L${
        fixture.difficultyLevel
      } ${techniqueName(fixture)} (${fixture.techniqueCode}) — ${
        STATUS_LABELS[record.status]
      }${record.note ? ` — ${record.note}` : ''}`,
    );
  }
  return lines.join('\n');
}

function Catalog({
  level,
  status,
  setLevel,
  setStatus,
  records,
  selectedExamples,
  onBack,
  onOpen,
  onShare,
}: {
  level: number | null;
  status: HintLabStatus | null;
  setLevel(level: number | null): void;
  setStatus(status: HintLabStatus | null): void;
  records: ReadonlyMap<string, HintLabRecord>;
  selectedExamples: Readonly<Record<string, string>>;
  onBack(): void;
  onOpen(index: number): void;
  onShare(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const styles = useHintLabStyles();
  const presentationCopy = HINT_PRESENTATION_COPIES[locale];
  const groups = TECHNIQUE_GROUPS.filter(
    group =>
      (level === null || group[0].fixture.difficultyLevel === level) &&
      group.some(
        ({ fixture }) =>
          status === null ||
          (records.get(fixture.id)?.status ?? 'untested') === status,
      ),
  );
  const passed = HINT_LAB_FIXTURES.filter(
    fixture => records.get(fixture.id)?.status === 'passed',
  ).length;
  const fixtureCount = HINT_LAB_FIXTURES.length;
  const scroll = useScreenScroll(`hint-lab:catalog:${level}:${status}`);

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.catalogContent}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerAction}>
          <Text style={styles.headerActionText}>‹ Home</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Hint Lab</Text>
        <Pressable onPress={onShare} style={styles.headerAction}>
          <Text style={[styles.headerActionText, styles.headerActionRight]}>
            Export
          </Text>
        </Pressable>
      </View>
      <View style={styles.progressCard}>
        <Text style={styles.progressValue}>
          {passed} / {fixtureCount}
        </Text>
        <Text style={styles.progressLabel}>examples accepted</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(passed / fixtureCount) * 100}%` },
            ]}
          />
        </View>
      </View>
      <Text style={styles.filterLabel}>LEVEL</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[null, 1, 2, 3, 4, 5].map(item => (
          <Pressable
            key={item ?? 'all'}
            onPress={() => setLevel(item)}
            style={[styles.chip, level === item && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, level === item && styles.chipTextActive]}
            >
              {item === null ? 'All' : `L${item}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.filterLabel}>STATUS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {([null, 'untested', 'passed', 'issue', 'retest'] as const).map(
          item => (
            <Pressable
              key={item ?? 'all'}
              onPress={() => setStatus(item)}
              style={[styles.chip, status === item && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  status === item && styles.chipTextActive,
                ]}
              >
                {item === null ? 'All' : STATUS_LABELS[item]}
              </Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      <View style={styles.fixtureList}>
        {groups.map(group => {
          const { fixture } = group[0];
          const accepted = group.filter(
            item => records.get(item.fixture.id)?.status === 'passed',
          ).length;
          const matching = group.filter(
            item =>
              status === null ||
              (records.get(item.fixture.id)?.status ?? 'untested') === status,
          );
          return (
            <Pressable
              key={fixture.techniqueCode}
              accessibilityRole="button"
              accessibilityLabel={`Open ${techniqueName(
                fixture,
                presentationCopy,
              )}, ${group.length} examples, ${accepted} passed`}
              onPress={() =>
                onOpen(
                  (
                    matching.find(
                      item =>
                        item.fixture.id ===
                        selectedExamples[fixture.techniqueCode],
                    ) ?? matching[0]
                  ).index,
                )
              }
              style={styles.fixtureCard}
            >
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  L{fixture.difficultyLevel}
                </Text>
              </View>
              <View style={styles.fixtureCopy}>
                <Text style={styles.fixtureName}>
                  {techniqueName(fixture, presentationCopy)}
                </Text>
                <Text style={styles.fixtureCode}>
                  {group.length} examples
                  {status === null
                    ? ''
                    : ` · ${matching.length} ${STATUS_LABELS[status]}`}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  accepted === group.length && styles.statusPassed,
                ]}
              >
                {accepted}/{group.length} passed ›
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ChecklistItem({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress(): void;
}): React.JSX.Element {
  const styles = useHintLabStyles();
  return (
    <Pressable onPress={onPress} style={styles.checkItem}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        <Text style={styles.checkboxText}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function FixtureScreen({
  fixture,
  fixtureIndex,
  record,
  onBack,
  onNavigate,
  onSave,
}: {
  fixture: HintLabFixture;
  fixtureIndex: number;
  record: HintLabRecord;
  onBack(): void;
  onNavigate(index: number): void;
  onSave(record: HintLabRecord): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const styles = useHintLabStyles();
  const [selectedJellyfishTarget, setSelectedJellyfishTarget] = useState<
    CandidateRef | undefined
  >(() =>
    fixture.techniqueCode === 'jellyfish'
      ? fixture.step.eliminations[0]
      : undefined,
  );
  const presentation = useMemo(
    () =>
      buildHintPresentation(
        fixture.step,
        HINT_PRESENTATION_COPIES[locale],
        'game',
        fixture.candidateMasks,
        selectedJellyfishTarget,
      ),
    [fixture, locale, selectedJellyfishTarget],
  );
  const examples = TECHNIQUE_GROUPS.find(
    group => group[0].fixture.techniqueCode === fixture.techniqueCode,
  )!;
  const exampleIndex = examples.findIndex(item => item.index === fixtureIndex);
  const [exampleMenuOpen, setExampleMenuOpen] = useState(false);
  const [session] = useState(() => createHintLabSession(fixture));
  const [pageIndex, setPageIndex] = useState(0);
  const [draft, setDraft] = useState(record);
  const draftRef = useRef(record);
  const page = presentation.pages[pageIndex];

  const selectJellyfishTarget = (cell: CellIndex) => {
    if (fixture.techniqueCode !== 'jellyfish') return;
    const target = fixture.step.eliminations.find(
      candidate => candidate.cell === cell,
    );
    if (!target) return;
    setSelectedJellyfishTarget(target);
    setPageIndex(current => Math.min(current, 2));
  };

  const updateDraft = (updates: Partial<HintLabRecord>) => {
    const next = { ...draftRef.current, ...updates };
    draftRef.current = next;
    setDraft(next);
    onSave(next);
  };
  const completedCheckCount = [
    draft.reasoningOk,
    draft.visualsOk,
    draft.resultOk,
    draft.applyUndoOk,
  ].filter(value => value === true).length;
  const checksComplete = completedCheckCount === 4;

  return (
    <ScrollView contentContainerStyle={styles.fixtureContent}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerAction}>
          <Text style={styles.headerActionText}>‹ Catalog</Text>
        </Pressable>
        <Text style={styles.headerTitle}>L{fixture.difficultyLevel}</Text>
        <Text style={[styles.headerActionText, styles.headerActionRight]}>
          {exampleIndex + 1}/{examples.length}
        </Text>
      </View>
      <Text style={styles.scenarioTitle}>{presentation.techniqueName}</Text>
      <Text style={styles.scenarioMeta}>
        {fixture.techniqueCode} · {fixture.sourceKind} ·{' '}
        {fixture.sourcePuzzleId}
      </Text>
      <View style={styles.examplePicker}>
        <Pressable
          accessibilityLabel={`Choose example, current example ${
            exampleIndex + 1
          } of ${examples.length}`}
          onPress={() => setExampleMenuOpen(true)}
          style={styles.exampleSelect}
        >
          <View style={styles.exampleSelectCopy}>
            <Text style={styles.exampleSelectTitle}>
              Example {exampleIndex + 1} of {examples.length}
            </Text>
            <Text style={styles.exampleSelectDetail}>
              {hintLabExampleLabel(fixture, locale)
                .split(' · ')
                .slice(1)
                .join(' · ')}
            </Text>
          </View>
          <Text style={styles.exampleSelectChevron}>⌄</Text>
        </Pressable>
        <Modal
          animationType="fade"
          onRequestClose={() => setExampleMenuOpen(false)}
          transparent
          visible={exampleMenuOpen}
        >
          <View style={styles.exampleModalBackdrop}>
            <Pressable
              accessibilityLabel="Close example list"
              onPress={() => setExampleMenuOpen(false)}
              style={styles.exampleModalDismiss}
            />
            <View style={styles.exampleMenu}>
              <Text style={styles.exampleMenuTitle}>Choose an example</Text>
              <ScrollView>
                {examples.map(({ fixture: example, index }, localIndex) => (
                  <Pressable
                    key={example.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open example ${
                      localIndex + 1
                    }, ${hintLabExampleLabel(example, locale)
                      .split(' · ')
                      .slice(1)
                      .join(' · ')}`}
                    accessibilityState={{ selected: index === fixtureIndex }}
                    onPress={() => {
                      setExampleMenuOpen(false);
                      onNavigate(index);
                    }}
                    style={[
                      styles.exampleOption,
                      index === fixtureIndex && styles.exampleOptionActive,
                    ]}
                  >
                    <Text style={styles.exampleOptionNumber}>
                      Example {localIndex + 1}
                    </Text>
                    <Text style={styles.exampleOptionDetail}>
                      {hintLabExampleLabel(example, locale)
                        .split(' · ')
                        .slice(1)
                        .join(' · ')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
      <SudokuBoard
        key={fixture.id}
        disabled={fixture.techniqueCode !== 'jellyfish'}
        hintAnimations={fixture.techniqueCode !== 'jellyfish'}
        hintAnimationDurationMs={140}
        hintVisuals={page.visuals}
        onSelectCell={selectJellyfishTarget}
        state={session.state}
      />
      <View style={styles.proofCard}>
        <Text style={styles.proofStep}>
          STEP {pageIndex + 1} / {presentation.pages.length}
        </Text>
        <Text style={styles.proofTitle}>{page.title}</Text>
        <Text style={styles.proofBody}>{page.body}</Text>
        <View style={styles.pageButtons}>
          <Pressable
            key={`back:${pageIndex}`}
            disabled={pageIndex === 0}
            onPress={() => setPageIndex(current => Math.max(0, current - 1))}
            style={[
              styles.smallButton,
              pageIndex === 0 && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.smallButtonText}>Back</Text>
          </Pressable>
          {pageIndex < presentation.pages.length - 1 ? (
            <Pressable
              key={`next:${pageIndex}`}
              onPress={() =>
                setPageIndex(current =>
                  Math.min(presentation.pages.length - 1, current + 1),
                )
              }
              style={styles.primarySmall}
            >
              <Text style={styles.primarySmallText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              key="restart"
              onPress={() => setPageIndex(0)}
              style={styles.primarySmall}
            >
              <Text style={styles.primarySmallText}>Restart</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.acceptanceCard}>
        <View style={styles.acceptanceHeader}>
          <Text style={styles.acceptanceTitle}>Acceptance checklist</Text>
          <Text style={styles.acceptanceProgress}>{completedCheckCount}/4</Text>
        </View>
        <ChecklistItem
          checked={draft.reasoningOk}
          label="Reasoning is correct and does not reveal early"
          onPress={() =>
            updateDraft({ reasoningOk: !draftRef.current.reasoningOk })
          }
        />
        <ChecklistItem
          checked={draft.visualsOk}
          label="Mask, cell colors and candidates are correct"
          onPress={() =>
            updateDraft({ visualsOk: !draftRef.current.visualsOk })
          }
        />
        <ChecklistItem
          checked={draft.resultOk}
          label="Placement or eliminations are correct"
          onPress={() => updateDraft({ resultOk: !draftRef.current.resultOk })}
        />
        <ChecklistItem
          checked={draft.applyUndoOk}
          label="Restart and Back behave correctly"
          onPress={() =>
            updateDraft({ applyUndoOk: !draftRef.current.applyUndoOk })
          }
        />
        <TextInput
          multiline
          onBlur={() => onSave(draftRef.current)}
          onChangeText={note => {
            const next = { ...draftRef.current, note };
            draftRef.current = next;
            setDraft(next);
          }}
          placeholder="Notes about this fixture…"
          style={styles.noteInput}
          value={draft.note}
        />
        <View style={styles.statusButtons}>
          <Pressable
            key={checksComplete ? 'pass-enabled' : 'pass-disabled'}
            disabled={!checksComplete}
            onPress={() =>
              updateDraft({
                status: 'passed',
                proofPage: pageIndex,
                updatedAtEpochMs: Date.now(),
              })
            }
            style={[
              styles.passButton,
              draft.status === 'passed' && styles.statusButtonSelected,
              !checksComplete && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.statusButtonText}>Pass</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              updateDraft({
                status: 'issue',
                proofPage: pageIndex,
                updatedAtEpochMs: Date.now(),
              })
            }
            style={[
              styles.issueButton,
              draft.status === 'issue' && styles.statusButtonSelected,
            ]}
          >
            <Text style={styles.statusButtonText}>Issue</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              updateDraft({
                status: 'retest',
                proofPage: pageIndex,
                updatedAtEpochMs: Date.now(),
              })
            }
            style={[
              styles.retestButton,
              draft.status === 'retest' && styles.statusButtonSelected,
            ]}
          >
            <Text style={styles.retestText}>Retest</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.navigationRow}>
        <Pressable
          disabled={exampleIndex === 0}
          onPress={() => onNavigate(examples[exampleIndex - 1].index)}
        >
          <Text style={styles.navigationText}>← Previous</Text>
        </Pressable>
        <Pressable
          disabled={exampleIndex === examples.length - 1}
          onPress={() => onNavigate(examples[exampleIndex + 1].index)}
        >
          <Text style={styles.navigationText}>Next example →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function HintLab({ onClose }: HintLabProps): React.JSX.Element {
  const styles = useHintLabStyles();
  const { palette } = useAppTheme();
  const storeRef = useRef<HintLabStore | null>(null);
  const [route, setRoute] = useScreenState<LabRoute>('hint-lab:route', {
    kind: 'catalog',
  });
  const [selectedExamples, setSelectedExamples] = useScreenState<
    Record<string, string>
  >('hint-lab:selected-examples', {});
  const openFixture = (index: number) => {
    const fixture = HINT_LAB_FIXTURES[index];
    setSelectedExamples(current => ({
      ...current,
      [fixture.techniqueCode]: fixture.id,
    }));
    setRoute({ kind: 'fixture', index });
  };
  // Catalog unmounts while viewing a fixture; keep filters for the lab session.
  const [level, setLevel] = useScreenState<number | null>(
    'hint-lab:level',
    null,
  );
  const [status, setStatus] = useScreenState<HintLabStatus | null>(
    'hint-lab:status',
    null,
  );
  const [records, setRecords] = useState<ReadonlyMap<string, HintLabRecord>>(
    new Map(),
  );
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const store = new HintLabStore();
    storeRef.current = store;
    let active = true;
    store
      .initialize()
      .then(() => store.readAll())
      .then(next => {
        if (active) {
          setRecords(next);
          setReady(true);
        }
      })
      .catch(error => {
        if (active) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      active = false;
      store.close();
      storeRef.current = null;
    };
  }, []);

  const save = (record: HintLabRecord) => {
    const normalized = { ...record, updatedAtEpochMs: Date.now() };
    setRecords(current => new Map(current).set(record.fixtureId, normalized));
    storeRef.current?.save(normalized).catch(() => undefined);
  };

  if (failure) {
    return (
      <View style={styles.loading}>
        <Text style={styles.failureTitle}>Hint Lab could not open</Text>
        <Text style={styles.loadingText}>{failure}</Text>
        <Pressable onPress={onClose} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.loadingText}>Loading Hint Lab…</Text>
      </View>
    );
  }
  if (route.kind === 'fixture') {
    const fixture = HINT_LAB_FIXTURES[route.index];
    return (
      <FixtureScreen
        fixture={fixture}
        fixtureIndex={route.index}
        key={fixture.id}
        onBack={() => setRoute({ kind: 'catalog' })}
        onNavigate={openFixture}
        onSave={save}
        record={records.get(fixture.id) ?? emptyHintLabRecord(fixture.id)}
      />
    );
  }
  return (
    <Catalog
      level={level}
      status={status}
      setLevel={setLevel}
      setStatus={setStatus}
      onBack={onClose}
      onOpen={openFixture}
      selectedExamples={selectedExamples}
      onShare={() =>
        Share.share({ message: buildReport(records) }).catch(() => undefined)
      }
      records={records}
    />
  );
}

function useHintLabStyles() {
  const { palette } = useAppTheme();
  return useMemo(() => createStyles(palette), [palette]);
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    loadingText: { color: palette.muted, marginTop: 10 },
    failureTitle: { color: palette.error, fontSize: 18, fontWeight: '900' },
    catalogContent: { paddingBottom: 36, paddingHorizontal: 16 },
    fixtureContent: { paddingBottom: 40 },
    examplePicker: { paddingBottom: 12, paddingHorizontal: 16 },
    exampleSelect: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 52,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    exampleSelectCopy: { flex: 1 },
    exampleSelectTitle: { color: palette.ink, fontSize: 13, fontWeight: '800' },
    exampleSelectDetail: { color: palette.muted, fontSize: 10, marginTop: 3 },
    exampleSelectChevron: {
      color: palette.accent,
      fontSize: 20,
      fontWeight: '900',
      marginLeft: 10,
    },
    exampleModalBackdrop: {
      alignItems: 'center',
      backgroundColor: palette.modalBackdrop,
      flex: 1,
      justifyContent: 'center',
      padding: 22,
    },
    exampleModalDismiss: { ...StyleSheet.absoluteFill },
    exampleMenu: {
      backgroundColor: palette.surface,
      borderRadius: 18,
      maxHeight: '72%',
      maxWidth: 520,
      overflow: 'hidden',
      padding: 14,
      width: '100%',
    },
    exampleMenuTitle: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '900',
      paddingBottom: 10,
      paddingHorizontal: 3,
    },
    exampleOption: {
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 10,
    },
    exampleOptionActive: { backgroundColor: palette.accentSoft },
    exampleOptionNumber: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: '800',
    },
    exampleOptionDetail: { color: palette.muted, fontSize: 10, marginTop: 2 },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 58,
      paddingHorizontal: 4,
    },
    headerAction: { flex: 1, paddingVertical: 10 },
    headerActionText: { color: palette.accent, fontWeight: '700' },
    headerActionRight: { flex: 1, textAlign: 'right' },
    headerTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
    progressCard: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 18,
      marginBottom: 18,
      padding: 18,
    },
    progressValue: { color: palette.ink, fontSize: 30, fontWeight: '900' },
    progressLabel: { color: palette.muted, marginTop: 2 },
    progressTrack: {
      backgroundColor: '#D5D0C6',
      borderRadius: 4,
      height: 7,
      marginTop: 14,
      overflow: 'hidden',
    },
    progressFill: { backgroundColor: palette.accent, height: 7 },
    filterLabel: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 7,
      marginTop: 10,
    },
    chip: {
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      marginRight: 7,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    chipActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    chipText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: palette.white },
    fixtureList: { gap: 8, marginTop: 18 },
    fixtureCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 66,
      padding: 11,
    },
    levelBadge: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 10,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    levelBadgeText: { color: palette.accent, fontSize: 13, fontWeight: '900' },
    fixtureCopy: { flex: 1, marginLeft: 11 },
    fixtureName: { color: palette.ink, fontSize: 15, fontWeight: '800' },
    fixtureCode: { color: palette.muted, fontSize: 10, marginTop: 3 },
    statusText: { color: palette.muted, fontSize: 11, fontWeight: '700' },
    statusPassed: { color: palette.accent },
    statusIssue: { color: palette.error },
    scenarioTitle: {
      color: palette.ink,
      fontSize: 24,
      fontWeight: '900',
      paddingHorizontal: 16,
    },
    scenarioMeta: {
      color: palette.muted,
      fontSize: 10,
      marginBottom: 12,
      marginTop: 3,
      paddingHorizontal: 16,
    },
    proofCard: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      margin: 14,
      padding: 16,
    },
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
    acceptanceCard: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      marginHorizontal: 14,
      padding: 16,
    },
    acceptanceHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    acceptanceTitle: { color: palette.ink, fontSize: 17, fontWeight: '900' },
    acceptanceProgress: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    checkItem: { alignItems: 'center', flexDirection: 'row', marginTop: 13 },
    checkbox: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 5,
      borderWidth: 1,
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    checkboxChecked: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    checkboxText: { color: palette.white, fontSize: 13, fontWeight: '900' },
    checkLabel: { color: palette.ink, flex: 1, fontSize: 12, marginLeft: 10 },
    noteInput: {
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      color: palette.ink,
      marginTop: 16,
      minHeight: 72,
      padding: 10,
      textAlignVertical: 'top',
    },
    statusButtons: { flexDirection: 'row', gap: 8, marginTop: 13 },
    passButton: {
      backgroundColor: palette.accent,
      borderRadius: 10,
      padding: 11,
    },
    issueButton: {
      backgroundColor: palette.error,
      borderRadius: 10,
      padding: 11,
    },
    retestButton: {
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      padding: 11,
    },
    statusButtonText: { color: palette.white, fontSize: 12, fontWeight: '800' },
    retestText: { color: palette.ink, fontSize: 12, fontWeight: '800' },
    statusButtonSelected: { borderColor: palette.ink, borderWidth: 3 },
    buttonDisabled: { opacity: 0.35 },
    navigationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 18,
    },
    navigationText: { color: palette.accent, fontSize: 13, fontWeight: '800' },
  });
}
