import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  HintPresentationCopy,
  buildHintPresentation,
} from '../domain';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../localization';
import { SudokuBoard } from '../ui/components/SudokuBoard';
import { palette } from '../ui/theme';
import {
  HINT_LAB_FIXTURES,
  HintLabFixture,
  applyHintLabStep,
  createHintLabSession,
  undoHintLabStep,
} from './hint-lab';
import {
  HintLabRecord,
  HintLabStatus,
  HintLabStore,
  emptyHintLabRecord,
} from './hint-lab-store';

type HintLabProps = { onClose(): void };
type LabRoute = { kind: 'catalog' } | { kind: 'fixture'; index: number };

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
  return buildHintPresentation(fixture.step, copy).techniqueName;
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
  records,
  onBack,
  onOpen,
  onShare,
}: {
  records: ReadonlyMap<string, HintLabRecord>;
  onBack(): void;
  onOpen(index: number): void;
  onShare(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const presentationCopy = HINT_PRESENTATION_COPIES[locale];
  const [level, setLevel] = useState<number | null>(null);
  const [status, setStatus] = useState<HintLabStatus | null>(null);
  const fixtures = HINT_LAB_FIXTURES.filter(fixture => {
    const record = records.get(fixture.id) ?? emptyHintLabRecord(fixture.id);
    return (
      (level === null || fixture.difficultyLevel === level) &&
      (status === null || record.status === status)
    );
  });
  const passed = HINT_LAB_FIXTURES.filter(
    fixture => records.get(fixture.id)?.status === 'passed',
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.catalogContent}>
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
        <Text style={styles.progressValue}>{passed} / 39</Text>
        <Text style={styles.progressLabel}>techniques accepted</Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${(passed / 39) * 100}%` }]}
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
        {fixtures.map(fixture => {
          const index = HINT_LAB_FIXTURES.indexOf(fixture);
          const record =
            records.get(fixture.id) ?? emptyHintLabRecord(fixture.id);
          return (
            <Pressable
              key={fixture.id}
              accessibilityLabel={`Open ${techniqueName(
                fixture,
                presentationCopy,
              )}, ${STATUS_LABELS[record.status]}`}
              onPress={() => onOpen(index)}
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
                  {fixture.techniqueCode} ·{' '}
                  {fixture.step.proofSteps?.length ?? 3} pages
                </Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  record.status === 'passed' && styles.statusPassed,
                  record.status === 'issue' && styles.statusIssue,
                ]}
              >
                {STATUS_LABELS[record.status]}
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
  const presentation = useMemo(
    () =>
      buildHintPresentation(
        fixture.step,
        HINT_PRESENTATION_COPIES[locale],
        'game',
        fixture.candidateMasks,
      ),
    [fixture, locale],
  );
  const [session, setSession] = useState(() => createHintLabSession(fixture));
  const [pageIndex, setPageIndex] = useState(0);
  const [replaySequence, setReplaySequence] = useState(0);
  const [draft, setDraft] = useState(record);
  const draftRef = useRef(record);
  const applied = session.state.activeHint === null;
  const page = presentation.pages[pageIndex];

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
          {fixtureIndex + 1}/39
        </Text>
      </View>
      <Text style={styles.scenarioTitle}>{presentation.techniqueName}</Text>
      <Text style={styles.scenarioMeta}>
        {fixture.techniqueCode} · {fixture.sourceKind} ·{' '}
        {fixture.sourcePuzzleId}
      </Text>
      <SudokuBoard
        key={`${fixture.id}:${pageIndex}:${replaySequence}:${applied}`}
        disabled
        hintVisuals={applied ? undefined : page.visuals}
        onSelectCell={() => undefined}
        state={session.state}
      />
      <View style={styles.proofCard}>
        <View style={styles.proofHeader}>
          <Text style={styles.proofStep}>
            STEP {pageIndex + 1} / {presentation.pages.length}
          </Text>
          <Pressable
            disabled={applied}
            onPress={() => setReplaySequence(value => value + 1)}
          >
            <Text style={styles.replayText}>Replay animation</Text>
          </Pressable>
        </View>
        <Text style={styles.proofTitle}>{page.title}</Text>
        <Text style={styles.proofBody}>{page.body}</Text>
        <View style={styles.pageButtons}>
          <Pressable
            disabled={pageIndex === 0 || applied}
            onPress={() => setPageIndex(index => index - 1)}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>Back</Text>
          </Pressable>
          <Pressable
            disabled={applied}
            onPress={() =>
              setPageIndex(
                pageIndex === presentation.pages.length - 1
                  ? 0
                  : presentation.pages.length - 1,
              )
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              {pageIndex === presentation.pages.length - 1
                ? 'First page'
                : 'Conclusion'}
            </Text>
          </Pressable>
          {pageIndex < presentation.pages.length - 1 ? (
            <Pressable
              disabled={applied}
              onPress={() => setPageIndex(index => index + 1)}
              style={styles.primarySmall}
            >
              <Text style={styles.primarySmallText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={applied}
              onPress={() => setSession(applyHintLabStep(fixture, session))}
              style={[styles.primarySmall, applied && styles.buttonDisabled]}
            >
              <Text style={styles.primarySmallText}>
                {applied ? 'Applied' : 'Apply'}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.sessionButtons}>
          <Pressable
            disabled={!applied}
            onPress={() => setSession(undoHintLabStep(fixture, session))}
          >
            <Text
              style={[styles.linkButton, !applied && styles.linkButtonDisabled]}
            >
              Undo applied step
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setSession(createHintLabSession(fixture));
              setPageIndex(0);
            }}
          >
            <Text style={styles.linkButton}>Reset scenario</Text>
          </Pressable>
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
          label="Apply and undo behave correctly"
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
          disabled={fixtureIndex === 0}
          onPress={() => onNavigate(fixtureIndex - 1)}
        >
          <Text style={styles.navigationText}>← Previous</Text>
        </Pressable>
        <Pressable
          disabled={fixtureIndex === HINT_LAB_FIXTURES.length - 1}
          onPress={() => onNavigate(fixtureIndex + 1)}
        >
          <Text style={styles.navigationText}>Next technique →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function HintLab({ onClose }: HintLabProps): React.JSX.Element {
  const storeRef = useRef<HintLabStore | null>(null);
  const [route, setRoute] = useState<LabRoute>({ kind: 'catalog' });
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
        onNavigate={index => setRoute({ kind: 'fixture', index })}
        onSave={save}
        record={records.get(fixture.id) ?? emptyHintLabRecord(fixture.id)}
      />
    );
  }
  return (
    <Catalog
      onBack={onClose}
      onOpen={index => setRoute({ kind: 'fixture', index })}
      onShare={() =>
        Share.share({ message: buildReport(records) }).catch(() => undefined)
      }
      records={records}
    />
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  loadingText: { color: palette.muted, marginTop: 10 },
  failureTitle: { color: palette.error, fontSize: 18, fontWeight: '900' },
  catalogContent: { paddingBottom: 36, paddingHorizontal: 16 },
  fixtureContent: { paddingBottom: 40 },
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
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: palette.white },
  fixtureList: { gap: 8, marginTop: 18 },
  fixtureCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: '#DDD8CE',
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
    borderColor: '#DDD8CE',
    borderRadius: 18,
    borderWidth: 1,
    margin: 14,
    padding: 16,
  },
  proofHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  proofStep: { color: palette.accent, fontSize: 10, fontWeight: '900' },
  replayText: { color: palette.accent, fontSize: 11, fontWeight: '700' },
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
  sessionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  linkButton: { color: palette.accent, fontSize: 11, fontWeight: '700' },
  linkButtonDisabled: { color: palette.muted, opacity: 0.45 },
  acceptanceCard: {
    backgroundColor: palette.surface,
    borderColor: '#DDD8CE',
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
