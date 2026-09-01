#include "hsp/hint_core/bridge.hpp"

#include "hsp/hint_core/engine.hpp"

#include <charconv>
#include <cstddef>
#include <sstream>
#include <string>
#include <vector>

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

constexpr std::string_view proofKind(ProofKind kind) noexcept {
  switch (kind) {
  case ProofKind::observe:
    return "observe";
  case ProofKind::reason:
    return "reason";
  case ProofKind::conclusion:
    return "conclusion";
  }
  return "reason";
}

constexpr std::string_view proofReason(ProofReason reason) noexcept {
  switch (reason) {
  case ProofReason::scanRegion:
    return "scan_region";
  case ProofReason::singleCandidate:
    return "single_candidate";
  case ProofReason::valueBlocksCells:
    return "value_blocks_cells";
  case ProofReason::patternConstraint:
    return "pattern_constraint";
  case ProofReason::chainInference:
    return "chain_inference";
  case ProofReason::forcedPlacement:
    return "forced_placement";
  case ProofReason::validElimination:
    return "valid_elimination";
  }
  return "pattern_constraint";
}

class JsonWriter {
public:
  void beginObject() {
    beforeValue();
    output_ += '{';
    scopes_.push_back({'{', true, false});
  }
  void endObject() {
    output_ += '}';
    scopes_.pop_back();
  }
  void beginArray() {
    beforeValue();
    output_ += '[';
    scopes_.push_back({'[', true, false});
  }
  void endArray() {
    output_ += ']';
    scopes_.pop_back();
  }
  void key(std::string_view key) {
    auto &scope = scopes_.back();
    if (!scope.first) {
      output_ += ',';
    }
    scope.first = false;
    appendString(key);
    output_ += ':';
    scope.expectingValue = true;
  }
  void value(std::string_view value) {
    beforeValue();
    appendString(value);
  }
  void value(std::size_t value) {
    beforeValue();
    output_ += std::to_string(value);
  }
  std::string take() { return std::move(output_); }

private:
  struct Scope {
    char kind;
    bool first;
    bool expectingValue;
  };

  void beforeValue() {
    if (scopes_.empty()) {
      return;
    }
    auto &scope = scopes_.back();
    if (scope.kind == '{' && scope.expectingValue) {
      scope.expectingValue = false;
      return;
    }
    if (!scope.first) {
      output_ += ',';
    }
    scope.first = false;
  }
  void appendString(std::string_view value) {
    output_ += '"';
    for (const char character : value) {
      switch (character) {
      case '"':
        output_ += "\\\"";
        break;
      case '\\':
        output_ += "\\\\";
        break;
      case '\n':
        output_ += "\\n";
        break;
      case '\r':
        output_ += "\\r";
        break;
      case '\t':
        output_ += "\\t";
        break;
      default:
        output_ += character;
        break;
      }
    }
    output_ += '"';
  }

  std::string output_;
  std::vector<Scope> scopes_;
};

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

void appendCells(JsonWriter &json, const std::vector<Cell> &cells) {
  json.beginArray();
  for (const auto cell : cells) {
    json.value(static_cast<std::size_t>(cell));
  }
  json.endArray();
}

void appendCandidates(JsonWriter &json,
                      const std::vector<Candidate> &candidates) {
  json.beginArray();
  for (const auto candidate : candidates) {
    json.beginObject();
    json.key("cell");
    json.value(static_cast<std::size_t>(candidate.cell));
    json.key("digit");
    json.value(static_cast<std::size_t>(candidate.digit));
    json.endObject();
  }
  json.endArray();
}

void appendRegions(JsonWriter &json,
                   const std::vector<Region> &regions) {
  json.beginArray();
  for (const auto region : regions) {
    json.beginObject();
    json.key("kind");
    json.value(regionKind(region.kind));
    json.key("index");
    json.value(static_cast<std::size_t>(region.index));
    json.endObject();
  }
  json.endArray();
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
  JsonWriter json;
  json.beginObject();
  json.key("status");
  json.value("step");
  json.key("step");
  json.beginObject();
  json.key("contractVersion");
  json.value(1);
  json.key("boardFingerprint");
  json.value(boardFingerprint);
  json.key("techniqueCode");
  json.value(code);
  json.key("difficultyLevel");
  json.value(difficultyLevel(step.technique));
  json.key("focusCells");
  appendCells(json, step.focusCells);
  json.key("focusRegions");
  appendRegions(json, step.focusRegions);
  json.key("premiseCandidates");
  appendCandidates(json, step.premises);
  json.key("eliminations");
  appendCandidates(json, step.eliminations);
  json.key("placements");
  appendCandidates(json, step.placements);
  json.key("humanCost");
  json.value(step.humanCost);
  json.key("proofSteps");
  json.beginArray();
  for (const auto &proof : step.proofSteps) {
    json.beginObject();
    json.key("kind");
    json.value(proofKind(proof.kind));
    json.key("reason");
    json.value(proofReason(proof.reason));
    json.key("focusCells");
    appendCells(json, proof.focusCells);
    json.key("focusRegions");
    appendRegions(json, proof.focusRegions);
    json.key("premiseCandidates");
    appendCandidates(json, proof.premiseCandidates);
    json.key("valueEvidence");
    appendCandidates(json, proof.valueEvidence);
    json.key("eliminations");
    appendCandidates(json, proof.eliminations);
    json.key("placements");
    appendCandidates(json, proof.placements);
    json.endObject();
  }
  json.endArray();
  json.key("explanationKey");
  json.value(std::string("hint.") + std::string(code));
  json.key("explanationParams");
  json.beginObject();
  json.key("focusCellCount");
  json.value(step.focusCells.size());
  json.key("focusCells");
  json.value(cellList(step.focusCells));
  json.key("focusRegions");
  json.value(regionList(step.focusRegions));
  json.key("premiseCandidates");
  json.value(candidateList(step.premises));
  json.key("eliminations");
  json.value(candidateList(step.eliminations));
  json.key("placements");
  json.value(candidateList(step.placements));
  json.key("resultCount");
  json.value(step.eliminations.size() + step.placements.size());
  json.endObject();
  json.endObject();
  json.endObject();
  return json.take();
}

} // namespace

std::string serializeHintStepJson(std::string_view boardFingerprint,
                                  const HintStep &step) {
  return serializeStep(boardFingerprint, step);
}

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
      return serializeHintStepJson(boardFingerprint, *result.step);
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
