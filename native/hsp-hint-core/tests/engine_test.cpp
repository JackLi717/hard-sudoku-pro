#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"

#include <algorithm>
#include <atomic>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

using namespace hsp::hint_core;

namespace {

Board solvedBoard() {
  return {5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8,
          1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1, 4, 2, 3,
          4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6,
          9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5,
          3, 4, 5, 2, 8, 6, 1, 7, 9};
}

void require(bool condition, std::string_view message) {
  if (!condition) {
    std::cerr << "FAILED: " << message << '\n';
    std::exit(EXIT_FAILURE);
  }
}

bool hasBalancedJsonStructure(std::string_view json) {
  std::vector<char> delimiters;
  bool inString = false;
  bool escaped = false;
  for (const char character : json) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character == '\\') {
        escaped = true;
      } else if (character == '"') {
        inString = false;
      }
      continue;
    }
    if (character == '"') {
      inString = true;
    } else if (character == '{' || character == '[') {
      delimiters.push_back(character);
    } else if (character == '}' || character == ']') {
      if (delimiters.empty()) {
        return false;
      }
      const char opening = delimiters.back();
      if ((character == '}' && opening != '{') ||
          (character == ']' && opening != '[')) {
        return false;
      }
      delimiters.pop_back();
    }
  }
  return !inString && !escaped && delimiters.empty();
}

HintRequest requestFor(Board board) {
  return {board, createCandidates(board)};
}

OpportunityIdentity identityFor(
    Technique technique, std::vector<Candidate> placements = {},
    std::vector<Candidate> eliminations = {}) {
  HintStep step{technique, {}, {}, {}, std::move(eliminations),
                std::move(placements)};
  return {technique, opportunityOutcome(step)};
}

const OpportunityAssessment *findAssessment(
    const OpportunitySetAnalysis &analysis,
    const OpportunityIdentity &identity) {
  const auto found = std::find_if(
      analysis.opportunities.begin(), analysis.opportunities.end(),
      [&](const OpportunityAssessment &assessment) {
        return assessment.identity == identity;
      });
  return found == analysis.opportunities.end() ? nullptr : &*found;
}

void requireExactIdentities(
    const OpportunitySetAnalysis &analysis,
    const std::vector<OpportunityIdentity> &expected) {
  require(analysis.opportunities.size() == expected.size(),
          "opportunity truth fixture has no false positives or duplicates");
  for (const auto &identity : expected) {
    require(findAssessment(analysis, identity) != nullptr,
            "opportunity truth fixture has no false negatives");
  }
}

std::string encodeCandidates(const CandidateGrid &candidates) {
  std::ostringstream encoded;
  for (std::size_t index = 0; index < candidates.size(); ++index) {
    if (index > 0) {
      encoded << ',';
    }
    encoded << candidates[index];
  }
  return encoded.str();
}

void testFullHouse() {
  auto board = solvedBoard();
  board[8] = 0;
  const auto result = Engine{}.nextStep(requestFor(board));
  require(result.status == ResultStatus::step, "full house returns a step");
  require(result.step->technique == Technique::fullHouse,
          "full house has highest priority");
  require(result.step->placements == std::vector<Candidate>{{8, 2}},
          "full house places the missing digit");
  require(result.step->focusRegions ==
              std::vector<Region>{{RegionKind::row, 0}},
          "full house deterministically selects the row");
}

void testNakedSingle() {
  Board board{};
  auto request = requestFor(board);
  request.hintCandidates[0] = 1;
  const auto result = Engine{}.nextStep(request);
  require(result.status == ResultStatus::step, "naked single returns a step");
  require(result.step->technique == Technique::nakedSingle,
          "naked single technique is reported");
  require(result.step->placements == std::vector<Candidate>{{0, 1}},
          "naked single places its only candidate");
}

void testHiddenSingle() {
  Board board{};
  auto request = requestFor(board);
  const auto digitOne = static_cast<CandidateMask>(1);
  for (Cell cell = 0; cell < 9; ++cell) {
    if (cell != 4) {
      request.hintCandidates[cell] = static_cast<CandidateMask>(
          request.hintCandidates[cell] & ~digitOne);
    }
  }
  const auto result = Engine{}.nextStep(request);
  require(result.status == ResultStatus::step, "hidden single returns a step");
  require(result.step->technique == Technique::hiddenSingle,
          "hidden single technique is reported");
  require(result.step->placements == std::vector<Candidate>{{4, 1}},
          "hidden single places the unique candidate");
}

void testLocallySimplestHiddenSingle() {
  const Board board{
      0, 0, 5, 7, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 4, 0,
      9, 0, 1, 0, 3, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 5,
      0, 9, 2, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 4, 0, 1, 0, 2, 3, 0,
      0, 1, 0, 5, 0, 0, 4, 0, 0};
  const auto result = Engine{}.nextStep(requestFor(board));
  require(result.status == ResultStatus::step,
          "reported game position returns a hint");
  require(result.step->technique == Technique::hiddenSingle,
          "reported game position uses a hidden single");
  require(result.step->placements == std::vector<Candidate>{{44, 4}},
          "selector chooses the compact R5C9=4 box proof");
  require(result.step->focusRegions ==
              std::vector<Region>{{RegionKind::box, 5}},
          "the selected proof is local to the middle-right box");
  require(result.step->proofSteps.size() == 5,
          "hidden single has observe, three blocker, and conclusion pages");
  require(result.step->proofSteps[1].valueEvidence.size() == 1 &&
              result.step->proofSteps[2].valueEvidence.size() == 1 &&
              result.step->proofSteps[3].valueEvidence.size() == 1,
          "the proof exposes three grouped placed-value blockers");
  std::vector<Cell> explainedCells;
  for (std::size_t index = 1; index < 4; ++index) {
    explainedCells.insert(explainedCells.end(),
                          result.step->proofSteps[index].focusCells.begin(),
                          result.step->proofSteps[index].focusCells.end());
  }
  const auto explainedCount = explainedCells.size();
  std::sort(explainedCells.begin(), explainedCells.end());
  explainedCells.erase(
      std::unique(explainedCells.begin(), explainedCells.end()),
      explainedCells.end());
  require(explainedCells.size() == explainedCount,
          "blocker pages do not repeat already explained cells");
}

void testInvalidConflict() {
  Board board{};
  board[0] = 5;
  board[1] = 5;
  const auto result = Engine{}.nextStep(requestFor(board));
  require(result.status == ResultStatus::invalidBoard,
          "conflicting board is rejected");
  require(result.reason == ResultReason::conflictingDigits,
          "conflict reason is preserved");
}

void testSolved() {
  const auto result = Engine{}.nextStep(requestFor(solvedBoard()));
  require(result.status == ResultStatus::solved,
          "completed valid board is reported as solved");
}

void testInvalidGivenCell() {
  Board board{};
  auto request = requestFor(board);
  request.givenCells[0] = true;
  const auto result = Engine{}.nextStep(request);
  require(result.status == ResultStatus::invalidBoard,
          "an empty cell cannot be marked as a given");
  require(result.reason == ResultReason::invalidGivenCell,
          "invalid given metadata has an explicit reason");
}

void testNoSupportedStep() {
  Board board{};
  const auto result = Engine{}.nextStep(requestFor(board));
  require(result.status == ResultStatus::noSupportedStep,
          "valid state without an implemented technique is explicit");
}

void testFrontierReturnsAllLowestLevelOpportunities() {
  Board board{};
  auto request = requestFor(board);
  request.hintCandidates[0] = 1U;
  request.hintCandidates[10] = 2U;

  const Engine engine;
  const auto frontier = engine.collectFrontierOpportunities(request);
  require(frontier.status == ResultStatus::step,
          "frontier analysis returns applicable opportunities");
  require(frontier.frontierLevel == 1,
          "frontier analysis identifies the lowest non-empty level");
  require(frontier.opportunities.size() >= 2,
          "frontier analysis retains multiple same-level opportunities");
  require(std::all_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return difficultyLevel(step.technique) == 1;
                      }),
          "frontier analysis contains only its reported level");
  require(std::all_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return step.humanCost > 0 && !step.proofSteps.empty();
                      }),
          "every frontier opportunity has ranking cost and teaching proof");
  require(std::any_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return step.placements ==
                               std::vector<Candidate>{{0, 1}};
                      }) &&
              std::any_of(frontier.opportunities.begin(),
                          frontier.opportunities.end(),
                          [](const HintStep &step) {
                            return step.placements ==
                                   std::vector<Candidate>{{10, 2}};
                          }),
          "frontier analysis returns each applicable naked single");

  const auto next = engine.nextStep(request);
  require(next.status == ResultStatus::step &&
              next.step == frontier.opportunities.front(),
          "nextStep selects the first frontier opportunity");

  const auto repeated = engine.collectFrontierOpportunities(request);
  require(repeated.status == frontier.status &&
              repeated.frontierLevel == frontier.frontierLevel &&
              repeated.opportunities == frontier.opportunities,
          "frontier opportunity ordering is deterministic");
}

void testFrontierRetainsCrossTechniqueOpportunities() {
  auto board = solvedBoard();
  board[8] = 0;
  const auto request = requestFor(board);

  const Engine engine;
  const auto frontier = engine.collectFrontierOpportunities(request);
  require(frontier.status == ResultStatus::step &&
              frontier.frontierLevel == 1,
          "single-gap board exposes a level-one frontier");
  require(std::any_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return step.technique == Technique::fullHouse;
                      }),
          "frontier retains the full-house explanation");
  require(std::any_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return step.technique == Technique::nakedSingle;
                      }),
          "frontier retains a same-level naked-single explanation");

  const auto next = engine.nextStep(request);
  require(next.status == ResultStatus::step &&
              next.step == frontier.opportunities.front() &&
              next.step->technique == Technique::fullHouse,
          "nextStep keeps full house as the best cross-technique opportunity");
}

void testFrontierStopsAtLowestNonEmptyLevel() {
  Board board{};
  auto levelTwoRequest = requestFor(board);
  const auto digitOne = static_cast<CandidateMask>(1U);
  for (const Cell cell : std::array<Cell, 6>{9, 10, 11, 18, 19, 20}) {
    levelTwoRequest.hintCandidates[cell] = static_cast<CandidateMask>(
        levelTwoRequest.hintCandidates[cell] & ~digitOne);
  }

  const Engine engine;
  const auto levelTwo = engine.collectFrontierOpportunities(levelTwoRequest);
  require(levelTwo.status == ResultStatus::step &&
              levelTwo.frontierLevel == 2,
          "fixture exposes a level-two opportunity without easier steps");

  auto mixedRequest = levelTwoRequest;
  mixedRequest.hintCandidates[80] =
      static_cast<CandidateMask>(1U << 8U);
  const auto frontier = engine.collectFrontierOpportunities(mixedRequest);
  require(frontier.status == ResultStatus::step &&
              frontier.frontierLevel == 1,
          "a level-one opportunity becomes the mixed fixture frontier");
  require(std::all_of(frontier.opportunities.begin(),
                      frontier.opportunities.end(), [](const HintStep &step) {
                        return difficultyLevel(step.technique) == 1;
                      }),
          "higher-level opportunities are excluded from the frontier");

  auto allDirectSession = engine.startOpportunitySearch(
      mixedRequest, {OpportunitySearchScope::allDirect, 2});
  const auto allDirect = allDirectSession.advance({100});
  require(allDirect.status == OpportunitySearchStatus::complete &&
              allDirect.frontierLevel == 1 &&
              std::any_of(allDirect.opportunities.begin(),
                          allDirect.opportunities.end(),
                          [](const HintStep &step) {
                            return difficultyLevel(step.technique) == 1;
                          }) &&
              std::any_of(allDirect.opportunities.begin(),
                          allDirect.opportunities.end(),
                          [](const HintStep &step) {
                            return difficultyLevel(step.technique) == 2;
                          }),
          "all-direct search retains coexisting opportunities across levels");
}

void testFrontierBoundaryStatuses() {
  const Engine engine;

  Board conflicting{};
  conflicting[0] = 5;
  conflicting[1] = 5;
  const auto invalid =
      engine.collectFrontierOpportunities(requestFor(conflicting));
  require(invalid.status == ResultStatus::invalidBoard &&
              invalid.reason == ResultReason::conflictingDigits &&
              !invalid.frontierLevel && invalid.opportunities.empty(),
          "frontier analysis preserves invalid-board details");

  const auto solved =
      engine.collectFrontierOpportunities(requestFor(solvedBoard()));
  require(solved.status == ResultStatus::solved && !solved.frontierLevel &&
              solved.opportunities.empty(),
          "frontier analysis reports solved boards without opportunities");

  Board board{};
  auto cancelledRequest = requestFor(board);
  std::atomic_bool cancelled{true};
  cancelledRequest.cancelRequested = &cancelled;
  const auto cancelledResult =
      engine.collectFrontierOpportunities(cancelledRequest);
  require(cancelledResult.status == ResultStatus::cancelled &&
              !cancelledResult.frontierLevel &&
              cancelledResult.opportunities.empty(),
          "frontier analysis discards partial work when cancelled");

  const auto noStep = engine.collectFrontierOpportunities(requestFor(board));
  require(noStep.status == ResultStatus::noSupportedStep &&
              !noStep.frontierLevel &&
              noStep.opportunities.empty(),
          "frontier analysis explicitly reports no supported step");
}

void testOpportunitySearchResumesDeterministically() {
  auto board = solvedBoard();
  board[8] = 0;
  const auto request = requestFor(board);
  const OpportunitySearchOptions options{OpportunitySearchScope::allDirect, 2};
  const Engine engine;

  auto oneShotSession = engine.startOpportunitySearch(request, options);
  const auto oneShot = oneShotSession.advance({100});
  require(oneShot.status == OpportunitySearchStatus::complete,
          "one-shot opportunity search completes");
  require(oneShot.workUnitsConsumed == 9 &&
              oneShot.totalWorkUnitsConsumed == 9 &&
              oneShot.techniqueDiagnostics.size() == 9,
          "all-direct level-two search examines exactly nine techniques");
  require(oneShot.frontierLevel == 1 && !oneShot.opportunities.empty(),
          "all-direct search preserves the lowest discovered level");

  auto resumedSession = engine.startOpportunitySearch(request, options);
  const auto noWork = resumedSession.advance({0});
  require(noWork.status == OpportunitySearchStatus::partial &&
              noWork.workUnitsConsumed == 0 &&
              noWork.totalWorkUnitsConsumed == 0 &&
              noWork.opportunities.empty(),
          "zero budget observes a session without advancing it");

  OpportunitySearchBatch resumed = noWork;
  for (const std::uint32_t budget :
       std::array<std::uint32_t, 5>{1, 2, 1, 3, 2}) {
    resumed = resumedSession.advance({budget});
    require(resumed.workUnitsConsumed <= budget,
            "each search step respects its deterministic work budget");
    require(std::all_of(
                resumed.opportunities.begin(), resumed.opportunities.end(),
                [](const HintStep &step) {
                  return step.humanCost > 0 && !step.proofSteps.empty();
                }),
            "every partial search snapshot contains complete opportunities");
  }
  require(resumed.status == OpportunitySearchStatus::complete &&
              resumed.totalWorkUnitsConsumed == 9,
          "chunked opportunity search reaches the same terminal boundary");
  require(resumed.frontierLevel == oneShot.frontierLevel &&
              resumed.techniqueDiagnostics ==
                  oneShot.techniqueDiagnostics &&
              resumed.opportunities == oneShot.opportunities,
          "chunked and one-shot searches produce identical ordered results");

  for (auto current = resumed.opportunities.begin();
       current != resumed.opportunities.end(); ++current) {
    require(std::find(resumed.opportunities.begin(), current, *current) ==
                current,
            "opportunity search does not return duplicate steps");
  }

  const auto repeatedTerminal = resumedSession.advance({10});
  require(repeatedTerminal.status == OpportunitySearchStatus::complete &&
              repeatedTerminal.workUnitsConsumed == 0 &&
              repeatedTerminal.totalWorkUnitsConsumed == 9 &&
              repeatedTerminal.techniqueDiagnostics ==
                  resumed.techniqueDiagnostics &&
              repeatedTerminal.opportunities == resumed.opportunities,
          "a completed search session is idempotent");
}

void testOpportunitySearchPreservesFrontierCompatibility() {
  auto board = solvedBoard();
  board[8] = 0;
  auto request = requestFor(board);
  const auto originalRequest = request;
  const Engine engine;

  auto session = engine.startOpportunitySearch(request);
  request.board = {};
  request.hintCandidates = createCandidates(request.board);

  const auto fullHouseBatch = session.advance({1});
  require(fullHouseBatch.status == OpportunitySearchStatus::partial &&
              fullHouseBatch.workUnitsConsumed == 1 &&
              fullHouseBatch.frontierLevel == 1 &&
              std::all_of(fullHouseBatch.opportunities.begin(),
                          fullHouseBatch.opportunities.end(),
                          [](const HintStep &step) {
                            return step.technique == Technique::fullHouse;
                          }),
          "the first work unit exposes complete full-house opportunities");

  const auto nakedSingleBatch = session.advance({1});
  require(nakedSingleBatch.status == OpportunitySearchStatus::partial &&
              std::any_of(nakedSingleBatch.opportunities.begin(),
                          nakedSingleBatch.opportunities.end(),
                          [](const HintStep &step) {
                            return step.technique == Technique::nakedSingle;
                          }),
          "the next work unit resumes at the next technique");

  const auto complete = session.advance({1});
  const auto frontier = engine.collectFrontierOpportunities(originalRequest);
  require(complete.status == OpportunitySearchStatus::complete &&
              complete.totalWorkUnitsConsumed == 3 &&
              complete.techniqueDiagnostics.size() == 3 &&
              complete.frontierLevel == frontier.frontierLevel &&
              complete.opportunities == frontier.opportunities,
          "resumable frontier search is identical to the compatibility API");
}

void testOpportunitySearchBoundariesAndCancellation() {
  const Engine engine;
  Board board{};
  const auto validRequest = requestFor(board);

  auto invalidOptions = engine.startOpportunitySearch(
      validRequest, {OpportunitySearchScope::frontierOnly, 0});
  const auto invalidOptionsBatch = invalidOptions.advance({10});
  require(invalidOptionsBatch.status ==
                  OpportunitySearchStatus::invalidOptions &&
              invalidOptionsBatch.workUnitsConsumed == 0 &&
              invalidOptionsBatch.opportunities.empty(),
          "invalid search options terminate without running detectors");

  auto invalidLimit = engine.startOpportunitySearch(
      validRequest, {OpportunitySearchScope::allDirect, 5, 256, 0});
  const auto invalidLimitBatch = invalidLimit.advance({10});
  require(invalidLimitBatch.status ==
                  OpportunitySearchStatus::invalidOptions &&
              invalidLimitBatch.workUnitsConsumed == 0 &&
              invalidLimitBatch.techniqueDiagnostics.empty(),
          "zero candidate limits are rejected before detector work");

  auto conflicting = board;
  conflicting[0] = 5;
  conflicting[1] = 5;
  auto invalidBoard =
      engine.startOpportunitySearch(requestFor(conflicting));
  const auto invalidBoardBatch = invalidBoard.advance({10});
  require(invalidBoardBatch.status ==
                  OpportunitySearchStatus::invalidBoard &&
              invalidBoardBatch.reason == ResultReason::conflictingDigits &&
              invalidBoardBatch.workUnitsConsumed == 0,
          "invalid boards preserve their reason without detector work");

  auto solved = engine.startOpportunitySearch(requestFor(solvedBoard()));
  const auto solvedBatch = solved.advance({10});
  require(solvedBatch.status == OpportunitySearchStatus::solved &&
              solvedBatch.workUnitsConsumed == 0 &&
              solvedBatch.opportunities.empty(),
          "solved boards terminate opportunity search immediately");

  auto noOpportunity = engine.startOpportunitySearch(
      validRequest, {OpportunitySearchScope::allDirect, 5});
  const auto noOpportunityBatch = noOpportunity.advance({100});
  require(noOpportunityBatch.status == OpportunitySearchStatus::complete &&
              noOpportunityBatch.workUnitsConsumed ==
                  kTechniqueCatalog.size() &&
              noOpportunityBatch.totalWorkUnitsConsumed ==
                  kTechniqueCatalog.size() &&
              noOpportunityBatch.techniqueDiagnostics.size() ==
                  kTechniqueCatalog.size() &&
              std::none_of(noOpportunityBatch.techniqueDiagnostics.begin(),
                           noOpportunityBatch.techniqueDiagnostics.end(),
                           [](const TechniqueSearchDiagnostic &diagnostic) {
                             return diagnostic.reachedEnumerationLimit;
                           }) &&
              !noOpportunityBatch.frontierLevel &&
              noOpportunityBatch.opportunities.empty(),
          "all-direct search explicitly completes after all 39 detectors");

  auto cancellableBoard = solvedBoard();
  cancellableBoard[8] = 0;
  auto cancellableRequest = requestFor(cancellableBoard);
  std::atomic_bool cancelled{false};
  cancellableRequest.cancelRequested = &cancelled;
  auto cancellable = engine.startOpportunitySearch(cancellableRequest);
  const auto beforeCancellation = cancellable.advance({1});
  require(beforeCancellation.status == OpportunitySearchStatus::partial &&
              !beforeCancellation.opportunities.empty(),
          "a session can publish completed work before cancellation");
  cancelled.store(true, std::memory_order_relaxed);
  const auto afterCancellation = cancellable.advance({10});
  require(afterCancellation.status == OpportunitySearchStatus::cancelled &&
              afterCancellation.workUnitsConsumed == 0 &&
              afterCancellation.totalWorkUnitsConsumed == 1 &&
              !afterCancellation.frontierLevel &&
              afterCancellation.techniqueDiagnostics.empty() &&
              afterCancellation.opportunities.empty(),
          "cancellation terminates without exposing retained partial results");
}

void testOpportunityIdentityAndMaskingAnalysis() {
  const HintStep fullHouseRow{Technique::fullHouse,
                              {8},
                              {{RegionKind::row, 0}},
                              {},
                              {},
                              {{8, 2}}};
  const HintStep fullHouseColumn{Technique::fullHouse,
                                 {8},
                                 {{RegionKind::column, 8}},
                                 {},
                                 {},
                                 {{8, 2}}};
  const HintStep nakedSingle{Technique::nakedSingle,
                             {8},
                             {},
                             {{8, 2}},
                             {},
                             {{8, 2}}};
  const HintStep hiddenSingle{Technique::hiddenSingle,
                              {7},
                              {},
                              {{7, 1}},
                              {},
                              {{7, 1}}};
  const HintStep pointing{Technique::lockedCandidatesPointing,
                          {0, 1},
                          {},
                          {},
                          {{30, 3}, {20, 3}, {30, 3}},
                          {}};
  const HintStep invalid{Technique::xWing, {}, {}, {}, {}, {}};

  const auto analysis = analyzeOpportunitySet(
      {fullHouseRow, fullHouseColumn, fullHouseRow, nakedSingle, hiddenSingle,
       pointing, invalid});
  require(analysis.rawOpportunityCount == 7 &&
              analysis.invalidOpportunityCount == 1 &&
              analysis.duplicateRawOpportunityCount == 1 &&
              analysis.opportunities.size() == 4 &&
              analysis.distinctOutcomeCount == 3 &&
              analysis.ambiguousOutcomeCount == 1 &&
              analysis.effects.size() == 4 &&
              analysis.ambiguousEffectCount == 1 &&
              analysis.crossTechniqueAmbiguousEffectCount == 1 &&
              analysis.selectionOrderConsistent,
          "opportunity analysis separates raw proofs, identities, and outcomes");

  const auto fullHouseIdentity =
      identityFor(Technique::fullHouse, {{8, 2}});
  const auto nakedIdentity =
      identityFor(Technique::nakedSingle, {{8, 2}});
  const auto hiddenIdentity =
      identityFor(Technique::hiddenSingle, {{7, 1}});
  const auto pointingIdentity = identityFor(
      Technique::lockedCandidatesPointing, {}, {{20, 3}, {30, 3}});
  const auto *fullHouse = findAssessment(analysis, fullHouseIdentity);
  const auto *naked = findAssessment(analysis, nakedIdentity);
  const auto *hidden = findAssessment(analysis, hiddenIdentity);
  const auto *locked = findAssessment(analysis, pointingIdentity);
  require(fullHouse != nullptr && fullHouse->proofVariantCount == 2 &&
              fullHouse->selectionState ==
                  OpportunitySelectionState::selected &&
              fullHouse->ambiguousOutcome,
          "same-technique proof variants collapse into the selected identity");
  require(naked != nullptr && naked->ambiguousOutcome &&
              naked->selectionState ==
                  OpportunitySelectionState::maskedByFrontierRanking,
          "same-action techniques form an ambiguous attribution group");
  require(hidden != nullptr && !hidden->ambiguousOutcome &&
              hidden->selectionState ==
                  OpportunitySelectionState::maskedByFrontierRanking,
          "a distinct same-level action is classified as frontier-masked");
  require(locked != nullptr && !locked->ambiguousOutcome &&
              locked->selectionState ==
                  OpportunitySelectionState::maskedByLowerLevel,
          "a higher-level action is classified as lower-level-masked");

  const HintStep xWing{Technique::xWing,
                       {},
                       {},
                       {},
                       {{20, 1}, {21, 1}},
                       {}};
  const HintStep swordfish{Technique::swordfish,
                           {},
                           {},
                           {},
                           {{21, 1}, {22, 1}},
                           {}};
  const auto partialOverlap = analyzeOpportunitySet({xWing, swordfish});
  require(partialOverlap.distinctOutcomeCount == 2 &&
              partialOverlap.ambiguousOutcomeCount == 0 &&
              partialOverlap.effects.size() == 3 &&
              partialOverlap.ambiguousEffectCount == 1 &&
              partialOverlap.crossTechniqueAmbiguousEffectCount == 1,
          "partial action overlap is ambiguous without equal whole outcomes");
}

void testOpportunityEffectAttribution() {
  const HintStep unique{Technique::nakedSingle,
                        {},
                        {},
                        {},
                        {},
                        {{0, 1}}};
  const auto uniqueAnalysis = analyzeOpportunitySet({unique});
  const auto uniqueResult = attributeOpportunityEffect(
      uniqueAnalysis, {OpportunityEffectKind::placement, {0, 1}});
  require(uniqueResult.status ==
                  OpportunityAttributionStatus::uniqueTechnique &&
              uniqueResult.attributedTechnique == Technique::nakedSingle &&
              uniqueResult.matchingOpportunities ==
                  std::vector<OpportunityIdentity>{
                      identityFor(Technique::nakedSingle, {{0, 1}})},
          "one matching identity produces a unique technique candidate");

  const HintStep firstXWing{Technique::xWing,
                            {},
                            {},
                            {},
                            {{20, 1}, {21, 1}},
                            {}};
  const HintStep secondXWing{Technique::xWing,
                             {},
                             {},
                             {},
                             {{21, 1}, {22, 1}},
                             {}};
  const auto sameTechniqueAnalysis =
      analyzeOpportunitySet({firstXWing, secondXWing});
  const auto sameTechniqueResult = attributeOpportunityEffect(
      sameTechniqueAnalysis, {OpportunityEffectKind::elimination, {21, 1}});
  require(
      sameTechniqueResult.status == OpportunityAttributionStatus::
                                        sameTechniqueMultipleOpportunities &&
          sameTechniqueResult.attributedTechnique == Technique::xWing &&
          sameTechniqueResult.matchingOpportunities.size() == 2,
      "one technique with multiple matching opportunities stays attributable");

  const HintStep swordfish{Technique::swordfish,
                           {},
                           {},
                           {},
                           {{21, 1}, {23, 1}},
                           {}};
  const auto crossTechniqueAnalysis =
      analyzeOpportunitySet({firstXWing, swordfish});
  const auto crossTechniqueResult = attributeOpportunityEffect(
      crossTechniqueAnalysis, {OpportunityEffectKind::elimination, {21, 1}});
  require(crossTechniqueResult.status ==
                  OpportunityAttributionStatus::crossTechniqueAmbiguous &&
              !crossTechniqueResult.attributedTechnique &&
              crossTechniqueResult.matchingOpportunities.size() == 2,
          "cross-technique matches conservatively withhold attribution");

  const auto noMatchResult = attributeOpportunityEffect(
      uniqueAnalysis, {OpportunityEffectKind::elimination, {40, 9}});
  require(noMatchResult.status == OpportunityAttributionStatus::noMatch &&
              !noMatchResult.attributedTechnique &&
              noMatchResult.matchingOpportunities.empty(),
          "an effect outside the opportunity set has no match");

  const auto baselineFish = analyzeOpportunitySet({firstXWing});
  const auto sameTechniqueTransitions = compareOpportunityEffectAttribution(
      baselineFish, sameTechniqueAnalysis);
  const auto findTransition = [](const auto &transitions,
                                 OpportunityEffect effect) {
    return std::find_if(
        transitions.begin(), transitions.end(),
        [&](const OpportunityAttributionTransition &transition) {
          return transition.effect == effect;
        });
  };
  const auto sharedXWing = findTransition(
      sameTechniqueTransitions,
      {OpportunityEffectKind::elimination, {21, 1}});
  const auto newXWingEffect = findTransition(
      sameTechniqueTransitions,
      {OpportunityEffectKind::elimination, {22, 1}});
  require(sharedXWing != sameTechniqueTransitions.end() &&
              sharedXWing->baseline.status ==
                  OpportunityAttributionStatus::uniqueTechnique &&
              sharedXWing->comparison.status == OpportunityAttributionStatus::
                                                     sameTechniqueMultipleOpportunities &&
              sharedXWing->techniqueCandidatePreserved,
          "comparison preserves a technique candidate when only its identity count changes");
  require(newXWingEffect != sameTechniqueTransitions.end() &&
              newXWingEffect->baseline.status ==
                  OpportunityAttributionStatus::noMatch &&
              newXWingEffect->comparison.status ==
                  OpportunityAttributionStatus::uniqueTechnique &&
              !newXWingEffect->techniqueCandidatePreserved,
          "comparison explicitly records effects absent from the baseline");

  const auto crossTechniqueTransitions = compareOpportunityEffectAttribution(
      baselineFish, crossTechniqueAnalysis);
  const auto unsafeUnique = findTransition(
      crossTechniqueTransitions,
      {OpportunityEffectKind::elimination, {21, 1}});
  require(unsafeUnique != crossTechniqueTransitions.end() &&
              unsafeUnique->baseline.status ==
                  OpportunityAttributionStatus::uniqueTechnique &&
              unsafeUnique->comparison.status ==
                  OpportunityAttributionStatus::crossTechniqueAmbiguous &&
              !unsafeUnique->techniqueCandidatePreserved,
          "expanded cross-technique evidence invalidates a baseline unique attribution");
}

void testOpportunitySequenceMatching() {
  const OpportunityEffect first{OpportunityEffectKind::elimination, {20, 1}};
  const OpportunityEffect second{OpportunityEffectKind::elimination, {21, 1}};
  const OpportunityEffect alternative{OpportunityEffectKind::elimination,
                                      {22, 1}};
  const OpportunityEffect unrelated{OpportunityEffectKind::placement, {40, 9}};
  const auto playerEffect = [](std::uint64_t revision,
                               OpportunityEffect effect) {
    return OpportunitySequenceEvent{OpportunitySequenceEventKind::playerEffect,
                                    revision, revision + 1U, effect};
  };

  const HintStep twoActionXWing{Technique::xWing,
                                {},
                                {},
                                {},
                                {first.candidate, second.candidate},
                                {}};
  const auto xWingAnalysis = analyzeOpportunitySet({twoActionXWing});
  const auto initial = startOpportunitySequence(xWingAnalysis, 10);
  require(initial.status == OpportunitySequenceStatus::matching &&
              initial.boardRevision == 10 &&
              initial.matchingOpportunities.size() == 1 &&
              initial.matchedEffects.empty() &&
              !initial.attributedTechnique,
          "sequence starts with every normalized identity still eligible");

  const auto partial = advanceOpportunitySequence(initial, playerEffect(10, second));
  require(partial.status == OpportunitySequenceStatus::matching &&
              partial.boardRevision == 11 &&
              partial.matchedEffects == std::vector<OpportunityEffect>{second} &&
              !partial.attributedTechnique,
          "one effect keeps a multi-action outcome partial");
  const auto completed =
      advanceOpportunitySequence(partial, playerEffect(11, first));
  require(completed.status == OpportunitySequenceStatus::completed &&
              completed.boardRevision == 12 &&
              completed.matchedEffects ==
                  std::vector<OpportunityEffect>{first, second} &&
              completed.attributedTechnique == Technique::xWing,
          "all effects complete an outcome independent of action order");
  require(advanceOpportunitySequence(
              completed,
              {OpportunitySequenceEventKind::undo, 12, 13, std::nullopt}) ==
              completed,
          "a completed sequence is an absorbing terminal state");

  const HintStep shortXWing{Technique::xWing,
                            {},
                            {},
                            {},
                            {first.candidate},
                            {}};
  const auto prefixOverlap =
      analyzeOpportunitySet({shortXWing, twoActionXWing});
  const auto sharedPrefix = advanceOpportunitySequence(
      startOpportunitySequence(prefixOverlap, 20), playerEffect(20, first));
  require(sharedPrefix.status == OpportunitySequenceStatus::matching &&
              sharedPrefix.matchingOpportunities.size() == 2 &&
              !sharedPrefix.attributedTechnique,
          "a completed short identity waits while a longer overlap remains");
  const auto resolvedLong =
      advanceOpportunitySequence(sharedPrefix, playerEffect(21, second));
  require(resolvedLong.status == OpportunitySequenceStatus::completed &&
              resolvedLong.matchingOpportunities ==
                  std::vector<OpportunityIdentity>{identityFor(
                      Technique::xWing, {}, {first.candidate, second.candidate})},
          "a later effect resolves overlapping identities without early closure");

  const HintStep longerSwordfish{Technique::swordfish,
                                 {},
                                 {},
                                 {},
                                 {first.candidate, second.candidate},
                                 {}};
  const auto crossTechniqueLengthOverlap =
      analyzeOpportunitySet({shortXWing, longerSwordfish});
  const auto completedPrefix = advanceOpportunitySequence(
      startOpportunitySequence(crossTechniqueLengthOverlap, 25),
      playerEffect(25, first));
  require(completedPrefix.status == OpportunitySequenceStatus::matching &&
              completedPrefix.matchingOpportunities.size() == 2 &&
              !completedPrefix.attributedTechnique,
          "a completed identity waits for a longer cross-technique overlap");
  const auto resolvedCrossTechniqueLength = advanceOpportunitySequence(
      completedPrefix, playerEffect(26, second));
  require(resolvedCrossTechniqueLength.status ==
                  OpportunitySequenceStatus::completed &&
              resolvedCrossTechniqueLength.attributedTechnique ==
                  Technique::swordfish &&
              resolvedCrossTechniqueLength.matchingOpportunities.size() == 1,
          "a later effect safely resolves a longer cross-technique identity");

  const HintStep alternativeSwordfish{
      Technique::swordfish,
      {},
      {},
      {},
      {first.candidate, alternative.candidate},
      {}};
  const auto branching =
      analyzeOpportunitySet({twoActionXWing, alternativeSwordfish});
  const auto branchingPrefix = advanceOpportunitySequence(
      startOpportunitySequence(branching, 30), playerEffect(30, first));
  require(branchingPrefix.status == OpportunitySequenceStatus::matching &&
              branchingPrefix.matchingOpportunities.size() == 2,
          "a shared effect preserves multiple overlapping technique identities");
  const auto resolvedBranch =
      advanceOpportunitySequence(branchingPrefix, playerEffect(31, second));
  require(resolvedBranch.status == OpportunitySequenceStatus::completed &&
              resolvedBranch.attributedTechnique == Technique::xWing &&
              resolvedBranch.matchingOpportunities.size() == 1,
          "a discriminating effect resolves an overlapping technique branch");

  const HintStep sameOutcomeSwordfish{Technique::swordfish,
                                      {},
                                      {},
                                      {},
                                      {first.candidate, second.candidate},
                                      {}};
  const auto ambiguousAnalysis =
      analyzeOpportunitySet({twoActionXWing, sameOutcomeSwordfish});
  const auto ambiguousPartial = advanceOpportunitySequence(
      startOpportunitySequence(ambiguousAnalysis, 40), playerEffect(40, first));
  const auto ambiguous =
      advanceOpportunitySequence(ambiguousPartial, playerEffect(41, second));
  require(ambiguous.status == OpportunitySequenceStatus::ambiguous &&
              ambiguous.matchingOpportunities.size() == 2 &&
              !ambiguous.attributedTechnique,
          "a fully matched cross-technique outcome closes as ambiguous");

  const auto unrelatedState = advanceOpportunitySequence(
      partial, playerEffect(11, unrelated));
  require(unrelatedState.status == OpportunitySequenceStatus::superseded &&
              unrelatedState.matchingOpportunities.empty() &&
              !unrelatedState.attributedTechnique,
          "an unrelated player effect supersedes a partial sequence");
  const auto boardChange = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::boardChange, 10, 11, std::nullopt});
  require(boardChange.status == OpportunitySequenceStatus::superseded,
          "an unclassified board change explicitly supersedes a sequence");

  const auto revisionJump = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::playerEffect, 10, 12, first});
  const auto staleRevision = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::playerEffect, 9, 10, first});
  require(revisionJump.status ==
                  OpportunitySequenceStatus::revisionInvalidated &&
              staleRevision.status ==
                  OpportunitySequenceStatus::revisionInvalidated &&
              revisionJump.matchedEffects.empty() &&
              staleRevision.matchedEffects.empty(),
          "missing or stale revisions invalidate without accepting an effect");

  const auto hintViewed = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::hintViewed, 10, 10, std::nullopt});
  const auto hintApplied = advanceOpportunitySequence(
      partial,
      {OpportunitySequenceEventKind::hintApplied, 11, 12, std::nullopt});
  const auto undone = advanceOpportunitySequence(
      partial, {OpportunitySequenceEventKind::undo, 11, 12, std::nullopt});
  require(hintViewed.status == OpportunitySequenceStatus::hintPolluted &&
              hintApplied.status == OpportunitySequenceStatus::hintPolluted &&
              undone.status == OpportunitySequenceStatus::undoPolluted &&
              !hintViewed.attributedTechnique &&
              !hintApplied.attributedTechnique && !undone.attributedTechnique,
          "viewed or applied hints and undo terminate without attribution");

  const auto missingEffect = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::playerEffect, 10, 11, std::nullopt});
  const auto duplicateEffect =
      advanceOpportunitySequence(partial, playerEffect(11, second));
  const auto effectOnHint = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::hintViewed, 10, 10, first});
  const auto invalidEffectKind = advanceOpportunitySequence(
      initial,
      {OpportunitySequenceEventKind::playerEffect,
       10,
       11,
       OpportunityEffect{static_cast<OpportunityEffectKind>(99), {20, 1}}});
  require(missingEffect.status == OpportunitySequenceStatus::invalidInput &&
              duplicateEffect.status == OpportunitySequenceStatus::invalidInput &&
              effectOnHint.status == OpportunitySequenceStatus::invalidInput &&
              invalidEffectKind.status ==
                  OpportunitySequenceStatus::invalidInput,
          "missing, duplicate, or misplaced effects are invalid inputs");

  const auto empty = startOpportunitySequence({}, 50);
  require(empty.status == OpportunitySequenceStatus::superseded &&
              empty.matchingOpportunities.empty(),
          "an empty opportunity set starts in a conservative terminal state");
}

void testMinimumCostOpportunityExplanation() {
  auto request = requestFor(Board{});
  const OpportunityEffect placement{OpportunityEffectKind::placement, {0, 3}};
  const OpportunityEffect firstElimination{OpportunityEffectKind::elimination,
                                            {0, 4}};
  const OpportunityEffect secondElimination{
      OpportunityEffectKind::elimination, {0, 5}};

  HintStep nakedSingle{Technique::nakedSingle, {}, {}, {}, {}, {{0, 3}}};
  nakedSingle.humanCost = 120;
  HintStep hiddenSingle{Technique::hiddenSingle, {}, {}, {}, {}, {{0, 3}}};
  hiddenSingle.humanCost = 140;
  const auto direct = explainOpportunityEffects(
      request, {hiddenSingle, nakedSingle}, {placement}, true);
  require(direct.status == OpportunityExplanationStatus::matched &&
              direct.automaticTechnique == Technique::nakedSingle &&
              direct.candidates.size() == 2 &&
              direct.candidates[0].technique == Technique::nakedSingle &&
              direct.candidates[0].directPlacementMatch &&
              !direct.candidates[0].oneHopPlacementMatch,
          "direct placement keeps alternatives and selects minimum cost");

  HintStep xWing{Technique::xWing,
                 {},
                 {},
                 {},
                 {firstElimination.candidate, {10, 4}},
                 {}};
  xWing.humanCost = 3070;
  HintStep swordfish{Technique::swordfish,
                     {},
                     {},
                     {},
                     {firstElimination.candidate, {20, 4}},
                     {}};
  swordfish.humanCost = 4060;
  const auto partialElimination = explainOpportunityEffects(
      request, {swordfish, xWing}, {firstElimination}, true);
  require(partialElimination.status == OpportunityExplanationStatus::matched &&
              partialElimination.automaticTechnique == Technique::xWing &&
              partialElimination.candidates.size() == 2,
          "one observed elimination is evidence rather than a full checklist");

  request.hintCandidates[0] =
      static_cast<CandidateMask>((1U << 2U) | (1U << 3U) | (1U << 4U));
  HintStep eliminationTechnique{
      Technique::xWing,
      {},
      {},
      {},
      {firstElimination.candidate, secondElimination.candidate},
      {}};
  eliminationTechnique.humanCost = 3072;
  const auto directMentalShortcut = explainOpportunityEffects(
      request, {eliminationTechnique}, {placement}, true);
  require(directMentalShortcut.status == OpportunityExplanationStatus::matched &&
              directMentalShortcut.automaticTechnique == Technique::xWing &&
              directMentalShortcut.candidates[0].oneHopPlacementMatch &&
              !directMentalShortcut.candidates[0].directPlacementMatch,
          "unperformed eliminations can explain their immediate placement");

  const auto eliminatedThenPlaced = explainOpportunityEffects(
      request, {eliminationTechnique},
      {firstElimination, secondElimination, placement}, true);
  require(eliminatedThenPlaced.status == OpportunityExplanationStatus::matched &&
              eliminatedThenPlaced.automaticTechnique == Technique::xWing,
          "all explicit eliminations and the resulting placement form one explanation");

  const auto partlyEliminatedThenPlaced = explainOpportunityEffects(
      request, {eliminationTechnique}, {firstElimination, placement}, true);
  require(partlyEliminatedThenPlaced.status ==
                  OpportunityExplanationStatus::matched &&
              partlyEliminatedThenPlaced.automaticTechnique ==
                  Technique::xWing,
          "partial explicit eliminations can precede the same immediate placement");

  HintStep nonClosingTechnique{Technique::xWing,
                               {},
                               {},
                               {},
                               {secondElimination.candidate},
                               {}};
  nonClosingTechnique.humanCost = 3071;
  const auto noRecursiveClosure = explainOpportunityEffects(
      request, {nonClosingTechnique}, {placement}, true);
  require(noRecursiveClosure.status == OpportunityExplanationStatus::noMatch &&
              !noRecursiveClosure.automaticTechnique,
          "one-hop closure does not search a future elimination chain");

  auto preexistingSingleRequest = requestFor(Board{});
  preexistingSingleRequest.hintCandidates[0] =
      static_cast<CandidateMask>(1U << 2U);
  HintStep unrelatedElimination{Technique::xWing,
                                {},
                                {},
                                {},
                                {{1, 4}},
                                {}};
  unrelatedElimination.humanCost = 3070;
  const auto preexistingSingle = explainOpportunityEffects(
      preexistingSingleRequest, {unrelatedElimination}, {placement}, true);
  require(preexistingSingle.status == OpportunityExplanationStatus::noMatch,
          "a pre-existing single is not attributed to an unrelated elimination");

  auto hiddenRequest = requestFor(Board{});
  for (Cell cell = 1; cell < 8; ++cell) {
    hiddenRequest.hintCandidates[cell] = static_cast<CandidateMask>(
        hiddenRequest.hintCandidates[cell] & ~(1U << 5U));
  }
  HintStep hiddenClosure{Technique::lockedCandidatesPointing,
                         {},
                         {},
                         {},
                         {{8, 6}},
                         {}};
  hiddenClosure.humanCost = 2050;
  const auto hiddenPlacement = explainOpportunityEffects(
      hiddenRequest, {hiddenClosure},
      {{OpportunityEffectKind::placement, {0, 6}}}, true);
  require(hiddenPlacement.status == OpportunityExplanationStatus::matched &&
              hiddenPlacement.candidates[0].oneHopPlacementMatch,
          "one-hop closure includes a newly created hidden single");

  HintStep nakedTriple{Technique::nakedTriple,
                       {},
                       {},
                       {},
                       {firstElimination.candidate},
                       {}};
  nakedTriple.humanCost = 3000;
  xWing.humanCost = 3000;
  const auto stableTie = explainOpportunityEffects(
      request, {xWing, nakedTriple}, {firstElimination}, true);
  require(stableTie.automaticTechnique == Technique::nakedTriple &&
              stableTie.candidates[0].technique == Technique::nakedTriple &&
              stableTie.candidates[1].technique == Technique::xWing,
          "equal human cost uses stable technique catalog order");

  const auto incomplete = explainOpportunityEffects(
      request, {nakedTriple}, {firstElimination}, false);
  require(incomplete.status ==
                  OpportunityExplanationStatus::incompleteOpportunitySet &&
              incomplete.candidates.empty() && !incomplete.automaticTechnique,
          "an incomplete opportunity set abstains before minimum-cost selection");

  const auto invalidOrder = explainOpportunityEffects(
      request, {eliminationTechnique}, {placement, firstElimination}, true);
  const auto duplicate = explainOpportunityEffects(
      request, {eliminationTechnique},
      {firstElimination, firstElimination}, true);
  const auto eliminatedPlacement = explainOpportunityEffects(
      request, {eliminationTechnique},
      {firstElimination,
       {OpportunityEffectKind::placement, firstElimination.candidate}},
      true);
  require(invalidOrder.status == OpportunityExplanationStatus::invalidInput &&
              duplicate.status == OpportunityExplanationStatus::invalidInput &&
              eliminatedPlacement.status ==
                  OpportunityExplanationStatus::invalidInput,
          "placement order, duplicate effects, and eliminated values are invalid");
}

void testOpportunityGroundTruthFixtures() {
  const Engine engine;

  auto singleGapBoard = solvedBoard();
  singleGapBoard[8] = 0;
  auto singleGapSession = engine.startOpportunitySearch(
      requestFor(singleGapBoard), {OpportunitySearchScope::allDirect, 1});
  const auto singleGapBatch = singleGapSession.advance({10});
  const auto singleGap = analyzeOpportunitySet(singleGapBatch.opportunities);
  const auto commonPlacement = std::vector<Candidate>{{8, 2}};
  requireExactIdentities(
      singleGap,
      {identityFor(Technique::fullHouse, commonPlacement),
       identityFor(Technique::nakedSingle, commonPlacement),
       identityFor(Technique::hiddenSingle, commonPlacement)});
  require(singleGap.rawOpportunityCount == 7 &&
              singleGap.distinctOutcomeCount == 1 &&
              singleGap.ambiguousOutcomeCount == 1 &&
              singleGap.effects.size() == 1 &&
              singleGap.crossTechniqueAmbiguousEffectCount == 1 &&
              singleGap.selectedOpportunity ==
                  identityFor(Technique::fullHouse, commonPlacement) &&
              findAssessment(singleGap,
                             identityFor(Technique::fullHouse,
                                         commonPlacement))
                      ->proofVariantCount == 3 &&
              findAssessment(singleGap,
                             identityFor(Technique::hiddenSingle,
                                         commonPlacement))
                      ->proofVariantCount == 3,
          "single-gap truth fixture exposes three ambiguous techniques and seven proofs");

  Board twoSinglesBoard{};
  auto twoSinglesRequest = requestFor(twoSinglesBoard);
  twoSinglesRequest.hintCandidates[0] = 1U;
  twoSinglesRequest.hintCandidates[10] = 2U;
  auto twoSinglesSession = engine.startOpportunitySearch(
      twoSinglesRequest, {OpportunitySearchScope::allDirect, 1});
  const auto twoSinglesBatch = twoSinglesSession.advance({10});
  const auto twoSingles = analyzeOpportunitySet(twoSinglesBatch.opportunities);
  requireExactIdentities(
      twoSingles,
      {identityFor(Technique::nakedSingle, {{0, 1}}),
       identityFor(Technique::nakedSingle, {{10, 2}})});
  require(twoSingles.rawOpportunityCount == 2 &&
              twoSingles.distinctOutcomeCount == 2 &&
              twoSingles.ambiguousOutcomeCount == 0 &&
              twoSingles.effects.size() == 2 &&
              twoSingles.ambiguousEffectCount == 0,
          "two-single truth fixture preserves two independent opportunities");

  Board crossLevelBoard{};
  auto crossLevelRequest = requestFor(crossLevelBoard);
  constexpr CandidateMask digitOne = 1U;
  for (const Cell cell :
       std::array<Cell, 7>{2, 9, 10, 11, 18, 19, 20}) {
    crossLevelRequest.hintCandidates[cell] = static_cast<CandidateMask>(
        crossLevelRequest.hintCandidates[cell] & ~digitOne);
  }
  crossLevelRequest.hintCandidates[80] =
      static_cast<CandidateMask>(1U << 8U);
  auto crossLevelSession = engine.startOpportunitySearch(
      crossLevelRequest, {OpportunitySearchScope::allDirect, 2});
  const auto crossLevelBatch = crossLevelSession.advance({20});
  const auto crossLevel = analyzeOpportunitySet(crossLevelBatch.opportunities);
  const auto pointingIdentity = identityFor(
      Technique::lockedCandidatesPointing, {},
      {{3, 1}, {4, 1}, {5, 1}, {6, 1}, {7, 1}, {8, 1}});
  requireExactIdentities(
      crossLevel,
      {identityFor(Technique::nakedSingle, {{80, 9}}), pointingIdentity});
  const auto *pointing = findAssessment(crossLevel, pointingIdentity);
  require(crossLevel.rawOpportunityCount == 2 &&
              crossLevel.distinctOutcomeCount == 2 &&
              crossLevel.ambiguousOutcomeCount == 0 && pointing != nullptr &&
              crossLevel.effects.size() == 7 &&
              crossLevel.ambiguousEffectCount == 0 &&
              pointing->selectionState ==
                  OpportunitySelectionState::maskedByLowerLevel,
          "cross-level truth fixture identifies a valid masked pointing move");
}

void testCancellation() {
  Board board{};
  auto request = requestFor(board);
  std::atomic_bool cancelled{true};
  request.cancelRequested = &cancelled;
  const auto result = Engine{}.nextStep(request);
  require(result.status == ResultStatus::cancelled,
          "a cancelled request has an explicit status");
  require(!result.step, "a cancelled request never returns a partial step");
}

void testDeterminism() {
  Board board{};
  auto request = requestFor(board);
  request.hintCandidates[10] = static_cast<CandidateMask>(1U << 5U);
  const auto first = Engine{}.nextStep(request);
  const auto second = Engine{}.nextStep(request);
  require(first.status == second.status && first.step == second.step,
          "identical state returns identical step");
}

void testTechniqueContract() {
  require(techniqueCode(Technique::lockedCandidatesPointing) ==
              "lockedCandidates.pointing",
          "C++ technique code matches the TypeScript contract");
  require(difficultyLevel(Technique::forcingNet) == 5,
          "technique level is available without UI dependencies");
}

void testBridgeContract() {
  auto board = solvedBoard();
  board[8] = 0;
  std::string fingerprint;
  fingerprint.reserve(kCellCount);
  for (const Digit value : board) {
    fingerprint.push_back(static_cast<char>('0' + value));
  }

  const std::string json =
      nextStepJson(fingerprint, encodeCandidates(createCandidates(board)));
  require(hasBalancedJsonStructure(json),
          "bridge returns structurally complete JSON");
  require(json.ends_with("}}}"),
          "bridge closes explanation parameters, step, and result objects");
  require(json.find("\"status\":\"step\"") != std::string::npos,
          "bridge serializes a successful step");
  require(json.find("\"techniqueCode\":\"fullHouse\"") !=
              std::string::npos,
          "bridge preserves the stable technique code");
  require(json.find("\"placements\":[{\"cell\":8,\"digit\":2}]") !=
              std::string::npos,
          "bridge serializes the atomic placement");
  require(json.find("\"resultCount\":1") != std::string::npos &&
              json.find("\"placements\":\"8:2\"") != std::string::npos,
          "bridge serializes localizable explanation parameters");
  require(json.find("\"proofSteps\":[") != std::string::npos &&
              json.find("\"humanCost\":") != std::string::npos,
          "bridge serializes the teaching proof and ranking score");

  const std::string explanation = opportunityExplanationJson(
      fingerprint, encodeCandidates(createCandidates(board)), {}, "p:8:2");
  require(hasBalancedJsonStructure(explanation) &&
              explanation.find("\"status\":\"matched\"") !=
                  std::string::npos &&
              explanation.find("\"technique\":\"fullHouse\"") !=
                  std::string::npos &&
              explanation.find("\"opportunitySetComplete\":true") !=
                  std::string::npos &&
              explanation.find("\"usedExpandedSearch\":false") !=
                  std::string::npos,
          "behavior bridge exposes the existing minimum-cost candidates");
  const std::string malformedEffects = opportunityExplanationJson(
      fingerprint, encodeCandidates(createCandidates(board)), {}, "x:8:2");
  require(malformedEffects.find("\"status\":\"invalid_input\"") !=
              std::string::npos,
          "behavior bridge rejects malformed normalized effects");

  const std::string malformed = nextStepJson("123", "0");
  require(malformed.find("\"status\":\"invalid_board\"") !=
              std::string::npos,
          "bridge rejects malformed requests without throwing");

  std::atomic_bool cancelled{true};
  const std::string cancelledJson = nextStepJson(
      fingerprint, encodeCandidates(createCandidates(board)), {}, &cancelled);
  require(cancelledJson.find("\"status\":\"cancelled\"") !=
              std::string::npos,
          "bridge exposes cancellation to both platforms");
  const std::string cancelledExplanation = opportunityExplanationJson(
      fingerprint, encodeCandidates(createCandidates(board)), {}, "p:8:2",
      &cancelled);
  require(cancelledExplanation.find("\"status\":\"cancelled\"") !=
              std::string::npos,
          "behavior bridge exposes cancellation to both platforms");
}

} // namespace

int main() {
  testFullHouse();
  testNakedSingle();
  testHiddenSingle();
  testLocallySimplestHiddenSingle();
  testInvalidConflict();
  testSolved();
  testInvalidGivenCell();
  testNoSupportedStep();
  testFrontierReturnsAllLowestLevelOpportunities();
  testFrontierRetainsCrossTechniqueOpportunities();
  testFrontierStopsAtLowestNonEmptyLevel();
  testFrontierBoundaryStatuses();
  testOpportunitySearchResumesDeterministically();
  testOpportunitySearchPreservesFrontierCompatibility();
  testOpportunitySearchBoundariesAndCancellation();
  testOpportunityIdentityAndMaskingAnalysis();
  testOpportunityEffectAttribution();
  testOpportunitySequenceMatching();
  testMinimumCostOpportunityExplanation();
  testOpportunityGroundTruthFixtures();
  testCancellation();
  testDeterminism();
  testTechniqueContract();
  testBridgeContract();
  std::cout << "hsp_hint_core: all tests passed\n";
  return EXIT_SUCCESS;
}
