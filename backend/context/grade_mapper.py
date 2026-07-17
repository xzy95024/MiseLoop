"""品级映射：把各供应商的原始品级映射成统一的 premium/standard/economy。

按 (食材, 供应商, 原始品级) 三元组查 backend/data/grade_mapping.json。
这张表是人工手写的业务判断——两个供应商的分级习惯之间没有客观换算公式
（"1 级"和"A 级"哪个更接近 premium 没有数学答案），所以：
  - 命中 -> 返回 tier + grade_resolved=True。
  - 未命中 -> tier=None + grade_resolved=False，交给人工补 grade_mapping.json。
  - 绝不让程序/LLM 去推断。
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

VALID_TIERS = ("premium", "standard", "economy")

# backend/data/grade_mapping.json  （grade_mapper.py 在 backend/context/ 下）
_MAPPING_PATH = Path(__file__).resolve().parents[1] / "data" / "grade_mapping.json"


@lru_cache(maxsize=1)
def _load_mappings(path_str: str) -> dict:
    with open(path_str, encoding="utf-8") as fh:
        data = json.load(fh)
    return data.get("mappings", {})


def map_grade(item_canonical: str, supplier_canonical: str, raw_grade) -> dict:
    """按三元组查表映射品级。

    Args:
        item_canonical:     规范食材名，如 "salmon"
        supplier_canonical: 规范供应商名，如 "Sunny Farm"
        raw_grade:          原始品级，如 "A" 或 1（会统一转成字符串查表）

    Returns:
        {raw, tier, grade_resolved}
    """
    mappings = _load_mappings(str(_MAPPING_PATH))
    grade_key = str(raw_grade).strip()

    tier = (
        mappings.get(item_canonical, {})
        .get(supplier_canonical, {})
        .get(grade_key)
    )

    if tier is None:
        return {"raw": raw_grade, "tier": None, "grade_resolved": False}
    return {"raw": raw_grade, "tier": tier, "grade_resolved": True}
