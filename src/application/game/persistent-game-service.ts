import {
  GameCommand,
  GameCommandResult,
  GameDefinition,
  GameSession,
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
    const operation = this.operationTail.then(() =>
      this.dispatchAndPersist(command, eventId, targetCell),
    );
    this.operationTail = operation.then(
      () => undefined,
      () => undefined,
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
    const result = dispatchGameCommand(
      commandSession,
      this.definition,
      command,
    );
    if (!result.accepted || result.session === commandSession) {
      return result;
    }

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
