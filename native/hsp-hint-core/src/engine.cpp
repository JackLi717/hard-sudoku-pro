#include "hsp/hint_core/engine.hpp"
#include "techniques.hpp"

#include <algorithm>
#include <array>
#include <bit>

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

HintResult Engine::nextStep(const HintRequest &request) const {
  const auto validation = validateRequest(request);
  if (validation != ResultReason::none) {
    return {ResultStatus::invalidBoard, validation, std::nullopt};
  }

  if (std::all_of(request.board.begin(), request.board.end(),
                  [](Digit digit) { return digit != 0; })) {
    return {ResultStatus::solved, ResultReason::none, std::nullopt};
  }

  for (const auto &descriptor : kTechniqueCatalog) {
    if (request.cancelRequested != nullptr &&
        request.cancelRequested->load(std::memory_order_relaxed)) {
      return {ResultStatus::cancelled, ResultReason::none, std::nullopt};
    }
    if (auto step = detail::detectTechnique(request, descriptor.technique);
        step.has_value()) {
      return {ResultStatus::step, ResultReason::none, std::move(step)};
    }
  }
  return {ResultStatus::noSupportedStep, ResultReason::none, std::nullopt};
}

} // namespace hsp::hint_core
