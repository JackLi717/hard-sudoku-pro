#include "hsp/hint_core/bridge.hpp"
#include "hsp/hint_core/engine.hpp"
#include "../src/techniques.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
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

void writeOpportunityEffect(std::ostream &output,
                            const OpportunityEffect &effect) {
  output << "{\"kind\":"
         << jsonString(effect.kind == OpportunityEffectKind::placement
                           ? "placement"
                           : "elimination")
         << ",\"cell\":" << static_cast<unsigned>(effect.candidate.cell)
         << ",\"digit\":" << static_cast<unsigned>(effect.candidate.digit)
         << '}';
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

const OpportunityAssessment *findExpectedOpportunity(
    const OpportunitySetAnalysis &analysis, const HintStep &expected) {
  const OpportunityIdentity identity{expected.technique,
                                     opportunityOutcome(expected)};
  const auto found = std::find_if(
      analysis.opportunities.begin(), analysis.opportunities.end(),
      [&](const OpportunityAssessment &assessment) {
        return assessment.identity == identity;
      });
  return found == analysis.opportunities.end() ? nullptr : &*found;
}

std::string_view selectionStateName(OpportunitySelectionState state) {
  switch (state) {
  case OpportunitySelectionState::selected:
    return "selected";
  case OpportunitySelectionState::maskedByFrontierRanking:
    return "frontier_ranking";
  case OpportunitySelectionState::maskedByLowerLevel:
    return "lower_level";
  }
  return "unknown";
}

bool opportunityIsSafe(const Fixture &fixture, const HintStep &step) {
  auto request = fixture.request;
  return applyStep(request, step, fixture.solution);
}

struct LimitSensitivity {
  static constexpr std::size_t attributionStatusCount = 4;
  bool valid{false};
  bool deterministic{false};
  std::uint32_t defaultRawCount{0};
  std::uint32_t expandedRawCount{0};
  std::uint32_t defaultUniqueCount{0};
  std::uint32_t expandedUniqueCount{0};
  std::uint32_t additionalIdentityCount{0};
  std::uint32_t missingDefaultIdentityCount{0};
  std::uint64_t defaultMedianMicroseconds{0};
  std::uint64_t expandedMedianMicroseconds{0};
  std::uint32_t defaultEffectCount{0};
  std::uint32_t expandedNewEffectCount{0};
  std::uint32_t attributionStatusChangedCount{0};
  std::uint32_t defaultTechniqueCandidateCount{0};
  std::uint32_t preservedTechniqueCandidateCount{0};
  std::uint32_t candidateBecameCrossTechniqueCount{0};
  std::uint32_t attributedTechniqueChangedCount{0};
  struct CandidateInvalidation {
    OpportunityEffect effect;
    OpportunityAttributionStatus baselineStatus;
    Technique baselineTechnique;
    OpportunityAttributionStatus comparisonStatus;
    std::vector<Technique> comparisonTechniques;
  };
  std::vector<CandidateInvalidation> candidateInvalidations;
  std::array<std::array<std::uint32_t, attributionStatusCount>,
             attributionStatusCount>
      attributionTransitions{};
  std::array<std::uint32_t, kTechniqueCatalog.size()> additionalByTechnique{};
  std::vector<Technique> remainingLimitTechniques;
};

std::size_t attributionStatusIndex(OpportunityAttributionStatus status) {
  switch (status) {
  case OpportunityAttributionStatus::noMatch:
    return 0;
  case OpportunityAttributionStatus::uniqueTechnique:
    return 1;
  case OpportunityAttributionStatus::sameTechniqueMultipleOpportunities:
    return 2;
  case OpportunityAttributionStatus::crossTechniqueAmbiguous:
    return 3;
  }
  return 0;
}

std::string_view attributionStatusName(OpportunityAttributionStatus status) {
  switch (status) {
  case OpportunityAttributionStatus::noMatch:
    return "no_match";
  case OpportunityAttributionStatus::uniqueTechnique:
    return "unique_technique";
  case OpportunityAttributionStatus::sameTechniqueMultipleOpportunities:
    return "same_technique_multiple_opportunities";
  case OpportunityAttributionStatus::crossTechniqueAmbiguous:
    return "cross_technique_ambiguous";
  }
  return "unknown";
}

std::string_view sequenceStatusName(OpportunitySequenceStatus status) {
  switch (status) {
  case OpportunitySequenceStatus::matching:
    return "matching";
  case OpportunitySequenceStatus::completed:
    return "completed";
  case OpportunitySequenceStatus::ambiguous:
    return "ambiguous";
  case OpportunitySequenceStatus::superseded:
    return "superseded";
  case OpportunitySequenceStatus::revisionInvalidated:
    return "revision_invalidated";
  case OpportunitySequenceStatus::hintPolluted:
    return "hint_polluted";
  case OpportunitySequenceStatus::undoPolluted:
    return "undo_polluted";
  case OpportunitySequenceStatus::invalidInput:
    return "invalid_input";
  }
  return "unknown";
}

std::string_view proofReasonName(ProofReason reason) {
  switch (reason) {
  case ProofReason::scanRegion:
    return "scan_region";
  case ProofReason::singleCandidate:
    return "single_candidate";
  case ProofReason::valueBlocksCells:
    return "value_blocks_cells";
  case ProofReason::patternConstraint:
    return "pattern_constraint";
  case ProofReason::chainInference:
    return "chain_inference";
  case ProofReason::forcedPlacement:
    return "forced_placement";
  case ProofReason::validElimination:
    return "valid_elimination";
  }
  return "unknown";
}

std::vector<OpportunityEffect>
effectsForOutcome(const OpportunityOutcome &outcome) {
  std::vector<OpportunityEffect> effects;
  effects.reserve(outcome.placements.size() + outcome.eliminations.size());
  for (const auto placement : outcome.placements) {
    effects.push_back({OpportunityEffectKind::placement, placement});
  }
  for (const auto elimination : outcome.eliminations) {
    effects.push_back({OpportunityEffectKind::elimination, elimination});
  }
  return effects;
}

OpportunitySequenceState runSequence(
    const OpportunitySetAnalysis &analysis,
    const std::vector<OpportunityEffect> &effects,
    std::uint64_t initialRevision = 100) {
  auto state = startOpportunitySequence(analysis, initialRevision);
  for (const auto effect : effects) {
    state = advanceOpportunitySequence(
        state,
        {OpportunitySequenceEventKind::playerEffect, state.boardRevision,
         state.boardRevision + 1U, effect});
  }
  return state;
}

bool sequenceContainsIdentity(const OpportunitySequenceState &state,
                              const OpportunityIdentity &identity) {
  return std::find(state.matchingOpportunities.begin(),
                   state.matchingOpportunities.end(), identity) !=
         state.matchingOpportunities.end();
}

bool sequenceOutcomeComplete(
    const OpportunityOutcome &outcome,
    const std::vector<OpportunityEffect> &matchedEffects) {
  const auto effects = effectsForOutcome(outcome);
  return std::all_of(
      effects.begin(), effects.end(), [&](const OpportunityEffect &effect) {
        return std::find(matchedEffects.begin(), matchedEffects.end(), effect) !=
               matchedEffects.end();
      });
}

std::optional<OpportunityEffect>
findUnrelatedEffect(const OpportunitySetAnalysis &analysis) {
  for (const auto kind : {OpportunityEffectKind::placement,
                          OpportunityEffectKind::elimination}) {
    for (Cell cell = 0; cell < kCellCount; ++cell) {
      for (Digit digit = 1; digit <= kSideLength; ++digit) {
        const OpportunityEffect effect{kind, {cell, digit}};
        if (attributeOpportunityEffect(analysis, effect).status ==
            OpportunityAttributionStatus::noMatch) {
          return effect;
        }
      }
    }
  }
  return std::nullopt;
}

struct SequenceEvaluation {
  bool valid{false};
  bool usedExpandedAnalysis{false};
  bool hasPartialSequence{false};
  bool partialIdentityPreserved{false};
  bool orderIndependent{false};
  bool deterministic{false};
  bool pendingTechniqueStable{false};
  std::uint32_t effectCount{0};
  std::uint32_t completedOpportunityCount{0};
  std::uint32_t incompleteOpportunityCount{0};
  std::vector<Technique> matchingTechniques;
  OpportunitySequenceStatus finalStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus partialStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus unrelatedStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus revisionStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus hintViewedStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus hintAppliedStatus{
      OpportunitySequenceStatus::invalidInput};
  OpportunitySequenceStatus undoStatus{OpportunitySequenceStatus::invalidInput};
};

struct ProofIdentityAudit {
  OpportunityIdentity identity;
  bool complete{false};
  std::uint32_t remainingEffectCount{0};
  std::uint32_t proofVariantCount{0};
  std::uint32_t humanCost{0};
  std::uint32_t focusCellCount{0};
  std::uint32_t focusRegionCount{0};
  std::uint32_t premiseCount{0};
  std::vector<ProofReason> proofReasons;
};

struct ProofAudit {
  bool valid{false};
  std::string_view family;
  std::vector<OpportunityEffect> targetEffects;
  std::vector<ProofIdentityAudit> identities;
};

struct ExplanationEvaluation {
  bool valid{false};
  bool deterministic{false};
  bool expectedTechniqueCandidate{false};
  bool automaticMatchesExpected{false};
  bool hasPartial{false};
  bool partialExpectedTechniqueCandidate{false};
  std::uint32_t closurePlacementCount{0};
  std::uint32_t closureExpectedTechniqueCandidateCount{0};
  std::uint32_t closureAutomaticMatchesExpectedCount{0};
  OpportunityExplanationResult full;
};

bool explanationContainsTechnique(const OpportunityExplanationResult &result,
                                  Technique technique) {
  return std::any_of(
      result.candidates.begin(), result.candidates.end(),
      [&](const OpportunityTechniqueCandidate &candidate) {
        return candidate.technique == technique;
      });
}

ExplanationEvaluation evaluateExplanation(
    const HintRequest &request, const std::vector<HintStep> &opportunities,
    const HintStep &expectedStep) {
  ExplanationEvaluation result{};
  const auto expectedTechnique = expectedStep.technique;
  const auto effects = effectsForOutcome(opportunityOutcome(expectedStep));
  result.full =
      explainOpportunityEffects(request, opportunities, effects, true);
  const auto repeated =
      explainOpportunityEffects(request, opportunities, effects, true);
  result.deterministic = result.full == repeated;
  result.expectedTechniqueCandidate =
      explanationContainsTechnique(result.full, expectedTechnique);
  result.automaticMatchesExpected =
      result.full.automaticTechnique == expectedTechnique;

  result.hasPartial = effects.size() > 1;
  if (result.hasPartial) {
    const auto partial = explainOpportunityEffects(
        request, opportunities, {effects.front()}, true);
    result.partialExpectedTechniqueCandidate =
        partial.status == OpportunityExplanationStatus::matched &&
        explanationContainsTechnique(partial, expectedTechnique);
  }

  const auto closurePlacements =
      immediatePlacementsAfterOpportunity(request, expectedStep);
  result.closurePlacementCount =
      static_cast<std::uint32_t>(closurePlacements.size());
  for (const auto placement : closurePlacements) {
    const auto closure = explainOpportunityEffects(
        request, opportunities,
        {{OpportunityEffectKind::placement, placement}}, true);
    result.closureExpectedTechniqueCandidateCount +=
        closure.status == OpportunityExplanationStatus::matched &&
                explanationContainsTechnique(closure, expectedTechnique)
            ? 1U
            : 0U;
    result.closureAutomaticMatchesExpectedCount +=
        closure.automaticTechnique == expectedTechnique ? 1U : 0U;
  }

  result.valid =
      result.full.status == OpportunityExplanationStatus::matched &&
      result.expectedTechniqueCandidate && result.deterministic &&
      (!result.hasPartial || result.partialExpectedTechniqueCandidate) &&
      result.closureExpectedTechniqueCandidateCount ==
          result.closurePlacementCount;
  return result;
}

std::optional<std::string_view> proofAuditFamily(Technique technique) {
  switch (technique) {
  case Technique::nakedTriple:
    return "subset";
  case Technique::xWing:
    return "fish";
  case Technique::xChain:
    return "chain";
  case Technique::complexColoring:
    return "coloring";
  default:
    return std::nullopt;
  }
}

ProofAudit evaluateProofAudit(
    const OpportunitySetAnalysis &analysis,
    const std::vector<HintStep> &rawOpportunities,
    const OpportunityIdentity &targetIdentity) {
  ProofAudit result{};
  const auto family = proofAuditFamily(targetIdentity.technique);
  if (!family) {
    return result;
  }
  result.family = *family;
  result.targetEffects = effectsForOutcome(targetIdentity.outcome);
  const auto finalState = runSequence(analysis, result.targetEffects, 400);
  if (finalState.status == OpportunitySequenceStatus::completed ||
      finalState.matchingOpportunities.empty()) {
    return result;
  }

  bool targetPresent = false;
  for (const auto &identity : finalState.matchingOpportunities) {
    const auto assessment = std::find_if(
        analysis.opportunities.begin(), analysis.opportunities.end(),
        [&](const OpportunityAssessment &candidate) {
          return candidate.identity == identity;
        });
    const auto raw = std::find_if(
        rawOpportunities.begin(), rawOpportunities.end(),
        [&](const HintStep &step) {
          return OpportunityIdentity{step.technique, opportunityOutcome(step)} ==
                 identity;
        });
    if (assessment == analysis.opportunities.end() ||
        raw == rawOpportunities.end() || raw->proofSteps.empty() ||
        raw->proofSteps.front().kind != ProofKind::observe ||
        raw->proofSteps.back().kind != ProofKind::conclusion) {
      return result;
    }

    const auto identityEffects = effectsForOutcome(identity.outcome);
    std::uint32_t remainingEffectCount = 0;
    for (const auto effect : identityEffects) {
      if (std::find(finalState.matchedEffects.begin(),
                    finalState.matchedEffects.end(), effect) ==
          finalState.matchedEffects.end()) {
        ++remainingEffectCount;
      }
    }
    ProofIdentityAudit identityAudit{};
    identityAudit.identity = identity;
    identityAudit.complete = remainingEffectCount == 0;
    identityAudit.remainingEffectCount = remainingEffectCount;
    identityAudit.proofVariantCount = assessment->proofVariantCount;
    identityAudit.humanCost = raw->humanCost;
    identityAudit.focusCellCount =
        static_cast<std::uint32_t>(raw->focusCells.size());
    identityAudit.focusRegionCount =
        static_cast<std::uint32_t>(raw->focusRegions.size());
    identityAudit.premiseCount =
        static_cast<std::uint32_t>(raw->premises.size());
    for (const auto &proofStep : raw->proofSteps) {
      identityAudit.proofReasons.push_back(proofStep.reason);
    }
    result.identities.push_back(std::move(identityAudit));
    targetPresent = targetPresent || identity == targetIdentity;
  }
  result.valid = targetPresent && result.identities.size() ==
                                      finalState.matchingOpportunities.size();
  return result;
}

SequenceEvaluation evaluateSequence(
    const OpportunitySetAnalysis &analysis,
    const OpportunityIdentity &expectedIdentity, bool usedExpandedAnalysis) {
  SequenceEvaluation result{};
  result.usedExpandedAnalysis = usedExpandedAnalysis;
  const auto effects = effectsForOutcome(expectedIdentity.outcome);
  result.effectCount = static_cast<std::uint32_t>(effects.size());
  if (effects.empty()) {
    return result;
  }

  const auto forward = runSequence(analysis, effects);
  auto reversedEffects = effects;
  std::reverse(reversedEffects.begin(), reversedEffects.end());
  const auto reverse = runSequence(analysis, reversedEffects);
  const auto repeated = runSequence(analysis, effects);
  result.finalStatus = forward.status;
  std::set<Technique> matchingTechniques;
  for (const auto &identity : forward.matchingOpportunities) {
    matchingTechniques.insert(identity.technique);
    if (sequenceOutcomeComplete(identity.outcome, forward.matchedEffects)) {
      ++result.completedOpportunityCount;
    } else {
      ++result.incompleteOpportunityCount;
    }
  }
  result.matchingTechniques.assign(matchingTechniques.begin(),
                                   matchingTechniques.end());
  result.pendingTechniqueStable =
      forward.status == OpportunitySequenceStatus::matching &&
      result.matchingTechniques.size() == 1;
  result.orderIndependent =
      forward.status == reverse.status &&
      forward.matchedEffects == reverse.matchedEffects &&
      forward.matchingOpportunities == reverse.matchingOpportunities &&
      forward.attributedTechnique == reverse.attributedTechnique;
  result.deterministic = forward == repeated;

  auto partial = startOpportunitySequence(analysis, 200);
  result.hasPartialSequence = effects.size() > 1;
  if (result.hasPartialSequence) {
    for (std::size_t index = 0; index + 1 < effects.size(); ++index) {
      partial = advanceOpportunitySequence(
          partial,
          {OpportunitySequenceEventKind::playerEffect,
           partial.boardRevision, partial.boardRevision + 1U, effects[index]});
    }
    result.partialStatus = partial.status;
    result.partialIdentityPreserved =
        partial.status == OpportunitySequenceStatus::matching &&
        sequenceContainsIdentity(partial, expectedIdentity);
  }

  auto pollutionBase = startOpportunitySequence(analysis, 300);
  if (effects.size() > 1) {
    pollutionBase = advanceOpportunitySequence(
        pollutionBase,
        {OpportunitySequenceEventKind::playerEffect,
         pollutionBase.boardRevision, pollutionBase.boardRevision + 1U,
         effects.front()});
  }
  const auto unrelated = findUnrelatedEffect(analysis);
  if (!unrelated || pollutionBase.status != OpportunitySequenceStatus::matching) {
    return result;
  }
  result.unrelatedStatus =
      advanceOpportunitySequence(
          pollutionBase,
          {OpportunitySequenceEventKind::playerEffect,
           pollutionBase.boardRevision, pollutionBase.boardRevision + 1U,
           *unrelated})
          .status;
  result.revisionStatus =
      advanceOpportunitySequence(
          pollutionBase,
          {OpportunitySequenceEventKind::playerEffect,
           pollutionBase.boardRevision, pollutionBase.boardRevision + 2U,
           effects.back()})
          .status;
  result.hintViewedStatus =
      advanceOpportunitySequence(
          pollutionBase,
          {OpportunitySequenceEventKind::hintViewed,
           pollutionBase.boardRevision, pollutionBase.boardRevision,
           std::nullopt})
          .status;
  result.hintAppliedStatus =
      advanceOpportunitySequence(
          pollutionBase,
          {OpportunitySequenceEventKind::hintApplied,
           pollutionBase.boardRevision, pollutionBase.boardRevision + 1U,
           std::nullopt})
          .status;
  result.undoStatus =
      advanceOpportunitySequence(
          pollutionBase,
          {OpportunitySequenceEventKind::undo, pollutionBase.boardRevision,
           pollutionBase.boardRevision + 1U, std::nullopt})
          .status;

  const bool safeFinal =
      (forward.status == OpportunitySequenceStatus::completed &&
       forward.attributedTechnique == expectedIdentity.technique) ||
      ((forward.status == OpportunitySequenceStatus::matching ||
        forward.status == OpportunitySequenceStatus::ambiguous) &&
       !forward.attributedTechnique);
  const bool finalShapeValid =
      (forward.status == OpportunitySequenceStatus::completed &&
       result.completedOpportunityCount ==
           forward.matchingOpportunities.size() &&
       result.incompleteOpportunityCount == 0 &&
       result.matchingTechniques.size() == 1) ||
      (forward.status == OpportunitySequenceStatus::ambiguous &&
       result.completedOpportunityCount ==
           forward.matchingOpportunities.size() &&
       result.incompleteOpportunityCount == 0 &&
       result.matchingTechniques.size() > 1) ||
      (forward.status == OpportunitySequenceStatus::matching &&
       result.completedOpportunityCount > 0 &&
       result.incompleteOpportunityCount > 0);
  result.valid =
      safeFinal && finalShapeValid &&
      sequenceContainsIdentity(forward, expectedIdentity) &&
      forward.matchedEffects.size() == effects.size() &&
      (!result.hasPartialSequence || result.partialIdentityPreserved) &&
      result.orderIndependent && result.deterministic &&
      result.unrelatedStatus == OpportunitySequenceStatus::superseded &&
      result.revisionStatus ==
          OpportunitySequenceStatus::revisionInvalidated &&
      result.hintViewedStatus == OpportunitySequenceStatus::hintPolluted &&
      result.hintAppliedStatus == OpportunitySequenceStatus::hintPolluted &&
      result.undoStatus == OpportunitySequenceStatus::undoPolluted;
  return result;
}

constexpr std::array<OpportunityAttributionStatus,
                     LimitSensitivity::attributionStatusCount>
    kAttributionStatuses{
        OpportunityAttributionStatus::noMatch,
        OpportunityAttributionStatus::uniqueTechnique,
        OpportunityAttributionStatus::sameTechniqueMultipleOpportunities,
        OpportunityAttributionStatus::crossTechniqueAmbiguous,
    };

struct TimedSearch {
  bool valid{false};
  bool deterministic{false};
  std::uint64_t medianMicroseconds{0};
  std::optional<OpportunitySearchBatch> batch;
};

bool sameSearchBatch(const OpportunitySearchBatch &left,
                     const OpportunitySearchBatch &right) {
  return left.status == right.status && left.reason == right.reason &&
         left.workUnitsConsumed == right.workUnitsConsumed &&
         left.totalWorkUnitsConsumed == right.totalWorkUnitsConsumed &&
         left.frontierLevel == right.frontierLevel &&
         left.techniqueDiagnostics == right.techniqueDiagnostics &&
         left.opportunities == right.opportunities;
}

TimedSearch measureSearch(const HintRequest &request,
                          OpportunitySearchOptions options) {
  constexpr std::size_t repetitionCount = 3;
  TimedSearch result{};
  std::array<std::uint64_t, repetitionCount> durations{};
  for (std::size_t repetition = 0; repetition < repetitionCount;
       ++repetition) {
    auto session = Engine{}.startOpportunitySearch(request, options);
    const auto start = std::chrono::steady_clock::now();
    auto batch = session.advance(
        {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
    const auto finish = std::chrono::steady_clock::now();
    durations[repetition] = static_cast<std::uint64_t>(
        std::chrono::duration_cast<std::chrono::microseconds>(finish - start)
            .count());
    if (!result.batch) {
      result.batch = std::move(batch);
    } else if (!sameSearchBatch(*result.batch, batch)) {
      return result;
    }
  }
  std::sort(durations.begin(), durations.end());
  result.valid = true;
  result.deterministic = true;
  result.medianMicroseconds = durations[repetitionCount / 2];
  return result;
}

bool containsIdentity(const OpportunitySetAnalysis &analysis,
                      const OpportunityIdentity &identity) {
  return std::any_of(
      analysis.opportunities.begin(), analysis.opportunities.end(),
      [&](const OpportunityAssessment &assessment) {
        return assessment.identity == identity;
      });
}

LimitSensitivity evaluateLimitSensitivity(
    const Fixture &fixture, const OpportunitySetAnalysis &defaultAnalysis) {
  const auto defaultSearch = measureSearch(
      fixture.request, {OpportunitySearchScope::allDirect, 5});
  const auto expandedSearch = measureSearch(
      fixture.request,
      {OpportunitySearchScope::allDirect, 5, 1024, 512});
  if (!defaultSearch.valid || !defaultSearch.batch ||
      !expandedSearch.valid || !expandedSearch.batch) {
    return {};
  }
  const auto &batch = *expandedSearch.batch;
  if (batch.status != OpportunitySearchStatus::complete ||
      std::any_of(batch.opportunities.begin(), batch.opportunities.end(),
                  [&](const HintStep &step) {
                    return !opportunityIsSafe(fixture, step);
                  })) {
    return {};
  }
  const auto expanded = analyzeOpportunitySet(batch.opportunities);
  const auto measuredDefault =
      analyzeOpportunitySet(defaultSearch.batch->opportunities);
  if (measuredDefault.opportunities != defaultAnalysis.opportunities ||
      expanded.invalidOpportunityCount != 0 ||
      expanded.duplicateRawOpportunityCount != 0 ||
      !expanded.selectionOrderConsistent) {
    return {};
  }

  LimitSensitivity result{};
  result.valid = true;
  result.deterministic =
      defaultSearch.deterministic && expandedSearch.deterministic;
  result.defaultMedianMicroseconds = defaultSearch.medianMicroseconds;
  result.expandedMedianMicroseconds = expandedSearch.medianMicroseconds;
  result.defaultRawCount = defaultAnalysis.rawOpportunityCount;
  result.expandedRawCount = expanded.rawOpportunityCount;
  result.defaultUniqueCount =
      static_cast<std::uint32_t>(defaultAnalysis.opportunities.size());
  result.expandedUniqueCount =
      static_cast<std::uint32_t>(expanded.opportunities.size());
  const auto attributionTransitions =
      compareOpportunityEffectAttribution(defaultAnalysis, expanded);
  for (const auto &transition : attributionTransitions) {
    const auto baselineIndex =
        attributionStatusIndex(transition.baseline.status);
    const auto comparisonIndex =
        attributionStatusIndex(transition.comparison.status);
    ++result.attributionTransitions[baselineIndex][comparisonIndex];
    if (transition.baseline.status == OpportunityAttributionStatus::noMatch) {
      ++result.expandedNewEffectCount;
      continue;
    }
    ++result.defaultEffectCount;
    if (transition.baseline.status != transition.comparison.status) {
      ++result.attributionStatusChangedCount;
    }
    if (!transition.baseline.attributedTechnique) {
      continue;
    }
    ++result.defaultTechniqueCandidateCount;
    if (transition.techniqueCandidatePreserved) {
      ++result.preservedTechniqueCandidateCount;
    } else if (transition.comparison.status ==
               OpportunityAttributionStatus::crossTechniqueAmbiguous) {
      ++result.candidateBecameCrossTechniqueCount;
      std::set<Technique> techniques;
      for (const auto &identity :
           transition.comparison.matchingOpportunities) {
        techniques.insert(identity.technique);
      }
      result.candidateInvalidations.push_back(
          {transition.effect, transition.baseline.status,
           *transition.baseline.attributedTechnique,
           transition.comparison.status,
           {techniques.begin(), techniques.end()}});
    } else if (transition.comparison.attributedTechnique &&
               transition.comparison.attributedTechnique !=
                   transition.baseline.attributedTechnique) {
      ++result.attributedTechniqueChangedCount;
    }
  }
  for (const auto &assessment : expanded.opportunities) {
    if (containsIdentity(defaultAnalysis, assessment.identity)) {
      continue;
    }
    ++result.additionalIdentityCount;
    for (std::size_t index = 0; index < kTechniqueCatalog.size(); ++index) {
      if (kTechniqueCatalog[index].technique ==
          assessment.identity.technique) {
        ++result.additionalByTechnique[index];
        break;
      }
    }
  }
  for (const auto &assessment : defaultAnalysis.opportunities) {
    if (!containsIdentity(expanded, assessment.identity)) {
      ++result.missingDefaultIdentityCount;
    }
  }
  for (const auto &diagnostic : batch.techniqueDiagnostics) {
    if (diagnostic.reachedEnumerationLimit) {
      result.remainingLimitTechniques.push_back(diagnostic.technique);
    }
  }
  return result;
}

bool writeOpportunityEvaluation(
    const std::string &path,
    const std::array<std::optional<Fixture>, kTechniqueCatalog.size()>
        &fixtures) {
  std::ofstream output(path);
  if (!output) {
    std::cerr << "could not open opportunity evaluation output\n";
    return false;
  }

  std::uint32_t expectedFound = 0;
  std::uint32_t unsafeCount = 0;
  std::uint32_t rawCount = 0;
  std::uint32_t uniqueCount = 0;
  std::uint32_t outcomeCount = 0;
  std::uint32_t ambiguousCount = 0;
  std::uint32_t effectCount = 0;
  std::uint32_t ambiguousEffectCount = 0;
  std::uint32_t crossTechniqueAmbiguousEffectCount = 0;
  std::uint32_t duplicateCount = 0;
  std::uint32_t frontierMaskedCount = 0;
  std::uint32_t lowerLevelMaskedCount = 0;
  std::uint32_t enumerationLimitEvents = 0;
  std::set<Technique> enumerationLimitTechniques;
  std::set<Technique> expandedLimitTechniques;
  std::set<std::string> evaluatedStates;
  std::uint32_t sensitivityStateCount = 0;
  std::uint32_t sensitivityAdditionalIdentities = 0;
  std::uint32_t sensitivityMissingDefaultIdentities = 0;
  std::uint64_t sensitivityDefaultMedianMicroseconds = 0;
  std::uint64_t sensitivityExpandedMedianMicroseconds = 0;
  std::uint32_t sensitivityDefaultEffectCount = 0;
  std::uint32_t sensitivityExpandedNewEffectCount = 0;
  std::uint32_t sensitivityAttributionStatusChangedCount = 0;
  std::uint32_t sensitivityDefaultTechniqueCandidateCount = 0;
  std::uint32_t sensitivityPreservedTechniqueCandidateCount = 0;
  std::uint32_t sensitivityCandidateBecameCrossTechniqueCount = 0;
  std::uint32_t sensitivityAttributedTechniqueChangedCount = 0;
  std::uint32_t sequenceEffectCount = 0;
  std::uint32_t sequenceMultiEffectCount = 0;
  std::uint32_t sequenceCompletedCount = 0;
  std::uint32_t sequenceAmbiguousCount = 0;
  std::uint32_t sequenceOverlapPendingCount = 0;
  std::uint32_t sequencePendingTechniqueStableCount = 0;
  std::uint32_t sequencePendingCrossTechniqueCount = 0;
  std::uint32_t sequenceExpandedAnalysisCount = 0;
  std::uint32_t sequencePartialPreservedCount = 0;
  std::uint32_t sequenceOrderIndependentCount = 0;
  std::uint32_t sequenceDeterministicCount = 0;
  std::uint32_t sequenceUnrelatedSupersededCount = 0;
  std::uint32_t sequenceRevisionInvalidatedCount = 0;
  std::uint32_t sequenceHintViewedPollutedCount = 0;
  std::uint32_t sequenceHintAppliedPollutedCount = 0;
  std::uint32_t sequenceUndoPollutedCount = 0;
  std::uint32_t explanationExpectedCandidateCount = 0;
  std::uint32_t explanationAutomaticMatchesExpectedCount = 0;
  std::uint32_t explanationMultipleCandidateCount = 0;
  std::uint32_t explanationPartialCount = 0;
  std::uint32_t explanationPartialExpectedCandidateCount = 0;
  std::uint32_t explanationDeterministicCount = 0;
  std::uint32_t explanationClosurePlacementCount = 0;
  std::uint32_t explanationClosureExpectedCandidateCount = 0;
  std::uint32_t explanationClosureAutomaticMatchesExpectedCount = 0;
  std::array<std::array<std::uint32_t,
                        LimitSensitivity::attributionStatusCount>,
             LimitSensitivity::attributionStatusCount>
      sensitivityAttributionTransitions{};
  std::map<std::string, LimitSensitivity> sensitivityByState;
  std::map<std::string, OpportunitySetAnalysis> expandedAnalysisByState;
  std::map<std::string, std::vector<HintStep>> expandedOpportunitiesByState;

  output << "{\"evaluationKind\":\"opportunity_identity_sequence_and_masking\""
            ",\"fixtureCount\":"
         << fixtures.size() << ",\"fixtures\":[";
  for (std::size_t index = 0; index < fixtures.size(); ++index) {
    const auto &fixture = *fixtures[index];
    auto session = Engine{}.startOpportunitySearch(
        fixture.request, {OpportunitySearchScope::allDirect, 5});
    const auto batch = session.advance(
        {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
    if (batch.status != OpportunitySearchStatus::complete) {
      std::cerr << "opportunity evaluation did not complete for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    const auto analysis = analyzeOpportunitySet(batch.opportunities);
    const auto stateKey = fixture.sourcePuzzleId + ":" +
                          std::to_string(fixture.sourceIteration);
    const bool firstEvaluationForState = evaluatedStates.insert(stateKey).second;
    const auto *expected = findExpectedOpportunity(analysis, fixture.step);
    if (expected != nullptr) {
      ++expectedFound;
    }
    const auto fixtureUnsafe = static_cast<std::uint32_t>(std::count_if(
        batch.opportunities.begin(), batch.opportunities.end(),
        [&](const HintStep &step) {
          return !opportunityIsSafe(fixture, step);
        }));
    if (firstEvaluationForState) {
      unsafeCount += fixtureUnsafe;
      rawCount += analysis.rawOpportunityCount;
      uniqueCount +=
          static_cast<std::uint32_t>(analysis.opportunities.size());
      outcomeCount += analysis.distinctOutcomeCount;
      ambiguousCount += analysis.ambiguousOutcomeCount;
      effectCount += static_cast<std::uint32_t>(analysis.effects.size());
      ambiguousEffectCount += analysis.ambiguousEffectCount;
      crossTechniqueAmbiguousEffectCount +=
          analysis.crossTechniqueAmbiguousEffectCount;
      duplicateCount += analysis.duplicateRawOpportunityCount;
    }

    std::uint32_t fixtureFrontierMasked = 0;
    std::uint32_t fixtureLowerLevelMasked = 0;
    for (const auto &assessment : analysis.opportunities) {
      if (assessment.selectionState ==
          OpportunitySelectionState::maskedByFrontierRanking) {
        ++fixtureFrontierMasked;
      } else if (assessment.selectionState ==
                 OpportunitySelectionState::maskedByLowerLevel) {
        ++fixtureLowerLevelMasked;
      }
    }
    if (firstEvaluationForState) {
      frontierMaskedCount += fixtureFrontierMasked;
      lowerLevelMaskedCount += fixtureLowerLevelMasked;
    }

    std::vector<Technique> fixtureLimitTechniques;
    for (const auto &diagnostic : batch.techniqueDiagnostics) {
      if (diagnostic.reachedEnumerationLimit) {
        fixtureLimitTechniques.push_back(diagnostic.technique);
        enumerationLimitTechniques.insert(diagnostic.technique);
      }
    }
    const LimitSensitivity *sensitivity = nullptr;
    if (!fixtureLimitTechniques.empty()) {
      const auto [entry, inserted] = sensitivityByState.try_emplace(stateKey);
      if (inserted) {
        entry->second = evaluateLimitSensitivity(fixture, analysis);
        if (!entry->second.valid) {
          std::cerr << "expanded enumeration evaluation failed for "
                    << stateKey << '\n';
          return false;
        }
        ++sensitivityStateCount;
        sensitivityAdditionalIdentities +=
            entry->second.additionalIdentityCount;
        sensitivityMissingDefaultIdentities +=
            entry->second.missingDefaultIdentityCount;
        sensitivityDefaultMedianMicroseconds +=
            entry->second.defaultMedianMicroseconds;
        sensitivityExpandedMedianMicroseconds +=
            entry->second.expandedMedianMicroseconds;
        sensitivityDefaultEffectCount += entry->second.defaultEffectCount;
        sensitivityExpandedNewEffectCount +=
            entry->second.expandedNewEffectCount;
        sensitivityAttributionStatusChangedCount +=
            entry->second.attributionStatusChangedCount;
        sensitivityDefaultTechniqueCandidateCount +=
            entry->second.defaultTechniqueCandidateCount;
        sensitivityPreservedTechniqueCandidateCount +=
            entry->second.preservedTechniqueCandidateCount;
        sensitivityCandidateBecameCrossTechniqueCount +=
            entry->second.candidateBecameCrossTechniqueCount;
        sensitivityAttributedTechniqueChangedCount +=
            entry->second.attributedTechniqueChangedCount;
        for (std::size_t baselineIndex = 0;
             baselineIndex < LimitSensitivity::attributionStatusCount;
             ++baselineIndex) {
          for (std::size_t comparisonIndex = 0;
               comparisonIndex < LimitSensitivity::attributionStatusCount;
               ++comparisonIndex) {
            sensitivityAttributionTransitions[baselineIndex][comparisonIndex] +=
                entry->second
                    .attributionTransitions[baselineIndex][comparisonIndex];
          }
        }
        expandedLimitTechniques.insert(
            entry->second.remainingLimitTechniques.begin(),
            entry->second.remainingLimitTechniques.end());
      }
      sensitivity = &entry->second;
    }

    auto sequenceAnalysis = analysis;
    const std::vector<HintStep> *sequenceOpportunities =
        &batch.opportunities;
    bool sequenceUsedExpandedAnalysis = false;
    if (!fixtureLimitTechniques.empty()) {
      const auto [entry, inserted] =
          expandedAnalysisByState.try_emplace(stateKey);
      if (inserted) {
        auto expandedSession = Engine{}.startOpportunitySearch(
            fixture.request,
            {OpportunitySearchScope::allDirect, 5, 1024, 512});
        const auto expandedBatch = expandedSession.advance(
            {static_cast<std::uint32_t>(kTechniqueCatalog.size())});
        if (expandedBatch.status != OpportunitySearchStatus::complete ||
            std::any_of(
                expandedBatch.techniqueDiagnostics.begin(),
                expandedBatch.techniqueDiagnostics.end(),
                [](const TechniqueSearchDiagnostic &diagnostic) {
                  return diagnostic.reachedEnumerationLimit;
                })) {
          std::cerr << "sequence evaluation could not obtain an expanded "
                       "boundary-safe analysis for "
                    << kTechniqueCatalog[index].code << '\n';
          return false;
        }
        entry->second = analyzeOpportunitySet(expandedBatch.opportunities);
        expandedOpportunitiesByState.emplace(stateKey,
                                             expandedBatch.opportunities);
      }
      sequenceAnalysis = entry->second;
      sequenceOpportunities = &expandedOpportunitiesByState.at(stateKey);
      sequenceUsedExpandedAnalysis = true;
    }
    if (expected == nullptr) {
      std::cerr << "sequence evaluation is missing expected identity for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    const auto sequence = evaluateSequence(
        sequenceAnalysis, expected->identity, sequenceUsedExpandedAnalysis);
    if (!sequence.valid) {
      std::cerr << "sequence evaluation failed for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    const auto proofAudit = evaluateProofAudit(
        sequenceAnalysis, *sequenceOpportunities, expected->identity);
    if (proofAuditFamily(expected->identity.technique).has_value() &&
        !proofAudit.valid) {
      std::cerr << "proof audit failed for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    const auto explanation = evaluateExplanation(
        fixture.request, *sequenceOpportunities, fixture.step);
    if (!explanation.valid) {
      std::cerr << "minimum-cost explanation evaluation failed for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
    sequenceEffectCount += sequence.effectCount;
    sequenceMultiEffectCount += sequence.hasPartialSequence ? 1U : 0U;
    sequenceCompletedCount +=
        sequence.finalStatus == OpportunitySequenceStatus::completed ? 1U
                                                                     : 0U;
    sequenceAmbiguousCount +=
        sequence.finalStatus == OpportunitySequenceStatus::ambiguous ? 1U
                                                                     : 0U;
    sequenceOverlapPendingCount +=
        sequence.finalStatus == OpportunitySequenceStatus::matching ? 1U
                                                                    : 0U;
    sequencePendingTechniqueStableCount +=
        sequence.pendingTechniqueStable ? 1U : 0U;
    sequencePendingCrossTechniqueCount +=
        sequence.finalStatus == OpportunitySequenceStatus::matching &&
                !sequence.pendingTechniqueStable
            ? 1U
            : 0U;
    sequenceExpandedAnalysisCount +=
        sequence.usedExpandedAnalysis ? 1U : 0U;
    sequencePartialPreservedCount +=
        sequence.partialIdentityPreserved ? 1U : 0U;
    sequenceOrderIndependentCount += sequence.orderIndependent ? 1U : 0U;
    sequenceDeterministicCount += sequence.deterministic ? 1U : 0U;
    sequenceUnrelatedSupersededCount +=
        sequence.unrelatedStatus == OpportunitySequenceStatus::superseded
            ? 1U
            : 0U;
    sequenceRevisionInvalidatedCount +=
        sequence.revisionStatus ==
                OpportunitySequenceStatus::revisionInvalidated
            ? 1U
            : 0U;
    sequenceHintViewedPollutedCount +=
        sequence.hintViewedStatus == OpportunitySequenceStatus::hintPolluted
            ? 1U
            : 0U;
    sequenceHintAppliedPollutedCount +=
        sequence.hintAppliedStatus == OpportunitySequenceStatus::hintPolluted
            ? 1U
            : 0U;
    sequenceUndoPollutedCount +=
        sequence.undoStatus == OpportunitySequenceStatus::undoPolluted ? 1U
                                                                       : 0U;
    explanationExpectedCandidateCount +=
        explanation.expectedTechniqueCandidate ? 1U : 0U;
    explanationAutomaticMatchesExpectedCount +=
        explanation.automaticMatchesExpected ? 1U : 0U;
    explanationMultipleCandidateCount +=
        explanation.full.candidates.size() > 1 ? 1U : 0U;
    explanationPartialCount += explanation.hasPartial ? 1U : 0U;
    explanationPartialExpectedCandidateCount +=
        explanation.partialExpectedTechniqueCandidate ? 1U : 0U;
    explanationDeterministicCount += explanation.deterministic ? 1U : 0U;
    explanationClosurePlacementCount += explanation.closurePlacementCount;
    explanationClosureExpectedCandidateCount +=
        explanation.closureExpectedTechniqueCandidateCount;
    explanationClosureAutomaticMatchesExpectedCount +=
        explanation.closureAutomaticMatchesExpectedCount;

    if (index > 0) {
      output << ',';
    }
    output << "{\"techniqueCode\":"
           << jsonString(std::string(kTechniqueCatalog[index].code))
           << ",\"sourcePuzzleId\":" << jsonString(fixture.sourcePuzzleId)
           << ",\"sourceIteration\":" << fixture.sourceIteration
           << ",\"expectedIdentityFound\":"
           << (expected != nullptr ? "true" : "false")
           << ",\"expectedSelectionState\":"
           << jsonString(expected != nullptr
                             ? std::string(selectionStateName(
                                   expected->selectionState))
                             : "missing")
           << ",\"expectedProofVariantCount\":"
           << (expected != nullptr ? expected->proofVariantCount : 0)
           << ",\"rawOpportunityCount\":"
           << analysis.rawOpportunityCount
           << ",\"uniqueOpportunityCount\":"
           << analysis.opportunities.size()
           << ",\"distinctOutcomeCount\":"
           << analysis.distinctOutcomeCount
           << ",\"ambiguousOutcomeCount\":"
           << analysis.ambiguousOutcomeCount
           << ",\"effectCount\":" << analysis.effects.size()
           << ",\"ambiguousEffectCount\":"
           << analysis.ambiguousEffectCount
           << ",\"crossTechniqueAmbiguousEffectCount\":"
           << analysis.crossTechniqueAmbiguousEffectCount
           << ",\"duplicateRawOpportunityCount\":"
           << analysis.duplicateRawOpportunityCount
           << ",\"invalidOpportunityCount\":"
           << analysis.invalidOpportunityCount
           << ",\"unsafeOpportunityCount\":" << fixtureUnsafe
           << ",\"frontierMaskedCount\":" << fixtureFrontierMasked
           << ",\"lowerLevelMaskedCount\":" << fixtureLowerLevelMasked
           << ",\"sequenceEffectCount\":" << sequence.effectCount
           << ",\"sequenceUsedExpandedAnalysis\":"
           << (sequence.usedExpandedAnalysis ? "true" : "false")
           << ",\"sequenceFinalStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.finalStatus)))
           << ",\"sequenceCompletedOpportunityCount\":"
           << sequence.completedOpportunityCount
           << ",\"sequenceIncompleteOpportunityCount\":"
           << sequence.incompleteOpportunityCount
           << ",\"sequencePendingTechniqueStable\":"
           << (sequence.pendingTechniqueStable ? "true" : "false")
           << ",\"sequenceMatchingTechniques\":[";
    for (std::size_t techniqueIndex = 0;
         techniqueIndex < sequence.matchingTechniques.size();
         ++techniqueIndex) {
      if (techniqueIndex > 0) {
        output << ',';
      }
      output << jsonString(std::string(
          techniqueCode(sequence.matchingTechniques[techniqueIndex])));
    }
    output << ']'
           << ",\"explanationAutomaticTechnique\":"
           << jsonString(explanation.full.automaticTechnique.has_value()
                             ? std::string(techniqueCode(
                                   *explanation.full.automaticTechnique))
                             : "none")
           << ",\"explanationExpectedTechniqueCandidate\":"
           << (explanation.expectedTechniqueCandidate ? "true" : "false")
           << ",\"explanationAutomaticMatchesExpected\":"
           << (explanation.automaticMatchesExpected ? "true" : "false")
           << ",\"explanationCandidateCount\":"
           << explanation.full.candidates.size()
           << ",\"explanationCandidates\":[";
    for (std::size_t candidateIndex = 0;
         candidateIndex < explanation.full.candidates.size();
         ++candidateIndex) {
      if (candidateIndex > 0) {
        output << ',';
      }
      const auto &candidate = explanation.full.candidates[candidateIndex];
      output << "{\"techniqueCode\":"
             << jsonString(std::string(techniqueCode(candidate.technique)))
             << ",\"humanCost\":" << candidate.humanCost
             << ",\"directPlacementMatch\":"
             << (candidate.directPlacementMatch ? "true" : "false")
             << ",\"oneHopPlacementMatch\":"
             << (candidate.oneHopPlacementMatch ? "true" : "false")
             << ",\"matchingOpportunityCount\":"
             << candidate.matchingOpportunities.size() << '}';
    }
    output << "]"
           << ",\"explanationHasPartial\":"
           << (explanation.hasPartial ? "true" : "false")
           << ",\"explanationPartialExpectedTechniqueCandidate\":"
           << (explanation.partialExpectedTechniqueCandidate ? "true"
                                                              : "false")
           << ",\"explanationDeterministic\":"
           << (explanation.deterministic ? "true" : "false")
           << ",\"explanationClosurePlacementCount\":"
           << explanation.closurePlacementCount
           << ",\"explanationClosureExpectedTechniqueCandidateCount\":"
           << explanation.closureExpectedTechniqueCandidateCount
           << ",\"explanationClosureAutomaticMatchesExpectedCount\":"
           << explanation.closureAutomaticMatchesExpectedCount
           << ",\"sequenceProofAudit\":";
    if (!proofAudit.valid) {
      output << "null";
    } else {
      output << "{\"family\":"
             << jsonString(std::string(proofAudit.family))
             << ",\"targetEffects\":[";
      for (std::size_t effectIndex = 0;
           effectIndex < proofAudit.targetEffects.size(); ++effectIndex) {
        if (effectIndex > 0) {
          output << ',';
        }
        writeOpportunityEffect(output, proofAudit.targetEffects[effectIndex]);
      }
      output << "],\"identities\":[";
      for (std::size_t identityIndex = 0;
           identityIndex < proofAudit.identities.size(); ++identityIndex) {
        if (identityIndex > 0) {
          output << ',';
        }
        const auto &identityAudit = proofAudit.identities[identityIndex];
        output << "{\"techniqueCode\":"
               << jsonString(std::string(
                      techniqueCode(identityAudit.identity.technique)))
               << ",\"difficultyLevel\":"
               << static_cast<unsigned>(
                      difficultyLevel(identityAudit.identity.technique))
               << ",\"complete\":"
               << (identityAudit.complete ? "true" : "false")
               << ",\"outcomeEffectCount\":"
               << effectsForOutcome(identityAudit.identity.outcome).size()
               << ",\"remainingEffectCount\":"
               << identityAudit.remainingEffectCount
               << ",\"proofVariantCount\":"
               << identityAudit.proofVariantCount
               << ",\"humanCost\":" << identityAudit.humanCost
               << ",\"focusCellCount\":"
               << identityAudit.focusCellCount
               << ",\"focusRegionCount\":"
               << identityAudit.focusRegionCount
               << ",\"premiseCount\":" << identityAudit.premiseCount
               << ",\"proofReasons\":[";
        for (std::size_t reasonIndex = 0;
             reasonIndex < identityAudit.proofReasons.size(); ++reasonIndex) {
          if (reasonIndex > 0) {
            output << ',';
          }
          output << jsonString(std::string(
              proofReasonName(identityAudit.proofReasons[reasonIndex])));
        }
        output << "]}";
      }
      output << "]}";
    }
    output << ",\"sequenceHasPartial\":"
           << (sequence.hasPartialSequence ? "true" : "false")
           << ",\"sequencePartialStatus\":"
           << jsonString(sequence.hasPartialSequence
                             ? std::string(sequenceStatusName(
                                   sequence.partialStatus))
                             : "not_applicable")
           << ",\"sequencePartialIdentityPreserved\":"
           << (sequence.partialIdentityPreserved ? "true" : "false")
           << ",\"sequenceOrderIndependent\":"
           << (sequence.orderIndependent ? "true" : "false")
           << ",\"sequenceDeterministic\":"
           << (sequence.deterministic ? "true" : "false")
           << ",\"sequenceUnrelatedStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.unrelatedStatus)))
           << ",\"sequenceRevisionStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.revisionStatus)))
           << ",\"sequenceHintViewedStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.hintViewedStatus)))
           << ",\"sequenceHintAppliedStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.hintAppliedStatus)))
           << ",\"sequenceUndoStatus\":"
           << jsonString(std::string(
                  sequenceStatusName(sequence.undoStatus)))
           << ",\"enumerationLimitTechniques\":[";
    bool firstLimit = true;
    for (const auto technique : fixtureLimitTechniques) {
      if (!firstLimit) {
        output << ',';
      }
      firstLimit = false;
      if (firstEvaluationForState) {
        ++enumerationLimitEvents;
      }
      output << jsonString(std::string(techniqueCode(technique)));
    }
    output << "],\"limitSensitivity\":";
    if (sensitivity == nullptr) {
      output << "null";
    } else {
      output << "{\"defaultRawOpportunityCount\":"
             << sensitivity->defaultRawCount
             << ",\"expandedRawOpportunityCount\":"
             << sensitivity->expandedRawCount
             << ",\"defaultUniqueOpportunityCount\":"
             << sensitivity->defaultUniqueCount
             << ",\"expandedUniqueOpportunityCount\":"
             << sensitivity->expandedUniqueCount
             << ",\"additionalIdentityCount\":"
             << sensitivity->additionalIdentityCount
             << ",\"missingDefaultIdentityCount\":"
             << sensitivity->missingDefaultIdentityCount
             << ",\"deterministic\":"
             << (sensitivity->deterministic ? "true" : "false")
             << ",\"defaultMedianMicroseconds\":"
             << sensitivity->defaultMedianMicroseconds
             << ",\"expandedMedianMicroseconds\":"
             << sensitivity->expandedMedianMicroseconds
             << ",\"defaultEffectCount\":"
             << sensitivity->defaultEffectCount
             << ",\"expandedNewEffectCount\":"
             << sensitivity->expandedNewEffectCount
             << ",\"attributionStatusChangedCount\":"
             << sensitivity->attributionStatusChangedCount
             << ",\"defaultTechniqueCandidateCount\":"
             << sensitivity->defaultTechniqueCandidateCount
             << ",\"preservedTechniqueCandidateCount\":"
             << sensitivity->preservedTechniqueCandidateCount
             << ",\"candidateBecameCrossTechniqueCount\":"
             << sensitivity->candidateBecameCrossTechniqueCount
             << ",\"attributedTechniqueChangedCount\":"
             << sensitivity->attributedTechniqueChangedCount
             << ",\"candidateInvalidations\":[";
      for (std::size_t invalidationIndex = 0;
           invalidationIndex < sensitivity->candidateInvalidations.size();
           ++invalidationIndex) {
        if (invalidationIndex > 0) {
          output << ',';
        }
        const auto &invalidation =
            sensitivity->candidateInvalidations[invalidationIndex];
        output << "{\"effectKind\":"
               << jsonString(invalidation.effect.kind ==
                                     OpportunityEffectKind::placement
                                 ? "placement"
                                 : "elimination")
               << ",\"cell\":"
               << static_cast<unsigned>(invalidation.effect.candidate.cell)
               << ",\"digit\":"
               << static_cast<unsigned>(invalidation.effect.candidate.digit)
               << ",\"baselineStatus\":"
               << jsonString(std::string(
                      attributionStatusName(invalidation.baselineStatus)))
               << ",\"baselineTechnique\":"
               << jsonString(std::string(
                      techniqueCode(invalidation.baselineTechnique)))
               << ",\"comparisonStatus\":"
               << jsonString(std::string(
                      attributionStatusName(invalidation.comparisonStatus)))
               << ",\"comparisonTechniques\":[";
        for (std::size_t techniqueIndex = 0;
             techniqueIndex < invalidation.comparisonTechniques.size();
             ++techniqueIndex) {
          if (techniqueIndex > 0) {
            output << ',';
          }
          output << jsonString(std::string(techniqueCode(
              invalidation.comparisonTechniques[techniqueIndex])));
        }
        output << "]}";
      }
      output << "],\"attributionTransitions\":{";
      for (std::size_t baselineIndex = 0;
           baselineIndex < kAttributionStatuses.size(); ++baselineIndex) {
        if (baselineIndex > 0) {
          output << ',';
        }
        output << jsonString(std::string(
                      attributionStatusName(kAttributionStatuses[baselineIndex])))
               << ":{";
        for (std::size_t comparisonIndex = 0;
             comparisonIndex < kAttributionStatuses.size();
             ++comparisonIndex) {
          if (comparisonIndex > 0) {
            output << ',';
          }
          output << jsonString(std::string(attributionStatusName(
                        kAttributionStatuses[comparisonIndex])))
                 << ':'
                 << sensitivity->attributionTransitions[baselineIndex]
                                                        [comparisonIndex];
        }
        output << '}';
      }
      output << "},\"additionalByTechnique\":{";
      bool firstAdditional = true;
      for (std::size_t techniqueIndex = 0;
           techniqueIndex < kTechniqueCatalog.size(); ++techniqueIndex) {
        if (sensitivity->additionalByTechnique[techniqueIndex] == 0) {
          continue;
        }
        if (!firstAdditional) {
          output << ',';
        }
        firstAdditional = false;
        output << jsonString(
                      std::string(kTechniqueCatalog[techniqueIndex].code))
               << ':'
               << sensitivity->additionalByTechnique[techniqueIndex];
      }
      output << "},\"expandedEnumerationLimitTechniques\":[";
      for (std::size_t limitIndex = 0;
           limitIndex < sensitivity->remainingLimitTechniques.size();
           ++limitIndex) {
        if (limitIndex > 0) {
          output << ',';
        }
        output << jsonString(std::string(techniqueCode(
            sensitivity->remainingLimitTechniques[limitIndex])));
      }
      output << "]}";
    }
    output << '}';

    if (expected == nullptr || fixtureUnsafe != 0 ||
        analysis.invalidOpportunityCount != 0 ||
        analysis.duplicateRawOpportunityCount != 0 ||
        !analysis.selectionOrderConsistent) {
      std::cerr << "opportunity evaluation failed for "
                << kTechniqueCatalog[index].code << '\n';
      return false;
    }
  }
  output << "],\"summary\":{\"expectedIdentityCount\":"
         << fixtures.size() << ",\"expectedIdentityFound\":"
         << expectedFound << ",\"unsafeOpportunityCount\":" << unsafeCount
         << ",\"uniqueStateCount\":" << evaluatedStates.size()
         << ",\"rawOpportunityCount\":" << rawCount
         << ",\"uniqueOpportunityCount\":" << uniqueCount
         << ",\"distinctOutcomeCount\":" << outcomeCount
         << ",\"ambiguousOutcomeCount\":" << ambiguousCount
         << ",\"effectCount\":" << effectCount
         << ",\"ambiguousEffectCount\":" << ambiguousEffectCount
         << ",\"crossTechniqueAmbiguousEffectCount\":"
         << crossTechniqueAmbiguousEffectCount
         << ",\"duplicateRawOpportunityCount\":" << duplicateCount
         << ",\"frontierMaskedCount\":" << frontierMaskedCount
         << ",\"lowerLevelMaskedCount\":" << lowerLevelMaskedCount
         << ",\"sequenceFixtureCount\":" << fixtures.size()
         << ",\"sequenceEffectCount\":" << sequenceEffectCount
         << ",\"sequenceMultiEffectCount\":" << sequenceMultiEffectCount
         << ",\"sequenceCompletedCount\":" << sequenceCompletedCount
         << ",\"sequenceAmbiguousCount\":" << sequenceAmbiguousCount
         << ",\"sequenceOverlapPendingCount\":"
         << sequenceOverlapPendingCount
         << ",\"sequencePendingTechniqueStableCount\":"
         << sequencePendingTechniqueStableCount
         << ",\"sequencePendingCrossTechniqueCount\":"
         << sequencePendingCrossTechniqueCount
         << ",\"sequenceExpandedAnalysisCount\":"
         << sequenceExpandedAnalysisCount
         << ",\"sequencePartialPreservedCount\":"
         << sequencePartialPreservedCount
         << ",\"sequenceOrderIndependentCount\":"
         << sequenceOrderIndependentCount
         << ",\"sequenceDeterministicCount\":"
         << sequenceDeterministicCount
         << ",\"sequenceUnrelatedSupersededCount\":"
         << sequenceUnrelatedSupersededCount
         << ",\"sequenceRevisionInvalidatedCount\":"
         << sequenceRevisionInvalidatedCount
         << ",\"sequenceHintViewedPollutedCount\":"
         << sequenceHintViewedPollutedCount
         << ",\"sequenceHintAppliedPollutedCount\":"
         << sequenceHintAppliedPollutedCount
         << ",\"sequenceUndoPollutedCount\":"
         << sequenceUndoPollutedCount
         << ",\"explanationExpectedCandidateCount\":"
         << explanationExpectedCandidateCount
         << ",\"explanationAutomaticMatchesExpectedCount\":"
         << explanationAutomaticMatchesExpectedCount
         << ",\"explanationMultipleCandidateCount\":"
         << explanationMultipleCandidateCount
         << ",\"explanationPartialCount\":" << explanationPartialCount
         << ",\"explanationPartialExpectedCandidateCount\":"
         << explanationPartialExpectedCandidateCount
         << ",\"explanationDeterministicCount\":"
         << explanationDeterministicCount
         << ",\"explanationClosurePlacementCount\":"
         << explanationClosurePlacementCount
         << ",\"explanationClosureExpectedCandidateCount\":"
         << explanationClosureExpectedCandidateCount
         << ",\"explanationClosureAutomaticMatchesExpectedCount\":"
         << explanationClosureAutomaticMatchesExpectedCount
         << ",\"enumerationLimitEventCount\":" << enumerationLimitEvents
         << ",\"enumerationLimitTechniqueCount\":"
         << enumerationLimitTechniques.size()
         << ",\"enumerationLimitTechniques\":[";
  bool firstLimitTechnique = true;
  for (const auto technique : enumerationLimitTechniques) {
    if (!firstLimitTechnique) {
      output << ',';
    }
    firstLimitTechnique = false;
    output << jsonString(std::string(techniqueCode(technique)));
  }
  output << "],\"sensitivityStateCount\":" << sensitivityStateCount
         << ",\"expandedAdditionalIdentityCount\":"
         << sensitivityAdditionalIdentities
         << ",\"expandedMissingDefaultIdentityCount\":"
         << sensitivityMissingDefaultIdentities
         << ",\"sensitivityDefaultMedianMicroseconds\":"
         << sensitivityDefaultMedianMicroseconds
         << ",\"sensitivityExpandedMedianMicroseconds\":"
         << sensitivityExpandedMedianMicroseconds
         << ",\"sensitivityDefaultEffectCount\":"
         << sensitivityDefaultEffectCount
         << ",\"sensitivityExpandedNewEffectCount\":"
         << sensitivityExpandedNewEffectCount
         << ",\"sensitivityAttributionStatusChangedCount\":"
         << sensitivityAttributionStatusChangedCount
         << ",\"sensitivityDefaultTechniqueCandidateCount\":"
         << sensitivityDefaultTechniqueCandidateCount
         << ",\"sensitivityPreservedTechniqueCandidateCount\":"
         << sensitivityPreservedTechniqueCandidateCount
         << ",\"sensitivityCandidateBecameCrossTechniqueCount\":"
         << sensitivityCandidateBecameCrossTechniqueCount
         << ",\"sensitivityAttributedTechniqueChangedCount\":"
         << sensitivityAttributedTechniqueChangedCount
         << ",\"sensitivityAttributionTransitions\":{";
  for (std::size_t baselineIndex = 0;
       baselineIndex < kAttributionStatuses.size(); ++baselineIndex) {
    if (baselineIndex > 0) {
      output << ',';
    }
    output << jsonString(std::string(
                  attributionStatusName(kAttributionStatuses[baselineIndex])))
           << ":{";
    for (std::size_t comparisonIndex = 0;
         comparisonIndex < kAttributionStatuses.size(); ++comparisonIndex) {
      if (comparisonIndex > 0) {
        output << ',';
      }
      output << jsonString(std::string(attributionStatusName(
                    kAttributionStatuses[comparisonIndex])))
             << ':'
             << sensitivityAttributionTransitions[baselineIndex]
                                                     [comparisonIndex];
    }
    output << '}';
  }
  output << "},\"expandedEnumerationLimitTechniques\":[";
  bool firstExpandedLimit = true;
  for (const auto technique : expandedLimitTechniques) {
    if (!firstExpandedLimit) {
      output << ',';
    }
    firstExpandedLimit = false;
    output << jsonString(std::string(techniqueCode(technique)));
  }
  output << ']'
         << "}}\n";
  std::cout << "evaluated all " << expectedFound
            << " expected technique identities and " << fixtures.size()
            << " action sequences\n";
  return expectedFound == fixtures.size() && unsafeCount == 0 &&
         duplicateCount == 0 && sensitivityMissingDefaultIdentities == 0;
}

} // namespace

int main(int argc, char **argv) {
  if (argc != 3 && argc != 4) {
    std::cerr << "usage: fixture_export puzzles.csv output.json "
                 "[opportunity-evaluation.json]\n";
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
  if (argc == 4 && !writeOpportunityEvaluation(argv[3], fixtures)) {
    return EXIT_FAILURE;
  }
  std::cout << "exported 39 hint acceptance fixtures\n";
  return EXIT_SUCCESS;
}
