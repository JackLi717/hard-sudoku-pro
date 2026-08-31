#pragma once

#include "hsp/hint_core/types.hpp"

#include <optional>

namespace hsp::hint_core::detail {

std::optional<HintStep> detectTechnique(const HintRequest &request,
                                        Technique technique);

} // namespace hsp::hint_core::detail
