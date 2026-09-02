#!/usr/bin/env python3
"""Render the deterministic C++ opportunity-evaluation JSON as Markdown."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--markdown-output", required=True, type=Path)
    return parser.parse_args()


def require_int(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or value < 0:
        raise RuntimeError(f"Invalid {key}: {value!r}")
    return value


def render_effect(effect: Any) -> str:
    if not isinstance(effect, dict):
        raise RuntimeError("Invalid proof audit effect")
    kind = effect.get("kind")
    cell = require_int(effect, "cell")
    digit = require_int(effect, "digit")
    if kind not in {"placement", "elimination"} or cell >= 81 or digit not in range(1, 10):
        raise RuntimeError("Invalid proof audit effect fields")
    prefix = "p" if kind == "placement" else "e"
    return f"{prefix} r{cell // 9 + 1}c{cell % 9 + 1}={digit}"


def main() -> None:
    args = parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures")
    summary = payload.get("summary")
    if (
        payload.get("evaluationKind")
        != "opportunity_identity_sequence_and_masking"
        or not isinstance(fixtures, list)
        or len(fixtures) != 39
        or not isinstance(summary, dict)
    ):
        raise RuntimeError("Unexpected opportunity evaluation payload")

    expected = require_int(summary, "expectedIdentityCount")
    found = require_int(summary, "expectedIdentityFound")
    unsafe = require_int(summary, "unsafeOpportunityCount")
    duplicates = require_int(summary, "duplicateRawOpportunityCount")
    expanded_missing = require_int(summary, "expandedMissingDefaultIdentityCount")
    default_median_total = require_int(
        summary, "sensitivityDefaultMedianMicroseconds"
    )
    expanded_median_total = require_int(
        summary, "sensitivityExpandedMedianMicroseconds"
    )
    default_effects = require_int(summary, "sensitivityDefaultEffectCount")
    expanded_new_effects = require_int(
        summary, "sensitivityExpandedNewEffectCount"
    )
    attribution_changes = require_int(
        summary, "sensitivityAttributionStatusChangedCount"
    )
    default_candidates = require_int(
        summary, "sensitivityDefaultTechniqueCandidateCount"
    )
    preserved_candidates = require_int(
        summary, "sensitivityPreservedTechniqueCandidateCount"
    )
    candidates_became_cross = require_int(
        summary, "sensitivityCandidateBecameCrossTechniqueCount"
    )
    changed_techniques = require_int(
        summary, "sensitivityAttributedTechniqueChangedCount"
    )
    sequence_fixtures = require_int(summary, "sequenceFixtureCount")
    sequence_multi_effects = require_int(summary, "sequenceMultiEffectCount")
    sequence_completed = require_int(summary, "sequenceCompletedCount")
    sequence_ambiguous = require_int(summary, "sequenceAmbiguousCount")
    sequence_pending = require_int(summary, "sequenceOverlapPendingCount")
    sequence_pending_stable = require_int(
        summary, "sequencePendingTechniqueStableCount"
    )
    sequence_pending_cross = require_int(
        summary, "sequencePendingCrossTechniqueCount"
    )
    sequence_partial_preserved = require_int(
        summary, "sequencePartialPreservedCount"
    )
    sequence_order_independent = require_int(
        summary, "sequenceOrderIndependentCount"
    )
    sequence_deterministic = require_int(summary, "sequenceDeterministicCount")
    sequence_unrelated = require_int(
        summary, "sequenceUnrelatedSupersededCount"
    )
    sequence_revision = require_int(
        summary, "sequenceRevisionInvalidatedCount"
    )
    sequence_hint_viewed = require_int(
        summary, "sequenceHintViewedPollutedCount"
    )
    sequence_hint_applied = require_int(
        summary, "sequenceHintAppliedPollutedCount"
    )
    sequence_undo = require_int(summary, "sequenceUndoPollutedCount")
    if (
        expected != 39
        or found != expected
        or unsafe != 0
        or duplicates != 0
        or expanded_missing != 0
        or changed_techniques != 0
        or default_candidates
        != preserved_candidates + candidates_became_cross + changed_techniques
        or sequence_fixtures != expected
        or sequence_completed + sequence_ambiguous + sequence_pending
        != sequence_fixtures
        or sequence_pending_stable + sequence_pending_cross != sequence_pending
        or sequence_multi_effects == 0
        or sequence_partial_preserved != sequence_multi_effects
        or sequence_order_independent != sequence_fixtures
        or sequence_deterministic != sequence_fixtures
        or sequence_unrelated != sequence_fixtures
        or sequence_revision != sequence_fixtures
        or sequence_hint_viewed != sequence_fixtures
        or sequence_hint_applied != sequence_fixtures
        or sequence_undo != sequence_fixtures
    ):
        raise RuntimeError("Opportunity evaluation did not meet its hard gates")
    limit_techniques = summary.get("enumerationLimitTechniques")
    expanded_limit_techniques = summary.get("expandedEnumerationLimitTechniques")
    if not isinstance(limit_techniques, list) or not isinstance(
        expanded_limit_techniques, list
    ):
        raise RuntimeError("Missing enumeration sensitivity summary")

    lines = [
        "# 39技巧多机会与动作序列算法评价",
        "",
        "本报告由固定的39项 Hint Lab C++ 夹具生成。每个夹具在同一盘面上运行等级1–5的 `allDirect` 搜索，检查目标技巧 identity 是否被召回、全部动作是否与答案相容，以及检测器是否达到枚举边界。",
        "",
        "## 汇总",
        "",
        "| 指标 | 数量 |",
        "| --- | ---: |",
        f"| 目标技巧 identity | {expected} |",
        f"| 成功召回 | {found} |",
        f"| 去重后的夹具盘面 | {require_int(summary, 'uniqueStateCount')} |",
        f"| 不安全机会 | {unsafe} |",
        f"| 原始证明 | {require_int(summary, 'rawOpportunityCount')} |",
        f"| 去重机会 identity | {require_int(summary, 'uniqueOpportunityCount')} |",
        f"| 不同动作 outcome | {require_int(summary, 'distinctOutcomeCount')} |",
        f"| 歧义 outcome | {require_int(summary, 'ambiguousOutcomeCount')} |",
        f"| 原子 placement/elimination 效果 | {require_int(summary, 'effectCount')} |",
        f"| 多机会可解释效果 | {require_int(summary, 'ambiguousEffectCount')} |",
        f"| 多技巧可解释效果 | {require_int(summary, 'crossTechniqueAmbiguousEffectCount')} |",
        f"| 完全重复证明 | {duplicates} |",
        f"| 同级排序遮蔽 | {require_int(summary, 'frontierMaskedCount')} |",
        f"| 低等级遮蔽 | {require_int(summary, 'lowerLevelMaskedCount')} |",
        f"| 达到枚举边界的检测器事件 | {require_int(summary, 'enumerationLimitEventCount')} |",
        f"| 达到默认边界的技巧 | {', '.join(limit_techniques) if limit_techniques else '—'} |",
        f"| 进行扩容对照的不同盘面 | {require_int(summary, 'sensitivityStateCount')} |",
        f"| 扩容新增 identity | {require_int(summary, 'expandedAdditionalIdentityCount')} |",
        f"| 扩容丢失默认 identity | {expanded_missing} |",
        f"| 风险盘面的默认 effect | {default_effects} |",
        f"| 扩容新增 effect | {expanded_new_effects} |",
        f"| 归因状态变化 effect | {attribution_changes} |",
        f"| 默认输出技巧候选 | {default_candidates} |",
        f"| 扩容后保持同技巧候选 | {preserved_candidates} |",
        f"| 扩容后变为跨技巧歧义 | {candidates_became_cross} |",
        f"| 扩容后错误切换到另一技巧 | {changed_techniques} |",
        f"| 默认搜索中位耗时合计（4盘面） | {default_median_total} µs |",
        f"| 扩容搜索中位耗时合计（4盘面） | {expanded_median_total} µs |",
        f"| 扩容后仍达到边界的技巧 | {', '.join(expanded_limit_techniques) if expanded_limit_techniques else '—'} |",
        "",
        "## 真实 outcome 序列回放",
        "",
        "每项技巧把 Hint Lab 检测器实际返回的完整 outcome 转成连续玩家 effect。达到默认枚举边界的盘面先使用扩容且不再触发边界的机会集合。硬门槛包括正序/逆序一致、重复运行一致、所有部分 outcome 保留目标 identity，以及无关动作、revision 跳跃、提示和撤销全部保守终止。",
        "",
        "| 指标 | 数量 |",
        "| --- | ---: |",
        f"| 技巧序列 | {sequence_fixtures} |",
        f"| 真实原子 effect | {require_int(summary, 'sequenceEffectCount')} |",
        f"| 多 effect outcome | {sequence_multi_effects} |",
        f"| 使用扩容机会集合的序列 | {require_int(summary, 'sequenceExpandedAnalysisCount')} |",
        f"| 完整后唯一技巧完成 | {sequence_completed} |",
        f"| 完整后跨技巧歧义 | {sequence_ambiguous} |",
        f"| 完整后仍有更长重叠 identity | {sequence_pending} |",
        f"| 重叠未决但技巧集合唯一 | {sequence_pending_stable} |",
        f"| 重叠未决且涉及多个技巧 | {sequence_pending_cross} |",
        f"| 部分序列正确保持目标 identity | {sequence_partial_preserved} |",
        f"| 正序/逆序一致 | {sequence_order_independent} |",
        f"| 重复运行确定 | {sequence_deterministic} |",
        f"| 无关动作正确 supersede | {sequence_unrelated} |",
        f"| revision 跳跃正确失效 | {sequence_revision} |",
        f"| 查看提示正确污染 | {sequence_hint_viewed} |",
        f"| 应用提示正确污染 | {sequence_hint_applied} |",
        f"| 撤销正确污染 | {sequence_undo} |",
        "",
        "### 逐技巧序列结果",
        "",
        "| 技巧 | 目标 effect | 机会集合 | 部分序列 | 完整序列终态 |",
        "| --- | ---: | --- | --- | --- |",
    ]
    proof_audits: list[tuple[str, dict[str, Any]]] = []
    for fixture in fixtures:
        if not isinstance(fixture, dict):
            raise RuntimeError("Invalid fixture sequence evaluation")
        has_partial = fixture.get("sequenceHasPartial")
        partial_preserved = fixture.get("sequencePartialIdentityPreserved")
        partial_status = fixture.get("sequencePartialStatus")
        final_status = fixture.get("sequenceFinalStatus")
        completed_opportunities = require_int(
            fixture, "sequenceCompletedOpportunityCount"
        )
        incomplete_opportunities = require_int(
            fixture, "sequenceIncompleteOpportunityCount"
        )
        matching_techniques = fixture.get("sequenceMatchingTechniques")
        pending_stable = fixture.get("sequencePendingTechniqueStable")
        if not isinstance(has_partial, bool) or not isinstance(
            partial_preserved, bool
        ) or not isinstance(pending_stable, bool):
            raise RuntimeError("Invalid partial sequence result")
        if not isinstance(matching_techniques, list) or not matching_techniques or not all(
            isinstance(code, str) for code in matching_techniques
        ):
            raise RuntimeError("Invalid sequence technique candidates")
        proof_audit = fixture.get("sequenceProofAudit")
        if proof_audit is not None:
            if not isinstance(proof_audit, dict) or not isinstance(
                fixture.get("techniqueCode"), str
            ):
                raise RuntimeError("Invalid representative proof audit")
            proof_audits.append((fixture["techniqueCode"], proof_audit))
        if (
            fixture.get("sequenceOrderIndependent") is not True
            or fixture.get("sequenceDeterministic") is not True
            or fixture.get("sequenceUnrelatedStatus") != "superseded"
            or fixture.get("sequenceRevisionStatus") != "revision_invalidated"
            or fixture.get("sequenceHintViewedStatus") != "hint_polluted"
            or fixture.get("sequenceHintAppliedStatus") != "hint_polluted"
            or fixture.get("sequenceUndoStatus") != "undo_polluted"
            or (
                has_partial
                and (partial_status != "matching" or not partial_preserved)
            )
            or (
                not has_partial
                and (partial_status != "not_applicable" or partial_preserved)
            )
            or final_status not in {"completed", "ambiguous", "matching"}
            or (
                final_status == "completed"
                and (
                    completed_opportunities == 0
                    or incomplete_opportunities != 0
                    or len(matching_techniques) != 1
                    or pending_stable
                )
            )
            or (
                final_status == "ambiguous"
                and (
                    completed_opportunities < 2
                    or incomplete_opportunities != 0
                    or len(matching_techniques) < 2
                    or pending_stable
                )
            )
            or (
                final_status == "matching"
                and (
                    completed_opportunities == 0
                    or incomplete_opportunities == 0
                    or pending_stable != (len(matching_techniques) == 1)
                )
            )
        ):
            raise RuntimeError("Sequence evaluation did not meet its hard gates")
        lines.append(
            "| {code} | {effects} | {analysis} | {partial} | {final} |".format(
                code=fixture.get("techniqueCode"),
                effects=require_int(fixture, "sequenceEffectCount"),
                analysis=(
                    "expanded"
                    if fixture.get("sequenceUsedExpandedAnalysis") is True
                    else "default"
                ),
                partial=partial_status,
                final=final_status,
            )
        )

    proof_families = {audit.get("family") for _, audit in proof_audits}
    if len(proof_audits) != 4 or proof_families != {
        "subset",
        "fish",
        "chain",
        "coloring",
    }:
        raise RuntimeError("Representative proof audit coverage is incomplete")

    lines.extend(
        [
            "",
            "### 非唯一序列审计目录",
            "",
            "`matching` 行已经完成至少一个 identity，但仍有更长 identity 未完成；`ambiguous` 行的存活 identity 已全部完成但横跨多个技巧。只有所有存活 identity 都属于同一技巧，才具备进一步讨论提前输出技巧候选的前提。",
            "",
            "| 目标技巧 | 终态 | 已完整 identity | 未完整 identity | 存活技巧 | 当前决定 |",
            "| --- | --- | ---: | ---: | --- | --- |",
        ]
    )
    for fixture in fixtures:
        final_status = fixture.get("sequenceFinalStatus")
        if final_status == "completed":
            continue
        matching_techniques = fixture.get("sequenceMatchingTechniques")
        if not isinstance(matching_techniques, list):
            raise RuntimeError("Missing sequence conflict techniques")
        pending_stable = fixture.get("sequencePendingTechniqueStable") is True
        decision = (
            "候选可研究但继续等待"
            if final_status == "matching" and pending_stable
            else "跨技巧，保守放弃"
        )
        lines.append(
            "| {code} | {status} | {completed} | {incomplete} | {techniques} | {decision} |".format(
                code=fixture.get("techniqueCode"),
                status=final_status,
                completed=require_int(
                    fixture, "sequenceCompletedOpportunityCount"
                ),
                incomplete=require_int(
                    fixture, "sequenceIncompleteOpportunityCount"
                ),
                techniques=", ".join(matching_techniques),
                decision=decision,
            )
        )

    lines.extend(
        [
            "",
            "### 代表冲突 proof 审计",
            "",
            "以下四组固定代表分别覆盖子集、鱼、链和着色。`complete` 表示该 identity 与目标动作集合完全相同；`incomplete` 表示它包含目标动作但还要求更多 effect。proof 是引擎为各技巧生成的成立依据，不是玩家实际思路的观测证据。",
            "",
            "| 家族 | 目标 | 冲突技巧 | 关系 | 等级 | outcome effect | 剩余 effect | proof 变体 | humanCost | focus cell/region | premise | proof 原因 |",
            "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |",
        ]
    )
    for target, audit in proof_audits:
        family = audit.get("family")
        target_effects = audit.get("targetEffects")
        identities = audit.get("identities")
        if (
            not isinstance(family, str)
            or not isinstance(target_effects, list)
            or not target_effects
            or not isinstance(identities, list)
            or len(identities) < 2
        ):
            raise RuntimeError("Incomplete representative proof audit")
        rendered_target_effects = ", ".join(
            render_effect(effect) for effect in target_effects
        )
        target_found = False
        for identity in identities:
            if not isinstance(identity, dict):
                raise RuntimeError("Invalid proof identity audit")
            technique = identity.get("techniqueCode")
            complete = identity.get("complete")
            reasons = identity.get("proofReasons")
            if (
                not isinstance(technique, str)
                or not isinstance(complete, bool)
                or not isinstance(reasons, list)
                or len(reasons) < 2
                or not all(isinstance(reason, str) for reason in reasons)
                or reasons[0] != "scan_region"
                or reasons[-1] != "valid_elimination"
            ):
                raise RuntimeError("Invalid proof identity evidence")
            remaining = require_int(identity, "remainingEffectCount")
            if complete != (remaining == 0):
                raise RuntimeError("Proof identity completion mismatch")
            target_found = target_found or (technique == target and complete)
            lines.append(
                "| {family} | {target}<br>{effects} | {technique} | {relation} | {level} | {outcome} | {remaining} | {variants} | {cost} | {cells}/{regions} | {premises} | {reasons} |".format(
                    family=family,
                    target=target,
                    effects=rendered_target_effects,
                    technique=technique,
                    relation="complete" if complete else "incomplete",
                    level=require_int(identity, "difficultyLevel"),
                    outcome=require_int(identity, "outcomeEffectCount"),
                    remaining=remaining,
                    variants=require_int(identity, "proofVariantCount"),
                    cost=require_int(identity, "humanCost"),
                    cells=require_int(identity, "focusCellCount"),
                    regions=require_int(identity, "focusRegionCount"),
                    premises=require_int(identity, "premiseCount"),
                    reasons=" → ".join(reasons),
                )
            )
        if not target_found:
            raise RuntimeError("Proof audit lost its target identity")

    lines.extend(
        [
            "",
            "proof 结构可以区分引擎证明使用 `pattern_constraint` 还是 `chain_inference`，也能比较 focus、premise 和成本；但相同玩家 effect 可以同时拥有这些不同证明。它们不能反向证明玩家选择了较低等级、较低成本或目标 fixture 的技巧，因此本轮不增加 proof 优先级归因规则。",
            "",
        ]
    )

    lines.extend(
        [
            "",
            "## 逐技巧结果",
            "",
            "| 技巧 | 召回 | 目标状态 | identity | outcome | 效果 | 跨技巧歧义效果 | 枚举边界 | 扩容新增 |",
            "| --- | :---: | --- | ---: | ---: | ---: | ---: | --- | ---: |",
        ]
    )
    for fixture in fixtures:
        if not isinstance(fixture, dict):
            raise RuntimeError("Invalid fixture evaluation")
        limits = fixture.get("enumerationLimitTechniques")
        if not isinstance(limits, list) or not all(
            isinstance(code, str) for code in limits
        ):
            raise RuntimeError("Invalid enumeration limit diagnostics")
        sensitivity = fixture.get("limitSensitivity")
        if sensitivity is not None and not isinstance(sensitivity, dict):
            raise RuntimeError("Invalid limit sensitivity diagnostics")
        if sensitivity is not None and sensitivity.get("deterministic") is not True:
            raise RuntimeError("Limit sensitivity search was not deterministic")
        lines.append(
            "| {code} | {found} | {state} | {unique} | {outcomes} | {effects} | {ambiguous_effects} | {limits} | {additional} |".format(
                code=fixture.get("techniqueCode"),
                found="是" if fixture.get("expectedIdentityFound") else "否",
                state=fixture.get("expectedSelectionState"),
                unique=require_int(fixture, "uniqueOpportunityCount"),
                outcomes=require_int(fixture, "distinctOutcomeCount"),
                effects=require_int(fixture, "effectCount"),
                ambiguous_effects=require_int(
                    fixture, "crossTechniqueAmbiguousEffectCount"
                ),
                limits=", ".join(limits) if limits else "—",
                additional=(
                    require_int(sensitivity, "additionalIdentityCount")
                    if sensitivity is not None
                    else 0
                ),
            )
        )

    lines.extend(
        [
            "",
            "## Effect 归因稳定性",
            "",
            "下表只比较触发默认枚举边界的4个盘面。默认技巧候选若在扩容后变为跨技巧歧义，说明有界集合中的“唯一”存在误归因风险，不能直接进入成长事件。",
            "",
            "| 盘面 | 默认 effect | 新增 effect | 状态变化 | 默认技巧候选 | 保持候选 | 变为跨技巧歧义 |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    rendered_states: set[tuple[str, int]] = set()
    invalidation_rows: list[str] = []
    for fixture in fixtures:
        sensitivity = fixture.get("limitSensitivity")
        if not isinstance(sensitivity, dict):
            continue
        source_id = fixture.get("sourcePuzzleId")
        source_iteration = fixture.get("sourceIteration")
        if not isinstance(source_id, str) or not isinstance(source_iteration, int):
            raise RuntimeError("Invalid sensitivity state identity")
        state = (source_id, source_iteration)
        if state in rendered_states:
            continue
        rendered_states.add(state)
        lines.append(
            f"| {source_id}:{source_iteration} | "
            f"{require_int(sensitivity, 'defaultEffectCount')} | "
            f"{require_int(sensitivity, 'expandedNewEffectCount')} | "
            f"{require_int(sensitivity, 'attributionStatusChangedCount')} | "
            f"{require_int(sensitivity, 'defaultTechniqueCandidateCount')} | "
            f"{require_int(sensitivity, 'preservedTechniqueCandidateCount')} | "
            f"{require_int(sensitivity, 'candidateBecameCrossTechniqueCount')} |"
        )
        invalidations = sensitivity.get("candidateInvalidations")
        if not isinstance(invalidations, list):
            raise RuntimeError("Missing candidate invalidation details")
        for invalidation in invalidations:
            if not isinstance(invalidation, dict):
                raise RuntimeError("Invalid candidate invalidation")
            techniques = invalidation.get("comparisonTechniques")
            if not isinstance(techniques, list) or not all(
                isinstance(code, str) for code in techniques
            ):
                raise RuntimeError("Invalid comparison techniques")
            invalidation_rows.append(
                "| {state} | {kind} r{row}c{column}={digit} | {baseline} | {comparison} |".format(
                    state=f"{source_id}:{source_iteration}",
                    kind=invalidation.get("effectKind"),
                    row=require_int(invalidation, "cell") // 9 + 1,
                    column=require_int(invalidation, "cell") % 9 + 1,
                    digit=require_int(invalidation, "digit"),
                    baseline=invalidation.get("baselineTechnique"),
                    comparison=", ".join(techniques),
                )
            )

    if len(invalidation_rows) != candidates_became_cross:
        raise RuntimeError("Candidate invalidation details do not match summary")

    lines.extend(
        [
            "",
            "### 被扩容推翻的技巧候选",
            "",
            "| 盘面 | Effect | 默认技巧 | 扩容后涉及技巧 |",
            "| --- | --- | --- | --- |",
            *(invalidation_rows or ["| — | — | — | — |"]),
            "",
            "## 枚举扩容性能对照",
            "",
            "每个搜索配置在同一进程内重复3次，表中记录中位耗时。盘面按 source puzzle 与 iteration 去重；倍率只用于比较本次同机同轮成本，不是移动端发布延迟门槛。",
            "",
            "| 盘面 | 默认中位耗时 | 扩容中位耗时 | 扩容/默认 | 新增 identity |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
    )
    rendered_states = set()
    for fixture in fixtures:
        sensitivity = fixture.get("limitSensitivity")
        if not isinstance(sensitivity, dict):
            continue
        source_id = fixture.get("sourcePuzzleId")
        source_iteration = fixture.get("sourceIteration")
        if not isinstance(source_id, str) or not isinstance(source_iteration, int):
            raise RuntimeError("Invalid sensitivity state identity")
        state = (source_id, source_iteration)
        if state in rendered_states:
            continue
        rendered_states.add(state)
        default_micros = require_int(sensitivity, "defaultMedianMicroseconds")
        expanded_micros = require_int(sensitivity, "expandedMedianMicroseconds")
        ratio = (
            f"{expanded_micros / default_micros:.2f}×"
            if default_micros > 0
            else "—"
        )
        lines.append(
            f"| {source_id}:{source_iteration} | {default_micros} µs | "
            f"{expanded_micros} µs | {ratio} | "
            f"{require_int(sensitivity, 'additionalIdentityCount')} |"
        )

    lines.extend(
        [
            "",
            "## 解释边界",
            "",
            "39/39召回证明每个既有正例都能进入多机会 identity 集合；汇总数量按 source puzzle 与 iteration 对盘面去重，逐技巧表仍保留39行。动作安全检查可以排除与题目答案冲突的结果。它不能证明集合包含盘面上全部人类可见机会，也不能把同 outcome 的某一种技巧解释认定为玩家真实采用的技巧。",
            "",
            "`reachedEnumerationLimit` 是保守的不完整风险信号：它表示检测器候选收集达到当前边界，不等于已经证明存在漏检。出现该信号的技巧必须进入后续定向扩容与人工真值检查。",
            "",
            "扩容对照把等级2–4候选上限从256提高到1024、等级5从64提高到512。扩容新增 identity 证明默认边界确实会省略部分当前盘面机会；这些新增结果仍只通过动作安全性检查，不能替代逐项人工技巧真值标注。",
            "",
            "耗时记录受主机负载、编译器和硬件影响。验收硬门槛是三次运行输出完全一致、扩容不丢失默认 identity；本轮微秒数仅用于评估完整性收益的相对成本。",
            "",
            "动作序列中的 `completed` 只表示完整 effect 集合最终剩余一个技巧；`ambiguous` 表示同一完整动作仍有多个技巧解释；`matching` 表示目标 outcome 已做完但更长的重叠 identity 仍可能成立。后两类都不输出技巧候选。序列评价不证明玩家独立发现，也不包含计时、自动候选或成长事件策略。",
            "",
            "当前16个 `matching` 案例的存活 identity 全部跨技巧，没有仅由同一技巧构成的重叠未决案例。因此现有证据不支持放宽提前关闭规则；下一步需要对审计目录中的具体 effect 和证明做人工真值扩充，而不是从正例 fixture 自动推定玩家采用的技巧。",
            "",
        ]
    )
    args.markdown_output.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
