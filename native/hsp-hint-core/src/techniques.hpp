#pragma once

#include "hsp/hint_core/types.hpp"

#include <cstddef>
#include <optional>
#include <vector>

namespace hsp::hint_core::detail {

std::optional<HintStep> detectTechnique(const HintRequest &request,
                                        Technique technique);

// Level-one techniques are cheap enough to enumerate completely. This is
// used by the human-oriented selector instead of relying on detector order.
std::vector<HintStep> detectLevelOneCandidates(const HintRequest &request,
                                               Technique technique);

// Enumerates applicable instances for the selector. Graph-heavy techniques
// are deliberately bounded so hint latency stays interactive.
std::vector<HintStep> detectTechniqueCandidates(const HintRequest &request,
                                                Technique technique);

struct TechniqueCandidateResult {
  std::vector<HintStep> steps;
  // True when the collector reached its configured bound. This is a
  // conservative completeness warning: the detector may have stopped early,
  // but reaching the bound does not prove another candidate existed.
  bool reachedEnumerationLimit{false};
};

TechniqueCandidateResult detectTechniqueCandidateResult(
    const HintRequest &request, Technique technique);
TechniqueCandidateResult detectTechniqueCandidateResult(
    const HintRequest &request, Technique technique,
    std::size_t candidateLimit);

// Adds the variable-length, page-local proof and the human-effort score used
// by Engine. Exposed only in this internal header for detector acceptance.
void addTeachingProof(const HintRequest &request, HintStep &step);

} // namespace hsp::hint_core::detail
