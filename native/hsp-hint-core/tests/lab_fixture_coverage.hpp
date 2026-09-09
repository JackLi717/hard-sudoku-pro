#pragma once
#include "lab_fixture_validation.hpp"
#include "lab_shape_coverage.hpp"
#include <set>

namespace hsp::hint_core::tests::lab {
struct Coverage {
  std::string mode;
  std::vector<std::string> layouts;
  std::string result;
  std::size_t targetCount;
};
inline std::string regionName(RegionKind kind) {
  return kind == RegionKind::row ? "row" : kind == RegionKind::column ? "column" : "box";
}
inline Coverage classifyCoverage(const HintRequest &request, const HintStep &step) {
  Coverage result{step.teaching.mode.empty() ? "direct" : std::string(step.teaching.mode), {},
    step.placements.empty() ? "elimination" : "placement", step.placements.size() + step.eliminations.size()};
  std::set<std::string> tags;
  const auto firstRegion = [&]() {
    if (!step.focusRegions.empty()) tags.insert(regionName(step.focusRegions.front().kind));
  };
  switch (step.technique) {
  case Technique::fullHouse:
  case Technique::hiddenSingle:
  case Technique::hiddenPair:
  case Technique::hiddenTriple:
  case Technique::hiddenQuad:
  case Technique::xWing:
  case Technique::swordfish:
  case Technique::jellyfish:
    firstRegion(); break;
  case Technique::nakedPair:
  case Technique::nakedTriple:
  case Technique::nakedQuad: {
    for (const auto region : step.focusRegions) {
      const auto contains = [&](Cell cell) {
        const int index = region.kind == RegionKind::row ? cell / 9 : region.kind == RegionKind::column ? cell % 9 : (cell / 27) * 3 + (cell % 9) / 3;
        return index == region.index;
      };
      if (std::all_of(step.focusCells.begin(), step.focusCells.end(), contains) &&
          std::all_of(step.eliminations.begin(), step.eliminations.end(), [&](const Candidate &item) { return contains(item.cell); })) tags.insert(regionName(region.kind));
    }
    break;
  }
  case Technique::lockedCandidatesPointing:
  case Technique::lockedCandidatesClaiming:
    for (const auto region : step.focusRegions)
      if (region.kind != RegionKind::box) tags.insert(regionName(region.kind));
    break;
  case Technique::lockedPair:
  case Technique::lockedTriple:
    if (!step.focusCells.empty()) {
      if (std::all_of(step.focusCells.begin(), step.focusCells.end(), [&](Cell cell) { return cell / 9 == step.focusCells.front() / 9; })) tags.insert("row");
      if (std::all_of(step.focusCells.begin(), step.focusCells.end(), [&](Cell cell) { return cell % 9 == step.focusCells.front() % 9; })) tags.insert("column");
    }
    break;
  case Technique::finnedXWing:
  case Technique::sashimiXWing:
  case Technique::skyscraper: {
    std::set<int> rows, columns;
    for (const auto cell : step.focusCells) { rows.insert(cell / 9); columns.insert(cell % 9); }
    if (rows.size() == 2 && std::all_of(step.eliminations.begin(), step.eliminations.end(),
        [&](const Candidate &item) { return !rows.contains(item.cell / 9); })) tags.insert("row");
    if (columns.size() == 2 && std::all_of(step.eliminations.begin(), step.eliminations.end(),
        [&](const Candidate &item) { return !columns.contains(item.cell % 9); })) tags.insert("column");
    break;
  }
  default: break;
  }
  if (step.technique == Technique::finnedXWing || step.technique == Technique::sashimiXWing) {
    const auto coreSize = step.technique == Technique::finnedXWing ? 4U : 3U;
    if (step.focusCells.size() > coreSize) tags.insert(step.focusCells.size() - coreSize == 1 ? "single-fin" : "multiple-fins");
  }
  if (step.technique == Technique::simpleColoring || step.technique == Technique::multiColoring || step.technique == Technique::complexColoring)
    tags.insert("components-" + std::to_string(step.teaching.branches.size()));
  // Candidate distribution is an observed property, not a new logical mode.
  if (step.technique == Technique::nakedTriple || step.technique == Technique::nakedQuad ||
      step.technique == Technique::lockedTriple) {
    std::vector<int> sizes;
    for (const auto cell : step.focusCells) sizes.push_back(std::popcount(request.hintCandidates[cell]));
    std::sort(sizes.begin(), sizes.end());
    std::string distribution = "candidates";
    for (const auto size : sizes) distribution += "-" + std::to_string(size);
    tags.insert(distribution);
  }
  if (step.technique == Technique::xChain || step.technique == Technique::xyChain ||
      step.technique == Technique::aic || step.technique == Technique::groupedAic ||
      step.technique == Technique::forcingChain || step.technique == Technique::forcingNet) {
    std::size_t nodes = 0;
    bool grouped = false;
    bool branching = false;
    std::set<std::string> distinctGroups;

    for (const auto &branch : step.teaching.branches) {
      nodes += branch.nodes.size();
      for (std::size_t nodeIndex = 0; nodeIndex < branch.nodes.size(); ++nodeIndex) {
        const auto &node = branch.nodes[nodeIndex];
        grouped = grouped || node.candidates.size() > 1;
        if (node.candidates.size() > 1) {
          std::string identity;
          for (const auto candidate : node.candidates) identity += std::to_string(candidate.cell) + ":" + std::to_string(candidate.digit) + ",";
          distinctGroups.insert(identity);
          tags.insert(nodeIndex == 0 || nodeIndex + 1 == branch.nodes.size() ? "endpoint-group" : "internal-group");
          if (node.candidates.size() == 2) tags.insert("group-size-2");
          if (node.candidates.size() == 3) tags.insert("group-size-3");
        }
        branching = branching || node.parents.size() > 1;
      }
    }
    if (step.technique == Technique::xChain)
      tags.insert(nodes <= 6 ? "short" : nodes <= 8 ? "medium" : "long");
    else if (step.technique == Technique::xyChain)
      tags.insert(nodes <= 8 ? "short" : nodes <= 14 ? "medium" : "long");
    else
      tags.insert(nodes <= 8 ? "short" : nodes <= 16 ? "medium" : "long");
    if (grouped) {
      tags.insert("grouped");
      tags.insert(distinctGroups.size() == 1 ? "single-group" : "multiple-groups");
    }
    if (branching) tags.insert("multiple-premises");
    tags.insert("branches-" + std::to_string(step.teaching.branches.size()));
  }
  addShapeCoverage(request, step, tags);
  result.layouts.assign(tags.begin(), tags.end());
  return result;
}
inline std::string coverageKey(const Coverage &coverage) {
  std::string key = coverage.mode + ":" + coverage.result;
  for (const auto &layout : coverage.layouts) key += ":" + layout;
  return key + (coverage.targetCount > 1 ? ":multiple" : ":single");
}
} // namespace hsp::hint_core::tests::lab
