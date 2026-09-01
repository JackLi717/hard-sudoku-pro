#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <array>
#include <cstdlib>
#include <fstream>
#include <iostream>
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

} // namespace

int main(int argc, char **argv) {
  if (argc != 3) {
    std::cerr << "usage: fixture_export puzzles.csv output.json\n";
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
  std::cout << "exported 39 hint acceptance fixtures\n";
  return EXIT_SUCCESS;
}
