import {
  GameCommand,
  GameCommandResult,
  GameDefinition,
  GameSession,
  GameState,
  UndoSnapshot,
} from '../../domain/game/contracts';
import {
  createGameSession,
  dispatchGameCommand,
} from '../../domain/game/engine';
import { CreateGameInput } from '../../domain/game/contracts';
import { CellIndex } from '../../domain/sudoku/contracts';
import {
  PersistedCommand,
  RestoredGame,
  UserRepository,
} from '../../data/user/user-repository';

export function replaySnapshot(state: GameState): UndoSnapshot {
  const {
    values,
    candidates,
    incorrectCells,
    errorCount,
    status,
    completionKind,
  } = state;
  return {
    values,
    candidates,
    incorrectCells,
    errorCount,
    status,
    completionKind,
  };
}

export interface PersistentGameStore {
  createSession(session: GameSession, eventId: string): Promise<void>;
  persistCommand(
    result: GameCommandResult,
    eventId: string,
    expectedRevision: number,
  ): Promise<PersistedCommand>;
}

export type PersistedGameCommandResult = GameCommandResult & {
  persistence?: PersistedCommand;
};

type DurableGameCommand = Exclude<GameCommand, { type: 'select_cell' }>;

export class PersistentGameService {
  private readonly dispatched = new Map<
    string,
    { command: string; result: Promise<PersistedGameCommandResult> }
  >();
  private operationTail: Promise<void> = Promise.resolve();

  private constructor(
    private currentSession: GameSession,
    private readonly definition: GameDefinition,
    private readonly store: PersistentGameStore,
  ) {}

  static async start(
    input: CreateGameInput,
    store: PersistentGameStore,
    startEventId: string,
  ): Promise<PersistentGameService> {
    const session = createGameSession(input);
    session.state.replayRecordingSinceRevision = 0;
    await store.createSession(session, startEventId);
    return new PersistentGameService(session, input.definition, store);
  }

  static fromRestored(
    session: GameSession,
    definition: GameDefinition,
    store: PersistentGameStore,
  ): PersistentGameService {
    if (
      session.state.puzzleId !== definition.puzzleId ||
      session.state.contentVersion !== definition.contentVersion
    ) {
      throw new Error(
        'The restored session does not match its puzzle definition.',
      );
    }
    return new PersistentGameService(session, definition, store);
  }

  get session(): GameSession {
    return this.currentSession;
  }

  dispatch(
    command: DurableGameCommand,
    eventId: string,
    targetCell = this.currentSession.state.selectedCell,
  ): Promise<PersistedGameCommandResult> {
    const identity = JSON.stringify({ command, targetCell });
    const existing = this.dispatched.get(eventId);
    if (existing) {
      if (existing.command !== identity)
        return Promise.reject(
          new Error('Event ID reused for a different command.'),
        );
      return existing.result;
    }
    const operation = this.operationTail.then(() =>
      this.dispatchAndPersist(command, eventId, targetCell),
    );
    this.operationTail = operation.then(
      () => undefined,
      () => undefined,
    );
    this.dispatched.set(eventId, { command: identity, result: operation });
    operation.then(
      () => {
        // Bound retained snapshots while preserving in-flight duplicate delivery.
        if (this.dispatched.size > 128)
          this.dispatched.delete(this.dispatched.keys().next().value!);
      },
      () => this.dispatched.delete(eventId),
    );
    return operation;
  }

  selectCell(
    command: Extract<GameCommand, { type: 'select_cell' }>,
  ): GameCommandResult {
    const result = dispatchGameCommand(
      this.currentSession,
      this.definition,
      command,
    );
    if (result.accepted) {
      this.currentSession = result.session;
    }
    return result;
  }

  private async dispatchAndPersist(
    command: DurableGameCommand,
    eventId: string,
    targetCell: CellIndex | null,
  ): Promise<PersistedGameCommandResult> {
    const previous = this.currentSession;
    const commandSession =
      (command.type === 'input_digit' || command.type === 'erase') &&
      previous.state.selectedCell !== targetCell
        ? {
            ...previous,
            state: { ...previous.state, selectedCell: targetCell },
          }
        : previous;
    let result = dispatchGameCommand(commandSession, this.definition, command);
    if (!result.accepted || result.session === commandSession) {
      return result;
    }

    result = {
      ...result,
      session: {
        ...result.session,
        state: {
          ...result.session.state,
          replayRecordingSinceRevision:
            previous.state.replayRecordingSinceRevision ??
            previous.state.revision,
        },
      },
      replayEvent: {
        id: eventId,
        sessionId: previous.state.sessionId,
        previousRevision: previous.state.revision,
        revision: result.session.state.revision,
        kind: command.type,
        move:
          result.historyChange?.kind === 'append'
            ? result.historyChange.move
            : null,
        targetMoveId:
          result.historyChange?.kind === 'undo'
            ? result.historyChange.moveId
            : null,
        hint:
          command.type === 'reveal_hint'
            ? result.session.state.activeHint
            : command.type === 'apply_hint'
            ? previous.state.activeHint
            : null,
        before: replaySnapshot(previous.state),
        after: replaySnapshot(result.session.state),
        createdAtEpochMs: result.session.state.updatedAtEpochMs,
      },
    };
    const persistence = await this.store.persistCommand(
      result,
      eventId,
      previous.state.revision,
    );
    // Selection can change while SQLite is saving. A completed write must not
    // move the user's focus back to the cell targeted by an earlier command.
    const selectedCell = this.currentSession.state.selectedCell;
    this.currentSession =
      selectedCell === result.session.state.selectedCell
        ? result.session
        : {
            ...result.session,
            state: { ...result.session.state, selectedCell },
          };
    return { ...result, persistence };
  }
}

export async function restorePersistentGameService(
  repository: UserRepository,
  definition: GameDefinition,
  restoredAtEpochMs: number,
): Promise<
  | { status: 'none' | 'content_changed'; restored: RestoredGame }
  | { status: 'ready'; service: PersistentGameService }
> {
  const restored = await repository.restoreUnfinishedSession(
    definition.contentVersion,
    restoredAtEpochMs,
  );
  if (restored.status !== 'ready') {
    return { status: restored.status, restored };
  }
  return {
    status: 'ready',
    service: PersistentGameService.fromRestored(
      restored.session,
      definition,
      repository,
    ),
  };
}
