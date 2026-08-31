import { HintEngineRequest, HintEngineResult } from './contracts';

/**
 * Runtime boundary for the logical hint engine.
 *
 * Implementations must run away from the UI thread and must never fall back to
 * guessing, backtracking, or a solution-derived placement.
 */
export interface HintEngine {
  nextStep(request: HintEngineRequest): Promise<HintEngineResult>;
}
