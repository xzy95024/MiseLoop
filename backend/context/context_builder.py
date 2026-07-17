"""主入口：串联 extractor -> resolver -> normalizer -> mapper，
产出统一、可比、有校验的 restaurant_context.json。

用法:
    python -m backend.context.context_builder
或:
    from backend.context import build_context
    build_context()
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from . import (
    entity_resolver,
    grade_mapper,
    nexla_extractor,
    pdf_extractor,
    unit_normalizer,
    xlsx_extractor,
)
from .nexla_client import NexlaError, NexlaNotConfigured, load_dotenv

# 目录锚点：context_builder.py 在 backend/context/ 下。
_BACKEND = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND.parent

# 原始素材在仓库根 data/ 下；产物写到 backend/output/。
DEFAULT_PDF = _REPO_ROOT / "data" / "sunny_farm_receipt_0716.pdf"
DEFAULT_XLSX = _REPO_ROOT / "data" / "bay_produce_receipts.xlsx"
DEFAULT_OUTPUT = _BACKEND / "output" / "restaurant_context.json"


def _acquire_rows(pdf_path, xlsx_path) -> tuple[list[dict], str, str | None]:
    """取原始行：Nexla combined 端点优先（一次调用，受 60s 超时约束），
    超时/失败/未配置则本地兜底（PDF + Excel 两个 extractor）。

    对应 Nexla flow 的最终产物 —— union 后的 combined Nexset（NEXLA_COMBINED_RESOURCE_ID）。

    Returns:
        (raw_rows, backend, note)；backend ∈ {"nexla", "local_fallback"}。
    """
    combined_id = os.getenv("NEXLA_COMBINED_RESOURCE_ID")
    if combined_id:
        try:
            rows = nexla_extractor.extract_combined(combined_id)
            for r in rows:
                r["extraction_backend"] = "nexla"
            return rows, "nexla", None
        except (NexlaError, NexlaNotConfigured) as e:
            note = f"Nexla 不可用，已回退本地: {e}"
        except Exception as e:  # 任何意外也不能拖垮管道
            note = f"Nexla 异常，已回退本地: {e!r}"
    else:
        note = "未配置 NEXLA_COMBINED_RESOURCE_ID，直接使用本地抽取"

    rows = pdf_extractor.extract(pdf_path) + xlsx_extractor.extract(xlsx_path)
    for r in rows:
        r["extraction_backend"] = "local_fallback"
    return rows, "local_fallback", note


def _unify_row(raw: dict) -> dict:
    """把一条原始行归一成统一记录（实体对齐 + 单位换算 + 品级映射）。"""
    supplier = entity_resolver.resolve_supplier(raw["supplier_raw"])
    item = entity_resolver.resolve_item(raw["item_raw"])

    units = unit_normalizer.normalize_line(
        quantity_value=raw["quantity_value"],
        quantity_unit=raw["quantity_unit"],
        unit_price_value=raw["unit_price_value"],
        unit_price_unit=raw["unit_price_unit"],
    )

    grade = grade_mapper.map_grade(
        item_canonical=item["canonical"],
        supplier_canonical=supplier["canonical"],
        raw_grade=raw["grade_raw"],
    )

    # 校验：归一后的小计 vs 收据上的 source_total 是否一致。
    total_matches = abs(units["subtotal"] - raw["source_total"]) < 1e-2

    return {
        "source_file": raw["source_file"],
        "source_type": raw["source_type"],
        "extraction_backend": raw.get("extraction_backend"),
        "delivery_id": raw["delivery_id"],
        "delivery_date": raw["delivery_date"],
        "delivered_to": raw.get("delivered_to"),
        "best_by_date": raw.get("best_by_date"),
        "certification": raw.get("certification"),
        "supplier": supplier,
        "item": item,
        "grade": grade,
        "quantity": {
            "kg": units["quantity_kg"],
            "raw_value": units["raw_quantity_value"],
            "raw_unit": units["raw_quantity_unit"],
        },
        "unit_price": {
            "per_kg": units["unit_price_per_kg"],
            "raw_value": units["raw_unit_price_value"],
            "raw_unit": units["raw_unit_price_unit"],
            "currency": raw["currency"],
        },
        "subtotal": units["subtotal"],
        "source_total": raw["source_total"],
        "checks": {
            "subtotal_consistent": units["subtotal_consistent"],
            "total_matches_source": total_matches,
        },
    }


def build_context(
    pdf_path: str | Path = DEFAULT_PDF,
    xlsx_path: str | Path = DEFAULT_XLSX,
    output_path: str | Path = DEFAULT_OUTPUT,
    write: bool = True,
) -> dict:
    """跑通整条管道，返回（并可选写出）统一后的 context 字典。

    先打 Nexla combined 端点（受 60s 超时约束），超时/失败/未配置则回退本地抽取。
    """
    load_dotenv()

    raw_rows, backend, note = _acquire_rows(pdf_path, xlsx_path)
    line_items = [_unify_row(r) for r in raw_rows]

    # 汇总校验：把需要人工介入的问题集中列出。
    unresolved_items = sorted(
        {li["item"]["raw"] for li in line_items if not li["item"]["entity_resolved"]}
    )
    unresolved_suppliers = sorted(
        {li["supplier"]["raw"] for li in line_items if not li["supplier"]["entity_resolved"]}
    )
    unresolved_grades = [
        {
            "item": li["item"]["canonical"],
            "supplier": li["supplier"]["canonical"],
            "raw_grade": li["grade"]["raw"],
            "delivery_id": li["delivery_id"],
        }
        for li in line_items
        if not li["grade"]["grade_resolved"]
    ]
    total_issues = [
        li["delivery_id"]
        for li in line_items
        if not (li["checks"]["subtotal_consistent"] and li["checks"]["total_matches_source"])
    ]

    context = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_files": [Path(pdf_path).name, Path(xlsx_path).name],
        "extraction": {
            "backend": backend,
            "note": note,
            "combined_resource_id": os.getenv("NEXLA_COMBINED_RESOURCE_ID"),
            "nexla_timeout_seconds": float(os.getenv("NEXLA_TIMEOUT_SECONDS", "60")),
        },
        "line_items": line_items,
        "validation": {
            "total_line_items": len(line_items),
            "unresolved_items": unresolved_items,
            "unresolved_suppliers": unresolved_suppliers,
            "unresolved_grades": unresolved_grades,
            "total_check_failures": total_issues,
            "clean": not (
                unresolved_items or unresolved_suppliers or unresolved_grades or total_issues
            ),
        },
    }

    if write:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(context, ensure_ascii=False, indent=2), encoding="utf-8")

    return context


def main() -> None:
    context = build_context()
    v = context["validation"]
    ex = context["extraction"]
    print(f"抽取通路: {ex['backend']}  (combined nexset={ex['combined_resource_id']}, Nexla 超时={ex['nexla_timeout_seconds']}s)")
    if ex["note"]:
        print(f"  - {ex['note']}")
    print(f"抽取 {v['total_line_items']} 条品项 -> {DEFAULT_OUTPUT}")
    print(f"未解析食材:   {v['unresolved_items'] or '无'}")
    print(f"未解析供应商: {v['unresolved_suppliers'] or '无'}")
    print(f"未解析品级:   {v['unresolved_grades'] or '无'}")
    print(f"金额校验失败: {v['total_check_failures'] or '无'}")
    print(f"整体干净: {'✅' if v['clean'] else '⚠️  需人工介入'}")


if __name__ == "__main__":
    main()
