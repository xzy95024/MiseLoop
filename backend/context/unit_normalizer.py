"""单位归一化：把数量统一换算成 kg，单价同步换算成 $/kg。

核心不变量：换算数量的同时，单价必须按比例反向换算，使得
    quantity * unit_price（小计）在换算前后保持不变。
否则会出现"数量换算了但单价没换"的致命 bug。
"""

from __future__ import annotations

# 每个单位对应多少 kg。新增单位在此补充即可。
_UNIT_TO_KG: dict[str, float] = {
    "kg": 1.0,
    "g": 0.001,
    "lb": 0.45359237,
}


class UnknownUnitError(ValueError):
    """遇到别名表里没有的单位——不猜，直接报错交给人工。"""


def supported_units() -> list[str]:
    return sorted(_UNIT_TO_KG)


def _canon_unit(unit: str) -> str:
    key = unit.strip().lower()
    if key not in _UNIT_TO_KG:
        raise UnknownUnitError(
            f"未知单位 {unit!r}，支持的单位: {supported_units()}"
        )
    return key


def to_kg(value: float, unit: str) -> float:
    """把某单位下的重量换算成 kg。"""
    return value * _UNIT_TO_KG[_canon_unit(unit)]


def normalize_line(
    quantity_value: float,
    quantity_unit: str,
    unit_price_value: float,
    unit_price_unit: str,
) -> dict:
    """把一行的数量+单价同步换算到 kg 基准。

    Args:
        quantity_value:  原始数量，如 10
        quantity_unit:   原始数量单位，如 "lb"
        unit_price_value: 原始单价，如 21.0
        unit_price_unit:  单价的计价单位（$/该单位），如 "lb"

    Returns:
        dict，包含 kg 基准的数量、$/kg 单价，以及换算前后的小计（用于校验）。
    """
    q_unit = _canon_unit(quantity_unit)
    p_unit = _canon_unit(unit_price_unit)

    qty_kg = quantity_value * _UNIT_TO_KG[q_unit]
    # $/unit -> $/kg：除以"每单位多少 kg"。
    # 例：$/lb -> $/kg 需要 price / 0.4536（每 kg 更贵，因为 1kg > 1lb）。
    price_per_kg = unit_price_value / _UNIT_TO_KG[p_unit]

    subtotal_before = quantity_value * unit_price_value
    subtotal_after = qty_kg * price_per_kg

    return {
        "quantity_kg": round(qty_kg, 6),
        "unit_price_per_kg": round(price_per_kg, 6),
        "raw_quantity_value": quantity_value,
        "raw_quantity_unit": q_unit,
        "raw_unit_price_value": unit_price_value,
        "raw_unit_price_unit": p_unit,
        # 小计不变量：两者应当相等（浮点容差内）。
        "subtotal": round(subtotal_after, 6),
        "subtotal_consistent": abs(subtotal_before - subtotal_after) < 1e-6,
    }
