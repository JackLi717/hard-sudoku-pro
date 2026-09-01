import { PersistentGameService } from '../game/persistent-game-service';
import {
  GameCommand,
  GameDefinition,
  GameSettings,
  GameSession,
  DEFAULT_GAME_SETTINGS,
  PlayerCompletionProgress,
  PuzzleRecord,
  assignPuzzle,
} from '../../domain';
import {
  GameStatistics,
  RestoredGame,
  WalletBalance,
} from '../../data/user/user-repository';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { HintEngine } from '../../domain/hints/engine';
import { CreditResource } from '../../domain/game/contracts';
import { CompletionReward } from '../../domain/game/progression';
import { PersistentGameStore } from '../game/persistent-game-service';

export interface OfflineContentStore {
  readonly metadata: { contentVersion: number };
  getPuzzle(id: string): Promise<PuzzleRecord | null>;
  listPuzzles(level: DifficultyLevel): Promise<readonly PuzzleRecord[]>;
}

export interface OfflinePlayerStore extends PersistentGameStore {
  restoreUnfinishedSession(
    activeContentVersion: number,
    restoredAtEpochMs: number,
  ): Promise<RestoredGame>;
  readWallet(): Promise<Readonly<Record<CreditResource, WalletBalance>>>;
  getCompletionProgress(): Promise<PlayerCompletionProgress>;
  getStatistics(): Promise<GameStatistics>;
}

export type StartOpportunity = 'new_game' | 'continue_game';

export interface GameAccessAdapter {
  isPremium(): Promise<boolean>;
  showStartOpportunity(opportunity: StartOpportunity): Promise<void>;
}

export class OfflineTestAccessAdapter implements GameAccessAdapter {
  constructor(private readonly premium = false) {}

  async isPremium(): Promise<boolean> {
    return this.premium;
  }

  async showStartOpportunity(): Promise<void> {
    // Stage 4 remains fully offline. Stage 7 can replace this adapter.
  }
}

export type CoordinatorScreen = 'home' | 'game' | 'result';

export type ReplacementRequest = {
  level: DifficultyLevel;
};

export type CoordinatorMessageCode =
  | 'game_not_active'
  | 'game_not_paused'
  | 'hint_in_progress'
  | 'no_selected_cell'
  | 'given_cell'
  | 'filled_cell'
  | 'nothing_to_erase'
  | 'nothing_to_undo'
  | 'quick_draft_missing'
  | 'incorrect_values'
  | 'conflicting_values'
  | 'unsolvable_values'
  | 'insufficient_quick_pencil_credits'
  | 'insufficient_smart_hint_credits'
  | 'hint_already_active'
  | 'no_active_hint'
  | 'invalid_hint'
  | 'action_failed'
  | 'unexpected_error'
  | 'board_already_solved'
  | 'invalid_hint_board'
  | 'no_supported_hint'
  | 'saved_catalog_changed'
  | 'saved_puzzle_missing'
  | 'level_unavailable'
  | 'level_replay';

export type CoordinatorMessage = {
  code: CoordinatorMessageCode;
  params?: Readonly<Record<string, string | number>>;
};

export type OfflineGameSnapshot = {
  screen: CoordinatorScreen;
  session: GameSession | null;
  puzzle: PuzzleRecord | null;
  resumable: boolean;
  busy: boolean;
  message: CoordinatorMessage | null;
  replacementRequest: ReplacementRequest | null;
  quickDraftConfirmation: boolean;
  wallet: Readonly<Record<CreditResource, WalletBalance>>;
  statistics: GameStatistics;
  completedByLevel: Readonly<Record<DifficultyLevel, number>>;
  reward: CompletionReward | null;
};

const EMPTY_STATISTICS: GameStatistics = {
  attempts: 0,
  completions: 0,
  failures: 0,
  abandonments: 0,
  totalElapsedMs: 0,
  totalHintsUsed: 0,
  totalQuickPencilsUsed: 0,
};

const EMPTY_WALLET: Readonly<Record<CreditResource, WalletBalance>> = {
  quick_pencil: {
    resource: 'quick_pencil',
    balance: 0,
    earnedTotal: 0,
    spentTotal: 0,
  },
  smart_hint: {
    resource: 'smart_hint',
    balance: 0,
    earnedTotal: 0,
    spentTotal: 0,
  },
};

const EMPTY_COMPLETED: Readonly<Record<DifficultyLevel, number>> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const BLOCK_MESSAGE_CODES = new Set<CoordinatorMessageCode>([
  'game_not_active',
  'game_not_paused',
  'hint_in_progress',
  'no_selected_cell',
  'given_cell',
  'filled_cell',
  'nothing_to_erase',
  'nothing_to_undo',
  'quick_draft_missing',
  'incorrect_values',
  'conflicting_values',
  'unsolvable_values',
  'insufficient_quick_pencil_credits',
  'insufficient_smart_hint_credits',
  'hint_already_active',
  'no_active_hint',
  'invalid_hint',
]);

function blockedMessage(reason: string | null | undefined): CoordinatorMessage {
  return {
    code:
      reason && BLOCK_MESSAGE_CODES.has(reason as CoordinatorMessageCode)
        ? (reason as CoordinatorMessageCode)
        : 'action_failed',
  };
}

type Listener = (snapshot: OfflineGameSnapshot) => void;
type IdFactory = (kind: 'session' | 'event' | 'move') => string;

function defaultIdFactory(kind: 'session' | 'event' | 'move'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${kind}-${Date.now()}-${random}`;
}

function definitionFor(puzzle: PuzzleRecord): GameDefinition {
  return {
    puzzleId: puzzle.id,
    contentVersion: puzzle.contentVersion,
    difficultyLevel: puzzle.difficultyLevel,
    puzzleFingerprint: puzzle.puzzle,
    solutionFingerprint: puzzle.solution,
  };
}

function isTerminal(session: GameSession): boolean {
  return ['completed', 'failed'].includes(session.state.status);
}

export class OfflineGameCoordinator {
  private listeners = new Set<Listener>();
  private service: PersistentGameService | null = null;
  private pauseRequested = false;
  private catalogs = new Map<DifficultyLevel, readonly PuzzleRecord[]>();
  private progress: PlayerCompletionProgress = {
    completedPuzzleIds: [],
    currentFirstCompletionStreak: 0,
    bestFirstCompletionStreak: 0,
  };
  private premium = false;
  private newGameSettings: GameSettings = DEFAULT_GAME_SETTINGS;
  private state: OfflineGameSnapshot = {
    screen: 'home',
    session: null,
    puzzle: null,
    resumable: false,
    busy: false,
    message: null,
    replacementRequest: null,
    quickDraftConfirmation: false,
    wallet: EMPTY_WALLET,
    statistics: EMPTY_STATISTICS,
    completedByLevel: EMPTY_COMPLETED,
    reward: null,
  };

  constructor(
    private readonly content: OfflineContentStore,
    private readonly players: OfflinePlayerStore,
    private readonly hints: HintEngine,
    private readonly access: GameAccessAdapter = new OfflineTestAccessAdapter(),
    private readonly now: () => number = Date.now,
    private readonly createId: IdFactory = defaultIdFactory,
  ) {}

  get snapshot(): OfflineGameSnapshot {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setNewGameSettings(settings: GameSettings): void {
    this.newGameSettings = { ...settings };
  }

  async initialize(): Promise<void> {
    this.patch({ busy: true });
    try {
      const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
      const [catalogs, wallet, statistics, progress, restored, premium] =
        await Promise.all([
          Promise.all(levels.map(level => this.content.listPuzzles(level))),
          this.players.readWallet(),
          this.players.getStatistics(),
          this.players.getCompletionProgress(),
          this.players.restoreUnfinishedSession(
            this.content.metadata.contentVersion,
            this.now(),
          ),
          this.access.isPremium(),
        ]);
      levels.forEach((level, index) => {
        this.catalogs.set(level, catalogs[index]);
      });
      this.progress = progress;
      this.premium = premium;
      this.patch({
        wallet,
        statistics,
        completedByLevel: this.countCompletions(progress),
      });
      await this.attachRestored(restored);
    } finally {
      this.patch({ busy: false });
    }
  }

  requestNewGame(level: DifficultyLevel): Promise<void> {
    if (
      this.service &&
      ['active', 'paused'].includes(this.service.session.state.status)
    ) {
      this.patch({ replacementRequest: { level }, message: null });
      return Promise.resolve();
    }
    return this.startFresh(level, 'new_game');
  }

  cancelReplacement(): void {
    this.patch({ replacementRequest: null });
  }

  async confirmReplacement(): Promise<void> {
    const request = this.state.replacementRequest;
    if (!request) {
      return;
    }
    await this.runBusy(async () => {
      if (
        this.service &&
        ['active', 'paused'].includes(this.service.session.state.status)
      ) {
        await this.dispatch({ type: 'abandon', atEpochMs: this.now() });
        await this.refreshPlayerSummary();
      }
      this.service = null;
      this.patch({ session: null, puzzle: null, replacementRequest: null });
      await this.startFreshInternal(request.level, 'new_game');
    });
  }

  async resumeGame(): Promise<void> {
    if (!this.service) {
      return;
    }
    await this.runBusy(async () => {
      await this.access.showStartOpportunity('continue_game');
      if (this.service?.session.state.status === 'paused') {
        await this.dispatch({ type: 'resume', atEpochMs: this.now() });
      }
      this.patch({ screen: 'game', resumable: false, message: null });
    });
  }

  async returnHome(): Promise<void> {
    if (!this.service) {
      this.patch({ screen: 'home' });
      return;
    }
    await this.runBusy(async () => {
      if (this.service?.session.state.status === 'active') {
        await this.dispatch({ type: 'pause', atEpochMs: this.now() });
      }
      this.patch({ screen: 'home', resumable: true, message: null });
    });
  }

  async pause(): Promise<void> {
    if (this.state.busy) {
      this.pauseRequested = true;
      return;
    }
    if (this.service?.session.state.status !== 'active') {
      return;
    }
    await this.runBusy(async () => {
      await this.dispatch({ type: 'pause', atEpochMs: this.now() });
    });
  }

  async resumePausedGame(): Promise<void> {
    if (this.service?.session.state.status !== 'paused') {
      return;
    }
    await this.runBusy(async () => {
      await this.dispatch({ type: 'resume', atEpochMs: this.now() });
    });
  }

  async abandonToHome(): Promise<void> {
    if (!this.service) {
      return;
    }
    await this.runBusy(async () => {
      await this.dispatch({ type: 'abandon', atEpochMs: this.now() });
      this.service = null;
      await this.refreshPlayerSummary();
      this.patch({
        screen: 'home',
        session: null,
        puzzle: null,
        resumable: false,
        message: null,
      });
    });
  }

  selectCell(cell: number): Promise<void> {
    if (!this.service || this.state.busy) {
      return Promise.resolve();
    }
    try {
      const result = this.service.selectCell({
        type: 'select_cell',
        cell,
        atEpochMs: this.now(),
      });
      if (result.accepted && result.session !== this.state.session) {
        this.patch({ session: result.session, message: null });
      } else if (!result.accepted) {
        this.patch({
          message: blockedMessage(result.reason),
        });
      }
    } catch {
      this.patch({ message: { code: 'unexpected_error' } });
    }
    return Promise.resolve();
  }

  inputDigit(digit: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Promise<void> {
    return this.runCommand({
      type: 'input_digit',
      digit,
      moveId: this.createId('move'),
      atEpochMs: this.now(),
    });
  }

  erase(): Promise<void> {
    return this.runCommand({
      type: 'erase',
      moveId: this.createId('move'),
      atEpochMs: this.now(),
    });
  }

  undo(): Promise<void> {
    return this.runCommand({ type: 'undo', atEpochMs: this.now() });
  }

  togglePencil(): Promise<void> {
    const enabled = !(
      this.service?.session.state.candidates.pencilMode ?? false
    );
    return this.runCommand({
      type: 'set_pencil_mode',
      enabled,
      atEpochMs: this.now(),
    });
  }

  async toggleQuickPencil(): Promise<void> {
    const state = this.service?.session.state;
    if (!state) {
      return;
    }
    if (state.candidates.activeCandidateSource === 'quick') {
      await this.runCommand({
        type: 'set_candidate_source',
        source: 'manual',
        atEpochMs: this.now(),
      });
      return;
    }
    await this.runBusy(async () => {
      const result = await this.dispatch({
        type: 'generate_quick_draft',
        confirmed: false,
        availableCredits: this.state.wallet.quick_pencil.balance,
        premium: this.premium,
        atEpochMs: this.now(),
      });
      if (
        !result.accepted &&
        result.reason === 'quick_draft_confirmation_required'
      ) {
        this.patch({ quickDraftConfirmation: true, message: null });
      }
    });
  }

  cancelQuickDraftRegeneration(): void {
    this.patch({ quickDraftConfirmation: false });
  }

  async confirmQuickDraftRegeneration(): Promise<void> {
    await this.runCommand({
      type: 'generate_quick_draft',
      confirmed: true,
      availableCredits: this.state.wallet.quick_pencil.balance,
      premium: this.premium,
      atEpochMs: this.now(),
    });
    this.patch({ quickDraftConfirmation: false });
  }

  async requestHint(): Promise<void> {
    if (!this.service) {
      return;
    }
    await this.runBusy(async () => {
      const prepared = await this.dispatch({
        type: 'prepare_hint',
        atEpochMs: this.now(),
      });
      if (!prepared.accepted || !prepared.hintRequest) {
        return;
      }
      const hint = await this.hints.nextStep(prepared.hintRequest);
      if (hint.status !== 'step') {
        const code: CoordinatorMessageCode =
          hint.status === 'solved'
            ? 'board_already_solved'
            : hint.status === 'invalid_board'
            ? 'invalid_hint_board'
            : 'no_supported_hint';
        this.patch({ message: { code } });
        return;
      }
      await this.dispatch({
        type: 'reveal_hint',
        step: hint.step,
        availableCredits: this.state.wallet.smart_hint.balance,
        premium: this.premium,
        atEpochMs: this.now(),
      });
    });
  }

  applyHint(): Promise<void> {
    return this.runCommand({
      type: 'apply_hint',
      moveId: this.createId('move'),
      atEpochMs: this.now(),
    });
  }

  dismissHint(): Promise<void> {
    return this.runCommand({ type: 'dismiss_hint', atEpochMs: this.now() });
  }

  async retryPuzzle(): Promise<void> {
    const current = this.service?.session;
    const puzzle = this.state.puzzle;
    if (!current || !puzzle || current.state.status !== 'failed') {
      return;
    }
    await this.runBusy(async () => {
      const startedAtEpochMs = this.now();
      this.service = await PersistentGameService.start(
        {
          sessionId: this.createId('session'),
          definition: definitionFor(puzzle),
          attemptNumber: current.state.attemptNumber + 1,
          startedAtEpochMs,
          settings: current.state.settings,
        },
        this.players,
        this.createId('event'),
      );
      this.patch({
        screen: 'game',
        session: this.service.session,
        reward: null,
        message: null,
      });
    });
  }

  async nextPuzzle(): Promise<void> {
    const level = this.state.puzzle?.difficultyLevel;
    if (!level) {
      return;
    }
    this.service = null;
    await this.startFresh(level, 'new_game');
  }

  async newGameFromResult(): Promise<void> {
    this.service = null;
    this.patch({
      screen: 'home',
      session: null,
      puzzle: null,
      reward: null,
      message: null,
    });
  }

  clearMessage(): void {
    this.patch({ message: null });
  }

  private async attachRestored(restored: RestoredGame): Promise<void> {
    if (restored.status === 'none') {
      return;
    }
    if (restored.status === 'content_changed') {
      this.patch({
        message: { code: 'saved_catalog_changed' },
      });
      return;
    }
    const puzzle = await this.content.getPuzzle(
      restored.session.state.puzzleId,
    );
    if (!puzzle) {
      this.patch({ message: { code: 'saved_puzzle_missing' } });
      return;
    }
    this.service = PersistentGameService.fromRestored(
      restored.session,
      definitionFor(puzzle),
      this.players,
    );
    if (this.service.session.state.status === 'active') {
      await this.dispatch({ type: 'pause', atEpochMs: this.now() });
    }
    this.patch({
      puzzle,
      session: this.service.session,
      resumable: true,
      screen: 'home',
    });
  }

  private startFresh(
    level: DifficultyLevel,
    opportunity: StartOpportunity,
  ): Promise<void> {
    return this.runBusy(() => this.startFreshInternal(level, opportunity));
  }

  private async startFreshInternal(
    level: DifficultyLevel,
    opportunity: StartOpportunity,
  ): Promise<void> {
    await this.access.showStartOpportunity(opportunity);
    const catalog = this.catalogs.get(level) ?? [];
    const assignment = assignPuzzle(
      catalog,
      level,
      new Set(this.progress.completedPuzzleIds),
      this.createId('session'),
    );
    if (!assignment) {
      this.patch({ message: { code: 'level_unavailable', params: { level } } });
      return;
    }
    const startedAtEpochMs = this.now();
    const sessionId = this.createId('session');
    this.service = await PersistentGameService.start(
      {
        sessionId,
        definition: definitionFor(assignment.puzzle),
        startedAtEpochMs,
        settings: this.newGameSettings,
      },
      this.players,
      this.createId('event'),
    );
    this.patch({
      screen: 'game',
      session: this.service.session,
      puzzle: assignment.puzzle,
      resumable: false,
      reward: null,
      message: assignment.replay
        ? { code: 'level_replay', params: { level } }
        : null,
    });
  }

  private runCommand(
    command: Exclude<GameCommand, { type: 'select_cell' }>,
  ): Promise<void> {
    return this.runBusy(async () => {
      await this.dispatch(command);
    });
  }

  private async dispatch(
    command: Exclude<GameCommand, { type: 'select_cell' }>,
  ) {
    if (!this.service) {
      throw new Error('No game session is available.');
    }
    const result = await this.service.dispatch(command, this.createId('event'));
    if (!result.accepted) {
      this.patch({
        message: blockedMessage(result.reason),
      });
      return result;
    }
    const nextPatch: Partial<OfflineGameSnapshot> = {
      session: result.session,
      message: null,
    };
    if (result.persistence) {
      nextPatch.wallet = result.persistence.wallet;
      nextPatch.reward = result.persistence.reward;
    }
    if (isTerminal(result.session)) {
      nextPatch.screen = 'result';
      nextPatch.resumable = false;
      await this.refreshPlayerSummary();
    }
    this.patch(nextPatch);
    return result;
  }

  private async refreshPlayerSummary(): Promise<void> {
    const [statistics, progress, wallet] = await Promise.all([
      this.players.getStatistics(),
      this.players.getCompletionProgress(),
      this.players.readWallet(),
    ]);
    this.progress = progress;
    this.patch({
      statistics,
      wallet,
      completedByLevel: this.countCompletions(progress),
    });
  }

  private countCompletions(
    progress: PlayerCompletionProgress,
  ): Readonly<Record<DifficultyLevel, number>> {
    const completed = new Set(progress.completedPuzzleIds);
    return {
      1: (this.catalogs.get(1) ?? []).filter(puzzle => completed.has(puzzle.id))
        .length,
      2: (this.catalogs.get(2) ?? []).filter(puzzle => completed.has(puzzle.id))
        .length,
      3: (this.catalogs.get(3) ?? []).filter(puzzle => completed.has(puzzle.id))
        .length,
      4: (this.catalogs.get(4) ?? []).filter(puzzle => completed.has(puzzle.id))
        .length,
      5: (this.catalogs.get(5) ?? []).filter(puzzle => completed.has(puzzle.id))
        .length,
    };
  }

  private async runBusy(operation: () => Promise<void>): Promise<void> {
    if (this.state.busy) {
      return;
    }
    this.patch({ busy: true });
    try {
      await operation();
    } catch {
      this.patch({ message: { code: 'unexpected_error' } });
    } finally {
      this.patch({ busy: false });
      if (this.pauseRequested) {
        this.pauseRequested = false;
        await this.pause();
      }
    }
  }

  private patch(changes: Partial<OfflineGameSnapshot>): void {
    this.state = { ...this.state, ...changes };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
