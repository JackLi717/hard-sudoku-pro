#include "techniques.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <optional>
#include <queue>
#include <set>
#include <utility>
#include <vector>

namespace hsp::hint_core::detail {
namespace {

struct Unit {
  Region region;
  std::array<Cell, kSideLength> cells;
};

constexpr CandidateMask bit(Digit digit) noexcept {
  return static_cast<CandidateMask>(1U << (digit - 1U));
}
constexpr std::uint8_t row(Cell cell) noexcept { return cell / 9U; }
constexpr std::uint8_t column(Cell cell) noexcept { return cell % 9U; }
constexpr std::uint8_t box(Cell cell) noexcept {
  return static_cast<std::uint8_t>((row(cell) / 3U) * 3U + column(cell) / 3U);
}
constexpr bool peers(Cell a, Cell b) noexcept {
  return a != b &&
         (row(a) == row(b) || column(a) == column(b) || box(a) == box(b));
}
constexpr bool has(CandidateMask mask, Digit digit) noexcept {
  return (mask & bit(digit)) != 0;
}
bool cancelled(const HintRequest &request) noexcept {
  return request.cancelRequested != nullptr &&
         request.cancelRequested->load(std::memory_order_relaxed);
}

Unit makeUnit(RegionKind kind, std::uint8_t index) {
  Unit result{{kind, index}, {}};
  for (std::uint8_t offset = 0; offset < 9; ++offset) {
    if (kind == RegionKind::row) {
      result.cells[offset] = static_cast<Cell>(index * 9U + offset);
    } else if (kind == RegionKind::column) {
      result.cells[offset] = static_cast<Cell>(offset * 9U + index);
    } else {
      result.cells[offset] = static_cast<Cell>(
          (index / 3U * 3U + offset / 3U) * 9U +
          (index % 3U * 3U + offset % 3U));
    }
  }
  return result;
}

const std::array<Unit, 27> &units() {
  static const auto value = [] {
    std::array<Unit, 27> result{};
    for (std::uint8_t index = 0; index < 9; ++index) {
      result[index] = makeUnit(RegionKind::row, index);
      result[9U + index] = makeUnit(RegionKind::column, index);
      result[18U + index] = makeUnit(RegionKind::box, index);
    }
    return result;
  }();
  return value;
}

std::vector<Region> regionsFor(const std::vector<Cell> &cells) {
  std::vector<Region> result;
  for (const auto cell : cells) {
    const std::array candidates{Region{RegionKind::row, row(cell)},
                                Region{RegionKind::column, column(cell)},
                                Region{RegionKind::box, box(cell)}};
    for (const auto region : candidates) {
      if (std::find(result.begin(), result.end(), region) == result.end()) {
        result.push_back(region);
      }
    }
  }
  return result;
}

void normalize(std::vector<Cell> &values) {
  std::sort(values.begin(), values.end());
  values.erase(std::unique(values.begin(), values.end()), values.end());
}
void normalize(std::vector<Candidate> &values) {
  std::sort(values.begin(), values.end(), [](const Candidate &a,
                                             const Candidate &b) {
    return a.cell < b.cell || (a.cell == b.cell && a.digit < b.digit);
  });
  values.erase(std::unique(values.begin(), values.end()), values.end());
}
void normalize(std::vector<Region> &values) {
  std::sort(values.begin(), values.end(), [](const Region &a, const Region &b) {
    return a.kind < b.kind || (a.kind == b.kind && a.index < b.index);
  });
  values.erase(std::unique(values.begin(), values.end()), values.end());
}

std::vector<Candidate> candidatesFor(const HintRequest &request,
                                     const std::vector<Cell> &cells,
                                     CandidateMask digits) {
  std::vector<Candidate> result;
  for (const auto cell : cells) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      if (has(digits, digit) && has(request.hintCandidates[cell], digit)) {
        result.push_back({cell, digit});
      }
    }
  }
  normalize(result);
  return result;
}

std::optional<HintStep>
eliminationStep(Technique technique, std::vector<Cell> focusCells,
                std::vector<Region> focusRegions,
                std::vector<Candidate> premises,
                std::vector<Candidate> eliminations) {
  normalize(focusCells);
  normalize(focusRegions);
  normalize(premises);
  normalize(eliminations);
  if (eliminations.empty()) {
    return std::nullopt;
  }
  return HintStep{technique, std::move(focusCells), std::move(focusRegions),
                  std::move(premises), std::move(eliminations), {}};
}

HintStep placementStep(Technique technique, Cell cell, Digit digit,
                       std::vector<Region> focusRegions,
                       std::vector<Candidate> premises = {}) {
  normalize(focusRegions);
  normalize(premises);
  return {technique, {cell}, std::move(focusRegions), std::move(premises), {},
          {{cell, digit}}};
}

template <typename Callback>
bool combinations(const std::vector<int> &items, int count, Callback callback) {
  std::vector<int> selected;
  std::function<bool(std::size_t)> visit = [&](std::size_t start) {
    if (selected.size() == static_cast<std::size_t>(count)) {
      return callback(selected);
    }
    const auto needed = static_cast<std::size_t>(count) - selected.size();
    for (std::size_t index = start; index + needed <= items.size(); ++index) {
      selected.push_back(items[index]);
      if (visit(index + 1U)) {
        return true;
      }
      selected.pop_back();
    }
    return false;
  };
  return visit(0);
}

std::optional<HintStep> findFullHouse(const HintRequest &request) {
  for (const auto &unit : units()) {
    Cell empty = 0;
    unsigned emptyCount = 0;
    CandidateMask present = 0;
    for (const auto cell : unit.cells) {
      if (request.board[cell] == 0) {
        empty = cell;
        ++emptyCount;
      } else {
        present = static_cast<CandidateMask>(present | bit(request.board[cell]));
      }
    }
    const auto missing = static_cast<CandidateMask>(kAllCandidatesMask & ~present);
    if (emptyCount == 1 && std::popcount(missing) == 1 &&
        (request.hintCandidates[empty] & missing) != 0) {
      const auto digit = static_cast<Digit>(std::countr_zero(missing) + 1U);
      return placementStep(Technique::fullHouse, empty, digit, {unit.region});
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findNakedSingle(const HintRequest &request) {
  for (Cell cell = 0; cell < 81; ++cell) {
    const auto mask = request.hintCandidates[cell];
    if (request.board[cell] == 0 && std::popcount(mask) == 1) {
      const auto digit = static_cast<Digit>(std::countr_zero(mask) + 1U);
      return placementStep(Technique::nakedSingle, cell, digit,
                           regionsFor({cell}), {{cell, digit}});
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findHiddenSingle(const HintRequest &request) {
  for (const auto &unit : units()) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::vector<Cell> positions;
      for (const auto cell : unit.cells) {
        if (request.board[cell] == 0 &&
            has(request.hintCandidates[cell], digit)) {
          positions.push_back(cell);
        }
      }
      if (positions.size() == 1) {
        return placementStep(Technique::hiddenSingle, positions.front(), digit,
                             {unit.region}, {{positions.front(), digit}});
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findLockedCandidates(const HintRequest &request,
                                             bool pointing) {
  if (pointing) {
    for (std::uint8_t boxIndex = 0; boxIndex < 9; ++boxIndex) {
      const auto boxUnit = makeUnit(RegionKind::box, boxIndex);
      for (Digit digit = 1; digit <= 9; ++digit) {
        std::vector<Cell> positions;
        for (const auto cell : boxUnit.cells) {
          if (has(request.hintCandidates[cell], digit)) {
            positions.push_back(cell);
          }
        }
        if (positions.size() < 2) {
          continue;
        }
        for (const auto kind : {RegionKind::row, RegionKind::column}) {
          const auto index = kind == RegionKind::row ? row(positions.front())
                                                     : column(positions.front());
          if (!std::all_of(positions.begin(), positions.end(), [&](Cell cell) {
                return (kind == RegionKind::row ? row(cell) : column(cell)) ==
                       index;
              })) {
            continue;
          }
          std::vector<Candidate> eliminations;
          const auto line = makeUnit(kind, index);
          for (const auto cell : line.cells) {
            if (box(cell) != boxIndex && has(request.hintCandidates[cell], digit)) {
              eliminations.push_back({cell, digit});
            }
          }
          if (auto step = eliminationStep(
                  Technique::lockedCandidatesPointing, positions,
                  {boxUnit.region, line.region},
                  candidatesFor(request, positions, bit(digit)), eliminations)) {
            return step;
          }
        }
      }
    }
    return std::nullopt;
  }

  for (const auto kind : {RegionKind::row, RegionKind::column}) {
    for (std::uint8_t index = 0; index < 9; ++index) {
      const auto line = makeUnit(kind, index);
      for (Digit digit = 1; digit <= 9; ++digit) {
        std::vector<Cell> positions;
        for (const auto cell : line.cells) {
          if (has(request.hintCandidates[cell], digit)) {
            positions.push_back(cell);
          }
        }
        if (positions.size() < 2 ||
            !std::all_of(positions.begin(), positions.end(), [&](Cell cell) {
              return box(cell) == box(positions.front());
            })) {
          continue;
        }
        const auto boxUnit = makeUnit(RegionKind::box, box(positions.front()));
        std::vector<Candidate> eliminations;
        for (const auto cell : boxUnit.cells) {
          if ((kind == RegionKind::row ? row(cell) : column(cell)) != index &&
              has(request.hintCandidates[cell], digit)) {
            eliminations.push_back({cell, digit});
          }
        }
        if (auto step = eliminationStep(
                Technique::lockedCandidatesClaiming, positions,
                {line.region, boxUnit.region},
                candidatesFor(request, positions, bit(digit)), eliminations)) {
          return step;
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findNakedSubset(const HintRequest &request, int size,
                                        Technique technique,
                                        bool requireIntersection) {
  for (const auto &unit : units()) {
    std::vector<int> eligible;
    for (const auto cell : unit.cells) {
      const auto count = std::popcount(request.hintCandidates[cell]);
      if (request.board[cell] == 0 && count >= 2 && count <= size) {
        eligible.push_back(cell);
      }
    }
    std::optional<HintStep> found;
    combinations(eligible, size, [&](const std::vector<int> &choice) {
      CandidateMask unionMask = 0;
      std::vector<Cell> pattern;
      for (const auto value : choice) {
        const auto cell = static_cast<Cell>(value);
        pattern.push_back(cell);
        unionMask = static_cast<CandidateMask>(
            unionMask | request.hintCandidates[cell]);
      }
      if (std::popcount(unionMask) != size) {
        return false;
      }
      if (requireIntersection) {
        const bool sameBox = std::all_of(pattern.begin(), pattern.end(),
                                         [&](Cell cell) {
                                           return box(cell) == box(pattern[0]);
                                         });
        const bool unitIsLine = unit.region.kind != RegionKind::box;
        const bool sameLine =
            std::all_of(pattern.begin(), pattern.end(), [&](Cell cell) {
              return row(cell) == row(pattern[0]);
            }) ||
            std::all_of(pattern.begin(), pattern.end(), [&](Cell cell) {
              return column(cell) == column(pattern[0]);
            });
        if (!(unitIsLine ? sameBox : sameLine)) {
          return false;
        }
      }
      std::vector<Candidate> eliminations;
      for (const auto cell : unit.cells) {
        if (std::find(pattern.begin(), pattern.end(), cell) != pattern.end()) {
          continue;
        }
        for (Digit digit = 1; digit <= 9; ++digit) {
          if (has(unionMask, digit) && has(request.hintCandidates[cell], digit)) {
            eliminations.push_back({cell, digit});
          }
        }
      }
      if (requireIntersection) {
        Unit cross{};
        if (unit.region.kind == RegionKind::box) {
          const bool sameRow = std::all_of(pattern.begin(), pattern.end(),
                                           [&](Cell cell) {
                                             return row(cell) == row(pattern[0]);
                                           });
          cross = makeUnit(sameRow ? RegionKind::row : RegionKind::column,
                           sameRow ? row(pattern[0]) : column(pattern[0]));
        } else {
          cross = makeUnit(RegionKind::box, box(pattern[0]));
        }
        for (const auto cell : cross.cells) {
          if (std::find(pattern.begin(), pattern.end(), cell) != pattern.end()) {
            continue;
          }
          for (Digit digit = 1; digit <= 9; ++digit) {
            if (has(unionMask, digit) && has(request.hintCandidates[cell], digit)) {
              eliminations.push_back({cell, digit});
            }
          }
        }
      }
      found = eliminationStep(technique, pattern, regionsFor(pattern),
                              candidatesFor(request, pattern, unionMask),
                              eliminations);
      return found.has_value();
    });
    if (found) {
      return found;
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findHiddenSubset(const HintRequest &request, int size,
                                         Technique technique) {
  const std::vector<int> digits{1, 2, 3, 4, 5, 6, 7, 8, 9};
  for (const auto &unit : units()) {
    std::optional<HintStep> found;
    combinations(digits, size, [&](const std::vector<int> &choice) {
      CandidateMask selectedMask = 0;
      std::vector<Cell> positions;
      for (const auto value : choice) {
        const auto digit = static_cast<Digit>(value);
        selectedMask = static_cast<CandidateMask>(selectedMask | bit(digit));
        bool seen = false;
        for (const auto cell : unit.cells) {
          if (has(request.hintCandidates[cell], digit)) {
            seen = true;
            positions.push_back(cell);
          }
        }
        if (!seen) {
          return false;
        }
      }
      normalize(positions);
      if (positions.size() != static_cast<std::size_t>(size)) {
        return false;
      }
      std::vector<Candidate> eliminations;
      for (const auto cell : positions) {
        const auto other = static_cast<CandidateMask>(
            request.hintCandidates[cell] & ~selectedMask);
        for (Digit digit = 1; digit <= 9; ++digit) {
          if (has(other, digit)) {
            eliminations.push_back({cell, digit});
          }
        }
      }
      found = eliminationStep(technique, positions, {unit.region},
                              candidatesFor(request, positions, selectedMask),
                              eliminations);
      return found.has_value();
    });
    if (found) {
      return found;
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findFish(const HintRequest &request, int size,
                                 Technique technique) {
  for (const bool rowsAreBase : {true, false}) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::vector<int> eligible;
      std::array<CandidateMask, 9> covers{};
      for (int base = 0; base < 9; ++base) {
        for (int cover = 0; cover < 9; ++cover) {
          const auto cell = static_cast<Cell>(rowsAreBase ? base * 9 + cover
                                                         : cover * 9 + base);
          if (has(request.hintCandidates[cell], digit)) {
            covers[base] = static_cast<CandidateMask>(covers[base] | (1U << cover));
          }
        }
        const auto count = std::popcount(covers[base]);
        if (count >= 2 && count <= size) {
          eligible.push_back(base);
        }
      }
      std::optional<HintStep> found;
      combinations(eligible, size, [&](const std::vector<int> &baseChoice) {
        CandidateMask coverUnion = 0;
        for (const auto base : baseChoice) {
          coverUnion = static_cast<CandidateMask>(coverUnion | covers[base]);
        }
        if (std::popcount(coverUnion) != size) {
          return false;
        }
        std::vector<Cell> pattern;
        std::vector<Candidate> eliminations;
        for (const auto base : baseChoice) {
          for (int cover = 0; cover < 9; ++cover) {
            if ((covers[base] & (1U << cover)) != 0) {
              pattern.push_back(static_cast<Cell>(rowsAreBase
                                                      ? base * 9 + cover
                                                      : cover * 9 + base));
            }
          }
        }
        for (int cover = 0; cover < 9; ++cover) {
          if ((coverUnion & (1U << cover)) == 0) {
            continue;
          }
          for (int base = 0; base < 9; ++base) {
            if (std::find(baseChoice.begin(), baseChoice.end(), base) !=
                baseChoice.end()) {
              continue;
            }
            const auto cell = static_cast<Cell>(rowsAreBase
                                                    ? base * 9 + cover
                                                    : cover * 9 + base);
            if (has(request.hintCandidates[cell], digit)) {
              eliminations.push_back({cell, digit});
            }
          }
        }
        std::vector<Region> focus;
        for (const auto base : baseChoice) {
          focus.push_back({rowsAreBase ? RegionKind::row : RegionKind::column,
                           static_cast<std::uint8_t>(base)});
        }
        found = eliminationStep(technique, pattern, focus,
                                candidatesFor(request, pattern, bit(digit)),
                                eliminations);
        return found.has_value();
      });
      if (found) {
        return found;
      }
    }
  }
  return std::nullopt;
}

std::vector<Cell> digitCells(const HintRequest &request, Digit digit) {
  std::vector<Cell> result;
  for (Cell cell = 0; cell < 81; ++cell) {
    if (has(request.hintCandidates[cell], digit)) {
      result.push_back(cell);
    }
  }
  return result;
}

std::vector<std::pair<Cell, Cell>> conjugateLinks(const HintRequest &request,
                                                  Digit digit) {
  std::vector<std::pair<Cell, Cell>> result;
  for (const auto &unit : units()) {
    std::vector<Cell> positions;
    for (const auto cell : unit.cells) {
      if (has(request.hintCandidates[cell], digit)) {
        positions.push_back(cell);
      }
    }
    if (positions.size() == 2) {
      auto link = std::minmax(positions[0], positions[1]);
      if (std::find(result.begin(), result.end(), link) == result.end()) {
        result.push_back(link);
      }
    }
  }
  std::sort(result.begin(), result.end());
  return result;
}

std::vector<Candidate> eliminationsSeeing(const HintRequest &request,
                                          const std::vector<Cell> &pattern,
                                          const std::vector<Cell> &required,
                                          Digit digit) {
  std::vector<Candidate> result;
  for (const auto cell : digitCells(request, digit)) {
    if (std::find(pattern.begin(), pattern.end(), cell) != pattern.end()) {
      continue;
    }
    if (std::all_of(required.begin(), required.end(),
                    [&](Cell endpoint) { return peers(cell, endpoint); })) {
      result.push_back({cell, digit});
    }
  }
  return result;
}

std::optional<HintStep> findSkyscraper(const HintRequest &request) {
  for (const bool rowsAreBase : {true, false}) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::array<std::vector<int>, 9> covers;
      for (int base = 0; base < 9; ++base) {
        for (int cover = 0; cover < 9; ++cover) {
          const auto cell = static_cast<Cell>(rowsAreBase ? base * 9 + cover
                                                         : cover * 9 + base);
          if (has(request.hintCandidates[cell], digit)) {
            covers[base].push_back(cover);
          }
        }
      }
      for (int first = 0; first < 8; ++first) {
        if (covers[first].size() != 2) {
          continue;
        }
        for (int second = first + 1; second < 9; ++second) {
          if (covers[second].size() != 2) {
            continue;
          }
          for (const auto shared : covers[first]) {
            if (std::find(covers[second].begin(), covers[second].end(), shared) ==
                covers[second].end()) {
              continue;
            }
            const auto roofA = *std::find_if(
                covers[first].begin(), covers[first].end(),
                [&](int value) { return value != shared; });
            const auto roofB = *std::find_if(
                covers[second].begin(), covers[second].end(),
                [&](int value) { return value != shared; });
            if (roofA == roofB) {
              continue;
            }
            const auto cellAt = [&](int base, int cover) {
              return static_cast<Cell>(rowsAreBase ? base * 9 + cover
                                                   : cover * 9 + base);
            };
            std::vector<Cell> pattern{cellAt(first, shared),
                                      cellAt(first, roofA),
                                      cellAt(second, shared),
                                      cellAt(second, roofB)};
            const std::vector<Cell> roofs{cellAt(first, roofA),
                                          cellAt(second, roofB)};
            auto eliminations =
                eliminationsSeeing(request, pattern, roofs, digit);
            if (auto step = eliminationStep(
                    Technique::skyscraper, pattern, regionsFor(pattern),
                    candidatesFor(request, pattern, bit(digit)), eliminations)) {
              return step;
            }
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findTwoStringKite(const HintRequest &request) {
  for (Digit digit = 1; digit <= 9; ++digit) {
    for (std::uint8_t rowIndex = 0; rowIndex < 9; ++rowIndex) {
      std::vector<Cell> rowCells;
      for (const auto cell : makeUnit(RegionKind::row, rowIndex).cells) {
        if (has(request.hintCandidates[cell], digit)) {
          rowCells.push_back(cell);
        }
      }
      if (rowCells.size() != 2) {
        continue;
      }
      for (std::uint8_t columnIndex = 0; columnIndex < 9; ++columnIndex) {
        std::vector<Cell> columnCells;
        for (const auto cell : makeUnit(RegionKind::column, columnIndex).cells) {
          if (has(request.hintCandidates[cell], digit)) {
            columnCells.push_back(cell);
          }
        }
        if (columnCells.size() != 2) {
          continue;
        }
        for (const auto rowBase : rowCells) {
          for (const auto columnBase : columnCells) {
            if (rowBase == columnBase || box(rowBase) != box(columnBase)) {
              continue;
            }
            const auto rowEnd = rowCells[0] == rowBase ? rowCells[1] : rowCells[0];
            const auto columnEnd = columnCells[0] == columnBase
                                       ? columnCells[1]
                                       : columnCells[0];
            std::vector<Cell> pattern{rowBase, rowEnd, columnBase, columnEnd};
            auto eliminations = eliminationsSeeing(
                request, pattern, {rowEnd, columnEnd}, digit);
            if (auto step = eliminationStep(
                    Technique::twoStringKite, pattern, regionsFor(pattern),
                    candidatesFor(request, pattern, bit(digit)), eliminations)) {
              return step;
            }
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findTurbotFish(const HintRequest &request) {
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto links = conjugateLinks(request, digit);
    for (const auto &[a, b] : links) {
      for (const auto &[c, d] : links) {
        if (a == c && b == d) {
          continue;
        }
        for (const auto leftInner : {a, b}) {
          const auto leftEnd = leftInner == a ? b : a;
          for (const auto rightInner : {c, d}) {
            const auto rightEnd = rightInner == c ? d : c;
            if (!peers(leftInner, rightInner) || leftEnd == rightEnd ||
                peers(leftEnd, rightEnd)) {
              continue;
            }
            std::vector<Cell> pattern{leftEnd, leftInner, rightInner, rightEnd};
            auto eliminations = eliminationsSeeing(
                request, pattern, {leftEnd, rightEnd}, digit);
            if (auto step = eliminationStep(
                    Technique::turbotFish, pattern, regionsFor(pattern),
                    candidatesFor(request, pattern, bit(digit)), eliminations)) {
              return step;
            }
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::vector<Cell> bivalueCells(const HintRequest &request) {
  std::vector<Cell> result;
  for (Cell cell = 0; cell < 81; ++cell) {
    if (std::popcount(request.hintCandidates[cell]) == 2) {
      result.push_back(cell);
    }
  }
  return result;
}

std::optional<HintStep> findWWing(const HintRequest &request) {
  const auto bivalue = bivalueCells(request);
  for (std::size_t first = 0; first < bivalue.size(); ++first) {
    const auto a = bivalue[first];
    for (std::size_t second = first + 1; second < bivalue.size(); ++second) {
      const auto b = bivalue[second];
      const auto mask = request.hintCandidates[a];
      if (request.hintCandidates[b] != mask || peers(a, b)) {
        continue;
      }
      for (Digit linkDigit = 1; linkDigit <= 9; ++linkDigit) {
        if (!has(mask, linkDigit)) {
          continue;
        }
        const auto eliminateDigit = static_cast<Digit>(
            std::countr_zero(static_cast<CandidateMask>(mask & ~bit(linkDigit))) +
            1U);
        for (const auto &[left, right] : conjugateLinks(request, linkDigit)) {
          if (!((peers(a, left) && peers(b, right)) ||
                (peers(a, right) && peers(b, left)))) {
            continue;
          }
          std::vector<Cell> pattern{a, b, left, right};
          auto eliminations =
              eliminationsSeeing(request, pattern, {a, b}, eliminateDigit);
          if (auto step = eliminationStep(
                  Technique::wWing, pattern, regionsFor(pattern),
                  candidatesFor(request, pattern,
                                static_cast<CandidateMask>(mask | bit(linkDigit))),
                  eliminations)) {
            return step;
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findXYWing(const HintRequest &request, bool xyz) {
  for (Cell pivot = 0; pivot < 81; ++pivot) {
    const auto pivotMask = request.hintCandidates[pivot];
    if (std::popcount(pivotMask) != (xyz ? 3 : 2)) {
      continue;
    }
    for (Cell wingA = 0; wingA < 81; ++wingA) {
      const auto maskA = request.hintCandidates[wingA];
      if (!peers(pivot, wingA) || std::popcount(maskA) != 2 ||
          std::popcount(static_cast<CandidateMask>(maskA & pivotMask)) == 0) {
        continue;
      }
      for (Cell wingB = static_cast<Cell>(wingA + 1U); wingB < 81; ++wingB) {
        const auto maskB = request.hintCandidates[wingB];
        if (!peers(pivot, wingB) || std::popcount(maskB) != 2) {
          continue;
        }
        const auto common = static_cast<CandidateMask>(maskA & maskB);
        if (std::popcount(common) != 1) {
          continue;
        }
        const auto z = static_cast<Digit>(std::countr_zero(common) + 1U);
        if (xyz) {
          if (!has(pivotMask, z) ||
              static_cast<CandidateMask>(maskA | maskB) != pivotMask) {
            continue;
          }
        } else {
          if (has(pivotMask, z) ||
              static_cast<CandidateMask>((maskA | maskB) & ~common) !=
                  pivotMask) {
            continue;
          }
        }
        std::vector<Cell> pattern{pivot, wingA, wingB};
        std::vector<Cell> required{wingA, wingB};
        if (xyz) {
          required.push_back(pivot);
        }
        auto eliminations = eliminationsSeeing(request, pattern, required, z);
        if (auto step = eliminationStep(
                xyz ? Technique::xyzWing : Technique::xyWing, pattern,
                regionsFor(pattern),
                candidatesFor(request, pattern,
                              static_cast<CandidateMask>(pivotMask | maskA |
                                                         maskB)),
                eliminations)) {
          return step;
        }
      }
    }
  }
  return std::nullopt;
}

struct ColoredComponent {
  Digit digit{};
  std::vector<Cell> cells;
  std::vector<int> colors;
};

std::vector<ColoredComponent> coloringComponents(const HintRequest &request,
                                                 Digit digit) {
  std::array<std::vector<Cell>, 81> adjacency;
  for (const auto &[a, b] : conjugateLinks(request, digit)) {
    adjacency[a].push_back(b);
    adjacency[b].push_back(a);
  }
  std::array<int, 81> color{};
  color.fill(-1);
  std::vector<ColoredComponent> result;
  for (Cell start = 0; start < 81; ++start) {
    if (adjacency[start].empty() || color[start] != -1) {
      continue;
    }
    ColoredComponent component{digit, {}, {}};
    std::queue<Cell> pending;
    pending.push(start);
    color[start] = 0;
    while (!pending.empty()) {
      const auto cell = pending.front();
      pending.pop();
      component.cells.push_back(cell);
      component.colors.push_back(color[cell]);
      for (const auto next : adjacency[cell]) {
        if (color[next] == -1) {
          color[next] = 1 - color[cell];
          pending.push(next);
        }
      }
    }
    std::vector<std::pair<Cell, int>> ordered;
    for (std::size_t i = 0; i < component.cells.size(); ++i) {
      ordered.emplace_back(component.cells[i], component.colors[i]);
    }
    std::sort(ordered.begin(), ordered.end());
    component.cells.clear();
    component.colors.clear();
    for (const auto &[cell, cellColor] : ordered) {
      component.cells.push_back(cell);
      component.colors.push_back(cellColor);
    }
    result.push_back(std::move(component));
  }
  return result;
}

std::vector<Cell> cellsOfColor(const ColoredComponent &component, int color) {
  std::vector<Cell> result;
  for (std::size_t index = 0; index < component.cells.size(); ++index) {
    if (component.colors[index] == color) {
      result.push_back(component.cells[index]);
    }
  }
  return result;
}

std::optional<HintStep> findSimpleColoring(const HintRequest &request) {
  for (Digit digit = 1; digit <= 9; ++digit) {
    for (const auto &component : coloringComponents(request, digit)) {
      for (int badColor = 0; badColor <= 1; ++badColor) {
        const auto colored = cellsOfColor(component, badColor);
        bool contradiction = false;
        for (std::size_t a = 0; a < colored.size() && !contradiction; ++a) {
          for (std::size_t b = a + 1; b < colored.size(); ++b) {
            if (peers(colored[a], colored[b])) {
              contradiction = true;
              break;
            }
          }
        }
        if (contradiction) {
          std::vector<Candidate> eliminations;
          for (const auto cell : colored) {
            eliminations.push_back({cell, digit});
          }
          if (auto step = eliminationStep(
                  Technique::simpleColoring, component.cells,
                  regionsFor(component.cells),
                  candidatesFor(request, component.cells, bit(digit)),
                  eliminations)) {
            return step;
          }
        }
      }
      const auto colorZero = cellsOfColor(component, 0);
      const auto colorOne = cellsOfColor(component, 1);
      std::vector<Candidate> eliminations;
      for (const auto target : digitCells(request, digit)) {
        if (std::find(component.cells.begin(), component.cells.end(), target) !=
            component.cells.end()) {
          continue;
        }
        const bool seesZero = std::any_of(colorZero.begin(), colorZero.end(),
                                          [&](Cell cell) {
                                            return peers(target, cell);
                                          });
        const bool seesOne = std::any_of(colorOne.begin(), colorOne.end(),
                                         [&](Cell cell) {
                                           return peers(target, cell);
                                         });
        if (seesZero && seesOne) {
          eliminations.push_back({target, digit});
        }
      }
      if (auto step = eliminationStep(
              Technique::simpleColoring, component.cells,
              regionsFor(component.cells),
              candidatesFor(request, component.cells, bit(digit)),
              eliminations)) {
        return step;
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findMultiColoring(const HintRequest &request,
                                          Technique technique) {
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto components = coloringComponents(request, digit);
    for (std::size_t first = 0; first < components.size(); ++first) {
      for (std::size_t second = first + 1; second < components.size(); ++second) {
        for (int firstColor = 0; firstColor <= 1; ++firstColor) {
          for (int secondColor = 0; secondColor <= 1; ++secondColor) {
            const auto firstSide =
                cellsOfColor(components[first], firstColor);
            const auto secondSide =
                cellsOfColor(components[second], secondColor);
            const bool conflict = std::any_of(
                firstSide.begin(), firstSide.end(), [&](Cell a) {
                  return std::any_of(secondSide.begin(), secondSide.end(),
                                     [&](Cell b) { return peers(a, b); });
                });
            if (!conflict) {
              continue;
            }
            const auto forcedFirst =
                cellsOfColor(components[first], 1 - firstColor);
            const auto forcedSecond =
                cellsOfColor(components[second], 1 - secondColor);
            std::vector<Cell> pattern = components[first].cells;
            pattern.insert(pattern.end(), components[second].cells.begin(),
                           components[second].cells.end());
            auto eliminations = eliminationsSeeing(
                request, pattern, {}, digit);
            eliminations.clear();
            for (const auto target : digitCells(request, digit)) {
              if (std::find(pattern.begin(), pattern.end(), target) !=
                  pattern.end()) {
                continue;
              }
              const bool seesFirst =
                  std::any_of(forcedFirst.begin(), forcedFirst.end(),
                              [&](Cell cell) { return peers(target, cell); });
              const bool seesSecond =
                  std::any_of(forcedSecond.begin(), forcedSecond.end(),
                              [&](Cell cell) { return peers(target, cell); });
              if (seesFirst && seesSecond) {
                eliminations.push_back({target, digit});
              }
            }
            if (auto step = eliminationStep(
                    technique, pattern, regionsFor(pattern),
                    candidatesFor(request, pattern, bit(digit)), eliminations)) {
              return step;
            }
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findRemotePair(const HintRequest &request) {
  const auto bivalue = bivalueCells(request);
  for (CandidateMask pairMask = 1; pairMask <= kAllCandidatesMask; ++pairMask) {
    if (std::popcount(pairMask) != 2) {
      continue;
    }
    std::vector<Cell> nodes;
    for (const auto cell : bivalue) {
      if (request.hintCandidates[cell] == pairMask) {
        nodes.push_back(cell);
      }
    }
    std::array<int, 81> color{};
    color.fill(-1);
    for (const auto start : nodes) {
      if (color[start] != -1) {
        continue;
      }
      std::queue<Cell> pending;
      std::vector<Cell> component;
      pending.push(start);
      color[start] = 0;
      bool bipartite = true;
      while (!pending.empty()) {
        const auto cell = pending.front();
        pending.pop();
        component.push_back(cell);
        for (const auto next : nodes) {
          if (!peers(cell, next)) {
            continue;
          }
          if (color[next] == -1) {
            color[next] = 1 - color[cell];
            pending.push(next);
          } else if (color[next] == color[cell]) {
            bipartite = false;
          }
        }
      }
      if (!bipartite || component.size() < 4) {
        continue;
      }
      std::vector<Cell> zero;
      std::vector<Cell> one;
      for (const auto cell : component) {
        (color[cell] == 0 ? zero : one).push_back(cell);
      }
      std::vector<Candidate> eliminations;
      for (Cell target = 0; target < 81; ++target) {
        if (std::find(component.begin(), component.end(), target) !=
            component.end()) {
          continue;
        }
        const bool seesZero = std::any_of(zero.begin(), zero.end(),
                                          [&](Cell cell) {
                                            return peers(target, cell);
                                          });
        const bool seesOne = std::any_of(one.begin(), one.end(),
                                         [&](Cell cell) {
                                           return peers(target, cell);
                                         });
        if (!seesZero || !seesOne) {
          continue;
        }
        for (Digit digit = 1; digit <= 9; ++digit) {
          if (has(pairMask, digit) &&
              has(request.hintCandidates[target], digit)) {
            eliminations.push_back({target, digit});
          }
        }
      }
      if (auto step = eliminationStep(
              Technique::remotePair, component, regionsFor(component),
              candidatesFor(request, component, pairMask), eliminations)) {
        return step;
      }
    }
  }
  return std::nullopt;
}

template <typename Callback> bool rectangles(Callback callback) {
  for (int r1 = 0; r1 < 8; ++r1) {
    for (int r2 = r1 + 1; r2 < 9; ++r2) {
      for (int c1 = 0; c1 < 8; ++c1) {
        for (int c2 = c1 + 1; c2 < 9; ++c2) {
          std::vector<Cell> cells{static_cast<Cell>(r1 * 9 + c1),
                                  static_cast<Cell>(r1 * 9 + c2),
                                  static_cast<Cell>(r2 * 9 + c1),
                                  static_cast<Cell>(r2 * 9 + c2)};
          std::set<std::uint8_t> boxes;
          for (const auto cell : cells) {
            boxes.insert(box(cell));
          }
          if (boxes.size() == 2 && callback(cells)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

std::optional<HintStep> findUniqueRectangle(const HintRequest &request) {
  std::optional<HintStep> found;
  rectangles([&](const std::vector<Cell> &cells) {
    for (CandidateMask pairMask = 1; pairMask <= kAllCandidatesMask; ++pairMask) {
      if (std::popcount(pairMask) != 2) {
        continue;
      }
      for (const auto roof : cells) {
        int exact = 0;
        bool valid = (request.hintCandidates[roof] & pairMask) == pairMask &&
                     request.hintCandidates[roof] != pairMask;
        for (const auto cell : cells) {
          if (cell != roof) {
            exact += request.hintCandidates[cell] == pairMask ? 1 : 0;
          }
        }
        if (!valid || exact != 3) {
          continue;
        }
        std::vector<Candidate> eliminations;
        for (Digit digit = 1; digit <= 9; ++digit) {
          if (has(pairMask, digit)) {
            eliminations.push_back({roof, digit});
          }
        }
        found = eliminationStep(
            Technique::uniqueRectangle, cells, regionsFor(cells),
            candidatesFor(request, cells, pairMask), eliminations);
        if (found) {
          return true;
        }
      }
    }
    return false;
  });
  return found;
}

std::optional<HintStep> findHiddenRectangle(const HintRequest &request) {
  std::optional<HintStep> found;
  rectangles([&](const std::vector<Cell> &cells) {
    for (CandidateMask pairMask = 1; pairMask <= kAllCandidatesMask; ++pairMask) {
      if (std::popcount(pairMask) != 2 ||
          !std::all_of(cells.begin(), cells.end(), [&](Cell cell) {
            return (request.hintCandidates[cell] & pairMask) == pairMask;
          })) {
        continue;
      }
      for (const bool roofIsSecondRow : {false, true}) {
        const std::vector<Cell> roof = roofIsSecondRow
                                           ? std::vector<Cell>{cells[2], cells[3]}
                                           : std::vector<Cell>{cells[0], cells[1]};
        const std::vector<Cell> floor = roofIsSecondRow
                                            ? std::vector<Cell>{cells[0], cells[1]}
                                            : std::vector<Cell>{cells[2], cells[3]};
        if (!std::all_of(floor.begin(), floor.end(), [&](Cell cell) {
              return request.hintCandidates[cell] == pairMask;
            })) {
          continue;
        }
        for (Digit strongDigit = 1; strongDigit <= 9; ++strongDigit) {
          if (!has(pairMask, strongDigit)) {
            continue;
          }
          const auto rowUnit = makeUnit(RegionKind::row, row(roof[0]));
          std::vector<Cell> positions;
          for (const auto cell : rowUnit.cells) {
            if (has(request.hintCandidates[cell], strongDigit)) {
              positions.push_back(cell);
            }
          }
          if (positions.size() != 2 ||
              std::find(positions.begin(), positions.end(), roof[0]) ==
                  positions.end() ||
              std::find(positions.begin(), positions.end(), roof[1]) ==
                  positions.end()) {
            continue;
          }
          const auto otherDigit = static_cast<Digit>(std::countr_zero(
                                      static_cast<CandidateMask>(
                                          pairMask & ~bit(strongDigit))) +
                                  1U);
          std::vector<Candidate> eliminations;
          for (const auto cell : roof) {
            eliminations.push_back({cell, otherDigit});
          }
          found = eliminationStep(
              Technique::hiddenRectangle, cells, regionsFor(cells),
              candidatesFor(request, cells, pairMask), eliminations);
          if (found) {
            return true;
          }
        }
      }
    }
    return false;
  });
  return found;
}

std::optional<HintStep> findAvoidableRectangle(const HintRequest &request) {
  std::optional<HintStep> found;
  rectangles([&](const std::vector<Cell> &cells) {
    for (std::size_t emptyIndex = 0; emptyIndex < cells.size(); ++emptyIndex) {
      const auto target = cells[emptyIndex];
      if (request.board[target] != 0) {
        continue;
      }
      std::vector<Cell> filled;
      for (std::size_t index = 0; index < cells.size(); ++index) {
        if (index != emptyIndex && request.board[cells[index]] != 0 &&
            !request.givenCells[cells[index]]) {
          filled.push_back(cells[index]);
        }
      }
      if (filled.size() != 3) {
        continue;
      }
      const auto opposite = cells[3U - emptyIndex];
      const auto deadlyDigit = request.board[opposite];
      if (!has(request.hintCandidates[target], deadlyDigit)) {
        continue;
      }
      const auto adjacentA = cells[emptyIndex ^ 1U];
      const auto adjacentB = cells[emptyIndex ^ 2U];
      if (request.board[adjacentA] == 0 ||
          request.board[adjacentA] != request.board[adjacentB] ||
          request.board[adjacentA] == deadlyDigit) {
        continue;
      }
      found = eliminationStep(
          Technique::avoidableRectangle, cells, regionsFor(cells),
          {{opposite, deadlyDigit}, {adjacentA, request.board[adjacentA]},
           {adjacentB, request.board[adjacentB]}},
          {{target, deadlyDigit}});
      return found.has_value();
    }
    return false;
  });
  return found;
}

std::optional<HintStep> findBugPlusOne(const HintRequest &request) {
  Cell triple = 0;
  int triples = 0;
  for (Cell cell = 0; cell < 81; ++cell) {
    if (request.board[cell] != 0) {
      continue;
    }
    const auto count = std::popcount(request.hintCandidates[cell]);
    if (count == 3) {
      triple = cell;
      ++triples;
    } else if (count != 2) {
      return std::nullopt;
    }
  }
  if (triples != 1) {
    return std::nullopt;
  }
  for (Digit digit = 1; digit <= 9; ++digit) {
    if (!has(request.hintCandidates[triple], digit)) {
      continue;
    }
    bool oddInAllUnits = true;
    for (const auto kind : {RegionKind::row, RegionKind::column,
                            RegionKind::box}) {
      const auto index = kind == RegionKind::row
                             ? row(triple)
                             : (kind == RegionKind::column ? column(triple)
                                                           : box(triple));
      int count = 0;
      for (const auto cell : makeUnit(kind, index).cells) {
        count += has(request.hintCandidates[cell], digit) ? 1 : 0;
      }
      oddInAllUnits = oddInAllUnits && count % 2 == 1;
    }
    if (oddInAllUnits) {
      return placementStep(Technique::bugPlusOne, triple, digit,
                           regionsFor({triple}),
                           candidatesFor(request, {triple},
                                         request.hintCandidates[triple]));
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findFinnedXWing(const HintRequest &request,
                                        bool sashimi) {
  for (const bool rowsAreBase : {true, false}) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::array<CandidateMask, 9> covers{};
      for (int base = 0; base < 9; ++base) {
        for (int cover = 0; cover < 9; ++cover) {
          const auto cell = static_cast<Cell>(rowsAreBase ? base * 9 + cover
                                                         : cover * 9 + base);
          if (has(request.hintCandidates[cell], digit)) {
            covers[base] = static_cast<CandidateMask>(covers[base] | (1U << cover));
          }
        }
      }
      for (int mainBase = 0; mainBase < 9; ++mainBase) {
        if (std::popcount(covers[mainBase]) != 2) {
          continue;
        }
        for (int finBase = 0; finBase < 9; ++finBase) {
          if (finBase == mainBase) {
            continue;
          }
          const auto corePresent = static_cast<CandidateMask>(
              covers[finBase] & covers[mainBase]);
          const auto fins = static_cast<CandidateMask>(
              covers[finBase] & ~covers[mainBase]);
          if (fins == 0 ||
              (sashimi ? std::popcount(corePresent) != 1
                       : corePresent != covers[mainBase])) {
            continue;
          }
          std::vector<int> finCovers;
          for (int cover = 0; cover < 9; ++cover) {
            if ((fins & (1U << cover)) != 0) {
              finCovers.push_back(cover);
            }
          }
          const auto cellAt = [&](int base, int cover) {
            return static_cast<Cell>(rowsAreBase ? base * 9 + cover
                                                 : cover * 9 + base);
          };
          const auto finBox = box(cellAt(finBase, finCovers.front()));
          if (!std::all_of(finCovers.begin(), finCovers.end(), [&](int cover) {
                return box(cellAt(finBase, cover)) == finBox;
              })) {
            continue;
          }
          std::vector<Cell> pattern;
          for (int cover = 0; cover < 9; ++cover) {
            if (((covers[mainBase] | covers[finBase]) & (1U << cover)) != 0) {
              if ((covers[mainBase] & (1U << cover)) != 0) {
                pattern.push_back(cellAt(mainBase, cover));
              }
              if ((covers[finBase] & (1U << cover)) != 0) {
                pattern.push_back(cellAt(finBase, cover));
              }
            }
          }
          std::vector<Candidate> eliminations;
          const auto targetCovers = sashimi ? corePresent : covers[mainBase];
          for (int cover = 0; cover < 9; ++cover) {
            if ((targetCovers & (1U << cover)) == 0) {
              continue;
            }
            for (int base = 0; base < 9; ++base) {
              if (base == mainBase || base == finBase) {
                continue;
              }
              const auto target = cellAt(base, cover);
              if (box(target) == finBox &&
                  has(request.hintCandidates[target], digit)) {
                eliminations.push_back({target, digit});
              }
            }
          }
          if (auto step = eliminationStep(
                  sashimi ? Technique::sashimiXWing
                          : Technique::finnedXWing,
                  pattern, regionsFor(pattern),
                  candidatesFor(request, pattern, bit(digit)), eliminations)) {
            return step;
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findXChain(const HintRequest &request) {
  constexpr int maxEdges = 9;
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto nodes = digitCells(request, digit);
    const auto strong = conjugateLinks(request, digit);
    const auto isStrong = [&](Cell a, Cell b) {
      const auto link = std::minmax(a, b);
      return std::find(strong.begin(), strong.end(), link) != strong.end();
    };
    for (const auto start : nodes) {
      std::vector<Cell> path{start};
      std::optional<HintStep> found;
      std::function<bool(bool, int)> dfs = [&](bool requireStrong, int edges) {
        if (cancelled(request)) {
          return false;
        }
        if (edges >= 3 && edges % 2 == 1 && requireStrong == false) {
          const auto end = path.back();
          auto eliminations =
              eliminationsSeeing(request, path, {start, end}, digit);
          found = eliminationStep(
              Technique::xChain, path, regionsFor(path),
              candidatesFor(request, path, bit(digit)), eliminations);
          if (found) {
            return true;
          }
        }
        if (edges == maxEdges) {
          return false;
        }
        const auto current = path.back();
        for (const auto next : nodes) {
          if (std::find(path.begin(), path.end(), next) != path.end() ||
              !peers(current, next)) {
            continue;
          }
          const bool linkStrong = isStrong(current, next);
          if ((requireStrong && !linkStrong) || (!requireStrong && linkStrong)) {
            continue;
          }
          path.push_back(next);
          if (dfs(!requireStrong, edges + 1)) {
            return true;
          }
          path.pop_back();
        }
        return false;
      };
      if (dfs(true, 0)) {
        return found;
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findXYChain(const HintRequest &request) {
  constexpr int maxCells = 10;
  const auto bivalue = bivalueCells(request);
  for (const auto start : bivalue) {
    const auto startMask = request.hintCandidates[start];
    for (Digit targetDigit = 1; targetDigit <= 9; ++targetDigit) {
      if (!has(startMask, targetDigit)) {
        continue;
      }
      const auto outgoing = static_cast<Digit>(std::countr_zero(
                                static_cast<CandidateMask>(startMask &
                                                           ~bit(targetDigit))) +
                            1U);
      std::vector<Cell> path{start};
      std::vector<Digit> links;
      std::optional<HintStep> found;
      std::function<bool(Digit)> dfs = [&](Digit linkDigit) {
        if (cancelled(request)) {
          return false;
        }
        if (path.size() >= static_cast<std::size_t>(maxCells)) {
          return false;
        }
        const auto current = path.back();
        for (const auto next : bivalue) {
          if (!peers(current, next) ||
              std::find(path.begin(), path.end(), next) != path.end() ||
              !has(request.hintCandidates[next], linkDigit)) {
            continue;
          }
          const auto nextDigit = static_cast<Digit>(std::countr_zero(
                                     static_cast<CandidateMask>(
                                         request.hintCandidates[next] &
                                         ~bit(linkDigit))) +
                                 1U);
          path.push_back(next);
          links.push_back(linkDigit);
          if (nextDigit == targetDigit && path.size() >= 3 &&
              !peers(start, next)) {
            auto eliminations = eliminationsSeeing(
                request, path, {start, next}, targetDigit);
            CandidateMask premiseDigits = startMask;
            for (const auto cell : path) {
              premiseDigits = static_cast<CandidateMask>(
                  premiseDigits | request.hintCandidates[cell]);
            }
            found = eliminationStep(
                Technique::xyChain, path, regionsFor(path),
                candidatesFor(request, path, premiseDigits), eliminations);
            if (found) {
              return true;
            }
          }
          if (dfs(nextDigit)) {
            return true;
          }
          links.pop_back();
          path.pop_back();
        }
        return false;
      };
      if (dfs(outgoing)) {
        return found;
      }
    }
  }
  return std::nullopt;
}

constexpr int literal(int candidateId, bool truth) noexcept {
  return candidateId * 2 + (truth ? 1 : 0);
}
constexpr int candidateId(Cell cell, Digit digit) noexcept {
  return static_cast<int>(cell) * 9 + static_cast<int>(digit) - 1;
}
constexpr Candidate candidateFromLiteral(int value) noexcept {
  const auto id = value / 2;
  return {static_cast<Cell>(id / 9), static_cast<Digit>(id % 9 + 1)};
}

struct ImplicationGraph {
  static constexpr int kLiteralCount = 81 * 9 * 2;
  std::array<std::vector<int>, kLiteralCount> edges;
};

void addImplication(ImplicationGraph &graph, int from, int to) {
  auto &edges = graph.edges[from];
  if (std::find(edges.begin(), edges.end(), to) == edges.end()) {
    edges.push_back(to);
  }
}

ImplicationGraph buildImplicationGraph(const HintRequest &request) {
  ImplicationGraph graph;
  for (Cell cell = 0; cell < 81; ++cell) {
    std::vector<Digit> digits;
    for (Digit digit = 1; digit <= 9; ++digit) {
      if (has(request.hintCandidates[cell], digit)) {
        digits.push_back(digit);
      }
    }
    for (const auto a : digits) {
      for (const auto b : digits) {
        if (a != b) {
          addImplication(graph, literal(candidateId(cell, a), true),
                         literal(candidateId(cell, b), false));
        }
      }
    }
    if (digits.size() == 2) {
      addImplication(graph, literal(candidateId(cell, digits[0]), false),
                     literal(candidateId(cell, digits[1]), true));
      addImplication(graph, literal(candidateId(cell, digits[1]), false),
                     literal(candidateId(cell, digits[0]), true));
    }
  }
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto cells = digitCells(request, digit);
    for (const auto a : cells) {
      for (const auto b : cells) {
        if (peers(a, b)) {
          addImplication(graph, literal(candidateId(a, digit), true),
                         literal(candidateId(b, digit), false));
        }
      }
    }
    for (const auto &[a, b] : conjugateLinks(request, digit)) {
      addImplication(graph, literal(candidateId(a, digit), false),
                     literal(candidateId(b, digit), true));
      addImplication(graph, literal(candidateId(b, digit), false),
                     literal(candidateId(a, digit), true));
    }
  }
  for (auto &edges : graph.edges) {
    std::sort(edges.begin(), edges.end());
  }
  return graph;
}

struct Closure {
  std::array<bool, ImplicationGraph::kLiteralCount> reached{};
  std::array<int, ImplicationGraph::kLiteralCount> parent{};
};

Closure closure(const ImplicationGraph &graph, int start, int maximumDepth = 18,
                const std::atomic_bool *cancelRequested = nullptr) {
  Closure result;
  result.parent.fill(-1);
  std::array<int, ImplicationGraph::kLiteralCount> depth{};
  std::queue<int> pending;
  result.reached[start] = true;
  pending.push(start);
  int visited = 0;
  constexpr int maximumVisited = 1200;
  while (!pending.empty() && visited < maximumVisited &&
         (cancelRequested == nullptr ||
          !cancelRequested->load(std::memory_order_relaxed))) {
    const auto current = pending.front();
    pending.pop();
    ++visited;
    if (depth[current] >= maximumDepth) {
      continue;
    }
    for (const auto next : graph.edges[current]) {
      if (!result.reached[next]) {
        result.reached[next] = true;
        result.parent[next] = current;
        depth[next] = depth[current] + 1;
        pending.push(next);
      }
    }
  }
  return result;
}

std::vector<Candidate> proofCandidates(const std::vector<Closure> &closures,
                                       const std::vector<int> &targets) {
  std::vector<Candidate> result;
  for (std::size_t index = 0; index < closures.size(); ++index) {
    auto current = targets[index];
    while (current != -1) {
      result.push_back(candidateFromLiteral(current));
      current = closures[index].parent[current];
    }
  }
  normalize(result);
  return result;
}

std::optional<HintStep> findAic(const HintRequest &request,
                                Technique technique) {
  const auto graph = buildImplicationGraph(request);
  for (Cell cell = 0; cell < 81; ++cell) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      if (!has(request.hintCandidates[cell], digit)) {
        continue;
      }
      const auto id = candidateId(cell, digit);
      const auto fromTrue =
          closure(graph, literal(id, true), 18, request.cancelRequested);
      if (fromTrue.reached[literal(id, false)]) {
        auto premises = proofCandidates({fromTrue}, {literal(id, false)});
        std::vector<Cell> focus;
        for (const auto premise : premises) {
          focus.push_back(premise.cell);
        }
        return eliminationStep(technique, focus, regionsFor(focus), premises,
                               {{cell, digit}});
      }
      const auto fromFalse =
          closure(graph, literal(id, false), 18, request.cancelRequested);
      if (fromFalse.reached[literal(id, true)]) {
        auto premises = proofCandidates({fromFalse}, {literal(id, true)});
        std::vector<Cell> focus;
        for (const auto premise : premises) {
          focus.push_back(premise.cell);
        }
        return placementStep(technique, cell, digit, regionsFor(focus),
                             premises);
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findForcingChain(const HintRequest &request,
                                         Technique technique) {
  const auto graph = buildImplicationGraph(request);
  for (Cell sourceCell = 0; sourceCell < 81; ++sourceCell) {
    for (Digit sourceDigit = 1; sourceDigit <= 9; ++sourceDigit) {
      if (!has(request.hintCandidates[sourceCell], sourceDigit)) {
        continue;
      }
      const auto source = candidateId(sourceCell, sourceDigit);
      const auto whenTrue =
          closure(graph, literal(source, true), 18, request.cancelRequested);
      const auto whenFalse =
          closure(graph, literal(source, false), 18, request.cancelRequested);
      for (Cell targetCell = 0; targetCell < 81; ++targetCell) {
        for (Digit targetDigit = 1; targetDigit <= 9; ++targetDigit) {
          if (!has(request.hintCandidates[targetCell], targetDigit) ||
              (targetCell == sourceCell && targetDigit == sourceDigit)) {
            continue;
          }
          const auto target = candidateId(targetCell, targetDigit);
          for (const bool truth : {false, true}) {
            const auto targetLiteral = literal(target, truth);
            if (!whenTrue.reached[targetLiteral] ||
                !whenFalse.reached[targetLiteral]) {
              continue;
            }
            auto premises = proofCandidates(
                {whenTrue, whenFalse}, {targetLiteral, targetLiteral});
            std::vector<Cell> focus;
            for (const auto premise : premises) {
              focus.push_back(premise.cell);
            }
            if (truth) {
              return placementStep(technique, targetCell, targetDigit,
                                   regionsFor(focus), premises);
            }
            return eliminationStep(technique, focus, regionsFor(focus),
                                   premises, {{targetCell, targetDigit}});
          }
        }
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep>
findBranchCommonConsequence(const HintRequest &request, Technique technique,
                            const std::vector<Candidate> &branches) {
  if (branches.size() < 3 || branches.size() > 6) {
    return std::nullopt;
  }
  const auto graph = buildImplicationGraph(request);
  std::vector<Closure> closures;
  for (const auto branch : branches) {
    closures.push_back(closure(graph,
                               literal(candidateId(branch.cell, branch.digit),
                                       true),
                               14, request.cancelRequested));
  }
  for (Cell targetCell = 0; targetCell < 81; ++targetCell) {
    for (Digit targetDigit = 1; targetDigit <= 9; ++targetDigit) {
      if (!has(request.hintCandidates[targetCell], targetDigit) ||
          std::find(branches.begin(), branches.end(),
                    Candidate{targetCell, targetDigit}) != branches.end()) {
        continue;
      }
      const auto target = candidateId(targetCell, targetDigit);
      for (const bool truth : {false, true}) {
        const auto targetLiteral = literal(target, truth);
        if (!std::all_of(closures.begin(), closures.end(),
                         [&](const Closure &item) {
                           return item.reached[targetLiteral];
                         })) {
          continue;
        }
        std::vector<int> targets(closures.size(), targetLiteral);
        auto premises = proofCandidates(closures, targets);
        premises.insert(premises.end(), branches.begin(), branches.end());
        normalize(premises);
        std::vector<Cell> focus;
        for (const auto premise : premises) {
          focus.push_back(premise.cell);
        }
        if (truth) {
          return placementStep(technique, targetCell, targetDigit,
                               regionsFor(focus), premises);
        }
        return eliminationStep(technique, focus, regionsFor(focus), premises,
                               {{targetCell, targetDigit}});
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findGroupedAic(const HintRequest &request,
                                       Technique technique) {
  for (const auto &unit : units()) {
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::vector<Candidate> branches;
      for (const auto cell : unit.cells) {
        if (has(request.hintCandidates[cell], digit)) {
          branches.push_back({cell, digit});
        }
      }
      if (auto step = findBranchCommonConsequence(request, technique, branches)) {
        return step;
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findForcingNet(const HintRequest &request) {
  for (Cell cell = 0; cell < 81; ++cell) {
    std::vector<Candidate> branches;
    for (Digit digit = 1; digit <= 9; ++digit) {
      if (has(request.hintCandidates[cell], digit)) {
        branches.push_back({cell, digit});
      }
    }
    if (auto step = findBranchCommonConsequence(
            request, Technique::forcingNet, branches)) {
      return step;
    }
  }
  return findGroupedAic(request, Technique::forcingNet);
}

std::optional<HintStep> findEmptyRectangle(const HintRequest &request) {
  for (std::uint8_t boxIndex = 0; boxIndex < 9; ++boxIndex) {
    const auto unit = makeUnit(RegionKind::box, boxIndex);
    for (Digit digit = 1; digit <= 9; ++digit) {
      std::vector<Cell> boxCandidates;
      for (const auto cell : unit.cells) {
        if (has(request.hintCandidates[cell], digit)) {
          boxCandidates.push_back(cell);
        }
      }
      if (boxCandidates.size() < 2 || boxCandidates.size() > 6) {
        continue;
      }
      for (std::uint8_t localRow = 0; localRow < 3; ++localRow) {
        for (std::uint8_t localColumn = 0; localColumn < 3; ++localColumn) {
          const auto intersection = static_cast<Cell>(
              (boxIndex / 3U * 3U + localRow) * 9U +
              boxIndex % 3U * 3U + localColumn);
          if (has(request.hintCandidates[intersection], digit)) {
            continue;
          }
          const auto globalRow = row(intersection);
          const auto globalColumn = column(intersection);
          const bool allOnArms = std::all_of(
              boxCandidates.begin(), boxCandidates.end(), [&](Cell cell) {
                return row(cell) == globalRow || column(cell) == globalColumn;
              });
          const bool bothArms = std::any_of(
                                     boxCandidates.begin(), boxCandidates.end(),
                                     [&](Cell cell) {
                                       return row(cell) == globalRow;
                                     }) &&
                               std::any_of(
                                   boxCandidates.begin(), boxCandidates.end(),
                                   [&](Cell cell) {
                                     return column(cell) == globalColumn;
                                   });
          if (!allOnArms || !bothArms) {
            continue;
          }

          // Col-arm S Row-arm W q S p.  q is outside the box on the
          // rectangle row and q/p are conjugate in q's column.  The target
          // at row(p)/globalColumn sees both possible true endpoints.
          for (const auto &[q, p] : conjugateLinks(request, digit)) {
            for (const auto [weakEnd, strongEnd] :
                 {std::pair{q, p}, std::pair{p, q}}) {
              if (box(weakEnd) != boxIndex && row(weakEnd) == globalRow &&
                  column(weakEnd) == column(strongEnd)) {
                const auto target = static_cast<Cell>(
                    row(strongEnd) * 9U + globalColumn);
                if (box(target) != boxIndex && target != strongEnd &&
                    has(request.hintCandidates[target], digit)) {
                  auto pattern = boxCandidates;
                  pattern.push_back(weakEnd);
                  pattern.push_back(strongEnd);
                  if (auto step = eliminationStep(
                          Technique::emptyRectangle, pattern,
                          regionsFor(pattern),
                          candidatesFor(request, pattern, bit(digit)),
                          {{target, digit}})) {
                    return step;
                  }
                }
              }

              // Row-arm S Col-arm W q S p, rotated ninety degrees.
              if (box(weakEnd) != boxIndex &&
                  column(weakEnd) == globalColumn &&
                  row(weakEnd) == row(strongEnd)) {
                const auto target = static_cast<Cell>(
                    globalRow * 9U + column(strongEnd));
                if (box(target) != boxIndex && target != strongEnd &&
                    has(request.hintCandidates[target], digit)) {
                  auto pattern = boxCandidates;
                  pattern.push_back(weakEnd);
                  pattern.push_back(strongEnd);
                  if (auto step = eliminationStep(
                          Technique::emptyRectangle, pattern,
                          regionsFor(pattern),
                          candidatesFor(request, pattern, bit(digit)),
                          {{target, digit}})) {
                    return step;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return std::nullopt;
}

struct CandidateGroup {
  std::vector<Cell> cells;
  bool operator==(const CandidateGroup &) const = default;
};

std::vector<CandidateGroup> candidateGroups(const HintRequest &request,
                                            Digit digit) {
  std::vector<CandidateGroup> result;
  const auto add = [&](std::vector<Cell> cells,
                       std::vector<CandidateGroup> &groups) {
    normalize(cells);
    if (!cells.empty() &&
        std::find(groups.begin(), groups.end(), CandidateGroup{cells}) ==
            groups.end()) {
      groups.push_back({std::move(cells)});
    }
  };
  for (const auto cell : digitCells(request, digit)) {
    add({cell}, result);
  }
  for (std::uint8_t boxIndex = 0; boxIndex < 9; ++boxIndex) {
    for (const auto kind : {RegionKind::row, RegionKind::column}) {
      for (std::uint8_t lineIndex = 0; lineIndex < 9; ++lineIndex) {
        std::vector<Cell> intersection;
        for (const auto cell : makeUnit(RegionKind::box, boxIndex).cells) {
          if ((kind == RegionKind::row ? row(cell) : column(cell)) ==
                  lineIndex &&
              has(request.hintCandidates[cell], digit)) {
            intersection.push_back(cell);
          }
        }
        if (intersection.size() >= 2) {
          add(std::move(intersection), result);
        }
      }
    }
  }
  std::sort(result.begin(), result.end(), [](const CandidateGroup &a,
                                             const CandidateGroup &b) {
    return a.cells < b.cells;
  });
  return result;
}

bool disjoint(const CandidateGroup &a, const CandidateGroup &b) {
  return std::none_of(a.cells.begin(), a.cells.end(), [&](Cell cell) {
    return std::find(b.cells.begin(), b.cells.end(), cell) != b.cells.end();
  });
}

bool groupWeakLink(const CandidateGroup &a, const CandidateGroup &b) {
  return disjoint(a, b) &&
         std::all_of(a.cells.begin(), a.cells.end(), [&](Cell left) {
           return std::all_of(b.cells.begin(), b.cells.end(), [&](Cell right) {
             return peers(left, right);
           });
         });
}

std::vector<std::pair<int, int>>
groupStrongLinks(const HintRequest &request, Digit digit,
                 const std::vector<CandidateGroup> &groups) {
  std::vector<std::pair<int, int>> result;
  for (const auto &unit : units()) {
    std::vector<Cell> positions;
    for (const auto cell : unit.cells) {
      if (has(request.hintCandidates[cell], digit)) {
        positions.push_back(cell);
      }
    }
    normalize(positions);
    for (std::size_t a = 0; a < groups.size(); ++a) {
      for (std::size_t b = a + 1; b < groups.size(); ++b) {
        if (!disjoint(groups[a], groups[b])) {
          continue;
        }
        auto combined = groups[a].cells;
        combined.insert(combined.end(), groups[b].cells.begin(),
                        groups[b].cells.end());
        normalize(combined);
        if (combined == positions) {
          result.emplace_back(static_cast<int>(a), static_cast<int>(b));
        }
      }
    }
  }
  std::sort(result.begin(), result.end());
  result.erase(std::unique(result.begin(), result.end()), result.end());
  return result;
}

std::optional<HintStep> findTrueGroupedAic(const HintRequest &request) {
  constexpr int maxEdges = 7;
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto groups = candidateGroups(request, digit);
    const auto strong = groupStrongLinks(request, digit, groups);
    const auto isStrong = [&](int a, int b) {
      const auto link = std::minmax(a, b);
      return std::find(strong.begin(), strong.end(), link) != strong.end();
    };
    for (std::size_t start = 0; start < groups.size(); ++start) {
      std::vector<int> path{static_cast<int>(start)};
      std::optional<HintStep> found;
      std::function<bool(bool, int, bool)> dfs =
          [&](bool requireStrong, int edges, bool usedGroup) {
            if (cancelled(request)) {
              return false;
            }
            if (edges >= 3 && edges % 2 == 1 && !requireStrong && usedGroup) {
              const auto &first = groups[path.front()];
              const auto &last = groups[path.back()];
              std::vector<Cell> pattern;
              for (const auto index : path) {
                pattern.insert(pattern.end(), groups[index].cells.begin(),
                               groups[index].cells.end());
              }
              std::vector<Candidate> eliminations;
              for (const auto target : digitCells(request, digit)) {
                if (std::find(pattern.begin(), pattern.end(), target) !=
                    pattern.end()) {
                  continue;
                }
                const bool seesFirst = std::all_of(
                    first.cells.begin(), first.cells.end(),
                    [&](Cell cell) { return peers(target, cell); });
                const bool seesLast = std::all_of(
                    last.cells.begin(), last.cells.end(),
                    [&](Cell cell) { return peers(target, cell); });
                if (seesFirst && seesLast) {
                  eliminations.push_back({target, digit});
                }
              }
              found = eliminationStep(
                  Technique::groupedAic, pattern, regionsFor(pattern),
                  candidatesFor(request, pattern, bit(digit)), eliminations);
              if (found) {
                return true;
              }
            }
            if (edges == maxEdges) {
              return false;
            }
            const auto current = path.back();
            for (std::size_t next = 0; next < groups.size(); ++next) {
              if (std::find(path.begin(), path.end(), static_cast<int>(next)) !=
                  path.end()) {
                continue;
              }
              const bool linkedStrong =
                  isStrong(current, static_cast<int>(next));
              const bool linkedWeak = groupWeakLink(groups[current], groups[next]);
              if ((requireStrong && !linkedStrong) ||
                  (!requireStrong && (!linkedWeak || linkedStrong))) {
                continue;
              }
              path.push_back(static_cast<int>(next));
              const bool nextUsedGroup =
                  usedGroup || groups[next].cells.size() > 1;
              if (dfs(!requireStrong, edges + 1, nextUsedGroup)) {
                return true;
              }
              path.pop_back();
            }
            return false;
          };
      if (dfs(true, 0, groups[start].cells.size() > 1)) {
        return found;
      }
    }
  }
  return std::nullopt;
}

std::optional<HintStep> findComplexColoring(const HintRequest &request) {
  for (Digit digit = 1; digit <= 9; ++digit) {
    const auto components = coloringComponents(request, digit);
    if (components.size() < 3) {
      continue;
    }
    const auto stateCount = static_cast<int>(components.size() * 2U);
    std::vector<std::vector<int>> implications(stateCount);
    for (std::size_t a = 0; a < components.size(); ++a) {
      for (std::size_t b = a + 1; b < components.size(); ++b) {
        for (int colorA = 0; colorA <= 1; ++colorA) {
          for (int colorB = 0; colorB <= 1; ++colorB) {
            const auto sideA = cellsOfColor(components[a], colorA);
            const auto sideB = cellsOfColor(components[b], colorB);
            const bool conflict = std::any_of(
                sideA.begin(), sideA.end(), [&](Cell left) {
                  return std::any_of(sideB.begin(), sideB.end(),
                                     [&](Cell right) {
                                       return peers(left, right);
                                     });
                });
            if (conflict) {
              implications[static_cast<int>(a * 2U) + colorA].push_back(
                  static_cast<int>(b * 2U) + 1 - colorB);
              implications[static_cast<int>(b * 2U) + colorB].push_back(
                  static_cast<int>(a * 2U) + 1 - colorA);
            }
          }
        }
      }
    }
    for (int start = 0; start < stateCount; ++start) {
      std::vector<bool> reached(stateCount);
      std::vector<int> parent(stateCount, -1);
      std::queue<int> pending;
      reached[start] = true;
      pending.push(start);
      while (!pending.empty()) {
        if (cancelled(request)) {
          return std::nullopt;
        }
        const auto current = pending.front();
        pending.pop();
        for (const auto next : implications[current]) {
          if (!reached[next]) {
            reached[next] = true;
            parent[next] = current;
            pending.push(next);
          }
        }
      }
      if (!reached[start ^ 1]) {
        continue;
      }
      std::set<int> proofComponents;
      auto current = start ^ 1;
      std::vector<Cell> pattern;
      while (current != -1) {
        const auto componentIndex = current / 2;
        const auto color = current % 2;
        proofComponents.insert(componentIndex);
        const auto side = cellsOfColor(components[componentIndex], color);
        pattern.insert(pattern.end(), side.begin(), side.end());
        current = parent[current];
      }
      if (proofComponents.size() < 3) {
        continue;
      }
      const auto badSide = cellsOfColor(components[start / 2], start % 2);
      std::vector<Candidate> eliminations;
      for (const auto cell : badSide) {
        eliminations.push_back({cell, digit});
      }
      if (auto step = eliminationStep(
              Technique::complexColoring, pattern, regionsFor(pattern),
              candidatesFor(request, pattern, bit(digit)), eliminations)) {
        return step;
      }
    }
  }
  return std::nullopt;
}

} // namespace

std::optional<HintStep> detectTechnique(const HintRequest &request,
                                        Technique technique) {
  switch (technique) {
  case Technique::fullHouse:
    return findFullHouse(request);
  case Technique::nakedSingle:
    return findNakedSingle(request);
  case Technique::hiddenSingle:
    return findHiddenSingle(request);
  case Technique::lockedCandidatesPointing:
    return findLockedCandidates(request, true);
  case Technique::lockedCandidatesClaiming:
    return findLockedCandidates(request, false);
  case Technique::lockedPair:
    return findNakedSubset(request, 2, technique, true);
  case Technique::lockedTriple:
    return findNakedSubset(request, 3, technique, true);
  case Technique::nakedPair:
    return findNakedSubset(request, 2, technique, false);
  case Technique::hiddenPair:
    return findHiddenSubset(request, 2, technique);
  case Technique::nakedTriple:
    return findNakedSubset(request, 3, technique, false);
  case Technique::hiddenTriple:
    return findHiddenSubset(request, 3, technique);
  case Technique::nakedQuad:
    return findNakedSubset(request, 4, technique, false);
  case Technique::hiddenQuad:
    return findHiddenSubset(request, 4, technique);
  case Technique::xWing:
    return findFish(request, 2, technique);
  case Technique::swordfish:
    return findFish(request, 3, technique);
  case Technique::skyscraper:
    return findSkyscraper(request);
  case Technique::twoStringKite:
    return findTwoStringKite(request);
  case Technique::turbotFish:
    return findTurbotFish(request);
  case Technique::wWing:
    return findWWing(request);
  case Technique::xyWing:
    return findXYWing(request, false);
  case Technique::xyzWing:
    return findXYWing(request, true);
  case Technique::simpleColoring:
    return findSimpleColoring(request);
  case Technique::multiColoring:
    return findMultiColoring(request, technique);
  case Technique::remotePair:
    return findRemotePair(request);
  case Technique::emptyRectangle:
    return findEmptyRectangle(request);
  case Technique::hiddenRectangle:
    return findHiddenRectangle(request);
  case Technique::avoidableRectangle:
    return findAvoidableRectangle(request);
  case Technique::uniqueRectangle:
    return findUniqueRectangle(request);
  case Technique::bugPlusOne:
    return findBugPlusOne(request);
  case Technique::finnedXWing:
    return findFinnedXWing(request, false);
  case Technique::sashimiXWing:
    return findFinnedXWing(request, true);
  case Technique::jellyfish:
    return findFish(request, 4, technique);
  case Technique::xChain:
    return findXChain(request);
  case Technique::xyChain:
    return findXYChain(request);
  case Technique::aic:
    return findAic(request, technique);
  case Technique::groupedAic:
    return findTrueGroupedAic(request);
  case Technique::complexColoring:
    return findComplexColoring(request);
  case Technique::forcingChain:
    return findForcingChain(request, technique);
  case Technique::forcingNet:
    return findForcingNet(request);
  }
  return std::nullopt;
}

} // namespace hsp::hint_core::detail
