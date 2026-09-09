#include "lab_fixture_coverage.hpp"
#include <cstdlib>
#include <iostream>

using namespace hsp::hint_core;
using namespace hsp::hint_core::tests::lab;

void require(bool condition, const char *message) {
  if (!condition) { std::cerr << message << '\n'; std::exit(EXIT_FAILURE); }
}

int main() {
  const std::string text = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
  Board solution{};
  for (Cell cell = 0; cell < kCellCount; ++cell) solution[cell] = static_cast<Digit>(text[cell] - '0');
  auto puzzle = solution;
  puzzle[0] = 0;
  HintRequest request{puzzle, createCandidates(puzzle)};
  for (Cell cell = 0; cell < kCellCount; ++cell) request.givenCells[cell] = puzzle[cell] != 0;
  require(validateSource(puzzle, solution, request, {}).empty(), "unique initial state rejected");
  require(inspectLowerFrontier(request, Technique::fullHouse).status == FrontierStatus::stalled,
          "foundation should have no lower rule");
  require(inspectLowerFrontier(request, Technique::nakedSingle).status == FrontierStatus::available,
          "full house must block naked single");
  require(inspectLowerFrontier(request, Technique::jellyfish).first.has_value(),
          "lower single must block advanced fixture");
  auto tampered = request;
  tampered.hintCandidates[0] = 1;
  require(validateSource(puzzle, solution, tampered, {}) == std::vector<std::string>{"unreachable_candidate_state"},
          "arbitrary candidates accepted");
  tampered = request;
  tampered.givenCells[1] = false;
  require(!validateSource(puzzle, solution, tampered, {}).empty(), "given mutation accepted");
  const auto step = detail::detectTechnique(request, Technique::fullHouse);
  require(step.has_value(), "missing replay move");
  require(validateTarget(request, *step, solution).empty(), "valid target rejected");
  auto forged = *step;
  forged.placements.front().digit = 1;
  require(!validateTarget(request, forged, solution).empty(), "forged target accepted");
  auto replay = request;
  require(applyVerifiedStep(replay, *step, solution), "valid step rejected");
  require(validateSource(puzzle, solution, replay, {*step}).empty(), "valid replay rejected");
  require(!validateSource(puzzle, solution, replay, {}).empty(), "missing replay history accepted");
  Board empty{};
  require(solutionCount(empty) == 2, "multiple solutions not detected");
  HintRequest multiple{empty, createCandidates(empty)};
  require(validateSource(empty, solution, multiple, {}) == std::vector<std::string>{"puzzle_not_unique"},
          "nonunique source accepted");
  auto invalid = solution;
  invalid[0] = invalid[1];
  require(!validBoard(invalid), "duplicate digit accepted");
  std::atomic_bool cancelled{true};
  request.cancelRequested = &cancelled;
  require(inspectLowerFrontier(request, Technique::jellyfish).status == FrontierStatus::incomplete,
          "cancellation incorrectly proves absence");
  const auto locked = lowerTechniques(Technique::lockedPair);
  require(std::find(locked.begin(), locked.end(), Technique::nakedPair) == locked.end(),
          "equivalent locked pair excluded by alias");
  const auto quad = lowerTechniques(Technique::nakedQuad);
  require(std::find(quad.begin(), quad.end(), Technique::nakedTriple) != quad.end(),
          "same level subset relation missing");
  HintStep pair{};
  pair.technique = Technique::nakedPair;
  pair.focusCells = {0, 9};
  pair.focusRegions = {{RegionKind::row, 0}, {RegionKind::row, 1}, {RegionKind::column, 0}, {RegionKind::box, 0}};
  pair.eliminations = {{27, 5}};
  require(classifyCoverage(request, pair).layouts == std::vector<std::string>{"column"},
          "subset coverage falsely claims incidental row/box");
  HintRequest wingRequest{};
  wingRequest.hintCandidates[0] = 3; // 1,2 pivot
  wingRequest.hintCandidates[3] = 5; // 1,3 row wing
  wingRequest.hintCandidates[27] = 6; // 2,3 column wing
  HintStep wing{};
  wing.technique = Technique::xyWing;
  wing.focusCells = {0, 3, 27};
  wing.eliminations = {{30, 3}};
  const auto wingCoverage = classifyCoverage(wingRequest, wing);
  require(std::find(wingCoverage.layouts.begin(), wingCoverage.layouts.end(), "row-column") != wingCoverage.layouts.end(),
          "cross-box XY pivot topology missing");
  require(std::find(wingCoverage.layouts.begin(), wingCoverage.layouts.end(), "box-line") == wingCoverage.layouts.end(),
          "cross-box XY pivot falsely classified box-line");
  HintStep rectangle{};
  rectangle.technique = Technique::uniqueRectangle;
  rectangle.focusCells = {0, 3, 9, 12};
  rectangle.eliminations = {{12, 1}};
  const auto rectangleCoverage = classifyCoverage(wingRequest, rectangle);
  require(std::find(rectangleCoverage.layouts.begin(), rectangleCoverage.layouts.end(), "corner-bottom-right") != rectangleCoverage.layouts.end(),
          "rectangle target corner missing");
  HintRequest fishRequest{};
  for (const Cell cell : std::vector<Cell>{0, 1, 10, 11, 18, 20, 21, 28, 29, 30}) fishRequest.hintCandidates[cell] = 1;
  HintStep fish{};
  fish.technique = Technique::jellyfish;
  fish.focusRegions = {{RegionKind::row, 0}, {RegionKind::row, 1}, {RegionKind::row, 2}, {RegionKind::row, 3}};
  fish.eliminations = {{36, 1}};
  const auto sparseFish = classifyCoverage(fishRequest, fish);
  require(std::find(sparseFish.layouts.begin(), sparseFish.layouts.end(), "sparse") != sparseFish.layouts.end(),
          "ten-node Jellyfish must be in the sparse teaching band");
  require(std::find(sparseFish.layouts.begin(), sparseFish.layouts.end(), "minimum-density") == sparseFish.layouts.end(),
          "ten-node Jellyfish must not claim the eight-node extremum");
  for (const Cell cell : std::vector<Cell>{2, 12, 27}) fishRequest.hintCandidates[cell] = 1;
  const auto denseFish = classifyCoverage(fishRequest, fish);
  require(std::find(denseFish.layouts.begin(), denseFish.layouts.end(), "mixed-density") != denseFish.layouts.end(),
          "thirteen-node Jellyfish must be in the denser teaching band");
  std::cout << "Hint Lab validation policy tests passed\n";
}
