#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

using namespace hsp::hint_core;

namespace {

struct Fixture {
  HintRequest request;
  HintStep step;
  Board puzzle;
  Board solution;
  std::string sourcePuzzleId;
  int sourceIteration{0};
  bool synthetic{false};
};

Board parseBoard(const std::string &text) {
  Board board{};
  if (text.size() != kCellCount) {
    throw std::runtime_error("invalid board length");
  }
  for (std::size_t index = 0; index < text.size(); ++index) {
    board[index] = static_cast<Digit>(text[index] - '0');
  }
  return board;
}

std::string boardText(const Board &board) {
  std::string text;
  text.reserve(kCellCount);
  for (const auto digit : board) {
    text.push_back(static_cast<char>('0' + digit));
  }
  return text;
}

std::vector<std::string> split(const std::string &line) {
  std::vector<std::string> fields;
  std::stringstream stream(line);
  std::string field;
  while (std::getline(stream, field, ',')) {
    fields.push_back(field);
  }
  return fields;
}

std::string jsonString(const std::string &value) {
  std::string encoded{"\""};
  for (const char character : value) {
    if (character == '\"' || character == '\\') {
      encoded.push_back('\\');
    }
    encoded.push_back(character);
  }
  encoded.push_back('\"');
  return encoded;
}

bool applyStep(HintRequest &request, const HintStep &step,
               const Board &solution) {
  for (const auto elimination : step.eliminations) {
    if (solution[elimination.cell] == elimination.digit) {
      return false;
    }
    request.hintCandidates[elimination.cell] = static_cast<CandidateMask>(
        request.hintCandidates[elimination.cell] &
        ~(1U << (elimination.digit - 1U)));
    if (request.hintCandidates[elimination.cell] == 0) {
      return false;
    }
  }
  for (const auto placement : step.placements) {
    if (solution[placement.cell] != placement.digit) {
      return false;
    }
    request.board[placement.cell] = placement.digit;
  }
  if (!step.placements.empty()) {
    const auto legal = createCandidates(request.board);
    for (Cell cell = 0; cell < kCellCount; ++cell) {
      if (request.board[cell] != 0) {
        request.hintCandidates[cell] = 0;
      } else {
        request.hintCandidates[cell] = static_cast<CandidateMask>(
            request.hintCandidates[cell] & legal[cell]);
        if (request.hintCandidates[cell] == 0) {
          return false;
        }
      }
    }
  }
  return true;
}

bool twoBoxRectangle(const std::array<Cell, 4> &cells) {
  std::set<int> boxes;
  for (const auto cell : cells) {
    const int row = cell / 9;
    const int column = cell % 9;
    boxes.insert((row / 3) * 3 + column / 3);
  }
  return boxes.size() == 2;
}

std::optional<Fixture> syntheticAvoidable(const Board &solution) {
  for (int r1 = 0; r1 < 8; ++r1) {
    for (int r2 = r1 + 1; r2 < 9; ++r2) {
      for (int c1 = 0; c1 < 8; ++c1) {
        for (int c2 = c1 + 1; c2 < 9; ++c2) {
          const std::array<Cell, 4> cells{
              static_cast<Cell>(r1 * 9 + c1),
              static_cast<Cell>(r1 * 9 + c2),
              static_cast<Cell>(r2 * 9 + c1),
              static_cast<Cell>(r2 * 9 + c2)};
          if (!twoBoxRectangle(cells)) {
            continue;
          }
          for (std::size_t emptyIndex = 0; emptyIndex < cells.size();
               ++emptyIndex) {
            const auto adjacentA = cells[emptyIndex ^ 1U];
            const auto adjacentB = cells[emptyIndex ^ 2U];
            const auto opposite = cells[3U - emptyIndex];
            if (solution[adjacentA] != solution[adjacentB] ||
                solution[adjacentA] == solution[opposite]) {
              continue;
            }
            HintRequest request{};
            for (std::size_t index = 0; index < cells.size(); ++index) {
              if (index != emptyIndex) {
                request.board[cells[index]] = solution[cells[index]];
              }
            }
            request.hintCandidates = createCandidates(request.board);
            const auto target = cells[emptyIndex];
            const auto deadly = solution[opposite];
            if ((request.hintCandidates[target] &
                 static_cast<CandidateMask>(1U << (deadly - 1U))) == 0) {
              continue;
            }
            auto step = detail::detectTechnique(
                request, Technique::avoidableRectangle);
            if (!step) {
              continue;
            }
            detail::addTeachingProof(request, *step);
            return Fixture{request, *step, Board{}, solution,
                           "synthetic-avoidable-rectangle", 0, true};
          }
        }
      }
    }
  }
  return std::nullopt;
}

void writeFixture(std::ostream &output, const Fixture &fixture,
                  const TechniqueDescriptor &descriptor) {
  const auto board = boardText(fixture.request.board);
  output << "{\"id\":"
         << jsonString("hint-lab-" + std::string(descriptor.code) + "-v1")
         << ",\"techniqueCode\":" << jsonString(std::string(descriptor.code))
         << ",\"difficultyLevel\":" << static_cast<int>(descriptor.level)
         << ",\"sourceKind\":"
         << jsonString(fixture.synthetic ? "synthetic" : "replay")
         << ",\"sourcePuzzleId\":" << jsonString(fixture.sourcePuzzleId)
         << ",\"sourceIteration\":" << fixture.sourceIteration
         << ",\"puzzleFingerprint\":"
         << jsonString(boardText(fixture.puzzle))
         << ",\"boardFingerprint\":" << jsonString(board)
         << ",\"solutionFingerprint\":"
         << jsonString(boardText(fixture.solution))
         << ",\"givenCells\":[";
  for (std::size_t index = 0; index < kCellCount; ++index) {
    if (index > 0) {
      output << ',';
    }
    output << (fixture.request.givenCells[index] ? "true" : "false");
  }
  output << "],\"candidateMasks\":[";
  for (std::size_t index = 0; index < kCellCount; ++index) {
    if (index > 0) {
      output << ',';
    }
    output << fixture.request.hintCandidates[index];
  }
  output << "],\"engineResult\":"
         << serializeHintStepJson(board, fixture.step) << '}';
}

const OpportunityAssessment *findExpectedOpportunity(
    const OpportunitySetAnalysis &analysis, const HintStep &expected) {
  const OpportunityIdentity identity{expected.technique,
                                     opportunityOutcome(expected)};
  const auto found = std::find_if(
      analysis.opportunities.begin(), analysis.opportunities.end(),
      [&](const OpportunityAssessment &assessment) {
        return assessment.identity == identity;
      });
  return found == analysis.opportunities.end() ? nullptr : &*found;
}

std::string_view selectionStateName(OpportunitySelectionState state) {
  switch (state) {
  case OpportunitySelectionState::selected:
    return "selected";
  case OpportunitySelectionState::maskedByFrontierRanking:
    return "frontier_ranking";
  case OpportunitySelectionState::maskedByLowerLevel:
    return "lower_level";
  }
  return "unknown";
}

bool opportunityIsSafe(const Fixture &fixture, const HintStep &step) {
  auto request = fixture.request;
  return applyStep(request, step, fixture.solution);
}

struct LimitSensitivity {
  static constexpr std::size_t attributionStatusCount = 4;
  bool valid{false};
  bool deterministic{false};
  std::uint32_t defaultRawCount{0};
  std::uint32_t expandedRawCount{0};
  std::uint32_t defaultUniqueCount{0};
  std::uint32_t expandedUniqueCount{0};
  std::uint32_t additionalIdentityCount{0};
  std::uint32_t missingDefaultIdentityCount{0};
  std::uint64_t defaultMedianMicroseconds{0};
  std::uint64_t expandedMedianMicroseconds{0};
  std::uint32_t defaultEffectCount{0};
  std::uint32_t expandedNewEffectCount{0};
  std::uint32_t attributionStatusChangedCount{0};
  std::uint32_t defaultTechniqueCandidateCount{0};
  std::uint32_t preservedTechniqueCandidateCount{0};
  std::uint32_t candidateBecameCrossTechniqueCount{0};
  std::uint32_t attributedTechniqueChangedCount{0};
  struct CandidateInvalidation {
    OpportunityEffect effect;
    OpportunityAttributionStatus baselineStatus;
    Technique baselineTechnique;
    OpportunityAttributionStatus comparisonStatus;
    std::vector<Technique> comparisonTechniques;
  };
  std::vector<CandidateInvalidation> candidateInvalidations;
  std::array<std::array<std::uint32_t, attributionStatusCount>,
             attributionStatusCount>
      attributionTransitions{};
  std::array<std::uint32_t, kTechniqueCatalog.size()> additionalByTechnique{};
  std::vector<Technique> remainingLimitTechniques;
};

std::size_t attributionStatusIndex(OpportunityAttributionStatus status) {
  switch (status) {
  case OpportunityAttributionStatus::noMatch:
    return 0;
  case OpportunityAttributionStatus::uniqueTechnique:
    return 1;
  case OpportunityAttributionStatus::sameTechniqueMultipleOpportunities:
    return 2;
  case OpportunityAttributionStatus::crossTechniqueAmbiguous:
    return 3;
  }
  return 0;
}

std::string_view attributionStatusName(OpportunityAttributionStatus status) {
  switch (status) {
  case OpportunityAttributionStatus::noMatch:
    return "no_match";
  case OpportunityAttributionStatus::uniqueTechnique:
    return "unique_technique";
  case OpportunityAttributionStatus::sameTechniqueMultipleOpportunities:
    return "same_technique_multiple_opportunities";
  case OpportunityAttributionStatus::crossTechniqueAmbiguous:
    return "cross_technique_ambiguous";
  }
  return "unknown";
}

constexpr std::array<OpportunityAttributionStatus,
                     LimitSensitivity::attributionStatusCount>
    kAttributionStatuses{
        OpportunityAttributionStatus::noMatch,
        OpportunityAttributionStatus::uniqueTechnique,
        OpportunityAttributionStatus::sameTechniqueMultipleOpportunities,
        OpportunityAttributionStatus::crossTechniqueAmbiguous,
    };

struct TimedSearch {
  bool valid{false};
  bool deterministic{false};
  std::uint64_t medianMicroseconds{0};
  std::optional<OpportunitySearchBatch> batch;
};

bool sameSearchBatch(const OpportunitySearchBatch &left,
                     const OpportunitySearchBatch &right) {
  return left.status == right.status && left.reason == right.reason &&
         left.workUnitsConsumed == right.workUnitsConsumed &&
         left.totalWorkUnitsConsumed == right.totalWorkUnitsConsumed &&
         left.frontierLevel == right.frontierLevel &&
         left.techniqueDiagnostics == right.techniqueDiagnostics &&
         left.opportunities == right.opportunities;
}

TimedSearch measureSearch(const HintRequest &request,
                          OpportunitySearchOptions options) {
  constexpr std::size_t repetitionCount = 3;
  TimedSearch result{};
  std::array<std::uint64_t, repetitionCount> durations{};
  for (std::size_t repetition = 0; repetition < repetitionCount;
       ++repetition) {
    auto session = Engine{}.startOpportunitySearch(request, options);
    const auto start = std::chrono::steady_clock::now();
    auto batch = session.advance(
        {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
    const auto finish = std::chrono::steady_clock::now();
    durations[repetition] = static_cast<std::uint64_t>(
        std::chrono::duration_cast<std::chrono::microseconds>(finish - start)
            .count());
    if (!result.batch) {
      result.batch = std::move(batch);
    } else if (!sameSearchBatch(*result.batch, batch)) {
      return result;
    }
  }
  std::sort(durations.begin(), durations.end());
  result.valid = true;
  result.deterministic = true;
  result.medianMicroseconds = durations[repetitionCount / 2];
  return result;
}

bool containsIdentity(const OpportunitySetAnalysis &analysis,
                      const OpportunityIdentity &identity) {
  return std::any_of(
      analysis.opportunities.begin(), analysis.opportunities.end(),
      [&](const OpportunityAssessment &assessment) {
        return assessment.identity == identity;
      });
}

LimitSensitivity evaluateLimitSensitivity(
    const Fixture &fixture, const OpportunitySetAnalysis &defaultAnalysis) {
  const auto defaultSearch = measureSearch(
      fixture.request, {OpportunitySearchScope::allDirect, 5});
  const auto expandedSearch = measureSearch(
      fixture.request,
      {OpportunitySearchScope::allDirect, 5, 1024, 512});
  if (!defaultSearch.valid || !defaultSearch.batch ||
      !expandedSearch.valid || !expandedSearch.batch) {
    return {};
  }
  const auto &batch = *expandedSearch.batch;
  if (batch.status != OpportunitySearchStatus::complete ||
      std::any_of(batch.opportunities.begin(), batch.opportunities.end(),
                  [&](const HintStep &step) {
                    return !opportunityIsSafe(fixture, step);
                  })) {
    return {};
  }
  const auto expanded = analyzeOpportunitySet(batch.opportunities);
  const auto measuredDefault =
      analyzeOpportunitySet(defaultSearch.batch->opportunities);
  if (measuredDefault.opportunities != defaultAnalysis.opportunities ||
      expanded.invalidOpportunityCount != 0 ||
      expanded.duplicateRawOpportunityCount != 0 ||
      !expanded.selectionOrderConsistent) {
    return {};
  }

  LimitSensitivity result{};
  result.valid = true;
  result.deterministic =
      defaultSearch.deterministic && expandedSearch.deterministic;
  result.defaultMedianMicroseconds = defaultSearch.medianMicroseconds;
  result.expandedMedianMicroseconds = expandedSearch.medianMicroseconds;
  result.defaultRawCount = defaultAnalysis.rawOpportunityCount;
  result.expandedRawCount = expanded.rawOpportunityCount;
  result.defaultUniqueCount =
      static_cast<std::uint32_t>(defaultAnalysis.opportunities.size());
  result.expandedUniqueCount =
      static_cast<std::uint32_t>(expanded.opportunities.size());
  const auto attributionTransitions =
      compareOpportunityEffectAttribution(defaultAnalysis, expanded);
  for (const auto &transition : attributionTransitions) {
    const auto baselineIndex =
        attributionStatusIndex(transition.baseline.status);
    const auto comparisonIndex =
        attributionStatusIndex(transition.comparison.status);
    ++result.attributionTransitions[baselineIndex][comparisonIndex];
    if (transition.baseline.status == OpportunityAttributionStatus::noMatch) {
      ++result.expandedNewEffectCount;
      continue;
    }
    ++result.defaultEffectCount;
    if (transition.baseline.status != transition.comparison.status) {
      ++result.attributionStatusChangedCount;
    }
    if (!transition.baseline.attributedTechnique) {
      continue;
    }
    ++result.defaultTechniqueCandidateCount;
    if (transition.techniqueCandidatePreserved) {
      ++result.preservedTechniqueCandidateCount;
    } else if (transition.comparison.status ==
               OpportunityAttributionStatus::crossTechniqueAmbiguous) {
      ++result.candidateBecameCrossTechniqueCount;
      std::set<Technique> techniques;
      for (const auto &identity :
           transition.comparison.matchingOpportunities) {
        techniques.insert(identity.technique);
      }
      result.candidateInvalidations.push_back(
          {transition.effect, transition.baseline.status,
           *transition.baseline.attributedTechnique,
           transition.comparison.status,
           {techniques.begin(), techniques.end()}});
    } else if (transition.comparison.attributedTechnique &&
               transition.comparison.attributedTechnique !=
                   transition.baseline.attributedTechnique) {
      ++result.attributedTechniqueChangedCount;
    }
  }
  for (const auto &assessment : expanded.opportunities) {
    if (containsIdentity(defaultAnalysis, assessment.identity)) {
      continue;
    }
    ++result.additionalIdentityCount;
    for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
      if (kTechniqueCatalog[index].technique ==
          assessment.identity.technique) {
        ++result.additionalByTechnique[index];
        break;
      }
    }
  }
  for (const auto &assessment : defaultAnalysis.opportunities) {
    if (!containsIdentity(expanded, assessment.identity)) {
      ++result.missingDefaultIdentityCount;
    }
  }
  for (const auto &diagnostic : batch.techniqueDiagnostics) {
    if (diagnostic.reachedEnumerationLimit) {
      result.remainingLimitTechniques.push_back(diagnostic.technique);
    }
  }
  return result;
}

bool writeOpportunityEvaluation(
    const std::string &path,
    const std::array<std::optional<Fixture>, kTechniqueCatalog.size()>
        &fixtures) {
  std::ofstream output(path);
  if (!output) {
    std::cerr << "could not open opportunity evaluation output\n";
    return false;
  }

  std::uint32_t expectedFound = 0;
  std::uint32_t unsafeCount = 0;
  std::uint32_t rawCount = 0;
  std::uint32_t uniqueCount = 0;
  std::uint32_t outcomeCount = 0;
  std::uint32_t ambiguousCount = 0;
  std::uint32_t effectCount = 0;
  std::uint32_t ambiguousEffectCount = 0;
  std::uint32_t crossTechniqueAmbiguousEffectCount = 0;
  std::uint32_t duplicateCount = 0;
  std::uint32_t frontierMaskedCount = 0;
  std::uint32_t lowerLevelMaskedCount = 0;
  std::uint32_t enumerationLimitEvents = 0;
  std::set<Technique> enumerationLimitTechniques;
  std::set<Technique> expandedLimitTechniques;
  std::set<std::string> evaluatedStates;
  std::uint32_t sensitivityStateCount = 0;
  std::uint32_t sensitivityAdditionalIdentities = 0;
  std::uint32_t sensitivityMissingDefaultIdentities = 0;
  std::uint64_t sensitivityDefaultMedianMicroseconds = 0;
  std::uint64_t sensitivityExpandedMedianMicroseconds = 0;
  std::uint32_t sensitivityDefaultEffectCount = 0;
  std::uint32_t sensitivityExpandedNewEffectCount = 0;
  std::uint32_t sensitivityAttributionStatusChangedCount = 0;
  std::uint32_t sensitivityDefaultTechniqueCandidateCount = 0;
  std::uint32_t sensitivityPreservedTechniqueCandidateCount = 0;
  std::uint32_t sensitivityCandidateBecameCrossTechniqueCount = 0;
  std::uint32_t sensitivityAttributedTechniqueChangedCount = 0;
  std::array<std::array<std::uint32_t,
                        LimitSensitivity::attributionStatusCount>,
             LimitSensitivity::attributionStatusCount>
      sensitivityAttributionTransitions{};
  std::map<std::string, LimitSensitivity> sensitivityByState;

  output << "{\"evaluationKind\":\"opportunity_identity_and_masking\""
            ",\"fixtureCount\":"
         << fixtures.size() << ",\"fixtures\":[";
  for (std::size_t index = 0; index < fixtures.size(); ++index) {
    const auto &fixture = *fixtures[index];
    auto session = Engine{}.startOpportunitySearch(
        fixture.request, {OpportunitySearchScope::allDirect, 5});
    const auto batch = session.advance(
        {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
    if (batch.status != OpportunitySearchStatus::complete) {
      std::cerr << "opportunity evaluation did not complete for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    const auto analysis = analyzeOpportunitySet(batch.opportunities);
    const auto stateKey = fixture.sourcePuzzleId + ":" +
                          std::to_string(fixture.sourceIteration);
    const bool firstEvaluationForState = evaluatedStates.insert(stateKey).second;
    const auto *expected = findExpectedOpportunity(analysis, fixture.step);
    if (expected != nullptr) {
      ++expectedFound;
    }
    const auto fixtureUnsafe = static_cast<std::uint32_t>(std::count_if(
        batch.opportunities.begin(), batch.opportunities.end(),
        [&](const HintStep &step) {
          return !opportunityIsSafe(fixture, step);
        }));
    if (firstEvaluationForState) {
      unsafeCount += fixtureUnsafe;
      rawCount += analysis.rawOpportunityCount;
      uniqueCount +=
          static_cast<std::uint32_t>(analysis.opportunities.size());
      outcomeCount += analysis.distinctOutcomeCount;
      ambiguousCount += analysis.ambiguousOutcomeCount;
      effectCount += static_cast<std::uint32_t>(analysis.effects.size());
      ambiguousEffectCount += analysis.ambiguousEffectCount;
      crossTechniqueAmbiguousEffectCount +=
          analysis.crossTechniqueAmbiguousEffectCount;
      duplicateCount += analysis.duplicateRawOpportunityCount;
    }

    std::uint32_t fixtureFrontierMasked = 0;
    std::uint32_t fixtureLowerLevelMasked = 0;
    for (const auto &assessment : analysis.opportunities) {
      if (assessment.selectionState ==
          OpportunitySelectionState::maskedByFrontierRanking) {
        ++fixtureFrontierMasked;
      } else if (assessment.selectionState ==
                 OpportunitySelectionState::maskedByLowerLevel) {
        ++fixtureLowerLevelMasked;
      }
    }
    if (firstEvaluationForState) {
      frontierMaskedCount += fixtureFrontierMasked;
      lowerLevelMaskedCount += fixtureLowerLevelMasked;
    }

    std::vector<Technique> fixtureLimitTechniques;
    for (const auto &diagnostic : batch.techniqueDiagnostics) {
      if (diagnostic.reachedEnumerationLimit) {
        fixtureLimitTechniques.push_back(diagnostic.technique);
        enumerationLimitTechniques.insert(diagnostic.technique);
      }
    }
    const LimitSensitivity *sensitivity = nullptr;
    if (!fixtureLimitTechniques.empty()) {
      const auto [entry, inserted] = sensitivityByState.try_emplace(stateKey);
      if (inserted) {
        entry->second = evaluateLimitSensitivity(fixture, analysis);
        if (!entry->second.valid) {
          std::cerr << "expanded enumeration evaluation failed for "
                    << stateKey << '\n';
          return false;
        }
        ++sensitivityStateCount;
        sensitivityAdditionalIdentities +=
            entry->second.additionalIdentityCount;
        sensitivityMissingDefaultIdentities +=
            entry->second.missingDefaultIdentityCount;
        sensitivityDefaultMedianMicroseconds +=
            entry->second.defaultMedianMicroseconds;
        sensitivityExpandedMedianMicroseconds +=
            entry->second.expandedMedianMicroseconds;
        sensitivityDefaultEffectCount += entry->second.defaultEffectCount;
        sensitivityExpandedNewEffectCount +=
            entry->second.expandedNewEffectCount;
        sensitivityAttributionStatusChangedCount +=
            entry->second.attributionStatusChangedCount;
        sensitivityDefaultTechniqueCandidateCount +=
            entry->second.defaultTechniqueCandidateCount;
        sensitivityPreservedTechniqueCandidateCount +=
            entry->second.preservedTechniqueCandidateCount;
        sensitivityCandidateBecameCrossTechniqueCount +=
            entry->second.candidateBecameCrossTechniqueCount;
        sensitivityAttributedTechniqueChangedCount +=
            entry->second.attributedTechniqueChangedCount;
        for (std::size_t baselineIndex = 0;
             baselineIndex < LimitSensitivity::attributionStatusCount;
             ++baselineIndex) {
          for (std::size_t comparisonIndex = 0;
               comparisonIndex < LimitSensitivity::attributionStatusCount;
               ++comparisonIndex) {
            sensitivityAttributionTransitions[baselineIndex][comparisonIndex] +=
                entry->second
                    .attributionTransitions[baselineIndex][comparisonIndex];
          }
        }
        expandedLimitTechniques.insert(
            entry->second.remainingLimitTechniques.begin(),
            entry->second.remainingLimitTechniques.end());
      }
      sensitivity = &entry->second;
    }

    if (index > 0) {
      output << ',';
    }
    output << "{\"techniqueCode\":"
           << jsonString(std::string(kTechniqueCatalog[index].code))
           << ",\"sourcePuzzleId\":" << jsonString(fixture.sourcePuzzleId)
           << ",\"sourceIteration\":" << fixture.sourceIteration
           << ",\"expectedIdentityFound\":"
           << (expected != nullptr ? "true" : "false")
           << ",\"expectedSelectionState\":"
           << jsonString(expected != nullptr
                             ? std::string(selectionStateName(
                                   expected->selectionState))
                             : "missing")
           << ",\"expectedProofVariantCount\":"
           << (expected != nullptr ? expected->proofVariantCount : 0)
           << ",\"rawOpportunityCount\":"
           << analysis.rawOpportunityCount
           << ",\"uniqueOpportunityCount\":"
           << analysis.opportunities.size()
           << ",\"distinctOutcomeCount\":"
           << analysis.distinctOutcomeCount
           << ",\"ambiguousOutcomeCount\":"
           << analysis.ambiguousOutcomeCount
           << ",\"effectCount\":" << analysis.effects.size()
           << ",\"ambiguousEffectCount\":"
           << analysis.ambiguousEffectCount
           << ",\"crossTechniqueAmbiguousEffectCount\":"
           << analysis.crossTechniqueAmbiguousEffectCount
           << ",\"duplicateRawOpportunityCount\":"
           << analysis.duplicateRawOpportunityCount
           << ",\"invalidOpportunityCount\":"
           << analysis.invalidOpportunityCount
           << ",\"unsafeOpportunityCount\":" << fixtureUnsafe
           << ",\"frontierMaskedCount\":" << fixtureFrontierMasked
           << ",\"lowerLevelMaskedCount\":" << fixtureLowerLevelMasked
           << ",\"enumerationLimitTechniques\":[";
    bool firstLimit = true;
    for (const auto technique : fixtureLimitTechniques) {
      if (!firstLimit) {
        output << ',';
      }
      firstLimit = false;
      if (firstEvaluationForState) {
        ++enumerationLimitEvents;
      }
      output << jsonString(std::string(techniqueCode(technique)));
    }
    output << "],\"limitSensitivity\":";
    if (sensitivity == nullptr) {
      output << "null";
    } else {
      output << "{\"defaultRawOpportunityCount\":"
             << sensitivity->defaultRawCount
             << ",\"expandedRawOpportunityCount\":"
             << sensitivity->expandedRawCount
             << ",\"defaultUniqueOpportunityCount\":"
             << sensitivity->defaultUniqueCount
             << ",\"expandedUniqueOpportunityCount\":"
             << sensitivity->expandedUniqueCount
             << ",\"additionalIdentityCount\":"
             << sensitivity->additionalIdentityCount
             << ",\"missingDefaultIdentityCount\":"
             << sensitivity->missingDefaultIdentityCount
             << ",\"deterministic\":"
             << (sensitivity->deterministic ? "true" : "false")
             << ",\"defaultMedianMicroseconds\":"
             << sensitivity->defaultMedianMicroseconds
             << ",\"expandedMedianMicroseconds\":"
             << sensitivity->expandedMedianMicroseconds
             << ",\"defaultEffectCount\":"
             << sensitivity->defaultEffectCount
             << ",\"expandedNewEffectCount\":"
             << sensitivity->expandedNewEffectCount
             << ",\"attributionStatusChangedCount\":"
             << sensitivity->attributionStatusChangedCount
             << ",\"defaultTechniqueCandidateCount\":"
             << sensitivity->defaultTechniqueCandidateCount
             << ",\"preservedTechniqueCandidateCount\":"
             << sensitivity->preservedTechniqueCandidateCount
             << ",\"candidateBecameCrossTechniqueCount\":"
             << sensitivity->candidateBecameCrossTechniqueCount
             << ",\"attributedTechniqueChangedCount\":"
             << sensitivity->attributedTechniqueChangedCount
             << ",\"candidateInvalidations\":[";
      for (std::size_t invalidationIndex = 0;
           invalidationIndex < sensitivity->candidateInvalidations.size();
           ++invalidationIndex) {
        if (invalidationIndex > 0) {
          output << ',';
        }
        const auto &invalidation =
            sensitivity->candidateInvalidations[invalidationIndex];
        output << "{\"effectKind\":"
               << jsonString(invalidation.effect.kind ==
                                     OpportunityEffectKind::placement
                                 ? "placement"
                                 : "elimination")
               << ",\"cell\":"
               << static_cast<unsigned>(invalidation.effect.candidate.cell)
               << ",\"digit\":"
               << static_cast<unsigned>(invalidation.effect.candidate.digit)
               << ",\"baselineStatus\":"
               << jsonString(std::string(
                      attributionStatusName(invalidation.baselineStatus)))
               << ",\"baselineTechnique\":"
               << jsonString(std::string(
                      techniqueCode(invalidation.baselineTechnique)))
               << ",\"comparisonStatus\":"
               << jsonString(std::string(
                      attributionStatusName(invalidation.comparisonStatus)))
               << ",\"comparisonTechniques\":[";
        for (std::size_t techniqueIndex = 0;
             techniqueIndex < invalidation.comparisonTechniques.size();
             ++techniqueIndex) {
          if (techniqueIndex > 0) {
            output << ',';
          }
          output << jsonString(std::string(techniqueCode(
              invalidation.comparisonTechniques[techniqueIndex])));
        }
        output << "]}";
      }
      output << "],\"attributionTransitions\":{";
      for (std::size_t baselineIndex = 0;
           baselineIndex < kAttributionStatuses.size(); ++baselineIndex) {
        if (baselineIndex > 0) {
          output << ',';
        }
        output << jsonString(std::string(
                      attributionStatusName(kAttributionStatuses[baselineIndex])))
               << ":{";
        for (std::size_t comparisonIndex = 0;
             comparisonIndex < kAttributionStatuses.size();
             ++comparisonIndex) {
          if (comparisonIndex > 0) {
            output << ',';
          }
          output << jsonString(std::string(attributionStatusName(
                        kAttributionStatuses[comparisonIndex])))
                 << ':'
                 << sensitivity->attributionTransitions[baselineIndex]
                                                        [comparisonIndex];
        }
        output << '}';
      }
      output << "},\"additionalByTechnique\":{";
      bool firstAdditional = true;
      for (std::size_t techniqueIndex = 0;
           techniqueIndex < kTechniqueCatalog.size(); ++techniqueIndex) {
        if (sensitivity->additionalByTechnique[techniqueIndex] == 0) {
          continue;
        }
        if (!firstAdditional) {
          output << ',';
        }
        firstAdditional = false;
        output << jsonString(
                      std::string(kTechniqueCatalog[techniqueIndex].code))
               << ':'
               << sensitivity->additionalByTechnique[techniqueIndex];
      }
      output << "},\"expandedEnumerationLimitTechniques\":[";
      for (std::size_t limitIndex = 0;
           limitIndex < sensitivity->remainingLimitTechniques.size();
           ++limitIndex) {
        if (limitIndex > 0) {
          output << ',';
        }
        output << jsonString(std::string(techniqueCode(
            sensitivity->remainingLimitTechniques[limitIndex])));
      }
      output << "]}";
    }
    output << '}';

    if (expected == nullptr || fixtureUnsafe != 0 ||
        analysis.invalidOpportunityCount != 0 ||
        analysis.duplicateRawOpportunityCount != 0 ||
        !analysis.selectionOrderConsistent) {
      std::cerr << "opportunity evaluation failed for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
  }
  output << "],\"summary\":{\"expectedIdentityCount\":"
         << fixtures.size() << ",\"expectedIdentityFound\":"
         << expectedFound << ",\"unsafeOpportunityCount\":" << unsafeCount
         << ",\"uniqueStateCount\":" << evaluatedStates.size()
         << ",\"rawOpportunityCount\":" << rawCount
         << ",\"uniqueOpportunityCount\":" << uniqueCount
         << ",\"distinctOutcomeCount\":" << outcomeCount
         << ",\"ambiguousOutcomeCount\":" << ambiguousCount
         << ",\"effectCount\":" << effectCount
         << ",\"ambiguousEffectCount\":" << ambiguousEffectCount
         << ",\"crossTechniqueAmbiguousEffectCount\":"
         << crossTechniqueAmbiguousEffectCount
         << ",\"duplicateRawOpportunityCount\":" << duplicateCount
         << ",\"frontierMaskedCount\":" << frontierMaskedCount
         << ",\"lowerLevelMaskedCount\":" << lowerLevelMaskedCount
         << ",\"enumerationLimitEventCount\":" << enumerationLimitEvents
         << ",\"enumerationLimitTechniqueCount\":"
         << enumerationLimitTechniques.size()
         << ",\"enumerationLimitTechniques\":[";
  bool firstLimitTechnique = true;
  for (const auto technique : enumerationLimitTechniques) {
    if (!firstLimitTechnique) {
      output << ',';
    }
    firstLimitTechnique = false;
    output << jsonString(std::string(techniqueCode(technique)));
  }
  output << "],\"sensitivityStateCount\":" << sensitivityStateCount
         << ",\"expandedAdditionalIdentityCount\":"
         << sensitivityAdditionalIdentities
         << ",\"expandedMissingDefaultIdentityCount\":"
         << sensitivityMissingDefaultIdentities
         << ",\"sensitivityDefaultMedianMicroseconds\":"
         << sensitivityDefaultMedianMicroseconds
         << ",\"sensitivityExpandedMedianMicroseconds\":"
         << sensitivityExpandedMedianMicroseconds
         << ",\"sensitivityDefaultEffectCount\":"
         << sensitivityDefaultEffectCount
         << ",\"sensitivityExpandedNewEffectCount\":"
         << sensitivityExpandedNewEffectCount
         << ",\"sensitivityAttributionStatusChangedCount\":"
         << sensitivityAttributionStatusChangedCount
         << ",\"sensitivityDefaultTechniqueCandidateCount\":"
         << sensitivityDefaultTechniqueCandidateCount
         << ",\"sensitivityPreservedTechniqueCandidateCount\":"
         << sensitivityPreservedTechniqueCandidateCount
         << ",\"sensitivityCandidateBecameCrossTechniqueCount\":"
         << sensitivityCandidateBecameCrossTechniqueCount
         << ",\"sensitivityAttributedTechniqueChangedCount\":"
         << sensitivityAttributedTechniqueChangedCount
         << ",\"sensitivityAttributionTransitions\":{";
  for (std::size_t baselineIndex = 0;
       baselineIndex < kAttributionStatuses.size(); ++baselineIndex) {
    if (baselineIndex > 0) {
      output << ',';
    }
    output << jsonString(std::string(
                  attributionStatusName(kAttributionStatuses[baselineIndex])))
           << ":{";
    for (std::size_t comparisonIndex = 0;
         comparisonIndex < kAttributionStatuses.size(); ++comparisonIndex) {
      if (comparisonIndex > 0) {
        output << ',';
      }
      output << jsonString(std::string(attributionStatusName(
                    kAttributionStatuses[comparisonIndex])))
             << ':'
             << sensitivityAttributionTransitions[baselineIndex]
                                                     [comparisonIndex];
    }
    output << '}';
  }
  output << "},\"expandedEnumerationLimitTechniques\":[";
  bool firstExpandedLimit = true;
  for (const auto technique : expandedLimitTechniques) {
    if (!firstExpandedLimit) {
      output << ',';
    }
    firstExpandedLimit = false;
    output << jsonString(std::string(techniqueCode(technique)));
  }
  output << ']'
         << "}}\n";
  std::cout << "evaluated all " << expectedFound
            << " expected technique identities\n";
  return expectedFound == fixtures.size() && unsafeCount == 0 &&
         duplicateCount == 0 && sensitivityMissingDefaultIdentities == 0;
}

} // namespace

int main(int argc, char **argv) {
  if (argc != 3 && argc != 4) {
    std::cerr << "usage: fixture_export puzzles.csv output.json "
                 "[opportunity-evaluation.json]\n";
    return EXIT_FAILURE;
  }
  std::ifstream input(argv[1]);
  if (!input) {
    std::cerr << "could not open replay corpus\n";
    return EXIT_FAILURE;
  }
  std::array<std::optional<Fixture>, kTechniqueCatalog.size()> fixtures{};
  std::optional<Board> firstSolution;
  std::string line;
  std::getline(input, line);
  while (std::getline(input, line)) {
    const auto fields = split(line);
    if (fields.size() < 3) {
      return EXIT_FAILURE;
    }
    const auto puzzle = parseBoard(fields[1]);
    const auto solution = parseBoard(fields[2]);
    if (!firstSolution) {
      firstSolution = solution;
    }
    HintRequest request{puzzle, createCandidates(puzzle)};
    for (Cell cell = 0; cell < kCellCount; ++cell) {
      request.givenCells[cell] = puzzle[cell] != 0;
    }
    for (int iteration = 0; iteration < 1000; ++iteration) {
      for (std::size_t index = 0; index < fixtures.size(); ++index) {
        if (fixtures[index]) {
          continue;
        }
        auto direct = detail::detectTechnique(
            request, kTechniqueCatalog[index].technique);
        if (direct) {
          detail::addTeachingProof(request, *direct);
          fixtures[index] = Fixture{request, *direct, puzzle, solution,
                                    fields[0], iteration, false};
        }
      }
      const auto next = Engine{}.nextStep(request);
      if (next.status == ResultStatus::solved) {
        break;
      }
      if (next.status != ResultStatus::step || !next.step ||
          !applyStep(request, *next.step, solution)) {
        std::cerr << "could not advance " << fields[0] << '\n';
        return EXIT_FAILURE;
      }
    }
  }
  for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
    if (kTechniqueCatalog[index].technique == Technique::avoidableRectangle &&
        !fixtures[index] && firstSolution) {
      fixtures[index] = syntheticAvoidable(*firstSolution);
    }
    if (!fixtures[index]) {
      std::cerr << "missing fixture for " << kTechniqueCatalog[index].code
                << '\n';
      return EXIT_FAILURE;
    }
  }

  std::ofstream output(argv[2]);
  output << "{\"fixtureContentVersion\":1,\"fixtureCount\":39,"
            "\"fixtures\":[";
  for (std::size_t index = 0; index < fixtures.size(); ++index) {
    if (index > 0) {
      output << ',';
    }
    writeFixture(output, *fixtures[index], kTechniqueCatalog[index]);
  }
  output << "]}\n";
  if (argc == 4 && !writeOpportunityEvaluation(argv[3], fixtures)) {
    return EXIT_FAILURE;
  }
  std::cout << "exported 39 hint acceptance fixtures\n";
  return EXIT_SUCCESS;
}
