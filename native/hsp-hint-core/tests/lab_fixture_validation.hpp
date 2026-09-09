#pragma once

#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"
#include <algorithm>
#include <bit>
#include <optional>
#include <string>
#include <vector>

namespace hsp::hint_core::tests::lab {

// This is a partial pedagogical order, not catalog order or runtime cost.
// Same-level locked/ordinary subsets overlap, and Turbot includes Kite and
// Skyscraper; those same-level aliases are not made mutually exclusive.
// The catalog difficulty relation still applies across different levels.
inline std::vector<Technique> lowerTechniques(Technique target) {
  std::vector<Technique> result;
  for (const auto &entry : kTechniqueCatalog) {
    if (entry.level < difficultyLevel(target)) result.push_back(entry.technique);
  }
  const auto add = [&](Technique technique) {
    if (technique != target && std::find(result.begin(), result.end(), technique) == result.end())
      result.push_back(technique);
  };
  switch (target) {
  case Technique::hiddenSingle: add(Technique::nakedSingle); [[fallthrough]];
  case Technique::nakedSingle: add(Technique::fullHouse); break;
  case Technique::lockedTriple:
    add(Technique::lockedPair); add(Technique::nakedPair); add(Technique::hiddenPair); break;
  case Technique::nakedQuad:
  case Technique::hiddenQuad:
    add(Technique::nakedTriple); add(Technique::hiddenTriple); break;
  case Technique::multiColoring: add(Technique::simpleColoring); break;
  case Technique::xyzWing: add(Technique::xyWing); break;
  default: break;
  }
  return result;
}

enum class FrontierStatus { stalled, available, incomplete };
struct LowerFrontier {
  FrontierStatus status{FrontierStatus::stalled};
  std::optional<HintStep> first;
  std::vector<Technique> checked;
  std::vector<Technique> incomplete;
};

// One complete no-step pass proves a fixed point: no first lower-rule move
// exists, so no sequence of lower-rule moves can begin. All hard lower rules
// here are levels 1–4 and have no graph-depth cap. Same-level advanced proof
// preference is separate from this hard gate.
inline LowerFrontier inspectLowerFrontier(const HintRequest &request,
                                          Technique target) {
  LowerFrontier result;
  for (const auto technique : lowerTechniques(target)) {
    result.checked.push_back(technique);
    if (request.cancelRequested && request.cancelRequested->load()) {
      result.incomplete.push_back(technique);
      result.status = FrontierStatus::incomplete;
      return result;
    }
    const auto detected = detail::detectTechniqueCandidateResult(request, technique);
    if (!detected.steps.empty()) {
      result.first = detected.steps.front();
      result.status = FrontierStatus::available;
      return result;
    }
    if (detected.reachedEnumerationLimit ||
        (request.cancelRequested && request.cancelRequested->load())) {
      result.incomplete.push_back(technique);
      result.status = FrontierStatus::incomplete;
      return result;
    }
  }
  return result;
}

inline bool validBoard(const Board &board) {
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (board[cell] > 9) return false;
    if (board[cell] == 0) continue;
    for (Cell other = 0; other < cell; ++other) {
      if (board[other] == board[cell] &&
          (other / 9 == cell / 9 || other % 9 == cell % 9 ||
           (other / 27 == cell / 27 && (other % 9) / 3 == (cell % 9) / 3))) return false;
    }
  }
  return true;
}

// Counts to two, which is a conclusive non-uniqueness witness, not a search
// timeout. A result of one is returned only after the full tree is exhausted.
inline unsigned solutionCount(Board &board, unsigned stopAt = 2) {
  const auto legal = createCandidates(board);
  Cell selected = kCellCount;
  int minimum = 10;
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (board[cell] != 0) continue;
    const int count = std::popcount(legal[cell]);
    if (count == 0) return 0;
    if (count < minimum) { selected = cell; minimum = count; }
  }
  if (selected == kCellCount) return 1;
  unsigned count = 0;
  for (Digit digit = 1; digit <= 9; ++digit) {
    if ((legal[selected] & (1U << (digit - 1))) == 0) continue;
    board[selected] = digit;
    count += solutionCount(board, stopAt - count);
    board[selected] = 0;
    if (count >= stopAt) break;
  }
  return count;
}

inline bool applyVerifiedStep(HintRequest &request, const HintStep &step,
                              const Board &solution) {
  bool changed = false;
  for (const auto item : step.eliminations) {
    if (item.cell >= kCellCount || item.digit < 1 || item.digit > 9 ||
        request.board[item.cell] != 0 || solution[item.cell] == item.digit) return false;
    const auto bit = static_cast<CandidateMask>(1U << (item.digit - 1));
    if ((request.hintCandidates[item.cell] & bit) == 0) return false;
    request.hintCandidates[item.cell] &= static_cast<CandidateMask>(~bit);
    changed = true;
  }
  for (const auto item : step.placements) {
    if (item.cell >= kCellCount || item.digit < 1 || item.digit > 9 ||
        request.board[item.cell] != 0 || solution[item.cell] != item.digit ||
        (request.hintCandidates[item.cell] & (1U << (item.digit - 1))) == 0) return false;
    request.board[item.cell] = item.digit;
    changed = true;
  }
  const auto legal = createCandidates(request.board);
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    request.hintCandidates[cell] = request.board[cell] == 0
        ? static_cast<CandidateMask>(request.hintCandidates[cell] & legal[cell]) : 0;
    if (request.board[cell] == 0 && request.hintCandidates[cell] == 0) return false;
  }
  return changed && validBoard(request.board);
}

// Positive proof witnesses remain valid when enumeration reaches its output
// cap; only a missing witness becomes unknown in that case.
inline std::vector<std::string> validateTarget(
    const HintRequest &request, const HintStep &step, const Board &solution) {
  if (request.cancelRequested && request.cancelRequested->load())
    return {"target_verification_incomplete"};
  const auto detected = detail::detectTechniqueTeachingCandidates(request, step.technique);
  const auto match = std::find_if(detected.steps.begin(), detected.steps.end(), [&](const HintStep &candidate) {
    return candidate.placements == step.placements && candidate.eliminations == step.eliminations;
  });
  if (match == detected.steps.end()) return {detected.reachedEnumerationLimit
      ? "target_verification_incomplete" : "target_not_detected"};
  auto after = request;
  if (!applyVerifiedStep(after, *match, solution)) return {"invalid_target_effect"};
  return {};
}

inline std::vector<std::string> validateSource(
    const Board &puzzle, const Board &solution, const HintRequest &expected,
    const std::vector<HintStep> &history) {
  std::vector<std::string> errors;
  if (!validBoard(puzzle) || !validBoard(solution) ||
      std::find(solution.begin(), solution.end(), 0) != solution.end())
    return {"invalid_puzzle_or_solution"};
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (puzzle[cell] != 0 && puzzle[cell] != solution[cell]) return {"solution_clue_mismatch"};
    if (expected.givenCells[cell] != (puzzle[cell] != 0)) return {"given_identity_mismatch"};
  }
  auto copy = puzzle;
  if (solutionCount(copy) != 1) return {"puzzle_not_unique"};
  HintRequest replay{puzzle, createCandidates(puzzle)};
  for (Cell cell = 0; cell < kCellCount; ++cell) replay.givenCells[cell] = puzzle[cell] != 0;
  for (const auto &step : history) {
    const auto detected = detail::detectTechniqueTeachingCandidates(replay, step.technique);
    const auto match = std::find_if(detected.steps.begin(), detected.steps.end(), [&](const HintStep &candidate) {
      return candidate.placements == step.placements && candidate.eliminations == step.eliminations;
    });
    if (match == detected.steps.end()) return {detected.reachedEnumerationLimit
        ? "history_verification_incomplete" : "unproven_history_step"};
    if (!applyVerifiedStep(replay, *match, solution)) return {"invalid_history_effect"};
  }
  if (replay.board != expected.board || replay.hintCandidates != expected.hintCandidates)
    errors.push_back("unreachable_candidate_state");
  return errors;
}

} // namespace hsp::hint_core::tests::lab
