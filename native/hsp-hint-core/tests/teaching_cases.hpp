#pragma once
#include "hsp/hint_core/types.hpp"
#include <string_view>
#include <vector>
namespace hsp::hint_core::tests {
struct TeachingCase { std::string_view name; Technique technique; HintRequest request; };
inline CandidateMask teachingMask(std::initializer_list<int> digits) {
  CandidateMask mask = 0;
  for (const auto digit : digits) mask = static_cast<CandidateMask>(mask | (1U << (digit - 1)));
  return mask;
}
inline std::vector<TeachingCase> teachingCases() {
  std::vector<TeachingCase> cases;
  for (const bool placement : {false, true}) {
    HintRequest request{}; request.hintCandidates.fill(kAllCandidatesMask);
    request.hintCandidates[0] = placement ? teachingMask({5,6,7}) : teachingMask({1,2,3});
    request.hintCandidates[1] = placement ? teachingMask({5,8}) : teachingMask({1,4});
    request.hintCandidates[9] = placement ? teachingMask({6,8}) : teachingMask({2,4});
    request.hintCandidates[10] = placement ? teachingMask({7,8}) : teachingMask({3,4});
    if (placement) request.hintCandidates[2] = teachingMask({1,5,6,7,8});
    cases.push_back({placement ? "net-common-placement" : "net-common-elimination", Technique::forcingNet, request});
  }
  HintRequest color{}; color.hintCandidates.fill(kAllCandidatesMask);
  for (Cell c=0;c<81;++c) {
    const bool boxZero=c/27==0 && c%9<3;
    if ((boxZero && c!=0 && c!=1) || (c%9==1 && c!=1 && c!=28) ||
        (c/9==3 && c!=28 && c!=30) || (c%9==3 && c!=3 && c!=30))
      color.hintCandidates[c] = static_cast<CandidateMask>(color.hintCandidates[c] & ~1U);
  }
  cases.push_back({"color-same-side-conflict",Technique::simpleColoring,color});
  for (const bool sashimi : {false,true}) {
    HintRequest fish{}; fish.hintCandidates.fill(kAllCandidatesMask);
    for (Cell c=0;c<18;++c) fish.hintCandidates[c] = static_cast<CandidateMask>(fish.hintCandidates[c] & ~1U);
    for (const Cell c : {0,3,12,13,14}) fish.hintCandidates[c] |= 1;
    if (!sashimi) fish.hintCandidates[9] |= 1;
    cases.push_back({sashimi?"sashimi-two-fins":"x-wing-two-fins",sashimi?Technique::sashimiXWing:Technique::finnedXWing,fish});
  }
  return cases;
}
}
