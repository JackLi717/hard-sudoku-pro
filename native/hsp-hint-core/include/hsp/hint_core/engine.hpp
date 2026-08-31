#pragma once

#include "hsp/hint_core/types.hpp"

namespace hsp::hint_core {

CandidateGrid createCandidates(const Board &board) noexcept;
ResultReason validateRequest(const HintRequest &request) noexcept;

class Engine final {
public:
  [[nodiscard]] HintResult nextStep(const HintRequest &request) const;
};

} // namespace hsp::hint_core
