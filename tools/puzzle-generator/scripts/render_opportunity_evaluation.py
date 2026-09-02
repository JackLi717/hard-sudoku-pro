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
    if (
        expected != 39
        or found != expected
        or unsafe != 0
        or duplicates != 0
        or expanded_missing != 0
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
            "## 解释边界",
            "",
            "39/39召回证明每个既有正例都能进入多机会 identity 集合；汇总数量按 source puzzle 与 iteration 对盘面去重，逐技巧表仍保留39行。动作安全检查可以排除与题目答案冲突的结果。它不能证明集合包含盘面上全部人类可见机会，也不能把同 outcome 的某一种技巧解释认定为玩家真实采用的技巧。",
            "",
            "`reachedEnumerationLimit` 是保守的不完整风险信号：它表示检测器候选收集达到当前边界，不等于已经证明存在漏检。出现该信号的技巧必须进入后续定向扩容与人工真值检查。",
            "",
            "扩容对照把等级2–4候选上限从256提高到1024、等级5从64提高到512。扩容新增 identity 证明默认边界确实会省略部分当前盘面机会；这些新增结果仍只通过动作安全性检查，不能替代逐项人工技巧真值标注。",
            "",
        ]
    )
    args.markdown_output.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
