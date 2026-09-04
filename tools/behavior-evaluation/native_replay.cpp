#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"

#include <iostream>
#include <sstream>
#include <string>

int main(int argc, char **argv) {
  if (argc != 5) {
    std::cerr << "usage: native_replay <board> <candidates> <givens> <effects>\n";
    return 2;
  }
  if (std::string(argv[4]) == "--opportunities") {
    using namespace hsp::hint_core;
    // Offline-only enumeration seam. Production bridge and detectors unchanged.
    const std::string board = argv[1], givens = argv[3];
    HintRequest request;
    std::stringstream masks(argv[2]);
    std::string token;
    if (board.size() != 81 || givens.size() != 81) return 2;
    for (std::size_t i = 0; i < 81; ++i) {
      if (board[i] < '0' || board[i] > '9' ||
          (givens[i] != '0' && givens[i] != '1') ||
          !std::getline(masks, token, ',') || token.empty() ||
          token.find_first_not_of("0123456789") != std::string::npos ||
          token.size() > 3) return 2;
      const auto mask = std::stoi(token);
      if (mask > 511) return 2;
      request.board[i] = board[i] - '0';
      request.hintCandidates[i] = mask;
      request.givenCells[i] = givens[i] == '1';
    }
    if (std::getline(masks, token, ',')) return 2;
    OpportunitySearchOptions options;
    options.scope = OpportunitySearchScope::allDirect;
    options.levelTwoToFourCandidateLimit = 1024;
    options.levelFiveCandidateLimit = 512;
    auto session = Engine{}.startOpportunitySearch(request, options);
    const auto batch = session.advance({100});
    bool complete = batch.status == OpportunitySearchStatus::complete ||
                    batch.status == OpportunitySearchStatus::solved;
    for (const auto &d : batch.techniqueDiagnostics)
      if (d.reachedEnumerationLimit) complete = false;
    std::cout << "{\"board\":\"" << board << "\",\"snapshotKey\":\""
              << board << '|' << argv[2] << '|' << givens << "\",\"complete\":"
              << (complete ? "true" : "false") << ",\"steps\":[";
    bool first = true;
    for (const auto &step : batch.opportunities) {
      if (!first) std::cout << ',';
      first = false;
      std::cout << serializeHintStepJson(board, step);
    }
    std::cout << "]}";
    return 0;
  }
  std::cout << hsp::hint_core::opportunityExplanationJson(
      argv[1], argv[2], argv[3], argv[4]);
  return 0;
}
