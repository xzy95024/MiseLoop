"""Deterministic workflow generator for the P0 demo path."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


DEFAULT_WORKFLOW_ID = "wf_weekend_prep_001"
DEFAULT_OWNER_GOAL = "Create a weekend prep agent for this Friday"


WEEKEND_PREP_WORKFLOW = {
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


class DeterministicWorkflowGenerator:
    mode = "fixture"

    def generate(self, body: dict[str, Any]) -> dict[str, Any]:
        workflow = deepcopy(WEEKEND_PREP_WORKFLOW)
        constraints = body.get("constraints") or {}
        if constraints:
            workflow["approval_policy"] = {
                "external_write": constraints.get(
                    "external_write",
                    workflow["approval_policy"]["external_write"],
                ),
                "purchase_order": constraints.get(
                    "purchase_order",
                    workflow["approval_policy"]["purchase_order"],
                ),
            }

        missing_capabilities = [
            capability["name"] for capability in workflow["required_capabilities"]
        ]
        return {
            "workflow_id": DEFAULT_WORKFLOW_ID,
            "status": "BLOCKED",
            "context_id": body.get("context_id"),
            "owner_goal": body.get("owner_goal") or DEFAULT_OWNER_GOAL,
            "workflow": workflow,
            "missing_capabilities": missing_capabilities,
            "dependency_mode": {"workflow_generator": self.mode},
        }
