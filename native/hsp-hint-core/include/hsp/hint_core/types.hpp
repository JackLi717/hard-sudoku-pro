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
  // Owned by the caller for the duration of nextStep. Advanced graph searches
  // poll this flag and terminate without producing a partial hint.
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

} // namespace hsp::hint_core
