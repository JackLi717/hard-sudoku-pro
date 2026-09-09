#pragma once
#include "lab_fixture_validation.hpp"
#include <set>

namespace hsp::hint_core::tests::lab {
inline int shapeBox(Cell cell) { return cell / 27 * 3 + cell % 9 / 3; }
inline bool shapeSees(Cell a, Cell b) {
  return a != b && (a / 9 == b / 9 || a % 9 == b % 9 || shapeBox(a) == shapeBox(b));
}
inline std::vector<Cell> shapePositions(const HintRequest &request, RegionKind kind, int index, Digit digit) {
  std::vector<Cell> cells;
  for (Cell cell = 0; cell < 81; ++cell) {
    const int position = kind == RegionKind::row ? cell / 9 : kind == RegionKind::column ? cell % 9 : shapeBox(cell);
    if (position == index && (request.hintCandidates[cell] & (1U << (digit - 1)))) cells.push_back(cell);
  }
  return cells;
}
inline void addShapeCoverage(const HintRequest &request, const HintStep &step, std::set<std::string> &tags) {
  if (step.eliminations.empty()) return;
  const auto digit = step.eliminations.front().digit;
  const auto &cells = step.focusCells;
  if (step.technique == Technique::wWing) {
    for (const auto a : cells) for (const auto b : cells) {
      const auto mask = request.hintCandidates[a];
      if (a >= b || shapeSees(a, b) || std::popcount(mask) != 2 || mask != request.hintCandidates[b] || !(mask & (1U << (digit - 1)))) continue;
      const auto link = static_cast<Digit>(std::countr_zero(static_cast<CandidateMask>(mask & ~(1U << (digit - 1)))) + 1);
      for (const auto kind : {RegionKind::row, RegionKind::column, RegionKind::box}) for (int index = 0; index < 9; ++index) {
        const auto ends = shapePositions(request, kind, index, link);
        if (ends.size() != 2 || !std::all_of(ends.begin(), ends.end(), [&](Cell cell) { return std::find(cells.begin(), cells.end(), cell) != cells.end(); })) continue;
        if ((shapeSees(a, ends[0]) && shapeSees(b, ends[1])) || (shapeSees(a, ends[1]) && shapeSees(b, ends[0])))
          tags.insert(kind == RegionKind::row ? "strong-row" : kind == RegionKind::column ? "strong-column" : "strong-box");
      }
    }
  }
  if ((step.technique == Technique::xyWing || step.technique == Technique::xyzWing) && cells.size() == 3) {
    const bool xyz = step.technique == Technique::xyzWing;
    for (const auto pivot : cells) {
      const auto mask = request.hintCandidates[pivot];
      if (std::popcount(mask) != (xyz ? 3 : 2) || (!xyz && (mask & (1U << (digit - 1))))) continue;
      std::vector<Cell> wings;
      for (const auto cell : cells) if (cell != pivot) wings.push_back(cell);
      if (!shapeSees(pivot, wings[0]) || !shapeSees(pivot, wings[1])) continue;
      bool boxWing = false;
      for (const auto wing : wings) {
        boxWing = boxWing || shapeBox(wing) == shapeBox(pivot);
        if (shapeBox(wing) != shapeBox(pivot)) {
          if (wing / 9 == pivot / 9) tags.insert("row-link");
          if (wing % 9 == pivot % 9) tags.insert("column-link");
        }
      }
      tags.insert(boxWing ? "box-line" : "row-column");
    }
  }
  if (step.technique == Technique::emptyRectangle) {
    for (int box = 0; box < 9; ++box) {
      const auto inside = shapePositions(request, RegionKind::box, box, digit);
      if (inside.size() < 2 || !std::all_of(inside.begin(), inside.end(), [&](Cell cell) { return std::find(cells.begin(), cells.end(), cell) != cells.end(); })) continue;
      std::vector<Cell> outside;
      for (const auto cell : cells) if (shapeBox(cell) != box) outside.push_back(cell);
      if (outside.size() != 2) continue;
      if (outside[0] / 9 == outside[1] / 9 && shapePositions(request, RegionKind::row, outside[0] / 9, digit) == outside) tags.insert("strong-row");
      if (outside[0] % 9 == outside[1] % 9 && shapePositions(request, RegionKind::column, outside[0] % 9, digit) == outside) tags.insert("strong-column");
    }
  }
  if (step.technique == Technique::remotePair) {
    std::size_t maximumDegree = 0;
    bool allDegreeTwo = true;
    for (const auto cell : cells) {
      const auto degree = static_cast<std::size_t>(std::count_if(cells.begin(), cells.end(), [&](Cell other) { return shapeSees(cell, other); }));
      maximumDegree = std::max(maximumDegree, degree);
      allDegreeTwo = allDegreeTwo && degree == 2;
    }
    tags.insert(maximumDegree > 2 ? "branched" : allDegreeTwo ? "cycle" : "linear");
    tags.insert(cells.size() <= 4 ? "short" : "long");
  }
  if ((step.technique == Technique::uniqueRectangle || step.technique == Technique::avoidableRectangle) && cells.size() == 4) {
    const auto target = step.eliminations.front().cell;
    const bool bottom = target / 9 != cells.front() / 9;
    const bool right = target % 9 != cells.front() % 9;
    tags.insert(bottom ? (right ? "corner-bottom-right" : "corner-bottom-left") : (right ? "corner-top-right" : "corner-top-left"));
  }
  if (step.technique == Technique::hiddenRectangle && cells.size() == 4)
    tags.insert(step.eliminations.front().cell / 9 == cells.front() / 9 ? "roof-top" : "roof-bottom");
  if (step.technique == Technique::swordfish || step.technique == Technique::jellyfish) {
    std::vector<std::size_t> counts;
    for (const auto region : step.focusRegions) counts.push_back(shapePositions(request, region.kind, region.index, digit).size());
    std::sort(counts.begin(), counts.end());
    std::string distribution = "base-counts";
    for (const auto count : counts) distribution += "-" + std::to_string(count);
    tags.insert(distribution);
    std::size_t total = 0;
    for (const auto count : counts) total += count;
    // Pedagogical density bands, not separate logical fish types. Keep the
    // exact degree sequence above; the eight-node Jellyfish extremum is not
    // required to demonstrate a sparse four-base Hall set.
    const auto sparseLimit = step.technique == Technique::jellyfish ? 10U : 6U;
    tags.insert(total <= sparseLimit ? "sparse" : "mixed-density");
    if (std::all_of(counts.begin(), counts.end(), [](std::size_t count) { return count == 2; })) tags.insert("minimum-density");
  }
}
} // namespace hsp::hint_core::tests::lab
