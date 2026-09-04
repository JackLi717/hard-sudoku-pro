import { TechniqueOpportunityAnalyzer } from '../../domain/technique-recognition/contracts';
import { BehaviorShadowRecord } from './shadow-controller';
import { behaviorShadowRecordsToReviewSamples } from './shadow-export';
import { verifyReasoningStages } from './reasoning-stages';
import {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} from './opportunity-processes';

let nextReviewRun = 1;

/** On-demand, read-only verification of all competing processes for one record.
 * The whole graph's completeness gate is retained even when verifying a subset.
 */
export async function verifyReviewProcesses(
  records: readonly BehaviorShadowRecord[],
  sessionId: string,
  requestId: string,
  analyzer: TechniqueOpportunityAnalyzer,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new Error('Review cancelled');
  const local = records.filter(
    r =>
      r.sessionId === sessionId &&
      (!r.request || r.request.sessionId === sessionId),
  );
  const sample = behaviorShadowRecordsToReviewSamples(local).find(
    s => s.analysisRequest?.requestId === requestId,
  );
  const graph = buildOpportunityProcesses(local, sessionId);
  const selected = {
    ...graph,
    processes: graph.processes.filter(p =>
      p.members.some(m => m.sampleId === sample?.sampleId),
    ),
  };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 30_000);
  const runId = `review:${Date.now()}:${nextReviewRun++}`;
  let abortHandler: () => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    abortHandler = () => reject(new Error('Review cancelled or timed out'));
    controller.signal.addEventListener('abort', abortHandler, { once: true });
  });
  aborted.catch(() => undefined);
  try {
    const scopedAnalyzer: TechniqueOpportunityAnalyzer = {
      analyze: async request => {
        if (controller.signal.aborted) throw new Error('Review cancelled');
        const nativeRequest = {
          ...request,
          requestId: `${runId}:${request.requestId}`,
        };
        const response = await Promise.race([
          analyzer.analyze(nativeRequest, { signal: controller.signal }),
          aborted,
        ]);
        // Restore only our own namespace; a foreign native identity must fail.
        return response.requestId === nativeRequest.requestId
          ? { ...response, requestId: request.requestId }
          : response;
      },
    };
    const verified = await verifyOpportunityProcesses(selected, scopedAnalyzer);
    const reasoningStages = await verifyReasoningStages(
      verified,
      scopedAnalyzer,
    );
    if (controller.signal.aborted)
      throw new Error('Review cancelled or timed out');
    return {
      ...verified,
      reasoningStages,
      placementExplanations: verified.placementExplanations?.filter(
        e => e.sampleId === sample?.sampleId,
      ),
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', abortHandler);
  }
}
