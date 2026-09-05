#include "techniques.hpp"
#include "hsp/hint_core/engine.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <set>
#include <string_view>
#include <vector>

namespace hsp::hint_core::detail {
namespace {

constexpr CandidateMask bit(Digit digit) noexcept {
  return static_cast<CandidateMask>(1U << (digit - 1U));
}
constexpr std::uint8_t row(Cell cell) noexcept { return cell / 9U; }
constexpr std::uint8_t column(Cell cell) noexcept { return cell % 9U; }
constexpr std::uint8_t box(Cell cell) noexcept {
  return static_cast<std::uint8_t>((row(cell) / 3U) * 3U + column(cell) / 3U);
}
constexpr bool peers(Cell a, Cell b) noexcept {
  return a != b &&
         (row(a) == row(b) || column(a) == column(b) || box(a) == box(b));
}
constexpr bool conflicts(Candidate a, Candidate b) noexcept {
  return (a.cell == b.cell && a.digit != b.digit) ||
         (a.digit == b.digit && peers(a.cell, b.cell));
}
constexpr bool valid(Candidate candidate) noexcept {
  return candidate.cell < kCellCount && candidate.digit >= 1 &&
         candidate.digit <= kSideLength;
}
constexpr bool valid(Region region) noexcept {
  return region.index < kSideLength &&
         region.kind >= RegionKind::row && region.kind <= RegionKind::box;
}
constexpr bool inRegion(Cell cell, Region region) noexcept {
  switch (region.kind) {
  case RegionKind::row:
    return row(cell) == region.index;
  case RegionKind::column:
    return column(cell) == region.index;
  case RegionKind::box:
    return box(cell) == region.index;
  }
  return false;
}

bool candidateAvailable(const HintRequest &request, Candidate candidate) {
  return valid(candidate) && request.board[candidate.cell] == 0 &&
         (request.hintCandidates[candidate.cell] & bit(candidate.digit)) != 0;
}

bool candidateListIsValid(const HintRequest &request,
                          const std::vector<Candidate> &candidates,
                          bool allowEnteredValues = false) {
  std::set<std::pair<Cell, Digit>> distinct;
  for (const auto candidate : candidates) {
    if (!valid(candidate) ||
        !distinct.emplace(candidate.cell, candidate.digit).second) {
      return false;
    }
    if (allowEnteredValues && request.board[candidate.cell] != 0) {
      if (request.board[candidate.cell] != candidate.digit) {
        return false;
      }
    } else if (!candidateAvailable(request, candidate)) {
      return false;
    }
  }
  return true;
}

bool candidatesRemainViable(const Board &board,
                            const CandidateGrid &candidates) {
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (board[cell] == 0 && candidates[cell] == 0) {
      return false;
    }
  }
  for (std::uint8_t kind = 0; kind < 3; ++kind) {
    for (std::uint8_t index = 0; index < kSideLength; ++index) {
      const Region region{static_cast<RegionKind>(kind), index};
      for (Digit digit = 1; digit <= kSideLength; ++digit) {
        bool placed = false;
        bool available = false;
        for (Cell cell = 0; cell < kCellCount; ++cell) {
          if (!inRegion(cell, region)) {
            continue;
          }
          placed = placed || board[cell] == digit;
          available = available ||
                      (board[cell] == 0 &&
                       (candidates[cell] & bit(digit)) != 0);
        }
        if (!placed && !available) {
          return false;
        }
      }
    }
  }
  return true;
}

bool validateBoardAndResult(const HintRequest &request, const HintStep &step) {
  if ((step.eliminations.empty() && step.placements.empty()) ||
      (!step.eliminations.empty() && !step.placements.empty()) ||
      !candidateListIsValid(request, step.eliminations) ||
      !candidateListIsValid(request, step.placements)) {
    return false;
  }
  for (const auto cell : step.focusCells) {
    if (cell >= kCellCount) {
      return false;
    }
  }
  for (const auto region : step.focusRegions) {
    if (!valid(region)) {
      return false;
    }
  }
  if (!candidateListIsValid(request, step.premises)) {
    return false;
  }

  auto board = request.board;
  auto candidates = request.hintCandidates;
  for (const auto eliminated : step.eliminations) {
    candidates[eliminated.cell] = static_cast<CandidateMask>(
        candidates[eliminated.cell] & ~bit(eliminated.digit));
  }
  for (const auto placed : step.placements) {
    board[placed.cell] = placed.digit;
    candidates[placed.cell] = 0;
    for (Cell other = 0; other < kCellCount; ++other) {
      if (board[other] == placed.digit && peers(placed.cell, other)) {
        return false;
      }
      if (board[other] == 0 && peers(placed.cell, other)) {
        candidates[other] = static_cast<CandidateMask>(
            candidates[other] & ~bit(placed.digit));
      }
    }
  }
  return candidatesRemainViable(board, candidates);
}

bool nodeCandidatesExist(const HintRequest &request, const TeachingNode &node) {
  if (node.candidates.empty()) {
    return false;
  }
  return candidateListIsValid(request, node.candidates,
                              node.rule == "entered");
}

bool alternativesAreExhaustive(const HintRequest &request,
                               const std::vector<Candidate> &left,
                               const std::vector<Candidate> &right) {
  std::vector<Candidate> combined = left;
  combined.insert(combined.end(), right.begin(), right.end());
  if (combined.empty()) {
    return false;
  }
  const auto sameCell = std::all_of(
      combined.begin(), combined.end(), [&](Candidate candidate) {
        return candidate.cell == combined.front().cell;
      });
  if (sameCell) {
    CandidateMask represented = 0;
    for (const auto candidate : combined) {
      represented = static_cast<CandidateMask>(represented | bit(candidate.digit));
    }
    return represented == request.hintCandidates[combined.front().cell];
  }
  const auto digit = combined.front().digit;
  if (!std::all_of(combined.begin(), combined.end(),
                   [&](Candidate candidate) {
                     return candidate.digit == digit;
                   })) {
    return false;
  }
  for (std::uint8_t kind = 0; kind < 3; ++kind) {
    for (std::uint8_t index = 0; index < kSideLength; ++index) {
      const Region region{static_cast<RegionKind>(kind), index};
      if (!std::all_of(combined.begin(), combined.end(),
                       [&](Candidate candidate) {
                         return inRegion(candidate.cell, region);
                       })) {
        continue;
      }
      std::vector<Cell> expected;
      std::vector<Cell> represented;
      for (Cell cell = 0; cell < kCellCount; ++cell) {
        if (inRegion(cell, region) && candidateAvailable(request, {cell, digit})) {
          expected.push_back(cell);
        }
      }
      for (const auto candidate : combined) {
        represented.push_back(candidate.cell);
      }
      std::sort(expected.begin(), expected.end());
      std::sort(represented.begin(), represented.end());
      represented.erase(std::unique(represented.begin(), represented.end()),
                        represented.end());
      if (expected == represented) {
        return true;
      }
    }
  }
  return false;
}

bool validateInferenceBranch(const HintRequest &request,
                             const TeachingBranch &branch,
                             bool allowTerminalConflict) {
  if (branch.nodes.empty()) {
    return false;
  }
  for (std::size_t index = 0; index < branch.nodes.size(); ++index) {
    const auto &node = branch.nodes[index];
    if (!nodeCandidatesExist(request, node) ||
        !std::all_of(node.regions.begin(), node.regions.end(),
                     [](Region region) { return valid(region); })) {
      return false;
    }
    for (const auto parent : node.parents) {
      if (parent < 0 || static_cast<std::size_t>(parent) >= index) {
        return false;
      }
    }
    if (node.rule == "conflict") {
      if (!allowTerminalConflict || index + 1 != branch.nodes.size() ||
          node.parents.empty()) {
        return false;
      }
      continue;
    }
    if (node.rule == "assume" || node.rule == "color" ||
        node.rule == "entered" || node.rule == "color_on") {
      if (node.rule != "color_on" && !node.parents.empty()) {
        return false;
      }
      continue;
    }
    if (node.parents.empty()) {
      return false;
    }
    if (node.rule == "weak") {
      if (node.truth) {
        return false;
      }
      bool justified = false;
      for (const auto parent : node.parents) {
        const auto &source = branch.nodes[static_cast<std::size_t>(parent)];
        if (!source.truth) {
          continue;
        }
        justified = justified || std::all_of(
            source.candidates.begin(), source.candidates.end(),
            [&](Candidate from) {
              return std::all_of(node.candidates.begin(), node.candidates.end(),
                                 [&](Candidate to) {
                                   return conflicts(from, to);
                                 });
            });
      }
      if (!justified) {
        return false;
      }
    } else if (node.rule == "strong") {
      if (!node.truth || node.parents.size() != 1) {
        return false;
      }
      const auto &source =
          branch.nodes[static_cast<std::size_t>(node.parents.front())];
      if (source.truth || !alternativesAreExhaustive(
                              request, source.candidates, node.candidates)) {
        return false;
      }
    } else if (node.rule == "cell_single" ||
               node.rule == "region_single") {
      if (!node.truth || node.candidates.size() != 1) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

bool validateTeachingTrace(const HintRequest &request, const HintStep &step) {
  const auto &proof = step.teaching;
  if (proof.mode.empty()) {
    return proof.branches.empty() && proof.givenCells.empty();
  }
  for (const auto cell : proof.givenCells) {
    if (cell >= kCellCount || !request.givenCells[cell]) {
      return false;
    }
  }
  const bool colorMode = proof.mode == "color_conflict" ||
                         proof.mode == "color_trap" ||
                         proof.mode == "multi_color" ||
                         proof.mode == "remote_pair" ||
                         proof.mode == "complex_color";
  const bool avoidable = proof.mode == "avoidable";
  if (proof.branches.empty()) {
    return false;
  }
  for (const auto &branch : proof.branches) {
    if (colorMode || avoidable) {
      if (branch.nodes.empty()) {
        return false;
      }
      for (std::size_t index = 0; index < branch.nodes.size(); ++index) {
        const auto &node = branch.nodes[index];
        if (!nodeCandidatesExist(request, node)) {
          return false;
        }
        for (const auto parent : node.parents) {
          if (parent < 0 || static_cast<std::size_t>(parent) >= index) {
            return false;
          }
        }
      }
    } else {
      if (!validateInferenceBranch(request, branch,
                                   proof.mode == "contradiction")) {
        return false;
      }
      std::vector<Candidate> trueFacts;
      std::vector<Candidate> falseFacts;
      for (std::size_t index = 0; index < branch.nodes.size(); ++index) {
        const auto &node = branch.nodes[index];
        if (node.rule == "conflict" || node.candidates.size() != 1) {
          continue;
        }
        const auto fact = node.candidates.front();
        bool contradiction = false;
        if (node.truth) {
          contradiction =
              std::find(falseFacts.begin(), falseFacts.end(), fact) !=
                  falseFacts.end() ||
              std::any_of(trueFacts.begin(), trueFacts.end(),
                          [&](Candidate established) {
                            return conflicts(established, fact);
                          });
          trueFacts.push_back(fact);
        } else {
          contradiction =
              std::find(trueFacts.begin(), trueFacts.end(), fact) !=
              trueFacts.end();
          falseFacts.push_back(fact);
        }
        if (!contradiction) {
          continue;
        }
        const bool closesAtLastNode =
            proof.mode == "contradiction" &&
            index + 1 == branch.nodes.size();
        const bool aicClosureDeclaredNext =
            proof.mode == "contradiction" &&
            index + 2 == branch.nodes.size() &&
            branch.nodes.back().candidates == branch.nodes.front().candidates &&
            branch.nodes.back().truth != branch.nodes.front().truth;
        if (!closesAtLastNode && !aicClosureDeclaredNext) {
          return false;
        }
      }
    }
  }
  return true;
}

bool targetSees(Candidate target, Candidate endpoint) noexcept {
  return target.digit == endpoint.digit && peers(target.cell, endpoint.cell);
}

bool validateAlternatingChain(const HintRequest &request, const HintStep &step,
                              bool singleDigit) {
  if (step.teaching.mode != "endpoints" ||
      step.teaching.branches.size() != 1) {
    return false;
  }
  const auto &nodes = step.teaching.branches.front().nodes;
  if (nodes.size() < 4 || nodes.size() % 2 != 0 ||
      nodes.front().truth || !nodes.back().truth) {
    return false;
  }
  const auto digit = nodes.front().candidates.front().digit;
  for (std::size_t index = 0; index < nodes.size(); ++index) {
    if (nodes[index].candidates.size() != 1 ||
        nodes[index].truth != (index % 2 == 1) ||
        (singleDigit && nodes[index].candidates.front().digit != digit)) {
      return false;
    }
  }
  const auto first = nodes.front().candidates.front();
  const auto last = nodes.back().candidates.front();
  for (const auto target : step.eliminations) {
    if (!targetSees(target, first) || !targetSees(target, last)) {
      return false;
    }
  }
  for (std::size_t left = 1; left < nodes.size(); left += 2) {
    for (std::size_t right = left + 2; right < nodes.size(); right += 2) {
      if (conflicts(nodes[left].candidates.front(),
                    nodes[right].candidates.front())) {
        return false;
      }
    }
  }
  (void)request;
  return true;
}

bool validateTechniqueStructure(const HintRequest &request,
                                const HintStep &step) {
  switch (step.technique) {
  case Technique::xChain:
    return validateAlternatingChain(request, step, true);
  case Technique::xyChain:
    return validateAlternatingChain(request, step, false);
  case Technique::aic: {
    if (step.teaching.mode != "contradiction" ||
        step.teaching.branches.size() != 1) {
      return false;
    }
    const auto &nodes = step.teaching.branches.front().nodes;
    return nodes.size() >= 3 && nodes.front().candidates.size() == 1 &&
           nodes.back().candidates == nodes.front().candidates &&
           nodes.back().truth != nodes.front().truth;
  }
  case Technique::forcingChain:
    if (step.teaching.mode != "common" ||
        step.teaching.branches.size() != 2) {
      return false;
    }
    return step.teaching.branches[0].nodes.front().candidates ==
               step.teaching.branches[1].nodes.front().candidates &&
           step.teaching.branches[0].nodes.front().truth !=
               step.teaching.branches[1].nodes.front().truth;
  case Technique::forcingNet:
    return (step.teaching.mode == "common" &&
            step.teaching.branches.size() >= 2) ||
           (step.teaching.mode == "contradiction" &&
            step.teaching.branches.size() == 1);
  default:
    return true;
  }
}

} // namespace

bool validateTechniqueStep(const HintRequest &request,
                           const HintStep &step) noexcept {
  return validateRequest(request) == ResultReason::none &&
         validateBoardAndResult(request, step) &&
         validateTeachingTrace(request, step) &&
         validateTechniqueStructure(request, step);
}

} // namespace hsp::hint_core::detail
