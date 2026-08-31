#include "hsp/hint_core/engine.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <optional>
#include <utility>

namespace hsp::hint_core {
namespace {

struct Unit {
  Region region;
  std::array<Cell, kSideLength> cells;
};

using Detector = std::optional<HintStep> (*)(const HintRequest &);

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

Unit makeUnit(RegionKind kind, std::uint8_t index) {
  Unit unit{{kind, index}, {}};
  for (std::uint8_t offset = 0; offset < kSideLength; ++offset) {
    switch (kind) {
    case RegionKind::row:
      unit.cells[offset] = static_cast<Cell>(index * kSideLength + offset);
      break;
    case RegionKind::column:
      unit.cells[offset] = static_cast<Cell>(offset * kSideLength + index);
      break;
    case RegionKind::box:
      unit.cells[offset] = static_cast<Cell>(
          (index / 3U * 3U + offset / 3U) * kSideLength +
          (index % 3U * 3U + offset % 3U));
      break;
    }
  }
  return unit;
}

HintStep placementStep(Technique technique, Cell cell, Digit digit,
                       std::vector<Region> regions,
                       std::vector<Candidate> premises = {}) {
  return HintStep{technique,
                  {cell},
                  std::move(regions),
                  std::move(premises),
                  {},
                  {{cell, digit}}};
}

std::optional<HintStep> findFullHouse(const HintRequest &request) {
  constexpr std::array regionOrder{RegionKind::row, RegionKind::column,
                                   RegionKind::box};
  for (const auto kind : regionOrder) {
    for (std::uint8_t index = 0; index < kSideLength; ++index) {
      const auto unit = makeUnit(kind, index);
      Cell emptyCell = 0;
      std::uint8_t emptyCount = 0;
      CandidateMask present = 0;

      for (const auto cell : unit.cells) {
        const auto value = request.board[cell];
        if (value == 0) {
          emptyCell = cell;
          ++emptyCount;
        } else {
          present = static_cast<CandidateMask>(present | maskFor(value));
        }
      }

      if (emptyCount != 1) {
        continue;
      }
      const auto missing = static_cast<CandidateMask>(kAllCandidatesMask & ~present);
      if (std::popcount(missing) != 1 ||
          (request.hintCandidates[emptyCell] & missing) == 0) {
        continue;
      }
      const auto digit = static_cast<Digit>(std::countr_zero(missing) + 1);
      return placementStep(Technique::fullHouse, emptyCell, digit, {unit.region});
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findNakedSingle(const HintRequest &request) {
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    if (request.board[cell] != 0 ||
        std::popcount(request.hintCandidates[cell]) != 1) {
      continue;
    }
    const auto digit =
        static_cast<Digit>(std::countr_zero(request.hintCandidates[cell]) + 1);
    return placementStep(Technique::nakedSingle, cell, digit,
                         {{RegionKind::row, rowOf(cell)},
                          {RegionKind::column, columnOf(cell)},
                          {RegionKind::box, boxOf(cell)}});
  }
  return std::nullopt;
}

std::optional<HintStep> findHiddenSingle(const HintRequest &request) {
  constexpr std::array regionOrder{RegionKind::row, RegionKind::column,
                                   RegionKind::box};
  for (const auto kind : regionOrder) {
    for (std::uint8_t index = 0; index < kSideLength; ++index) {
      const auto unit = makeUnit(kind, index);
      for (Digit digit = 1; digit <= kSideLength; ++digit) {
        const auto mask = maskFor(digit);
        Cell candidateCell = 0;
        std::uint8_t candidateCount = 0;
        for (const auto cell : unit.cells) {
          if (request.board[cell] == 0 &&
              (request.hintCandidates[cell] & mask) != 0) {
            candidateCell = cell;
            ++candidateCount;
          }
        }
        if (candidateCount == 1) {
          return placementStep(Technique::hiddenSingle, candidateCell, digit,
                               {unit.region}, {{candidateCell, digit}});
        }
      }
    }
  }
  return std::nullopt;
}

constexpr std::array<Detector, 3> kDetectors{
    findFullHouse,
    findNakedSingle,
    findHiddenSingle,
};

} // namespace

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

HintResult Engine::nextStep(const HintRequest &request) const {
  const auto validation = validateRequest(request);
  if (validation != ResultReason::none) {
    return {ResultStatus::invalidBoard, validation, std::nullopt};
  }

  if (std::all_of(request.board.begin(), request.board.end(),
                  [](Digit digit) { return digit != 0; })) {
    return {ResultStatus::solved, ResultReason::none, std::nullopt};
  }

  for (const auto detector : kDetectors) {
    if (auto step = detector(request); step.has_value()) {
      return {ResultStatus::step, ResultReason::none, std::move(step)};
    }
  }
  return {ResultStatus::noSupportedStep, ResultReason::none, std::nullopt};
}

} // namespace hsp::hint_core
