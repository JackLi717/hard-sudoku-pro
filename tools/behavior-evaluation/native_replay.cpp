#include "hsp/hint_core/bridge.hpp"

#include <iostream>

int main(int argc, char **argv) {
  if (argc != 5) {
    std::cerr << "usage: native_replay <board> <candidates> <givens> <effects>\n";
    return 2;
  }
  std::cout << hsp::hint_core::opportunityExplanationJson(
      argv[1], argv[2], argv[3], argv[4]);
  return 0;
}
