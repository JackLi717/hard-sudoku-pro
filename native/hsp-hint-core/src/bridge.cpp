#include "hsp/hint_core/bridge.hpp"

#include "hsp/hint_core/engine.hpp"

#include <charconv>
#include <cstddef>
#include <algorithm>
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
  void boolean(bool value) {
    beforeValue();
    output_ += value ? "true" : "false";
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

bool parseUnsigned(std::string_view encoded, unsigned int &value) noexcept {
  if (encoded.empty()) {
    return false;
  }
  const auto parsed = std::from_chars(encoded.data(),
                                      encoded.data() + encoded.size(), value);
  return parsed.ec == std::errc{} &&
         parsed.ptr == encoded.data() + encoded.size();
}

bool parseObservedEffects(std::string_view encoded,
                          std::vector<OpportunityEffect> &effects) noexcept {
  if (encoded.empty()) {
    return false;
  }
  std::size_t start = 0;
  while (start < encoded.size()) {
    const std::size_t end = encoded.find(',', start);
    const std::string_view token = encoded.substr(
        start, end == std::string_view::npos ? encoded.size() - start
                                             : end - start);
    const std::size_t firstColon = token.find(':');
    const std::size_t secondColon = token.find(':', firstColon + 1);
    if (firstColon != 1 || secondColon == std::string_view::npos ||
        token.find(':', secondColon + 1) != std::string_view::npos) {
      return false;
    }
    unsigned int cell = 0;
    unsigned int digit = 0;
    if (!parseUnsigned(token.substr(firstColon + 1,
                                    secondColon - firstColon - 1),
                       cell) ||
        !parseUnsigned(token.substr(secondColon + 1), digit) ||
        cell >= kCellCount || digit < 1 || digit > kSideLength ||
        (token[0] != 'p' && token[0] != 'e')) {
      return false;
    }
    effects.push_back(
        {token[0] == 'p' ? OpportunityEffectKind::placement
                         : OpportunityEffectKind::elimination,
         {static_cast<Cell>(cell), static_cast<Digit>(digit)}});
    if (end == std::string_view::npos) {
      break;
    }
    start = end + 1;
  }
  return !effects.empty();
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

constexpr std::string_view explanationStatus(
    OpportunityExplanationStatus status) noexcept {
  switch (status) {
  case OpportunityExplanationStatus::matched:
    return "matched";
  case OpportunityExplanationStatus::noMatch:
    return "no_match";
  case OpportunityExplanationStatus::incompleteOpportunitySet:
    return "incomplete_opportunity_set";
  case OpportunityExplanationStatus::invalidInput:
    return "invalid_input";
  }
  return "invalid_input";
}

std::string serializeExplanation(
    const OpportunityExplanationResult &result,
    const OpportunitySearchBatch &batch, bool opportunitySetComplete,
    bool usedExpandedSearch) {
  JsonWriter json;
  json.beginObject();
  json.key("status");
  json.value(explanationStatus(result.status));
  json.key("candidateTechniques");
  json.beginArray();
  for (const auto &candidate : result.candidates) {
    json.beginObject();
    json.key("technique");
    json.value(techniqueCode(candidate.technique));
    json.key("humanCost");
    json.value(static_cast<std::size_t>(candidate.humanCost));
    json.key("directPlacementMatch");
    json.boolean(candidate.directPlacementMatch);
    json.key("oneHopPlacementMatch");
    json.boolean(candidate.oneHopPlacementMatch);
    json.key("matchingOpportunityCount");
    json.value(candidate.matchingOpportunities.size());
    json.key("matchingOpportunities");
    json.beginArray();
    for (const auto &opportunity : candidate.matchingOpportunities) {
      json.beginObject();
      json.key("placements");
      appendCandidates(json, opportunity.outcome.placements);
      json.key("eliminations");
      appendCandidates(json, opportunity.outcome.eliminations);
      json.endObject();
    }
    json.endArray();
    json.endObject();
  }
  json.endArray();
  json.key("diagnostics");
  json.beginObject();
  json.key("opportunityCount");
  json.value(batch.opportunities.size());
  json.key("opportunitySetComplete");
  json.boolean(opportunitySetComplete);
  json.key("usedExpandedSearch");
  json.boolean(usedExpandedSearch);
  json.key("reachedEnumerationLimitTechniques");
  json.beginArray();
  for (const auto &diagnostic : batch.techniqueDiagnostics) {
    if (diagnostic.reachedEnumerationLimit) {
      json.value(techniqueCode(diagnostic.technique));
    }
  }
  json.endArray();
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

std::string enumerateStepsJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells, const std::atomic_bool *cancelRequested) {
  HintRequest request{};
  if (!parseBoard(boardFingerprint, request.board) ||
      !parseCandidateMasks(candidateMasks, request.hintCandidates) ||
      !parseGivenCells(givenCells, request.givenCells)) {
    return R"({"complete":false,"steps":[]})";
  }
  request.cancelRequested = cancelRequested;
  auto search = Engine{}.startOpportunitySearch(
      request, {OpportunitySearchScope::allDirect, 5, 1024, 512});
  const auto batch = search.advance({1000});
  bool complete = batch.status == OpportunitySearchStatus::complete ||
                  batch.status == OpportunitySearchStatus::solved;
  for (const auto &diagnostic : batch.techniqueDiagnostics)
    if (diagnostic.reachedEnumerationLimit) complete = false;
  std::string result = "{\"board\":\"" + std::string(boardFingerprint) +
      "\",\"snapshotKey\":\"" + std::string(boardFingerprint) + "|" +
      std::string(candidateMasks) + "|" + std::string(givenCells) +
      "\",\"complete\":" + (complete ? "true" : "false") + ",\"steps\":[";
  bool first = true;
  for (const auto &step : batch.opportunities) {
    if (!first) result += ',';
    first = false;
    result += serializeHintStepJson(boardFingerprint, step);
  }
  return result + "]}";
}

std::string opportunityExplanationJson(
    std::string_view boardFingerprint, std::string_view candidateMasks,
    std::string_view givenCells, std::string_view observedEffects,
    const std::atomic_bool *cancelRequested) {
  HintRequest request{};
  std::vector<OpportunityEffect> effects;
  if (!parseBoard(boardFingerprint, request.board) ||
      !parseCandidateMasks(candidateMasks, request.hintCandidates) ||
      !parseGivenCells(givenCells, request.givenCells) ||
      !parseObservedEffects(observedEffects, effects)) {
    return "{\"status\":\"invalid_input\",\"candidateTechniques\":[],\"diagnostics\":{\"opportunityCount\":0,\"opportunitySetComplete\":false,\"usedExpandedSearch\":false,\"reachedEnumerationLimitTechniques\":[]}}";
  }
  request.cancelRequested = cancelRequested;
  auto search = Engine{}.startOpportunitySearch(
      request, {OpportunitySearchScope::allDirect, 5});
  auto batch = search.advance({1000});
  if (batch.status == OpportunitySearchStatus::cancelled) {
    return "{\"status\":\"cancelled\",\"candidateTechniques\":[],\"diagnostics\":{\"opportunityCount\":0,\"opportunitySetComplete\":false,\"usedExpandedSearch\":false,\"reachedEnumerationLimitTechniques\":[]}}";
  }
  if (batch.status != OpportunitySearchStatus::complete) {
    return "{\"status\":\"invalid_input\",\"candidateTechniques\":[],\"diagnostics\":{\"opportunityCount\":0,\"opportunitySetComplete\":false,\"usedExpandedSearch\":false,\"reachedEnumerationLimitTechniques\":[]}}";
  }
  const auto reachedLimit = [](const OpportunitySearchBatch &candidateBatch) {
    return std::any_of(
        candidateBatch.techniqueDiagnostics.begin(),
        candidateBatch.techniqueDiagnostics.end(),
        [](const TechniqueSearchDiagnostic &diagnostic) {
          return diagnostic.reachedEnumerationLimit;
        });
  };
  bool usedExpandedSearch = false;
  if (reachedLimit(batch)) {
    auto expandedSearch = Engine{}.startOpportunitySearch(
        request, {OpportunitySearchScope::allDirect, 5, 1024, 512});
    batch = expandedSearch.advance({1000});
    usedExpandedSearch = true;
    if (batch.status == OpportunitySearchStatus::cancelled) {
      return "{\"status\":\"cancelled\",\"candidateTechniques\":[],\"diagnostics\":{\"opportunityCount\":0,\"opportunitySetComplete\":false,\"usedExpandedSearch\":true,\"reachedEnumerationLimitTechniques\":[]}}";
    }
    if (batch.status != OpportunitySearchStatus::complete) {
      return "{\"status\":\"invalid_input\",\"candidateTechniques\":[],\"diagnostics\":{\"opportunityCount\":0,\"opportunitySetComplete\":false,\"usedExpandedSearch\":true,\"reachedEnumerationLimitTechniques\":[]}}";
    }
  }
  const bool complete = !reachedLimit(batch);
  const auto explanation =
      explainOpportunityEffects(request, batch.opportunities, effects, complete);
  return serializeExplanation(explanation, batch, complete,
                              usedExpandedSearch);
}

} // namespace hsp::hint_core
