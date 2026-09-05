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
inline void removeTeachingDigit(HintRequest &request, Cell cell, Digit digit) {
  request.hintCandidates[cell] = static_cast<CandidateMask>(
      request.hintCandidates[cell] & ~(1U << (digit - 1U)));
}
inline void addTeachingDigit(HintRequest &request, Cell cell, Digit digit) {
  request.hintCandidates[cell] = static_cast<CandidateMask>(
      request.hintCandidates[cell] | (1U << (digit - 1U)));
}
inline HintRequest columnSashimi(Digit digit, bool secondFin,
                                 bool secondTarget) {
  HintRequest request{};
  request.hintCandidates.fill(kAllCandidatesMask);
  for (Cell row = 0; row < 9; ++row) {
    removeTeachingDigit(request, static_cast<Cell>(row * 9 + 2), digit);
    removeTeachingDigit(request, static_cast<Cell>(row * 9 + 5), digit);
  }
  // HoDoKu c36/r37 structure: c6 is the strong pair, c3 contains
  // the shared corner and one or two fins. The missing corner is r7c3.
  for (const Cell cell : {Cell{20}, Cell{23}, Cell{59}, Cell{65}}) {
    addTeachingDigit(request, cell, digit);
  }
  if (secondFin) {
    addTeachingDigit(request, Cell{74}, digit);
  }
  if (!secondTarget) {
    removeTeachingDigit(request, Cell{55}, digit);
  }
  return request;
}
inline HintRequest rowSashimi(Digit digit) {
  HintRequest request{};
  request.hintCandidates.fill(kAllCandidatesMask);
  for (Cell column = 0; column < 9; ++column) {
    removeTeachingDigit(request, static_cast<Cell>(2 * 9 + column), digit);
    removeTeachingDigit(request, static_cast<Cell>(5 * 9 + column), digit);
  }
  // Transpose of the HoDoKu structure. The missing corner is r3c7.
  for (const Cell cell : {Cell{20}, Cell{25}, Cell{26}, Cell{47}, Cell{51}}) {
    addTeachingDigit(request, cell, digit);
  }
  removeTeachingDigit(request, Cell{15}, digit);
  return request;
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
  HintRequest finned{}; finned.hintCandidates.fill(kAllCandidatesMask);
  for (Cell c=0;c<18;++c) finned.hintCandidates[c] = static_cast<CandidateMask>(finned.hintCandidates[c] & ~1U);
  for (const Cell c : {0,3,9,12,13,14}) finned.hintCandidates[c] |= 1;
  cases.push_back({"x-wing-two-fins",Technique::finnedXWing,finned});
  cases.push_back({"sashimi-hodoku-two-fins", Technique::sashimiXWing,
                   columnSashimi(1, true, false)});
  auto singleFin = columnSashimi(5, false, false);
  removeTeachingDigit(singleFin, Cell{67}, Digit{5});
  cases.push_back(
      {"sashimi-single-fin", Technique::sashimiXWing, singleFin});
  cases.push_back({"sashimi-row-two-fins", Technique::sashimiXWing,
                   rowSashimi(7)});
  cases.push_back({"sashimi-two-targets", Technique::sashimiXWing,
                   columnSashimi(9, true, true)});
  return cases;
}
}
