"""从 Sunny Farm 的 PDF 收据抽取结构化字段。

用 pdfplumber 的 layout=True 模式读取，保留原始排版的列间空白关系，
再用正则按列切字段（针对该收据格式写死，不做通用 OCR）。

输出一批"原始行"字典，字段口径与 xlsx_extractor 对齐，便于 context_builder
用同一套 entity_resolver / unit_normalizer / grade_mapper 处理。
"""

from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

# 一行品项：ITEM(可含空格) <2+空格> GRADE <空格> QTY UNIT <空格> $PRICE / PUNIT <空格> $TOTAL
_LINE_RE = re.compile(
    r"^\s*(?P<item>\S.*?\S)\s{2,}"
    r"(?P<grade>[A-Za-z0-9]+)\s+"
    r"(?P<qty>\d+(?:\.\d+)?)\s*(?P<unit>kg|lb|g)\s+"
    r"\$(?P<price>\d+(?:\.\d+)?)\s*/\s*(?P<punit>kg|lb|g)\s+"
    r"\$(?P<total>\d+(?:\.\d+)?)"
)
_RECEIPT_RE = re.compile(r"Receipt\s*#:\s*(\S+)")
_DELIVERY_DATE_RE = re.compile(r"Delivery Date:\s*(\d{4}-\d{2}-\d{2})")
_DELIVERED_TO_RE = re.compile(r"Delivered To:\s*(.+?)\s*$")
_CERT_RE = re.compile(r"Certification:\s*(.+?)\s*$")
_BEST_BY_RE = re.compile(r"Best-By Date:\s*(\d{4}-\d{2}-\d{2})")


def _first(rx: re.Pattern, lines: list[str]) -> str | None:
    for ln in lines:
        m = rx.search(ln)
        if m:
            return m.group(1).strip()
    return None


def extract(pdf_path: str | Path) -> list[dict]:
    """抽取 PDF 收据的所有品项行。

    Returns:
        list[dict]，每个 dict 是一行原始（未做实体/单位/品级归一）的记录。
    """
    pdf_path = Path(pdf_path)
    with pdfplumber.open(pdf_path) as pdf:
        # 该收据为单页；如有多页则拼接。
        lines: list[str] = []
        for page in pdf.pages:
            text = page.extract_text(layout=True) or ""
            lines.extend(text.splitlines())

    # 供应商抬头 = 第一行非空文本。
    supplier_raw = next((ln.strip() for ln in lines if ln.strip()), "")
    supplier_raw = " ".join(supplier_raw.split())

    receipt_no = _first(_RECEIPT_RE, lines)
    delivery_date = _first(_DELIVERY_DATE_RE, lines)
    delivered_to = _first(_DELIVERED_TO_RE, lines)
    certification = _first(_CERT_RE, lines)
    best_by_date = _first(_BEST_BY_RE, lines)

    rows: list[dict] = []
    for ln in lines:
        m = _LINE_RE.match(ln)
        if not m:
            continue
        g = m.groupdict()
        rows.append(
            {
                "source_file": pdf_path.name,
                "source_type": "pdf",
                "supplier_raw": supplier_raw,
                "delivery_id": receipt_no,
                "delivery_date": delivery_date,
                "delivered_to": delivered_to,
                "best_by_date": best_by_date,
                "certification": certification,
                "item_raw": g["item"],
                "grade_raw": g["grade"],
                "quantity_value": float(g["qty"]),
                "quantity_unit": g["unit"],
                "unit_price_value": float(g["price"]),
                "unit_price_unit": g["punit"],
                "currency": "USD",
                "source_total": float(g["total"]),
            }
        )
    return rows
