#pragma once

#include <atomic>
#include <string>
#include <string_view>

namespace hsp::hint_core {

// Stable, platform-neutral boundary used by the iOS and Android TurboModules.
// Candidate masks are 81 comma-separated decimal 9-bit masks. givenCells is
// either empty or an 81-character string containing only '0' and '1'.
[[nodiscard]] std::string nextStepJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells = {},
    const std::atomic_bool *cancelRequested = nullptr);

} // namespace hsp::hint_core
