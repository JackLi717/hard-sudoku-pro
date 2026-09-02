#include "hsp/hint_core/engine.hpp"
#include "techniques.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <limits>
#include <tuple>
#include <vector>

namespace hsp::hint_core {
namespace {

constexpr CandidateMask maskFor(Digit digit) noexcept {
  return static_cast<CandidateMask>(1U << (digit - 1U));
}

constexpr std::uint8_t rowOf(Cell cell) noexcept {
  return static_cast<std::uint8_t>(cell / kSideLength);
}

constexpr std::uint8_t columnOf(Cell cell) noexcept {
  return static_cast<std::uint8_t>(cell % kSideLength);
}

constexpr std::uint8_t boxOf(Cell cell) noexcept {
  return static_cast<std::uint8_t>((rowOf(cell) / 3U) * 3U + columnOf(cell) / 3U);
}

constexpr bool arePeers(Cell left, Cell right) noexcept {
  return rowOf(left) == rowOf(right) || columnOf(left) == columnOf(right) ||
         boxOf(left) == boxOf(right);
}

std::array<Cell, kSideLength> cellsIn(Region region) noexcept {
  std::array<Cell, kSideLength> cells{};
  for (std::uint8_t offset = 0; offset < kSideLength; ++offset) {
    if (region.kind == RegionKind::row) {
      cells[offset] = static_cast<Cell>(region.index * 9U + offset);
    } else if (region.kind == RegionKind::column) {
      cells[offset] = static_cast<Cell>(offset * 9U + region.index);
    } else {
      cells[offset] = static_cast<Cell>(
          (region.index / 3U * 3U + offset / 3U) * 9U +
          (region.index % 3U * 3U + offset % 3U));
    }
  }
  return cells;
}

struct BlockerGroup {
  Candidate evidence;
  std::vector<Cell> blockedCells;
};

std::vector<BlockerGroup> hiddenSingleBlockers(const HintRequest &request,
                                                const HintStep &step) {
  if (step.technique != Technique::hiddenSingle || step.placements.empty() ||
      step.focusRegions.empty()) {
    return {};
  }
  const auto target = step.placements.front();
  std::vector<Cell> blocked;
  for (const auto cell : cellsIn(step.focusRegions.front())) {
    if (cell != target.cell && request.board[cell] == 0 &&
        (request.hintCandidates[cell] & maskFor(target.digit)) == 0) {
      blocked.push_back(cell);
    }
  }

  std::vector<Candidate> evidence;
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (request.board[cell] == target.digit &&
        std::any_of(blocked.begin(), blocked.end(),
                    [cell](Cell blockedCell) {
                      return arePeers(cell, blockedCell);
                    })) {
      evidence.push_back({cell, target.digit});
    }
  }

  // At most nine instances of a digit exist. Exhaustive set cover gives the
  // shortest visible explanation and a deterministic coordinate tie-break.
  std::uint16_t bestSubset = 0;
  unsigned bestCount = std::numeric_limits<unsigned>::max();
  const auto subsetCount = static_cast<std::uint16_t>(1U << evidence.size());
  for (std::uint16_t subset = 1; subset < subsetCount; ++subset) {
    const auto count = static_cast<unsigned>(std::popcount(subset));
    if (count > bestCount) {
      continue;
    }
    const bool coversAll = std::all_of(
        blocked.begin(), blocked.end(), [&](Cell blockedCell) {
          for (std::size_t index = 0; index < evidence.size(); ++index) {
            if ((subset & (1U << index)) != 0 &&
                arePeers(evidence[index].cell, blockedCell)) {
              return true;
            }
          }
          return false;
        });
    if (coversAll && (count < bestCount || subset < bestSubset)) {
      bestCount = count;
      bestSubset = subset;
    }
  }

  std::vector<BlockerGroup> groups;
  std::array<bool, kCellCount> assigned{};
  for (std::size_t index = 0; index < evidence.size(); ++index) {
    if ((bestSubset & (1U << index)) == 0) {
      continue;
    }
    BlockerGroup group{evidence[index], {}};
    for (const auto cell : blocked) {
      if (!assigned[cell] && arePeers(evidence[index].cell, cell)) {
        group.blockedCells.push_back(cell);
        assigned[cell] = true;
      }
    }
    groups.push_back(std::move(group));
  }
  return groups;
}

std::uint32_t humanCost(const HintRequest &request, const HintStep &step) {
  std::uint32_t cost = 0;
  switch (step.technique) {
  case Technique::fullHouse:
    cost = 100;
    break;
  case Technique::nakedSingle:
    cost = 120;
    break;
  case Technique::hiddenSingle:
    cost = 140;
    cost += static_cast<std::uint32_t>(hiddenSingleBlockers(request, step).size()) *
            18U;
    if (!step.focusRegions.empty()) {
      const auto regionCells = cellsIn(step.focusRegions.front());
      const auto occupied = std::count_if(
          regionCells.begin(), regionCells.end(),
          [&](Cell cell) { return request.board[cell] != 0; });
      cost += static_cast<std::uint32_t>(occupied) * 10U;
    }
    // A 3x3 box is normally perceived as a single compact visual group.
    if (!step.focusRegions.empty() &&
        step.focusRegions.front().kind != RegionKind::box) {
      cost += 18U;
    }
    break;
  default:
    cost = static_cast<std::uint32_t>(difficultyLevel(step.technique)) * 1000U;
    cost += static_cast<std::uint32_t>(step.focusRegions.size()) * 12U;
    cost += static_cast<std::uint32_t>(step.focusCells.size()) * 4U;
    cost += static_cast<std::uint32_t>(step.premises.size()) * 3U;
    cost += static_cast<std::uint32_t>(step.eliminations.size() +
                                      step.placements.size());
    break;
  }
  if (!step.focusCells.empty()) {
    std::array<bool, 9> rows{};
    std::array<bool, 9> columns{};
    std::array<bool, 9> boxes{};
    for (const auto cell : step.focusCells) {
      rows[rowOf(cell)] = true;
      columns[columnOf(cell)] = true;
      boxes[boxOf(cell)] = true;
    }
    const auto visualGroups = std::count(rows.begin(), rows.end(), true) +
                              std::count(columns.begin(), columns.end(), true) +
                              std::count(boxes.begin(), boxes.end(), true);
    cost += static_cast<std::uint32_t>(visualGroups) * 2U;
  }
  if (difficultyLevel(step.technique) > 1) {
    const auto reasonPages =
        std::max<std::size_t>(1, (step.premises.size() + 3U) / 4U);
    cost += static_cast<std::uint32_t>(reasonPages) * 8U;
  }
  return cost;
}

void buildProof(const HintRequest &request, HintStep &step) {
  step.humanCost = humanCost(request, step);
  step.proofSteps.clear();

  if (step.technique == Technique::fullHouse) {
    step.proofSteps.push_back({ProofKind::observe, ProofReason::scanRegion, {},
                               step.focusRegions, {}, {}, {}, {}});
  } else if (step.technique == Technique::nakedSingle) {
    step.proofSteps.push_back(
        {ProofKind::observe, ProofReason::singleCandidate, step.focusCells,
         step.focusRegions, step.premises, {}, {}, {}});
  } else if (step.technique == Technique::hiddenSingle) {
    step.proofSteps.push_back({ProofKind::observe, ProofReason::scanRegion, {},
                               step.focusRegions, {}, {}, {}, {}});
    for (auto &group : hiddenSingleBlockers(request, step)) {
      step.proofSteps.push_back(
          {ProofKind::reason, ProofReason::valueBlocksCells,
           std::move(group.blockedCells), step.focusRegions, {},
           {group.evidence}, {}, {}});
    }
  } else if (step.technique == Technique::avoidableRectangle) {
    step.proofSteps.push_back({ProofKind::observe, ProofReason::scanRegion, {},
                               step.focusRegions, {}, {}, {}, {}});
    std::vector<Candidate> valueEvidence;
    for (const auto cell : step.focusCells) {
      if (request.board[cell] != 0) {
        valueEvidence.push_back({cell, request.board[cell]});
      }
    }
    step.proofSteps.push_back(
        {ProofKind::reason, ProofReason::patternConstraint, step.focusCells,
         step.focusRegions, {}, std::move(valueEvidence), {}, {}});
  } else {
    step.proofSteps.push_back({ProofKind::observe, ProofReason::scanRegion, {},
                               step.focusRegions, {}, {}, {}, {}});
    constexpr std::size_t kPremisesPerPage = 4;
    if (step.premises.empty()) {
      step.proofSteps.push_back(
          {ProofKind::reason, ProofReason::patternConstraint, step.focusCells,
           step.focusRegions, {}, {}, {}, {}});
    } else {
      for (std::size_t start = 0; start < step.premises.size();
           start += kPremisesPerPage) {
        const auto end = std::min(start + kPremisesPerPage,
                                  step.premises.size());
        const std::vector<Candidate> premises(step.premises.begin() + start,
                                               step.premises.begin() + end);
        std::vector<Cell> cells;
        for (const auto premise : premises) {
          cells.push_back(premise.cell);
        }
        std::sort(cells.begin(), cells.end());
        cells.erase(std::unique(cells.begin(), cells.end()), cells.end());
        const bool chain = difficultyLevel(step.technique) >= 5;
        step.proofSteps.push_back(
            {ProofKind::reason,
             chain ? ProofReason::chainInference
                   : ProofReason::patternConstraint,
             std::move(cells), step.focusRegions, premises, {}, {}, {}});
      }
    }
  }

  step.proofSteps.push_back(
      {ProofKind::conclusion,
       step.placements.empty() ? ProofReason::validElimination
                               : ProofReason::forcedPlacement,
       step.focusCells, step.focusRegions, step.premises, {},
       step.eliminations, step.placements});
}

auto resultKey(const HintStep &step) {
  const auto candidate = !step.placements.empty()
                             ? step.placements.front()
                             : step.eliminations.front();
  return std::tuple{step.humanCost, static_cast<unsigned>(candidate.cell),
                    static_cast<unsigned>(candidate.digit),
                    static_cast<unsigned>(step.technique)};
}

} // namespace

namespace detail {

void addTeachingProof(const HintRequest &request, HintStep &step) {
  buildProof(request, step);
}

} // namespace detail

CandidateGrid createCandidates(const Board &board) noexcept {
  CandidateGrid candidates{};
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (board[cell] != 0) {
      candidates[cell] = 0;
      continue;
    }

    CandidateMask mask = kAllCandidatesMask;
    for (Cell peer = 0; peer < kCellCount; ++peer) {
      const auto value = board[peer];
      if (value != 0 && arePeers(cell, peer)) {
        mask = static_cast<CandidateMask>(mask & ~maskFor(value));
      }
    }
    candidates[cell] = mask;
  }
  return candidates;
}

ResultReason validateRequest(const HintRequest &request) noexcept {
  for (const auto value : request.board) {
    if (value > kSideLength) {
      return ResultReason::invalidDigit;
    }
  }

  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (request.board[cell] == 0) {
      continue;
    }
    for (Cell other = static_cast<Cell>(cell + 1); other < kCellCount; ++other) {
      if (request.board[other] == request.board[cell] && arePeers(cell, other)) {
        return ResultReason::conflictingDigits;
      }
    }
  }

  const auto legalCandidates = createCandidates(request.board);
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (request.givenCells[cell] && request.board[cell] == 0) {
      return ResultReason::invalidGivenCell;
    }
    const auto candidateMask = request.hintCandidates[cell];
    if ((candidateMask & static_cast<CandidateMask>(~kAllCandidatesMask)) != 0) {
      return ResultReason::illegalCandidate;
    }
    if (request.board[cell] != 0) {
      if (candidateMask != 0) {
        return ResultReason::candidatesOnFilledCell;
      }
      continue;
    }
    if (candidateMask == 0) {
      return ResultReason::emptyCandidateSet;
    }
    if ((candidateMask & static_cast<CandidateMask>(~legalCandidates[cell])) != 0) {
      return ResultReason::illegalCandidate;
    }
  }
  return ResultReason::none;
}

FrontierResult
Engine::collectFrontierOpportunities(const HintRequest &request) const {
  const auto validation = validateRequest(request);
  if (validation != ResultReason::none) {
    return {ResultStatus::invalidBoard, validation, std::nullopt, {}};
  }

  if (std::all_of(request.board.begin(), request.board.end(),
                  [](Digit digit) { return digit != 0; })) {
    return {ResultStatus::solved, ResultReason::none, std::nullopt, {}};
  }

  for (std::uint8_t level = 1; level <= 5; ++level) {
    std::vector<HintStep> candidates;
    for (const auto &descriptor : kTechniqueCatalog) {
      if (descriptor.level != level) {
        continue;
      }
      if (request.cancelRequested != nullptr &&
          request.cancelRequested->load(std::memory_order_relaxed)) {
        return {ResultStatus::cancelled, ResultReason::none, std::nullopt, {}};
      }
      auto detected =
          detail::detectTechniqueCandidates(request, descriptor.technique);
      if (request.cancelRequested != nullptr &&
          request.cancelRequested->load(std::memory_order_relaxed)) {
        return {ResultStatus::cancelled, ResultReason::none, std::nullopt, {}};
      }
      candidates.insert(candidates.end(),
                        std::make_move_iterator(detected.begin()),
                        std::make_move_iterator(detected.end()));
    }
    if (!candidates.empty()) {
      for (auto &step : candidates) {
        detail::addTeachingProof(request, step);
      }
      const auto best = std::min_element(
          candidates.begin(), candidates.end(),
          [](const HintStep &left, const HintStep &right) {
            return resultKey(left) < resultKey(right);
          });
      std::rotate(candidates.begin(), best, best + 1);
      return {ResultStatus::step, ResultReason::none, level,
              std::move(candidates)};
    }
  }
  return {ResultStatus::noSupportedStep, ResultReason::none, std::nullopt, {}};
}

HintResult Engine::nextStep(const HintRequest &request) const {
  auto frontier = collectFrontierOpportunities(request);
  if (frontier.status != ResultStatus::step) {
    return {frontier.status, frontier.reason, std::nullopt};
  }
  return {ResultStatus::step, ResultReason::none,
          std::move(frontier.opportunities.front())};
}

} // namespace hsp::hint_core
