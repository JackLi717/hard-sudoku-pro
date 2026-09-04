#pragma once

#include "hsp/hint_core/types.hpp"

#include <atomic>
#include <string>
#include <string_view>

namespace hsp::hint_core {

// Shared by the platform bridge and build-time acceptance-fixture exporter.
[[nodiscard]] std::string serializeHintStepJson(
    std::string_view boardFingerprint, const HintStep &step);

// Stable, platform-neutral boundary used by the iOS and Android TurboModules.
// Candidate masks are 81 comma-separated decimal 9-bit masks. givenCells is
// either empty or an 81-character string containing only '0' and '1'.
[[nodiscard]] std::string nextStepJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells = {},
    const std::atomic_bool *cancelRequested = nullptr);

[[nodiscard]] std::string enumerateStepsJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells,
    const std::atomic_bool *cancelRequested = nullptr);

// One-shot behavior-recognition boundary. observedEffects is a comma-separated
// list of p:<cell>:<digit> and e:<cell>:<digit> tokens. It searches the
// existing all-direct opportunity set and applies the existing minimum-cost
// explanation policy; it does not add recognition rules.
[[nodiscard]] std::string opportunityExplanationJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells, std::string_view observedEffects,
    const std::atomic_bool *cancelRequested = nullptr);

} // namespace hsp::hint_core
