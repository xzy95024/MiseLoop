"""Context layer: 把不同格式/单位/品级体系的原始采购文件，统一成一份
干净、可比、有校验的 JSON，作为下游所有决策逻辑（recommendation_services、
agent_generator）的唯一数据入口。

模块职责:
    pdf_extractor    从 PDF 收据抽取结构化字段
    xlsx_extractor   从 Excel 流水表抽取结构化字段
    entity_resolver  用人工别名表对齐食材/供应商实体（陌生名字不猜）
    unit_normalizer  单位统一换算成 kg（数量与单价同步）
    grade_mapper     按 (食材, 供应商, 原始品级) 三元组查表映射成统一 tier
    context_builder  主入口，串联以上模块，输出 restaurant_context.json
"""

__all__ = ["build_context"]


def __getattr__(name: str):
    # 懒加载：避免在 `python -m backend.context.context_builder` 下
    # 因包初始化提前 import 子模块而触发 RuntimeWarning。
    if name == "build_context":
        from .context_builder import build_context

        return build_context
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
