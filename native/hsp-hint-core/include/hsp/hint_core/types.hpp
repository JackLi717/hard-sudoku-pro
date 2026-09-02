#pragma once

#include <array>
#include <atomic>
#include <cstdint>
#include <optional>
#include <string_view>
#include <vector>

namespace hsp::hint_core {

inline constexpr std::size_t kSideLength = 9;
inline constexpr std::size_t kCellCount = 81;
inline constexpr std::uint16_t kAllCandidatesMask = 0x01FF;

using Cell = std::uint8_t;
using Digit = std::uint8_t;
using CandidateMask = std::uint16_t;
using Board = std::array<Digit, kCellCount>;
using CandidateGrid = std::array<CandidateMask, kCellCount>;
using CellFlags = std::array<bool, kCellCount>;

enum class RegionKind : std::uint8_t { row, column, box };

enum class Technique : std::uint8_t {
  fullHouse,
  nakedSingle,
  hiddenSingle,
  lockedCandidatesPointing,
  lockedCandidatesClaiming,
  lockedPair,
  lockedTriple,
  nakedPair,
  hiddenPair,
  nakedTriple,
  hiddenTriple,
  nakedQuad,
  hiddenQuad,
  xWing,
  swordfish,
  skyscraper,
  twoStringKite,
  turbotFish,
  wWing,
  xyWing,
  xyzWing,
  simpleColoring,
  multiColoring,
  remotePair,
  emptyRectangle,
  hiddenRectangle,
  avoidableRectangle,
  uniqueRectangle,
  bugPlusOne,
  finnedXWing,
  sashimiXWing,
  jellyfish,
  xChain,
  xyChain,
  aic,
  groupedAic,
  complexColoring,
  forcingChain,
  forcingNet,
};

struct TechniqueDescriptor {
  Technique technique;
  std::string_view code;
  std::uint8_t level;
};

inline constexpr std::array<TechniqueDescriptor, 39> kTechniqueCatalog{{
    {Technique::fullHouse, "fullHouse", 1},
    {Technique::nakedSingle, "nakedSingle", 1},
    {Technique::hiddenSingle, "hiddenSingle", 1},
    {Technique::lockedCandidatesPointing, "lockedCandidates.pointing", 2},
    {Technique::lockedCandidatesClaiming, "lockedCandidates.claiming", 2},
    {Technique::lockedPair, "lockedPair", 2},
    {Technique::lockedTriple, "lockedTriple", 2},
    {Technique::nakedPair, "nakedPair", 2},
    {Technique::hiddenPair, "hiddenPair", 2},
    {Technique::nakedTriple, "nakedTriple", 3},
    {Technique::hiddenTriple, "hiddenTriple", 3},
    {Technique::nakedQuad, "nakedQuad", 3},
    {Technique::hiddenQuad, "hiddenQuad", 3},
    {Technique::xWing, "xWing", 3},
    {Technique::swordfish, "swordfish", 4},
    {Technique::skyscraper, "skyscraper", 4},
    {Technique::twoStringKite, "twoStringKite", 4},
    {Technique::turbotFish, "turbotFish", 4},
    {Technique::wWing, "wWing", 4},
    {Technique::xyWing, "xyWing", 4},
    {Technique::xyzWing, "xyzWing", 4},
    {Technique::simpleColoring, "simpleColoring", 4},
    {Technique::multiColoring, "multiColoring", 4},
    {Technique::remotePair, "remotePair", 4},
    {Technique::emptyRectangle, "emptyRectangle", 4},
    {Technique::hiddenRectangle, "hiddenRectangle", 4},
    {Technique::avoidableRectangle, "avoidableRectangle", 4},
    {Technique::uniqueRectangle, "uniqueRectangle", 4},
    {Technique::bugPlusOne, "bugPlusOne", 4},
    {Technique::finnedXWing, "finnedXWing", 4},
    {Technique::sashimiXWing, "sashimiXWing", 4},
    {Technique::jellyfish, "jellyfish", 5},
    {Technique::xChain, "xChain", 5},
    {Technique::xyChain, "xyChain", 5},
    {Technique::aic, "aic", 5},
    {Technique::groupedAic, "groupedAic", 5},
    {Technique::complexColoring, "complexColoring", 5},
    {Technique::forcingChain, "forcingChain", 5},
    {Technique::forcingNet, "forcingNet", 5},
}};

constexpr std::string_view techniqueCode(Technique technique) noexcept {
  for (const auto &descriptor : kTechniqueCatalog) {
    if (descriptor.technique == technique) {
      return descriptor.code;
    }
  }
  return "unknown";
}

constexpr std::uint8_t difficultyLevel(Technique technique) noexcept {
  for (const auto &descriptor : kTechniqueCatalog) {
    if (descriptor.technique == technique) {
      return descriptor.level;
    }
  }
  return 0;
}

struct Candidate {
  Cell cell;
  Digit digit;
  bool operator==(const Candidate &) const = default;
};

struct Region {
  RegionKind kind;
  std::uint8_t index;
  bool operator==(const Region &) const = default;
};

enum class ProofKind : std::uint8_t { observe, reason, conclusion };

enum class ProofReason : std::uint8_t {
  scanRegion,
  singleCandidate,
  valueBlocksCells,
  patternConstraint,
  chainInference,
  forcedPlacement,
  validElimination,
};

struct HintProofStep {
  ProofKind kind;
  ProofReason reason;
  std::vector<Cell> focusCells;
  std::vector<Region> focusRegions;
  std::vector<Candidate> premiseCandidates;
  // Filled cells used as visible evidence. Candidate is reused here as the
  // compact (cell, digit) value reference shared by the native bridge.
  std::vector<Candidate> valueEvidence;
  std::vector<Candidate> eliminations;
  std::vector<Candidate> placements;
  bool operator==(const HintProofStep &) const = default;
};

struct HintStep {
  Technique technique;
  std::vector<Cell> focusCells;
  std::vector<Region> focusRegions;
  std::vector<Candidate> premises;
  std::vector<Candidate> eliminations;
  std::vector<Candidate> placements;
  // Optional so callers constructing legacy aggregate steps remain source
  // compatible. Engine-produced hints always populate a proof.
  std::vector<HintProofStep> proofSteps{};
  std::uint32_t humanCost{0};
  bool operator==(const HintStep &) const = default;
};

struct HintRequest {
  Board board{};
  CandidateGrid hintCandidates{};
  // Optional clue identity.  It is required only by techniques, such as
  // Avoidable Rectangle, whose proof depends on distinguishing immutable
  // givens from values entered while solving.  An all-false mask keeps the
  // original two-field aggregate initialization source-compatible and makes
  // those detectors conservatively decline to return a step.
  CellFlags givenCells{};
  // Owned by the caller for the duration of an Engine analysis. Advanced graph
  // searches poll this flag and terminate without producing partial results.
  const std::atomic_bool *cancelRequested{nullptr};
};

enum class ResultStatus : std::uint8_t {
  step,
  invalidBoard,
  noSupportedStep,
  solved,
  cancelled,
};

enum class ResultReason : std::uint8_t {
  none,
  invalidDigit,
  conflictingDigits,
  candidatesOnFilledCell,
  emptyCandidateSet,
  illegalCandidate,
  invalidGivenCell,
};

struct HintResult {
  ResultStatus status;
  ResultReason reason{ResultReason::none};
  std::optional<HintStep> step;
};

struct FrontierResult {
  ResultStatus status;
  ResultReason reason{ResultReason::none};
  // Invariant: status == step iff frontierLevel is in [1, 5] and
  // opportunities is non-empty. Every opportunity belongs to frontierLevel,
  // has its teaching proof and humanCost populated, and the normal hint
  // selector's best opportunity is first. Remaining opportunities keep their
  // deterministic detector order. Every non-step status has no level or
  // opportunities.
  std::optional<std::uint8_t> frontierLevel;
  std::vector<HintStep> opportunities;
};

enum class OpportunitySearchScope : std::uint8_t {
  // Stop after every detector in the lowest non-empty difficulty level has
  // run. This is the resumable equivalent of collectFrontierOpportunities().
  frontierOnly,
  // Continue through every enabled catalog level for the unchanged board.
  // Detectors retain their documented internal enumeration bounds.
  allDirect,
};

struct OpportunitySearchOptions {
  OpportunitySearchScope scope{OpportunitySearchScope::frontierOnly};
  std::uint8_t maximumLevel{5};
  // Algorithm-evaluation controls. Runtime callers should normally keep the
  // bounded defaults; larger values allow deterministic sensitivity checks.
  std::uint32_t levelTwoToFourCandidateLimit{256};
  std::uint32_t levelFiveCandidateLimit{64};
};

struct OpportunitySearchBudget {
  // One work unit runs one catalog technique detector. A unit is deterministic
  // and machine-independent; a future scheduling adapter may translate a
  // runtime time slice into one or more work units.
  std::uint32_t workUnits{1};
};

enum class OpportunitySearchStatus : std::uint8_t {
  partial,
  complete,
  invalidBoard,
  invalidOptions,
  solved,
  cancelled,
};

struct TechniqueSearchDiagnostic {
  Technique technique;
  std::uint32_t candidateCount{0};
  // Conservative completeness warning from the bounded detector collector.
  // False means the detector completed below its bound. True means the bound
  // was reached, not that a specific omitted opportunity is already proven.
  bool reachedEnumerationLimit{false};
  bool operator==(const TechniqueSearchDiagnostic &) const = default;
};

struct OpportunitySearchBatch {
  OpportunitySearchStatus status;
  ResultReason reason{ResultReason::none};
  // The number of technique detectors run by this advance call and by the
  // complete session respectively. Repeated terminal calls consume no work.
  std::uint32_t workUnitsConsumed{0};
  std::uint32_t totalWorkUnitsConsumed{0};
  // The lowest level represented in opportunities. It is absent while no
  // applicable opportunity has been found.
  std::optional<std::uint8_t> frontierLevel;
  // One entry for every fully completed detector, in catalog order.
  std::vector<TechniqueSearchDiagnostic> techniqueDiagnostics;
  // Complete immutable snapshot of all opportunities found so far, not a
  // delta. Every item has a proof and humanCost. The normal hint selector's
  // best currently known item is first; remaining items retain detector order.
  std::vector<HintStep> opportunities;
};

struct OpportunityOutcome {
  std::vector<Candidate> placements;
  std::vector<Candidate> eliminations;
  bool operator==(const OpportunityOutcome &) const = default;
};

struct OpportunityIdentity {
  Technique technique;
  OpportunityOutcome outcome;
  bool operator==(const OpportunityIdentity &) const = default;
};

enum class OpportunitySelectionState : std::uint8_t {
  selected,
  // A different opportunity at the selected difficulty level lost the normal
  // deterministic hint ranking.
  maskedByFrontierRanking,
  // An opportunity at a higher difficulty level was hidden by the selected
  // lower-level frontier.
  maskedByLowerLevel,
};

struct OpportunityAssessment {
  OpportunityIdentity identity;
  // Multiple detector proofs for one technique and atomic outcome collapse to
  // one growth opportunity while preserving their evidence count.
  std::uint32_t proofVariantCount{1};
  OpportunitySelectionState selectionState{
      OpportunitySelectionState::maskedByFrontierRanking};
  // True when at least one other technique explains exactly the same atomic
  // placements and eliminations. Such an action cannot be uniquely attributed
  // to this technique without additional evidence.
  bool ambiguousOutcome{false};
  bool operator==(const OpportunityAssessment &) const = default;
};

enum class OpportunityEffectKind : std::uint8_t {
  placement,
  elimination,
};

struct OpportunityEffect {
  OpportunityEffectKind kind;
  Candidate candidate;
  bool operator==(const OpportunityEffect &) const = default;
};

struct OpportunityEffectAttribution {
  OpportunityEffect effect;
  std::vector<OpportunityIdentity> opportunities;
  // More than one normalized opportunity can explain this atomic action.
  bool opportunityAmbiguous{false};
  // At least two different technique codes can explain this atomic action.
  bool techniqueAmbiguous{false};
  bool operator==(const OpportunityEffectAttribution &) const = default;
};

struct OpportunitySetAnalysis {
  std::uint32_t rawOpportunityCount{0};
  std::uint32_t invalidOpportunityCount{0};
  std::uint32_t duplicateRawOpportunityCount{0};
  std::uint32_t distinctOutcomeCount{0};
  std::uint32_t ambiguousOutcomeCount{0};
  std::uint32_t ambiguousEffectCount{0};
  std::uint32_t crossTechniqueAmbiguousEffectCount{0};
  bool selectionOrderConsistent{true};
  std::optional<OpportunityIdentity> selectedOpportunity;
  std::vector<OpportunityAssessment> opportunities;
  std::vector<OpportunityEffectAttribution> effects;
};

} // namespace hsp::hint_core
