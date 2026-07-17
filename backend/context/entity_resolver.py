"""实体对齐：把不同供应商对同一食材/供应商的不同叫法，统一成规范实体。

设计红线（对采购决策至关重要）：
  - 只用人工维护的别名表。命中 -> 返回规范名 + entity_resolved=True。
  - 未命中 -> 原样保留 + entity_resolved=False，交给人工补表。
  - 绝不允许用字符串相似度 / 编辑距离 / LLM 去猜两个名字是不是同一个东西。
    错判"是同一种食材"会直接污染供应商比价和后续所有决策。
"""

from __future__ import annotations

# ---- 食材别名表（人工维护）----
# key 为规范化后的原始名（小写、折叠空白），value 为规范实体名。
_ITEM_ALIASES: dict[str, str] = {
    "nordic fjord king salmon": "salmon",
    "atlantic salmon fillet": "salmon",
    "salmon": "salmon",
}

# ---- 供应商别名表（人工维护）----
_SUPPLIER_ALIASES: dict[str, str] = {
    "sunny farm organic produce": "Sunny Farm",
    "sunny farm": "Sunny Farm",
    "bay produce": "Bay Produce",
    "bay produce co": "Bay Produce",
}


def _norm(raw: str) -> str:
    """规范化查表 key：去首尾空白、折叠内部连续空白、转小写。"""
    return " ".join(raw.split()).lower()


def _resolve(raw: str, table: dict[str, str]) -> dict:
    # 空/None（如 combined feed 里未填的供应商）：不猜，标记待人工。
    if not raw or not str(raw).strip():
        return {"raw": raw, "canonical": raw, "entity_resolved": False}
    canonical = table.get(_norm(raw))
    if canonical is None:
        # 陌生名字：原样保留，打未解析标记，不做任何猜测。
        return {"raw": raw, "canonical": raw, "entity_resolved": False}
    return {"raw": raw, "canonical": canonical, "entity_resolved": True}


def resolve_item(raw: str) -> dict:
    """对齐食材名。返回 {raw, canonical, entity_resolved}。"""
    return _resolve(raw, _ITEM_ALIASES)


def resolve_supplier(raw: str) -> dict:
    """对齐供应商名。返回 {raw, canonical, entity_resolved}。"""
    return _resolve(raw, _SUPPLIER_ALIASES)
