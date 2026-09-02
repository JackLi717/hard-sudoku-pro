#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <algorithm>
#include <array>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
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
  bool valid{false};
  std::uint32_t defaultRawCount{0};
  std::uint32_t expandedRawCount{0};
  std::uint32_t defaultUniqueCount{0};
  std::uint32_t expandedUniqueCount{0};
  std::uint32_t additionalIdentityCount{0};
  std::uint32_t missingDefaultIdentityCount{0};
  std::array<std::uint32_t, kTechniqueCatalog.size()> additionalByTechnique{};
  std::vector<Technique> remainingLimitTechniques;
};

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
  auto session = Engine{}.startOpportunitySearch(
      fixture.request,
      {OpportunitySearchScope::allDirect, 5, 1024, 512});
  const auto batch = session.advance(
      {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
  if (batch.status != OpportunitySearchStatus::complete ||
      std::any_of(batch.opportunities.begin(), batch.opportunities.end(),
                  [&](const HintStep &step) {
                    return !opportunityIsSafe(fixture, step);
                  })) {
    return {};
  }
  const auto expanded = analyzeOpportunitySet(batch.opportunities);
  if (expanded.invalidOpportunityCount != 0 ||
      expanded.duplicateRawOpportunityCount != 0 ||
      !expanded.selectionOrderConsistent) {
    return {};
  }

  LimitSensitivity result{};
  result.valid = true;
  result.defaultRawCount = defaultAnalysis.rawOpportunityCount;
  result.expandedRawCount = expanded.rawOpportunityCount;
  result.defaultUniqueCount =
      static_cast<std::uint32_t>(defaultAnalysis.opportunities.size());
  result.expandedUniqueCount =
      static_cast<std::uint32_t>(expanded.opportunities.size());
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
             << ",\"additionalByTechnique\":{";
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
         << ",\"expandedEnumerationLimitTechniques\":[";
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
