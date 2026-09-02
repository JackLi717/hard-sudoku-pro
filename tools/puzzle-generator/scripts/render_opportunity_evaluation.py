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


def main() -> None:
    args = parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures")
    summary = payload.get("summary")
    if (
        payload.get("evaluationKind") != "opportunity_identity_and_masking"
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
    if (
        expected != 39
        or found != expected
        or unsafe != 0
        or duplicates != 0
        or expanded_missing != 0
        or changed_techniques != 0
        or default_candidates
        != preserved_candidates + candidates_became_cross + changed_techniques
    ):
        raise RuntimeError("Opportunity evaluation did not meet its hard gates")
    limit_techniques = summary.get("enumerationLimitTechniques")
    expanded_limit_techniques = summary.get("expandedEnumerationLimitTechniques")
    if not isinstance(limit_techniques, list) or not isinstance(
        expanded_limit_techniques, list
    ):
        raise RuntimeError("Missing enumeration sensitivity summary")

    lines = [
        "# 39技巧多机会算法评价",
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
        "## 逐技巧结果",
        "",
        "| 技巧 | 召回 | 目标状态 | identity | outcome | 效果 | 跨技巧歧义效果 | 枚举边界 | 扩容新增 |",
        "| --- | :---: | --- | ---: | ---: | ---: | ---: | --- | ---: |",
    ]
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
        ]
    )
    args.markdown_output.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
