"""Deterministic workflow runner for the P0 demo path."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


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


class WorkflowRunner:
    def run(
        self,
        *,
        workflow_id: str,
        workflow: dict[str, Any],
        context_version: str | None,
        bound_capabilities: list[dict[str, Any]],
    ) -> dict[str, Any]:
        capability_by_name = {
            capability["name"]: capability
            for capability in bound_capabilities
            if capability.get("name")
        }
        timeline = [
            self._timeline_item(step, context_version, capability_by_name)
            for step in workflow.get("steps", [])
        ]
        return {
            "workflow_id": workflow_id,
            "run_id": "run_001",
            "status": "COMPLETED_WITH_RECOMMENDATION",
            "timeline": timeline,
            "recommendation": deepcopy(RECOMMENDATION),
            "dependency_mode": {"workflow_runner": "fixture"},
        }

    def rerun(
        self,
        *,
        workflow_id: str,
        previous_run_id: str | None,
        new_context_version: str | None,
        context_diff: list[dict[str, Any]],
    ) -> dict[str, Any]:
        recommendation = self._patch_recommendation(context_diff)
        return {
            "workflow_id": workflow_id,
            "previous_run_id": previous_run_id,
            "run_id": "run_002",
            "status": "PATCHED_RECOMMENDATION",
            "context_version": new_context_version,
            "context_diff_applied": bool(context_diff),
            "context_diff": deepcopy(context_diff),
            "recommendation_diff": self._recommendation_diff(context_diff),
            "recommendation": recommendation,
            "dependency_mode": {"workflow_runner": "fixture"},
        }

    def _timeline_item(
        self,
        step: dict[str, Any],
        context_version: str | None,
        capability_by_name: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        step_id = step.get("id")
        if step_id == "load_context":
            return {
                "step_id": "load_context",
                "status": "COMPLETED",
                "summary": "Restaurant Context loaded from Nexla provider.",
                "evidence": context_version or "ctx_v001",
            }
        if step_id == "check_weather":
            capability = capability_by_name.get("weather_forecast", {})
            sample = capability.get("sample_result") or {}
            rain_probability = sample.get("rain_probability", 82)
            return {
                "step_id": "check_weather",
                "status": "COMPLETED",
                "summary": f"Rain probability is {rain_probability}% for Saturday.",
                "evidence": capability.get("capability_id", "zero_weather_001"),
            }
        if step_id == "check_events":
            capability = capability_by_name.get("local_event_calendar", {})
            sample = capability.get("sample_result") or {}
            lift = sample.get("expected_foot_traffic_lift", 0.18)
            return {
                "step_id": "check_events",
                "status": "COMPLETED",
                "summary": f"Nearby event increases expected foot traffic by {lift:.0%}.",
                "evidence": capability.get("capability_id", "zero_events_001"),
            }
        if step_id == "rank_suppliers":
            return {
                "step_id": "rank_suppliers",
                "status": "COMPLETED",
                "summary": "Supplier B is ranked first for tomatoes.",
                "evidence": "price 0.45, delivery 0.25, reliability 0.20",
            }
        if step_id == "patch_purchase_plan":
            return {
                "step_id": "patch_purchase_plan",
                "status": "PENDING_APPROVAL",
                "summary": "Recommendation created. External write remains gated.",
                "evidence": "manager approval required",
            }
        return {
            "step_id": step_id,
            "status": "COMPLETED",
            "summary": "Workflow step completed.",
            "evidence": step.get("type", "workflow"),
        }

    def _patch_recommendation(self, context_diff: list[dict[str, Any]]) -> dict[str, Any]:
        if not context_diff:
            return deepcopy(RECOMMENDATION)
        return deepcopy(PATCHED_RECOMMENDATION)

    def _recommendation_diff(self, context_diff: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not context_diff:
            return []
        return deepcopy(RECOMMENDATION_DIFF)
