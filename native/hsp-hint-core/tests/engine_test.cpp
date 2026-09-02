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
              oneShot.totalWorkUnitsConsumed == 9,
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
              afterCancellation.opportunities.empty(),
          "cancellation terminates without exposing retained partial results");
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
  testCancellation();
  testDeterminism();
  testTechniqueContract();
  testBridgeContract();
  std::cout << "hsp_hint_core: all tests passed\n";
  return EXIT_SUCCESS;
}
