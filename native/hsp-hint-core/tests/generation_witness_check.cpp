// Independent replay of saved generation witnesses through a capped search.
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <iostream>
#include <stdexcept>
#include <string>

using namespace hsp::hint_core;

int main() {
  try {
    std::string givens, board, code;
    unsigned level;
    unsigned checked = 0;
    while (std::cin >> givens >> board >> level >> code) {
      if (givens.size() != 81 || board.size() != 81 || level < 2 || level > 5) {
        throw std::runtime_error("invalid witness input");
      }
      HintRequest request{};
      for (Cell cell = 0; cell < kCellCount; ++cell) {
        request.board[cell] = static_cast<Digit>(board[cell] - '0');
        request.givenCells[cell] = givens[cell] != '0';
        unsigned mask;
        if (!(std::cin >> mask) || mask > 511) throw std::runtime_error("invalid mask");
        request.hintCandidates[cell] = static_cast<CandidateMask>(mask);
      }
      OpportunitySearchOptions options;
      options.maximumLevel = static_cast<std::uint8_t>(level - 1);
      auto session = Engine{}.startOpportunitySearch(request, options);
      const auto result = session.advance({39});
      if (result.status != OpportunitySearchStatus::complete || !result.opportunities.empty()) {
        throw std::runtime_error("lower-tier step still available");
      }
      bool found = false;
      for (const auto &descriptor : kTechniqueCatalog) {
        if (descriptor.code == code && difficultyLevel(descriptor.technique) == level) {
          found = !detail::detectTechniqueCandidates(request, descriptor.technique).empty();
        }
      }
      if (!found) throw std::runtime_error("target technique cannot be reproduced");
      ++checked;
    }
    if (!checked) throw std::runtime_error("no witnesses checked");
    std::cout << "verified " << checked << " capped lower-tier stalls and target detections\n";
  } catch (const std::exception &error) {
    std::cerr << error.what() << '\n';
    return 1;
  }
}
