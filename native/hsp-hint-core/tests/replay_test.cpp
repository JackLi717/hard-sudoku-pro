#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <algorithm>
#include <array>
#include <cstdlib>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace hsp::hint_core;

namespace {

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

std::vector<std::string> split(const std::string &line) {
  std::vector<std::string> fields;
  std::stringstream stream(line);
  std::string field;
  while (std::getline(stream, field, ',')) {
    fields.push_back(field);
  }
  return fields;
}

bool applyStep(HintRequest &request, const HintStep &step,
               const Board &solution, std::string &failure) {
  for (const auto elimination : step.eliminations) {
    if (solution[elimination.cell] == elimination.digit) {
      failure = "eliminated the solution candidate";
      return false;
    }
    request.hintCandidates[elimination.cell] = static_cast<CandidateMask>(
        request.hintCandidates[elimination.cell] & ~
        (1U << (elimination.digit - 1U)));
    if (request.hintCandidates[elimination.cell] == 0) {
      failure = "emptied a candidate set";
      return false;
    }
  }
  for (const auto placement : step.placements) {
    if (solution[placement.cell] != placement.digit) {
      failure = "placed a digit different from the solution";
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
          failure = "placement emptied a peer candidate set";
          return false;
        }
      }
    }
  }
  return true;
}

bool stepIsSolutionSafe(const HintStep &step, const Board &solution) {
  if (step.eliminations.empty() == step.placements.empty()) {
    return false;
  }
  for (const auto candidate : step.eliminations) {
    if (solution[candidate.cell] == candidate.digit) {
      return false;
    }
  }
  for (const auto candidate : step.placements) {
    if (solution[candidate.cell] != candidate.digit) {
      return false;
    }
  }
  return !step.focusCells.empty() &&
         (!step.focusRegions.empty() || !step.premises.empty());
}

HintRequest consumeDirectAction(HintRequest request, const HintStep &step) {
  for (const auto candidate : step.eliminations) {
    request.hintCandidates[candidate.cell] = static_cast<CandidateMask>(
        request.hintCandidates[candidate.cell] &
        ~(1U << (candidate.digit - 1U)));
  }
  for (const auto candidate : step.placements) {
    request.board[candidate.cell] = candidate.digit;
    request.hintCandidates[candidate.cell] = 0;
  }
  return request;
}

} // namespace

int main(int argc, char **argv) {
  if (argc < 2 || argc > 5) {
    std::cerr << "usage: replay_test puzzles.csv [expected-count] "
                 "[random-samples-per-puzzle] "
                 "[runtime-technique-usage.csv]\n";
    return EXIT_FAILURE;
  }
  const auto expectedCount = argc >= 3 ? std::stoi(argv[2]) : 0;
  const auto randomSamplesPerPuzzle = argc >= 4 ? std::stoi(argv[3]) : 10;
  if (expectedCount < 0 || randomSamplesPerPuzzle < 0) {
    std::cerr << "counts cannot be negative\n";
    return EXIT_FAILURE;
  }
  std::ifstream input(argv[1]);
  if (!input) {
    std::cerr << "could not open replay corpus\n";
    return EXIT_FAILURE;
  }
  std::ofstream coverageOutput;
  if (argc >= 5) {
    coverageOutput.open(argv[4]);
    if (!coverageOutput) {
      std::cerr << "could not open runtime technique coverage output\n";
      return EXIT_FAILURE;
    }
    coverageOutput << "puzzle_id,technique_code,use_count\n";
  }
  std::string line;
  std::getline(input, line);
  int puzzleCount = 0;
  int totalSteps = 0;
  int randomizedStates = 0;
  std::uint32_t randomState = 0x48535031U;
  std::array<int, kTechniqueCatalog.size()> techniqueCounts{};
  std::array<int, kTechniqueCatalog.size()> positiveCoverage{};
  std::array<int, kTechniqueCatalog.size()> negativeCoverage{};
  std::array<int, kTechniqueCatalog.size()> resultCoverage{};
  std::array<std::vector<double>, 6> latencyByLevel;
  while (std::getline(input, line)) {
    const auto fields = split(line);
    if (fields.size() < 3) {
      std::cerr << "malformed replay row\n";
      return EXIT_FAILURE;
    }
    const auto solution = parseBoard(fields[2]);
    if (puzzleCount == 0) {
      HintRequest negative{solution, createCandidates(solution)};
      negative.givenCells.fill(true);
      for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
        if (detail::detectTechnique(negative,
                                    kTechniqueCatalog[index].technique)) {
          std::cerr << "solved-board negative fixture produced "
                    << kTechniqueCatalog[index].code << '\n';
          return EXIT_FAILURE;
        }
        negativeCoverage[index] = 1;
      }
    }
    HintRequest request{parseBoard(fields[1]), {}};
    std::array<int, kTechniqueCatalog.size()> puzzleTechniqueCounts{};
    request.hintCandidates = createCandidates(request.board);
    for (Cell cell = 0; cell < kCellCount; ++cell) {
      request.givenCells[cell] = request.board[cell] != 0;
    }
    bool solved = false;
    for (int iteration = 0; iteration < 1000; ++iteration) {
      const auto started = std::chrono::steady_clock::now();
      const auto first = Engine{}.nextStep(request);
      const auto elapsed = std::chrono::duration<double, std::milli>(
          std::chrono::steady_clock::now() - started);
      const auto second = Engine{}.nextStep(request);
      for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
        if (positiveCoverage[index] == 0) {
          const auto direct = detail::detectTechnique(
              request, kTechniqueCatalog[index].technique);
          if (direct) {
            auto taught = *direct;
            detail::addTeachingProof(request, taught);
            const auto repeated = detail::detectTechnique(
                request, kTechniqueCatalog[index].technique);
            const auto nearMiss = detail::detectTechnique(
                consumeDirectAction(request, *direct),
                kTechniqueCatalog[index].technique);
            if (direct != repeated || nearMiss == direct ||
                taught.humanCost == 0 || taught.proofSteps.size() < 2 ||
                taught.proofSteps.front().kind != ProofKind::observe ||
                taught.proofSteps.back().kind != ProofKind::conclusion ||
                !stepIsSolutionSafe(*direct, solution)) {
              std::cerr << fields[0] << ": unsafe or nondeterministic direct "
                        << kTechniqueCatalog[index].code << " detector\n";
              return EXIT_FAILURE;
            }
            positiveCoverage[index] = 1;
            resultCoverage[index] = stepIsSolutionSafe(*direct, solution) ? 1 : 0;
          }
        }
      }
      if (first.status != second.status || first.reason != second.reason ||
          first.step != second.step) {
        std::cerr << fields[0] << ": nondeterministic result\n";
        return EXIT_FAILURE;
      }
      if (first.status == ResultStatus::solved) {
        solved = true;
        break;
      }
      if (first.status != ResultStatus::step || !first.step) {
        std::cerr << fields[0] << ": stalled after " << iteration
                  << " steps at level " << fields[3] << '\n';
        std::cerr << "board=";
        for (const auto digit : request.board) {
          std::cerr << static_cast<int>(digit);
        }
        std::cerr << "\ncandidates=";
        for (std::size_t index = 0; index < request.hintCandidates.size();
             ++index) {
          if (index != 0) {
            std::cerr << ',';
          }
          std::cerr << request.hintCandidates[index];
        }
        std::cerr << '\n';
        return EXIT_FAILURE;
      }
      latencyByLevel[difficultyLevel(first.step->technique)].push_back(
          elapsed.count());
      std::string failure;
      if (!applyStep(request, *first.step, solution, failure)) {
        std::cerr << fields[0] << ": " << failure << " from "
                  << techniqueCode(first.step->technique) << '\n';
        return EXIT_FAILURE;
      }
      for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
        if (kTechniqueCatalog[index].technique == first.step->technique) {
          ++techniqueCounts[index];
          ++puzzleTechniqueCounts[index];
        }
      }
      ++totalSteps;
    }
    if (!solved || request.board != solution) {
      std::cerr << fields[0] << ": did not reach the supplied solution\n";
      return EXIT_FAILURE;
    }
    if (coverageOutput) {
      for (std::size_t index = 0; index < puzzleTechniqueCounts.size(); ++index) {
        if (puzzleTechniqueCounts[index] != 0) {
          coverageOutput << fields[0] << ',' << kTechniqueCatalog[index].code
                         << ',' << puzzleTechniqueCounts[index] << '\n';
        }
      }
    }
    const auto puzzle = parseBoard(fields[1]);
    for (int sample = 0; sample < randomSamplesPerPuzzle; ++sample) {
      HintRequest randomized{puzzle, {}};
      for (Cell cell = 0; cell < kCellCount; ++cell) {
        randomized.givenCells[cell] = puzzle[cell] != 0;
        randomState ^= randomState << 13U;
        randomState ^= randomState >> 17U;
        randomState ^= randomState << 5U;
        if (puzzle[cell] == 0 && (randomState & 3U) == 0) {
          randomized.board[cell] = solution[cell];
        }
      }
      randomized.hintCandidates = createCandidates(randomized.board);
      const auto first = Engine{}.nextStep(randomized);
      const auto repeated = Engine{}.nextStep(randomized);
      if (first.status != repeated.status || first.reason != repeated.reason ||
          first.step != repeated.step ||
          (first.step && !stepIsSolutionSafe(*first.step, solution))) {
        std::cerr << fields[0]
                  << ": randomized legal state validation failed\n";
        return EXIT_FAILURE;
      }
      ++randomizedStates;
    }
    ++puzzleCount;
  }
  std::cout << "hsp_hint_core: replayed " << puzzleCount << " puzzles in "
            << totalSteps << " logical steps\n";
  std::cout << "hsp_hint_core: validated " << randomizedStates
            << " deterministic randomized legal states\n";
  std::cout << "hsp_hint_core: replay technique coverage";
  for (std::size_t index = 0; index < techniqueCounts.size(); ++index) {
    if (techniqueCounts[index] != 0) {
      std::cout << ' ' << kTechniqueCatalog[index].code << '='
                << techniqueCounts[index];
    }
  }
  std::cout << '\n';
  std::cout << "hsp_hint_core: independently exercised detectors";
  {
    HintRequest avoidable{};
    avoidable.board[0] = 1;
    avoidable.board[3] = 2;
    avoidable.board[9] = 2;
    avoidable.hintCandidates[12] =
        static_cast<CandidateMask>((1U << 0U) | (1U << 2U));
    const auto step = detail::detectTechnique(
        avoidable, Technique::avoidableRectangle);
    if (!step || step->eliminations != std::vector<Candidate>{{12, 1}}) {
      std::cerr << "avoidableRectangle synthetic proof failed\n";
      return EXIT_FAILURE;
    }
    avoidable.hintCandidates[12] =
        static_cast<CandidateMask>(avoidable.hintCandidates[12] & ~(1U << 0U));
    if (detail::detectTechnique(avoidable,
                                Technique::avoidableRectangle)) {
      std::cerr << "avoidableRectangle near-negative fixture failed\n";
      return EXIT_FAILURE;
    }
    for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
      if (kTechniqueCatalog[index].technique ==
          Technique::avoidableRectangle) {
        positiveCoverage[index] = 1;
        resultCoverage[index] = 1;
      }
    }
  }
  for (std::size_t index = 0; index < positiveCoverage.size(); ++index) {
    if (positiveCoverage[index] != 0) {
      std::cout << ' ' << kTechniqueCatalog[index].code;
    }
  }
  std::cout << '\n';
  const auto incomplete = [](const auto &coverage) {
    return std::any_of(coverage.begin(), coverage.end(),
                       [](int covered) { return covered == 0; });
  };
  if (incomplete(positiveCoverage) || incomplete(negativeCoverage) ||
      incomplete(resultCoverage)) {
    std::cerr << "not every catalog detector has positive, negative, and "
                 "safe-result coverage\n";
    return EXIT_FAILURE;
  }
  std::cout << "hsp_hint_core: all " << kTechniqueCatalog.size()
            << " techniques passed positive, negative, and safe-result tests\n";
  std::cout << "hsp_hint_core: replay P95 latency";
  for (std::size_t level = 1; level < latencyByLevel.size(); ++level) {
    auto &samples = latencyByLevel[level];
    if (samples.empty()) {
      continue;
    }
    std::sort(samples.begin(), samples.end());
    const auto percentileIndex = static_cast<std::size_t>(
        static_cast<double>(samples.size() - 1U) * 0.95);
    const auto p95 = samples[percentileIndex];
    std::cout << " level" << level << '=' << p95 << "ms";
    const auto limit = level < 5 ? 100.0 : 300.0;
    if (p95 >= limit) {
      std::cerr << "\nlevel " << level << " exceeded its P95 target\n";
      return EXIT_FAILURE;
    }
  }
  std::cout << '\n';
  return puzzleCount > 0 && (expectedCount == 0 || puzzleCount == expectedCount)
             ? EXIT_SUCCESS
             : EXIT_FAILURE;
}
