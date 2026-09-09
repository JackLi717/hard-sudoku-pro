// Offline generation acceptance: use the same lowest-tier selector as the app.
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <algorithm>
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace hsp::hint_core;

Board parse(const std::string &text) {
  if (text.size() != 81 || text.find_first_not_of("0123456789") != std::string::npos) {
    throw std::runtime_error("invalid board");
  }
  Board board{};
  for (std::size_t i = 0; i < 81; ++i) board[i] = static_cast<Digit>(text[i] - '0');
  return board;
}

void actions(std::ostream &out, const std::vector<Candidate> &values) {
  out << '[';
  bool first = true;
  for (const auto value : values) {
    if (!first) out << ',';
    first = false;
    out << '[' << static_cast<int>(value.cell) << ',' << static_cast<int>(value.digit) << ']';
  }
  out << ']';
}

struct TeachingMetrics {
  std::size_t branchCount{0};
  std::size_t nodeCount{0};
  std::size_t maximumDepth{0};
};

TeachingMetrics teachingMetrics(const HintStep &step) {
  TeachingMetrics result{step.teaching.branches.size(), 0, 0};
  for (const auto &branch : step.teaching.branches) {
    std::vector<std::size_t> depths(branch.nodes.size(), 1);
    result.nodeCount += branch.nodes.size();
    for (std::size_t index = 0; index < branch.nodes.size(); ++index) {
      for (const auto parent : branch.nodes[index].parents) {
        if (parent < 0 || static_cast<std::size_t>(parent) >= index) {
          throw std::runtime_error("invalid teaching dependency");
        }
        depths[index] = std::max(depths[index], depths[parent] + 1);
      }
      result.maximumDepth = std::max(result.maximumDepth, depths[index]);
    }
  }
  return result;
}

void apply(HintRequest &request, const HintStep &step, const Board &solution) {
  const auto before = request;
  for (const auto value : step.eliminations) {
    if (solution[value.cell] == value.digit) throw std::runtime_error("unsafe elimination");
    request.hintCandidates[value.cell] &= ~(1U << (value.digit - 1U));
  }
  for (const auto value : step.placements) {
    if (solution[value.cell] != value.digit) throw std::runtime_error("unsafe placement");
    request.board[value.cell] = value.digit;
  }
  const auto legal = createCandidates(request.board);
  for (Cell cell = 0; cell < kCellCount; ++cell) {
    request.hintCandidates[cell] &= legal[cell];
    if (request.board[cell] == 0 && request.hintCandidates[cell] == 0) {
      throw std::runtime_error("empty candidates");
    }
  }
  if (before.board == request.board && before.hintCandidates == request.hintCandidates) {
    throw std::runtime_error("non-progressing step");
  }
}

void analyze(const std::string &puzzle, const std::string &answer,
             const std::string &trainingTarget, bool screenOnly) {
  HintRequest request{parse(puzzle), {}};
  const auto solution = parse(answer);
  request.hintCandidates = createCandidates(request.board);
  for (Cell cell = 0; cell < kCellCount; ++cell) request.givenCells[cell] = request.board[cell] != 0;
  std::ostringstream evidence;
  std::ostringstream ratingSteps;
  std::map<std::string, int> usage;
  int highest = 0;
  bool solved = false;
  bool first = true;
  std::string hardest;
  for (int iteration = 0; iteration < 1000; ++iteration) {
    OpportunitySearchOptions options;
    if (screenOnly) options.maximumLevel = 4;
    auto session = Engine{}.startOpportunitySearch(request, options);
    const auto result = session.advance({39});
    if (result.status == OpportunitySearchStatus::solved) {
      solved = request.board == solution;
      break;
    }
    if (result.status != OpportunitySearchStatus::complete || result.opportunities.empty()) {
      if (screenOnly && result.status == OpportunitySearchStatus::complete) {
        bool eligible = false;
        for (const auto &descriptor : kTechniqueCatalog) {
          if (descriptor.code == trainingTarget) {
            const auto target = detail::detectTechniqueCandidateResult(request, descriptor.technique);
            eligible = !target.steps.empty() && !target.reachedEnumerationLimit;
          }
        }
        std::cout << "{\"puzzle\":\"" << puzzle << "\",\"eligible\":"
                  << (eligible ? "true" : "false") << "}" << std::endl;
        return;
      }
      break;
    }
    const auto runtimePreferred = result.opportunities.front().technique;
    // At L5 prefer specific patterns/chains before general forcing fallbacks.
    // Within a technique retain the runtime's human-cost ordering.
    auto selected = *result.frontierLevel == 5
        ? std::min_element(result.opportunities.begin(), result.opportunities.end(),
            [](const auto &left, const auto &right) { return left.technique < right.technique; })
        : result.opportunities.begin();
    if (*result.frontierLevel == 5 && !trainingTarget.empty()) {
      const auto target = std::find_if(result.opportunities.begin(), result.opportunities.end(),
          [&](const auto &candidate) { return techniqueCode(candidate.technique) == trainingTarget; });
      if (target != result.opportunities.end()) selected = target;
    }
    const auto &step = *selected;
    const int level = difficultyLevel(step.technique);
    const std::string code(techniqueCode(step.technique));
    if (level > highest) { highest = level; hardest = code; }
    ++usage[code];
    const auto metrics = teachingMetrics(step);
    if (iteration > 0) ratingSteps << ',';
    ratingSteps << "{\"technique\":\"" << code << "\",\"level\":" << level
                << ",\"humanCost\":" << step.humanCost
                << ",\"branchCount\":" << metrics.branchCount
                << ",\"nodeCount\":" << metrics.nodeCount
                << ",\"maximumDepth\":" << metrics.maximumDepth << '}';
    // Store only selected advanced steps, never incidental detector hits.
    if (level > 1) {
      if (!first) evidence << ',';
      first = false;
      evidence << "{\"stepIndex\":" << iteration << ",\"level\":" << level
               << ",\"technique\":\"" << code << "\",\"board\":\"";
      for (auto digit : request.board) evidence << static_cast<int>(digit);
      evidence << "\",\"candidates\":[";
      for (std::size_t i = 0; i < 81; ++i) {
        if (i) evidence << ',';
        evidence << request.hintCandidates[i];
      }
      const bool bounded = std::any_of(result.techniqueDiagnostics.begin(), result.techniqueDiagnostics.end(),
          [&](const auto &diagnostic) { return diagnostic.technique == step.technique && diagnostic.reachedEnumerationLimit; });
      evidence << "],\"lowerLevelsExhausted\":true,\"selection\":\"generation_frontier_priority\",\"enumerationBoundReached\":"
               << (bounded ? "true" : "false") << ",\"runtimePreferredTechnique\":\"" << techniqueCode(runtimePreferred) << "\",\"placements\":";
      actions(evidence, step.placements);
      evidence << ",\"eliminations\":";
      actions(evidence, step.eliminations);
      evidence << ",\"availableTechniques\":[";
      bool firstTechnique = true;
      for (const auto &diagnostic : result.techniqueDiagnostics) {
        if (diagnostic.candidateCount == 0) continue;
        if (!firstTechnique) evidence << ',';
        firstTechnique = false;
        evidence << "{\"code\":\"" << techniqueCode(diagnostic.technique)
                 << "\",\"bounded\":" << (diagnostic.reachedEnumerationLimit ? "true" : "false") << '}';
      }
      evidence << "]}";
    }
    apply(request, step, solution);
  }
  if (screenOnly) {
    std::cout << "{\"puzzle\":\"" << puzzle << "\",\"eligible\":false}" << std::endl;
    return;
  }
  std::cout << "{\"puzzle\":\"" << puzzle << "\",\"solved\":" << (solved ? "true" : "false")
            << ",\"trainingTarget\":\"" << trainingTarget << "\",\"minimumLevel\":" << highest << ",\"hardestTechnique\":\"" << hardest
            << "\",\"usage\":{";
  first = true;
  for (const auto &[code, count] : usage) {
    if (!first) std::cout << ',';
    first = false;
    std::cout << '"' << code << "\":" << count;
  }
  std::cout << "},\"ratingSteps\":[" << ratingSteps.str()
            << "],\"witnesses\":[" << evidence.str() << "]}" << std::endl;
}

int main(int argc, char **argv) {
  try {
    if (argc > 3 || (argc == 3 && std::string(argv[2]) != "--screen"))
      throw std::runtime_error("usage: generation-gate [training-technique [--screen]]");
    const std::string target = argc >= 2 ? argv[1] : "";
    if (!target.empty() && std::none_of(kTechniqueCatalog.begin(), kTechniqueCatalog.end(),
        [&](const auto &descriptor) { return descriptor.code == target && descriptor.level == 5; })) {
      throw std::runtime_error("training target must be an L5 technique");
    }
    std::string puzzle, solution;
    while (std::cin >> puzzle >> solution) analyze(puzzle, solution, target, argc == 3);
  } catch (const std::exception &error) {
    std::cerr << error.what() << '\n';
    return 1;
  }
}
