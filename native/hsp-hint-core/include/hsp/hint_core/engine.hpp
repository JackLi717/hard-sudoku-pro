#pragma once

#include "hsp/hint_core/types.hpp"

namespace hsp::hint_core {

CandidateGrid createCandidates(const Board &board) noexcept;
ResultReason validateRequest(const HintRequest &request) noexcept;
OpportunityOutcome opportunityOutcome(const HintStep &step);
OpportunitySetAnalysis
analyzeOpportunitySet(const std::vector<HintStep> &opportunities);
OpportunityAttributionResult
attributeOpportunityEffect(const OpportunitySetAnalysis &analysis,
                           OpportunityEffect effect);
std::vector<OpportunityAttributionTransition>
compareOpportunityEffectAttribution(
    const OpportunitySetAnalysis &baseline,
    const OpportunitySetAnalysis &comparison);
OpportunitySequenceState
startOpportunitySequence(const OpportunitySetAnalysis &analysis,
                         std::uint64_t boardRevision);
OpportunitySequenceState
advanceOpportunitySequence(const OpportunitySequenceState &state,
                           const OpportunitySequenceEvent &event);
std::vector<Candidate>
immediatePlacementsAfterOpportunity(const HintRequest &startingSnapshot,
                                    const HintStep &opportunity);
OpportunityExplanationResult explainOpportunityEffects(
    const HintRequest &startingSnapshot,
    const std::vector<HintStep> &opportunities,
    const std::vector<OpportunityEffect> &observedEffects,
    bool opportunitySetComplete);

class OpportunitySearchSession final {
public:
  OpportunitySearchSession(const OpportunitySearchSession &) = delete;
  OpportunitySearchSession &operator=(const OpportunitySearchSession &) = delete;
  OpportunitySearchSession(OpportunitySearchSession &&) noexcept = default;
  OpportunitySearchSession &operator=(OpportunitySearchSession &&) noexcept =
      default;

  // A session owns an immutable copy of the board, candidates, and given-cell
  // metadata. The optional cancellation flag remains caller-owned for the
  // session lifetime. Calls on one session are sequential; independent
  // sessions may advance concurrently.
  [[nodiscard]] OpportunitySearchBatch
  advance(OpportunitySearchBudget budget);

private:
  friend class Engine;
  OpportunitySearchSession(HintRequest request,
                           OpportunitySearchOptions options);

  [[nodiscard]] OpportunitySearchBatch snapshot(
      std::uint32_t workUnitsConsumed) const;
  void finishIfBoundaryReached();

  HintRequest request_;
  OpportunitySearchOptions options_;
  OpportunitySearchStatus status_{OpportunitySearchStatus::partial};
  ResultReason reason_{ResultReason::none};
  std::size_t nextTechniqueIndex_{0};
  std::uint32_t totalWorkUnitsConsumed_{0};
  std::optional<std::uint8_t> frontierLevel_;
  std::vector<TechniqueSearchDiagnostic> techniqueDiagnostics_;
  std::vector<HintStep> opportunities_;
};

class Engine final {
public:
  [[nodiscard]] OpportunitySearchSession startOpportunitySearch(
      const HintRequest &request,
      OpportunitySearchOptions options = {}) const;
  [[nodiscard]] FrontierResult
  collectFrontierOpportunities(const HintRequest &request) const;
  [[nodiscard]] HintResult nextStep(const HintRequest &request) const;
};

} // namespace hsp::hint_core
