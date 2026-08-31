#include "hsp/hint_core/bridge.hpp"

#include "hsp/hint_core/engine.hpp"

#include <charconv>
#include <cstddef>
#include <sstream>
#include <string>

namespace hsp::hint_core {
namespace {

constexpr std::string_view reasonKey(ResultReason reason) noexcept {
  switch (reason) {
  case ResultReason::invalidDigit:
    return "hint.invalidBoard.invalidDigit";
  case ResultReason::conflictingDigits:
    return "hint.invalidBoard.conflictingDigits";
  case ResultReason::candidatesOnFilledCell:
    return "hint.invalidBoard.candidatesOnFilledCell";
  case ResultReason::emptyCandidateSet:
    return "hint.invalidBoard.emptyCandidateSet";
  case ResultReason::illegalCandidate:
    return "hint.invalidBoard.illegalCandidate";
  case ResultReason::invalidGivenCell:
    return "hint.invalidBoard.invalidGivenCell";
  case ResultReason::none:
    return "hint.invalidBoard";
  }
  return "hint.invalidBoard";
}

constexpr std::string_view regionKind(RegionKind kind) noexcept {
  switch (kind) {
  case RegionKind::row:
    return "row";
  case RegionKind::column:
    return "column";
  case RegionKind::box:
    return "box";
  }
  return "row";
}

bool parseBoard(std::string_view fingerprint, Board &board) noexcept {
  if (fingerprint.size() != kCellCount) {
    return false;
  }
  for (std::size_t index = 0; index < fingerprint.size(); ++index) {
    const char value = fingerprint[index];
    if (value < '0' || value > '9') {
      return false;
    }
    board[index] = static_cast<Digit>(value - '0');
  }
  return true;
}

bool parseCandidateMasks(std::string_view encoded,
                         CandidateGrid &candidates) noexcept {
  std::size_t start = 0;
  for (std::size_t index = 0; index < kCellCount; ++index) {
    const std::size_t end = encoded.find(',', start);
    const bool isLast = index + 1 == kCellCount;
    if ((isLast && end != std::string_view::npos) ||
        (!isLast && end == std::string_view::npos)) {
      return false;
    }
    const std::size_t tokenEnd = isLast ? encoded.size() : end;
    if (tokenEnd == start) {
      return false;
    }

    unsigned int value = 0;
    const char *first = encoded.data() + start;
    const char *last = encoded.data() + tokenEnd;
    const auto parsed = std::from_chars(first, last, value);
    if (parsed.ec != std::errc{} || parsed.ptr != last ||
        value > kAllCandidatesMask) {
      return false;
    }
    candidates[index] = static_cast<CandidateMask>(value);
    start = tokenEnd + (isLast ? 0 : 1);
  }
  return start == encoded.size();
}

bool parseGivenCells(std::string_view encoded, CellFlags &givenCells) noexcept {
  if (encoded.empty()) {
    return true;
  }
  if (encoded.size() != kCellCount) {
    return false;
  }
  for (std::size_t index = 0; index < encoded.size(); ++index) {
    if (encoded[index] != '0' && encoded[index] != '1') {
      return false;
    }
    givenCells[index] = encoded[index] == '1';
  }
  return true;
}

void appendCells(std::ostringstream &json, const std::vector<Cell> &cells) {
  json << '[';
  for (std::size_t index = 0; index < cells.size(); ++index) {
    if (index > 0) {
      json << ',';
    }
    json << static_cast<unsigned int>(cells[index]);
  }
  json << ']';
}

void appendCandidates(std::ostringstream &json,
                      const std::vector<Candidate> &candidates) {
  json << '[';
  for (std::size_t index = 0; index < candidates.size(); ++index) {
    if (index > 0) {
      json << ',';
    }
    json << "{\"cell\":" << static_cast<unsigned int>(candidates[index].cell)
         << ",\"digit\":"
         << static_cast<unsigned int>(candidates[index].digit) << '}';
  }
  json << ']';
}

void appendRegions(std::ostringstream &json,
                   const std::vector<Region> &regions) {
  json << '[';
  for (std::size_t index = 0; index < regions.size(); ++index) {
    if (index > 0) {
      json << ',';
    }
    json << "{\"kind\":\"" << regionKind(regions[index].kind)
         << "\",\"index\":" << static_cast<unsigned int>(regions[index].index)
         << '}';
  }
  json << ']';
}

std::string cellList(const std::vector<Cell> &cells) {
  std::ostringstream text;
  for (std::size_t index = 0; index < cells.size(); ++index) {
    if (index > 0) {
      text << ',';
    }
    text << static_cast<unsigned int>(cells[index]);
  }
  return text.str();
}

std::string regionList(const std::vector<Region> &regions) {
  std::ostringstream text;
  for (std::size_t index = 0; index < regions.size(); ++index) {
    if (index > 0) {
      text << ',';
    }
    text << regionKind(regions[index].kind) << ':'
         << static_cast<unsigned int>(regions[index].index);
  }
  return text.str();
}

std::string candidateList(const std::vector<Candidate> &candidates) {
  std::ostringstream text;
  for (std::size_t index = 0; index < candidates.size(); ++index) {
    if (index > 0) {
      text << ',';
    }
    text << static_cast<unsigned int>(candidates[index].cell) << ':'
         << static_cast<unsigned int>(candidates[index].digit);
  }
  return text.str();
}

std::string serializeStep(std::string_view boardFingerprint,
                          const HintStep &step) {
  const std::string_view code = techniqueCode(step.technique);
  std::ostringstream json;
  json << "{\"status\":\"step\",\"step\":{\"contractVersion\":1"
       << ",\"boardFingerprint\":\"" << boardFingerprint << '"'
       << ",\"techniqueCode\":\"" << code << '"'
       << ",\"difficultyLevel\":"
       << static_cast<unsigned int>(difficultyLevel(step.technique))
       << ",\"focusCells\":";
  appendCells(json, step.focusCells);
  json << ",\"focusRegions\":";
  appendRegions(json, step.focusRegions);
  json << ",\"premiseCandidates\":";
  appendCandidates(json, step.premises);
  json << ",\"eliminations\":";
  appendCandidates(json, step.eliminations);
  json << ",\"placements\":";
  appendCandidates(json, step.placements);
  json << ",\"explanationKey\":\"hint." << code
       << "\",\"explanationParams\":{";
  json << "\"focusCellCount\":" << step.focusCells.size()
       << ",\"focusCells\":\"" << cellList(step.focusCells) << '"'
       << ",\"focusRegions\":\"" << regionList(step.focusRegions) << '"'
       << ",\"premiseCandidates\":\"" << candidateList(step.premises)
       << '"' << ",\"eliminations\":\""
       << candidateList(step.eliminations) << '"'
       << ",\"placements\":\"" << candidateList(step.placements) << '"'
       << ",\"resultCount\":"
       << step.eliminations.size() + step.placements.size() << "}}";
  return json.str();
}

} // namespace

std::string nextStepJson(std::string_view boardFingerprint,
                         std::string_view candidateMasks,
                         std::string_view givenCells,
                         const std::atomic_bool *cancelRequested) {
  HintRequest request{};
  if (!parseBoard(boardFingerprint, request.board) ||
      !parseCandidateMasks(candidateMasks, request.hintCandidates) ||
      !parseGivenCells(givenCells, request.givenCells)) {
    return "{\"status\":\"invalid_board\",\"reasonKey\":\"hint.invalidBoard.malformedRequest\"}";
  }
  request.cancelRequested = cancelRequested;

  const HintResult result = Engine{}.nextStep(request);
  switch (result.status) {
  case ResultStatus::step:
    if (result.step) {
      return serializeStep(boardFingerprint, *result.step);
    }
    return "{\"status\":\"no_supported_step\",\"reasonKey\":\"hint.noSupportedStep\"}";
  case ResultStatus::invalidBoard:
    return "{\"status\":\"invalid_board\",\"reasonKey\":\"" +
           std::string(reasonKey(result.reason)) + "\"}";
  case ResultStatus::noSupportedStep:
    return "{\"status\":\"no_supported_step\",\"reasonKey\":\"hint.noSupportedStep\"}";
  case ResultStatus::solved:
    return "{\"status\":\"solved\",\"reasonKey\":\"hint.solved\"}";
  case ResultStatus::cancelled:
    return "{\"status\":\"cancelled\",\"reasonKey\":\"hint.cancelled\"}";
  }
  return "{\"status\":\"no_supported_step\",\"reasonKey\":\"hint.noSupportedStep\"}";
}

} // namespace hsp::hint_core
