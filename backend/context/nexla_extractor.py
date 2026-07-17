"""通过 Nexla API 抽取结构化记录，并映射成与本地 extractor 完全一致的"原始行"schema。

这样 context_builder 下游的 entity_resolver / unit_normalizer / grade_mapper
无需关心数据是来自 Nexla 还是本地——两条通路产出的行结构相同。

注意：Nexla flow 的输出字段由你在 Nexla 平台里的配置决定。下面的 _FIELD_CANDIDATES
是一份"容错字段映射"，会尝试若干常见键名；如与你的 Nexset 输出不符，改这里即可。
"""

from __future__ import annotations

from .nexla_client import NexlaClient

# 标准字段 -> Nexla 记录里可能出现的候选键名（按顺序取第一个命中的）。
# 已对齐用户 Nexset 435601/435602 的统一输出 schema:
#   item / grade / qty_kg / unit_price / total / date / best_by_date /
#   supplier / receipt_id / certification
_FIELD_CANDIDATES: dict[str, tuple[str, ...]] = {
    "supplier_raw": ("supplier", "supplier_name", "vendor", "seller"),
    "delivery_id": ("receipt_id", "delivery_id", "receipt_no", "receipt_number", "id"),
    "delivery_date": ("delivery_date", "date"),
    "delivered_to": ("delivered_to", "customer", "ship_to"),
    "best_by_date": ("best_by_date", "best_by", "expiry", "expiration"),
    "certification": ("certification", "cert"),
    "item_raw": ("item", "item_name", "product", "description"),
    "grade_raw": ("grade", "quality_grade", "quality"),
    "quantity_value": ("qty", "quantity", "qty_kg", "amount"),
    "quantity_unit": ("unit", "quantity_unit", "uom"),
    "unit_price_value": ("unit_price", "price", "price_per_unit"),
    "unit_price_unit": ("unit_price_unit", "price_unit"),
    "currency": ("currency",),
    "source_total": ("total", "subtotal", "line_total"),
}


def _pick(record: dict, candidates: tuple[str, ...]):
    for key in candidates:
        if key in record and record[key] is not None:
            return record[key]
    return None


def _to_row(
    record: dict,
    source_file: str,
    source_type: str,
    default_supplier: str | None = None,
) -> dict:
    row = {"source_file": source_file, "source_type": source_type}
    for std_key, candidates in _FIELD_CANDIDATES.items():
        row[std_key] = _pick(record, candidates)

    # 供应商来源兜底：Excel 源的 Nexset 输出 supplier=null，按文件来源补回
    # （与本地 xlsx_extractor 的 _SUPPLIER_RAW 口径一致），否则实体对齐会失败。
    if not row.get("supplier_raw") and default_supplier:
        row["supplier_raw"] = default_supplier

    # 类型/缺省兜底，保持与本地 extractor 的口径一致。
    row["quantity_value"] = float(row["quantity_value"]) if row["quantity_value"] is not None else 0.0
    row["unit_price_value"] = float(row["unit_price_value"]) if row["unit_price_value"] is not None else 0.0
    row["source_total"] = float(row["source_total"]) if row["source_total"] is not None else 0.0
    row["quantity_unit"] = row["quantity_unit"] or "kg"
    row["unit_price_unit"] = row["unit_price_unit"] or row["quantity_unit"]
    row["currency"] = row["currency"] or "USD"
    return row


def extract(
    resource_id: str,
    source_file: str,
    source_type: str,
    default_supplier: str | None = None,
) -> list[dict]:
    """从一个 Nexla 资源拉取记录并映射成标准原始行。

    可能抛 NexlaNotConfigured / NexlaError —— 由 context_builder 捕获后走本地兜底。
    """
    client = NexlaClient()
    records = client.fetch_records(resource_id)
    return [_to_row(r, source_file, source_type, default_supplier) for r in records]


# receipt_id 前缀 -> (来源类型, 缺省供应商)。人工定义的确定性映射（非模糊匹配）。
# combined 端点里 Bay Produce 行 supplier=null，据此按前缀补回。
_PREFIX_MAP: dict[str, dict[str, str | None]] = {
    "SF": {"source_type": "pdf", "default_supplier": None},   # Sunny Farm，记录内已带 supplier
    "BP": {"source_type": "xlsx", "default_supplier": "Bay Produce"},
}


def extract_combined(resource_id: str) -> list[dict]:
    """从 union 后的 combined Nexset 一次性拉取所有记录（PDF+Excel 混合）。

    combined feed 无 source_type 字段、且 Excel 行 supplier=null；
    据 receipt_id 前缀（SF-/BP-）用 _PREFIX_MAP 确定性地补齐来源与缺省供应商。
    """
    client = NexlaClient()
    records = client.fetch_records(resource_id)
    source_file = f"nexla:data_set/{resource_id}"

    rows: list[dict] = []
    for rec in records:
        rid = str(_pick(rec, _FIELD_CANDIDATES["delivery_id"]) or "")
        prefix = rid.split("-", 1)[0].upper() if "-" in rid else ""
        meta = _PREFIX_MAP.get(prefix, {"source_type": "unknown", "default_supplier": None})
        rows.append(
            _to_row(
                rec,
                source_file=source_file,
                source_type=str(meta["source_type"]),
                default_supplier=meta["default_supplier"],
            )
        )
    return rows
