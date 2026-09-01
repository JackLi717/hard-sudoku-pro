#pragma once

#include "hsp/hint_core/types.hpp"

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

// Adds the variable-length, page-local proof and the human-effort score used
// by Engine. Exposed only in this internal header for detector acceptance.
void addTeachingProof(const HintRequest &request, HintStep &step);

} // namespace hsp::hint_core::detail
