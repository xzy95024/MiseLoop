"""从 Bay Produce 的 Excel 流水表抽取结构化字段。

这份是已经结构化的表格，用 pandas.read_excel 直接按列名取值即可，不需要正则。

列：delivery_id, date, item, grade, qty_kg, unit_price, total, best_by_date
注意：文件本身不含供应商列——供应商="Bay Produce"由文件来源隐含，此处写死。
单位：qty_kg 已是 kg，unit_price 为 $/kg。
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

# 供应商名由文件来源确定（表内无此列）。原始名交给 entity_resolver 归一。
_SUPPLIER_RAW = "Bay Produce"


def extract(xlsx_path: str | Path, sheet_name: str = "Receipts") -> list[dict]:
    """抽取 Excel 流水表的所有行。

    Returns:
        list[dict]，字段口径与 pdf_extractor 对齐。
    """
    xlsx_path = Path(xlsx_path)
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name)

    rows: list[dict] = []
    for _, r in df.iterrows():
        rows.append(
            {
                "source_file": xlsx_path.name,
                "source_type": "xlsx",
                "supplier_raw": _SUPPLIER_RAW,
                "delivery_id": str(r["delivery_id"]),
                "delivery_date": str(r["date"]),
                "delivered_to": None,
                "best_by_date": str(r["best_by_date"]),
                "certification": None,
                "item_raw": str(r["item"]),
                # grade 是数字（1-5），保留原值，grade_mapper 会转字符串查表。
                "grade_raw": r["grade"].item() if hasattr(r["grade"], "item") else r["grade"],
                "quantity_value": float(r["qty_kg"]),
                "quantity_unit": "kg",
                "unit_price_value": float(r["unit_price"]),
                "unit_price_unit": "kg",
                "currency": "USD",
                "source_total": float(r["total"]),
            }
        )
    return rows
