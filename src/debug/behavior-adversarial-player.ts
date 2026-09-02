import { GameSession } from '../domain/game/contracts';
import { CandidateGrid, Digit } from '../domain/sudoku/contracts';
import { digitsFromMask } from '../domain/sudoku/board';

export type AdversarialStrategy =
  | 'direct_placement'
  | 'all_then_placement'
  | 'partial_then_placement'
  | 'elimination_idle'
  | 'wrong_then_erase'
  | 'undo_after_result'
  | 'hint_interruption'
  | 'pause_resume'
  | 'rejected_command'
  | 'rapid_placements';

export type AdversarialGameView = {
  session: GameSession | null;
  solutionFingerprint: string | null;
  messageCode: string | null;
};

export interface AdversarialGameDriver {
  view(): AdversarialGameView;
  startGame(): Promise<void>;
  selectCell(cell: number): Promise<void>;
  inputDigit(digit: Digit): Promise<void>;
  erase(): Promise<void>;
  undo(): Promise<void>;
  togglePencil(): Promise<void>;
  toggleQuickPencil(): Promise<void>;
  requestHint(): Promise<void>;
  dismissHint(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  acceptedDurableCommandCount(): number;
}

export type AdversarialTraceEntry = {
  step: number;
  strategy: AdversarialStrategy;
  beforeRevision: number | null;
  afterRevision: number | null;
  commandCount: number;
  acceptedDurableCommandCount: number;
  messageCode: string | null;
  error: string | null;
};

export type AdversarialRun = {
  seed: number;
  requestedSteps: number;
  commandCount: number;
  strategyCounts: Record<AdversarialStrategy, number>;
  trace: readonly AdversarialTraceEntry[];
};

const STRATEGIES: readonly AdversarialStrategy[] = [
  'direct_placement',
  'all_then_placement',
  'partial_then_placement',
  'elimination_idle',
  'wrong_then_erase',
  'undo_after_result',
  'hint_interruption',
  'pause_resume',
  'rejected_command',
  'rapid_placements',
];

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 0x6d2b79f5;
  }

  next(): number {
    this.state =
      (Math.imul(1_664_525, this.state) + 1_013_904_223 + 0x1_0000_0000) %
      0x1_0000_0000;
    return this.state / 0x1_0000_0000;
  }

  choose<Value>(values: readonly Value[]): Value | null {
    return values.length === 0
      ? null
      : values[Math.floor(this.next() * values.length)];
  }
}

type StrategyContext = {
  random: SeededRandom;
  driver: AdversarialGameDriver;
  commandCount: number;
};

async function command(
  context: StrategyContext,
  operation: () => Promise<void>,
): Promise<void> {
  context.commandCount += 1;
  await operation();
}

function mutableEmptyCells(view: AdversarialGameView): number[] {
  const state = view.session?.state;
  if (!state) {
    return [];
  }
  return state.values
    .map((value, cell) =>
      value === null && state.givens[cell] === null ? cell : -1,
    )
    .filter(cell => cell >= 0);
}

function candidateChoice(
  grid: CandidateGrid,
  cells: readonly number[],
  solution: string,
  random: SeededRandom,
): { cell: number; digit: Digit } | null {
  const choices = cells.flatMap(cell =>
    digitsFromMask(grid[cell])
      .filter(digit => digit !== Number(solution[cell]))
      .map(digit => ({ cell, digit })),
  );
  return random.choose(choices);
}

async function ensureActive(context: StrategyContext): Promise<void> {
  const session = context.driver.view().session;
  if (
    !session ||
    ['completed', 'failed', 'abandoned'].includes(session.state.status)
  ) {
    await command(context, () => context.driver.startGame());
  } else if (session.state.status === 'paused') {
    await command(context, () => context.driver.resume());
  }
}

async function ensurePencil(
  context: StrategyContext,
  enabled: boolean,
): Promise<void> {
  if (context.driver.view().session?.state.candidates.pencilMode !== enabled) {
    await command(context, () => context.driver.togglePencil());
  }
}

async function placeCorrect(context: StrategyContext): Promise<boolean> {
  await ensureActive(context);
  await ensurePencil(context, false);
  const view = context.driver.view();
  const cell = context.random.choose(mutableEmptyCells(view));
  if (cell === null || !view.solutionFingerprint) {
    return false;
  }
  await command(context, () => context.driver.selectCell(cell));
  await command(context, () =>
    context.driver.inputDigit(Number(view.solutionFingerprint![cell]) as Digit),
  );
  return true;
}

async function eliminateCandidate(
  context: StrategyContext,
  count: number,
): Promise<boolean> {
  await ensureActive(context);
  let state = context.driver.view().session!.state;
  if (state.candidates.activeCandidateSource !== 'quick') {
    await command(context, () => context.driver.toggleQuickPencil());
    state = context.driver.view().session!.state;
  }
  await ensurePencil(context, true);
  let changed = false;
  for (let index = 0; index < count; index += 1) {
    const view = context.driver.view();
    state = view.session!.state;
    const choice = candidateChoice(
      state.candidates.quickCandidates,
      mutableEmptyCells(view),
      view.solutionFingerprint!,
      context.random,
    );
    if (!choice) {
      break;
    }
    await command(context, () => context.driver.selectCell(choice.cell));
    await command(context, () => context.driver.inputDigit(choice.digit));
    changed = true;
  }
  return changed;
}

async function executeStrategy(
  strategy: AdversarialStrategy,
  context: StrategyContext,
): Promise<void> {
  switch (strategy) {
    case 'direct_placement':
      await placeCorrect(context);
      return;
    case 'all_then_placement':
      await eliminateCandidate(context, 3);
      await placeCorrect(context);
      return;
    case 'partial_then_placement':
      await eliminateCandidate(context, 1);
      await placeCorrect(context);
      return;
    case 'elimination_idle':
      if (!(await eliminateCandidate(context, 2))) {
        await placeCorrect(context);
      }
      return;
    case 'wrong_then_erase': {
      await ensureActive(context);
      await ensurePencil(context, false);
      const view = context.driver.view();
      const cell = context.random.choose(mutableEmptyCells(view));
      if (cell === null || !view.solutionFingerprint) {
        return;
      }
      const solution = Number(view.solutionFingerprint[cell]);
      const wrong = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).find(
        digit => digit !== solution,
      )!;
      await command(context, () => context.driver.selectCell(cell));
      await command(context, () => context.driver.inputDigit(wrong));
      await command(context, () => context.driver.erase());
      return;
    }
    case 'undo_after_result':
      if (await placeCorrect(context)) {
        await command(context, () => context.driver.undo());
      }
      return;
    case 'hint_interruption':
      await ensureActive(context);
      await eliminateCandidate(context, 1);
      await command(context, () => context.driver.requestHint());
      await command(context, () => context.driver.dismissHint());
      return;
    case 'pause_resume':
      await ensureActive(context);
      await command(context, () => context.driver.pause());
      await command(context, () => context.driver.resume());
      return;
    case 'rejected_command':
      await ensureActive(context);
      await command(context, () =>
        context.driver.selectCell(
          context.driver
            .view()
            .session!.state.givens.findIndex(value => value !== null),
        ),
      );
      await command(context, () => context.driver.inputDigit(1));
      return;
    case 'rapid_placements':
      await placeCorrect(context);
      await placeCorrect(context);
  }
}

export async function runAdversarialPlayer(
  driver: AdversarialGameDriver,
  options: { seed: number; steps: number },
): Promise<AdversarialRun> {
  const random = new SeededRandom(options.seed);
  const context: StrategyContext = { random, driver, commandCount: 0 };
  const trace: AdversarialTraceEntry[] = [];
  const strategyCounts = Object.fromEntries(
    STRATEGIES.map(strategy => [strategy, 0]),
  ) as Record<AdversarialStrategy, number>;

  await ensureActive(context);
  for (let step = 0; step < options.steps; step += 1) {
    const strategy =
      step < STRATEGIES.length ? STRATEGIES[step] : random.choose(STRATEGIES)!;
    const beforeRevision = driver.view().session?.state.revision ?? null;
    const beforeCommands = context.commandCount;
    const beforeAccepted = driver.acceptedDurableCommandCount();
    let error: string | null = null;
    try {
      await executeStrategy(strategy, context);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    strategyCounts[strategy] += 1;
    trace.push({
      step,
      strategy,
      beforeRevision,
      afterRevision: driver.view().session?.state.revision ?? null,
      commandCount: context.commandCount - beforeCommands,
      acceptedDurableCommandCount:
        driver.acceptedDurableCommandCount() - beforeAccepted,
      messageCode: driver.view().messageCode,
      error,
    });
  }
  return {
    seed: options.seed,
    requestedSteps: options.steps,
    commandCount: context.commandCount,
    strategyCounts,
    trace,
  };
}

export function auditAdversarialRun(run: AdversarialRun): readonly string[] {
  const violations: string[] = [];
  if (run.trace.length !== run.requestedSteps) {
    violations.push('trace_length_mismatch');
  }
  for (const strategy of STRATEGIES) {
    if (run.strategyCounts[strategy] === 0) {
      violations.push(`missing_strategy:${strategy}`);
    }
  }
  for (const entry of run.trace) {
    if (entry.error !== null) {
      violations.push(`strategy_error:${entry.step}:${entry.error}`);
    }
    if (entry.commandCount === 0) {
      violations.push(`empty_strategy:${entry.step}:${entry.strategy}`);
    }
    if (
      entry.strategy === 'rejected_command' &&
      entry.acceptedDurableCommandCount !== 0
    ) {
      violations.push(`rejected_command_observed:${entry.step}`);
    }
    if (entry.messageCode === 'unexpected_error') {
      violations.push(`unexpected_game_error:${entry.step}:${entry.strategy}`);
    }
  }
  return violations;
}

export const ADVERSARIAL_STRATEGIES = STRATEGIES;
