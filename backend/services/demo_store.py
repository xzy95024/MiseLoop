"""In-memory demo state for the API v3 shell.

This store is intentionally deterministic. It lets the frontend run against
the real API contract while deeper Nexla, Zero, and runner services are wired
in behind the same endpoints.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


DependencyMode = dict[str, str]


DEFAULT_WORKFLOW_ID = "wf_weekend_prep_001"
DEFAULT_CONTEXT_ID = "ctx_001"


WORKFLOW = {
    "id": "weekend-prep-agent",
    "name": "Weekend Prep Agent",
    "trigger": {"type": "manual_or_schedule", "value": "Every Friday 9 AM"},
    "conditions": [
        {"field": "external.weather.rain_probability", "operator": ">", "value": 70}
    ],
    "required_capabilities": [
        {"name": "weather_forecast", "reason": "Rain changes patio demand"},
        {"name": "local_event_calendar", "reason": "Nearby events change weekend demand"},
    ],
    "steps": [
        {"id": "load_context", "type": "context", "source": "nexla.restaurant_context"},
        {"id": "check_weather", "type": "capability", "capability": "weather_forecast"},
        {"id": "check_events", "type": "capability", "capability": "local_event_calendar"},
        {"id": "rank_suppliers", "type": "decision", "action": "rank_suppliers"},
        {
            "id": "patch_purchase_plan",
            "type": "recommendation",
            "requires_approval": True,
        },
    ],
    "approval_policy": {
        "external_write": "manager_approval_required",
        "purchase_order": "recommendation_only",
    },
}


ZERO_RESOLUTION_EVENTS = [
    {
        "capability": "weather_forecast",
        "provider": "zero",
        "capability_id": "zero_weather_001",
        "validation_status": "PASSED",
        "sample_output": {"rain_probability": 82, "temperature_f": 58},
        "input_schema": {"location": "string", "date": "string"},
        "output_schema": {"rain_probability": "number", "temperature_f": "number"},
    },
    {
        "capability": "local_event_calendar",
        "provider": "zero",
        "capability_id": "zero_events_001",
        "validation_status": "PASSED",
        "sample_output": {"expected_foot_traffic_lift": 0.18},
        "input_schema": {"location": "string", "weekend": "boolean"},
        "output_schema": {"expected_foot_traffic_lift": "number"},
    },
]


RUN_TIMELINE = [
    {
        "step_id": "load_context",
        "status": "COMPLETED",
        "summary": "Restaurant Context loaded from Nexla provider.",
        "evidence": "ctx_v001",
    },
    {
        "step_id": "check_weather",
        "status": "COMPLETED",
        "summary": "Rain probability is 82% for Saturday.",
        "evidence": "zero_weather_001",
    },
    {
        "step_id": "check_events",
        "status": "COMPLETED",
        "summary": "Nearby event increases expected foot traffic by 18%.",
        "evidence": "zero_events_001",
    },
    {
        "step_id": "rank_suppliers",
        "status": "COMPLETED",
        "summary": "Supplier B is ranked first for tomatoes.",
        "evidence": "price 0.45, delivery 0.25, reliability 0.20",
    },
    {
        "step_id": "patch_purchase_plan",
        "status": "PENDING_APPROVAL",
        "summary": "Recommendation created. External write remains gated.",
        "evidence": "manager approval required",
    },
]


RECOMMENDATION = {
    "title": "Weekend purchase plan",
    "summary": "Increase indoor comfort items, reduce patio-heavy prep, and switch tomato supplier.",
    "requires_approval": True,
    "approval_status": "PENDING_APPROVAL",
    "expected_impact": {
        "stockout_risk_reduction": 0.22,
        "estimated_cost_savings": 143.50,
        "prep_waste_reduction": 0.12,
    },
    "plan_items": [
        {
            "item": "Tomatoes",
            "action": "Use Supplier B",
            "reason": "Supplier B has better weekend price and reliability.",
        },
        {
            "item": "Patio garnish",
            "action": "Reduce prep by 18%",
            "reason": "Rain probability is 82%, lowering patio-heavy demand.",
        },
        {
            "item": "Indoor comfort items",
            "action": "Increase prep by 12%",
            "reason": "Local event traffic plus rain shifts demand indoors.",
        },
    ],
}


CONTEXT_DIFF = [
    {
        "path": "supplier_price.by_item.tomato.vendor_a.price",
        "label": "Vendor A tomato price",
        "before": "$2.10",
        "after": "$2.85",
        "impact": "Previous tomato supplier is no longer optimal.",
    },
    {
        "path": "supplier_price.by_item.tomato.vendor_b.reliability",
        "label": "Vendor B reliability",
        "before": "0.91",
        "after": "0.94",
        "impact": "Vendor B becomes the safer weekend recommendation.",
    },
]


RECOMMENDATION_DIFF = [
    {
        "field": "supplier.tomato.primary",
        "label": "Tomato supplier",
        "before": "Vendor A",
        "after": "Vendor B",
        "reason": "Vendor A tomato price increased from 2.10 to 2.85.",
    },
    {
        "field": "purchase_plan.estimated_savings",
        "label": "Estimated savings",
        "before": "$143.50",
        "after": "$168.20",
        "reason": "Switching tomatoes to Vendor B improves weekend cost profile.",
    },
]


PATCHED_RECOMMENDATION = {
    **RECOMMENDATION,
    "summary": "Supplier price changed. Loop reran the workflow and switched tomatoes to Vendor B.",
    "expected_impact": {
        **RECOMMENDATION["expected_impact"],
        "estimated_cost_savings": 168.20,
    },
    "plan_items": [
        {
            "item": "Tomatoes",
            "action": "Switch to Vendor B",
            "reason": "Vendor A price increased to $2.85 while Vendor B remains more reliable.",
        },
        *RECOMMENDATION["plan_items"][1:],
    ],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def request_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


def envelope(
    *,
    message: str,
    data: Any,
    request_prefix: str,
    dependency_mode: str | DependencyMode | None = None,
    context_version: str | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {"request_id": request_id(request_prefix)}
    if dependency_mode is not None:
        meta["dependency_mode"] = dependency_mode
    if context_version is not None:
        meta["context_version"] = context_version
    return {
        "success": True,
        "message": message,
        "data": data,
        "meta": meta,
        "timestamp": utc_now(),
    }


class DemoStore:
    def __init__(self) -> None:
        self.state = self._initial_state()

    def reset(self) -> dict[str, Any]:
        self.state = self._initial_state()
        return self.dashboard()

    def dashboard(self) -> dict[str, Any]:
        state = self.state
        return {
            "restaurant": {"id": "restaurant_001", "name": "MiseLoop Demo Kitchen"},
            "dependency_mode": deepcopy(state["dependency_mode"]),
            "context": deepcopy(state["context"]),
            "workflow": {
                "workflow_id": state.get("workflow_id"),
                "status": state["workflow_status"],
                "missing_capabilities": deepcopy(state["missing_capabilities"]),
                "bound_capabilities": deepcopy(state["bound_capabilities"]),
            },
            "timeline": deepcopy(state["timeline"]),
            "recommendation": deepcopy(state["recommendation"]),
            "metrics": deepcopy(state["metrics"]),
        }

    def build_context(self, body: dict[str, Any]) -> dict[str, Any]:
        sources = body.get("sources") or self._default_sources()
        source_cards = [self._source_card(source) for source in sources]
        self.state["context"] = {
            "context_id": DEFAULT_CONTEXT_ID,
            "version": "ctx_v001",
            "source_cards": source_cards,
            "last_diff": [],
        }
        self.state["workflow_status"] = "CONTEXT_READY"
        self.state["dependency_mode"]["nexla"] = "fixture"
        return {
            "context_id": DEFAULT_CONTEXT_ID,
            "context_version": "ctx_v001",
            "freshness": {
                "sales": "2026-07-17T17:00:00Z",
                "inventory": "2026-07-17T17:05:00Z",
                "supplier_prices": "2026-07-17T17:10:00Z",
            },
            "restaurant_context": {
                "sales": {"by_day": [], "by_item": []},
                "inventory": {"on_hand": [], "spoilage_risk": []},
                "supplier_price": {"by_item": [], "delivery_days": [], "reliability": []},
                "external": {},
            },
            "source_cards": source_cards,
        }

    def generate_workflow(self, body: dict[str, Any]) -> dict[str, Any]:
        self.state["workflow_id"] = DEFAULT_WORKFLOW_ID
        self.state["workflow_status"] = "BLOCKED"
        self.state["missing_capabilities"] = ["weather_forecast", "local_event_calendar"]
        self.state["dependency_mode"]["workflow_generator"] = "fixture"
        return {
            "workflow_id": DEFAULT_WORKFLOW_ID,
            "status": "BLOCKED",
            "owner_goal": body.get("owner_goal", "Create a weekend prep agent for this Friday"),
            "workflow": deepcopy(WORKFLOW),
            "missing_capabilities": deepcopy(self.state["missing_capabilities"]),
        }

    def resolve_capabilities(self, workflow_id: str) -> dict[str, Any]:
        bound = [
            {
                "name": event["capability"],
                "provider": event["provider"],
                "capability_id": event["capability_id"],
                "input_schema": event["input_schema"],
                "output_schema": event["output_schema"],
                "validation_status": event["validation_status"],
                "sample_result": event["sample_output"],
            }
            for event in ZERO_RESOLUTION_EVENTS
        ]
        self.state["workflow_id"] = workflow_id
        self.state["workflow_status"] = "READY"
        self.state["missing_capabilities"] = []
        self.state["bound_capabilities"] = bound
        self.state["metrics"]["capabilities_resolved"] = len(bound)
        self.state["dependency_mode"]["zero"] = "fixture"
        return {
            "workflow_id": workflow_id,
            "status_before": "BLOCKED",
            "status_after": "READY",
            "resolution_events": deepcopy(ZERO_RESOLUTION_EVENTS),
            "bound_capabilities": deepcopy(bound),
        }

    def run_workflow(self, workflow_id: str) -> dict[str, Any]:
        self.state["workflow_id"] = workflow_id
        self.state["workflow_status"] = "COMPLETED_WITH_RECOMMENDATION"
        self.state["run_id"] = "run_001"
        self.state["timeline"] = deepcopy(RUN_TIMELINE)
        self.state["recommendation"] = deepcopy(RECOMMENDATION)
        self.state["metrics"]["workflow_runs"] = max(self.state["metrics"]["workflow_runs"], 1)
        self.state["metrics"]["estimated_cost_savings"] = 143.50
        return {
            "workflow_id": workflow_id,
            "run_id": "run_001",
            "status": "COMPLETED_WITH_RECOMMENDATION",
            "timeline": deepcopy(RUN_TIMELINE),
            "recommendation": deepcopy(RECOMMENDATION),
        }

    def update_context(self) -> dict[str, Any]:
        self.state["context"]["version"] = "ctx_v002"
        self.state["context"]["last_diff"] = deepcopy(CONTEXT_DIFF)
        return {
            "previous_context_version": "ctx_v001",
            "new_context_version": "ctx_v002",
            "diff": deepcopy(CONTEXT_DIFF),
            "recommended_next_step": {
                "type": "RERUN_WORKFLOW",
                "workflow_id": self.state.get("workflow_id") or DEFAULT_WORKFLOW_ID,
            },
        }

    def rerun_workflow(self, workflow_id: str) -> dict[str, Any]:
        self.state["workflow_id"] = workflow_id
        self.state["workflow_status"] = "PATCHED_RECOMMENDATION"
        self.state["run_id"] = "run_002"
        self.state["recommendation"] = deepcopy(PATCHED_RECOMMENDATION)
        self.state["metrics"]["workflow_runs"] = 2
        self.state["metrics"]["self_corrections"] = 1
        self.state["metrics"]["estimated_cost_savings"] = 168.20
        return {
            "run_id": "run_002",
            "status": "PATCHED_RECOMMENDATION",
            "context_diff_applied": True,
            "recommendation_diff": deepcopy(RECOMMENDATION_DIFF),
            "recommendation": deepcopy(PATCHED_RECOMMENDATION),
        }

    def _initial_state(self) -> dict[str, Any]:
        return {
            "dependency_mode": {
                "nexla": "fixture",
                "zero": "fixture",
                "workflow_generator": "fixture",
            },
            "context": {
                "context_id": None,
                "version": None,
                "source_cards": [],
                "last_diff": [],
            },
            "workflow_id": None,
            "workflow_status": "EMPTY",
            "missing_capabilities": [],
            "bound_capabilities": [],
            "timeline": [],
            "recommendation": {},
            "metrics": {
                "capabilities_resolved": 0,
                "workflow_runs": 0,
                "self_corrections": 0,
                "estimated_cost_savings": 0,
            },
        }

    def _default_sources(self) -> list[dict[str, str]]:
        return [
            {"type": "sales", "source_id": "sales_last_year"},
            {"type": "inventory", "source_id": "inventory_current"},
            {"type": "supplier_prices", "source_id": "supplier_prices_q3"},
        ]

    def _source_card(self, source: dict[str, Any]) -> dict[str, Any]:
        source_type = source.get("type", "unknown")
        mapped_fields = {
            "sales": 8,
            "inventory": 7,
            "supplier_prices": 6,
            "manager_notes": 3,
            "purchase_history": 4,
        }.get(source_type, 1)
        normalized_fields = {
            "sales": "sales.by_day, sales.by_item",
            "inventory": "inventory.on_hand, reorder_threshold",
            "supplier_prices": "supplier_price.by_item",
            "manager_notes": "constraints.manager_notes",
            "purchase_history": "purchase_history.by_item",
        }
        return {
            "type": source_type,
            "source_id": source.get("source_id", source_type),
            "status": "MAPPED",
            "mapped_fields": mapped_fields,
            "normalized_context_field": normalized_fields.get(source_type, source_type),
        }


demo_store = DemoStore()
