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

from .nexla_context_provider import NexlaContextProvider
from .workflow_generator import DEFAULT_WORKFLOW_ID, DeterministicWorkflowGenerator
from .workflow_runner import RECOMMENDATION, WorkflowRunner
from .zero_capability_provider import ZeroCapabilityProvider


DependencyMode = dict[str, str]


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
        self.nexla_context_provider = NexlaContextProvider()
        self.workflow_generator = DeterministicWorkflowGenerator()
        self.workflow_runner = WorkflowRunner()
        self.zero_capability_provider = ZeroCapabilityProvider()
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
        context_data = self.nexla_context_provider.build(sources)
        source_cards = context_data["source_cards"]
        self.state["context"] = {
            "context_id": context_data["context_id"],
            "version": context_data["context_version"],
            "source_cards": source_cards,
            "last_diff": [],
        }
        self.state["workflow_status"] = "CONTEXT_READY"
        self.state["dependency_mode"].update(context_data["dependency_mode"])
        return context_data

    def generate_workflow(self, body: dict[str, Any]) -> dict[str, Any]:
        generated = self.workflow_generator.generate(body)
        self.state["workflow_id"] = generated["workflow_id"]
        self.state["workflow_status"] = "BLOCKED"
        self.state["workflow"] = deepcopy(generated["workflow"])
        self.state["missing_capabilities"] = deepcopy(generated["missing_capabilities"])
        self.state["dependency_mode"].update(generated["dependency_mode"])
        return generated

    def resolve_capabilities(self, workflow_id: str) -> dict[str, Any]:
        workflow = self.state.get("workflow") or {}
        requirements = workflow.get("required_capabilities") or self.state["missing_capabilities"]
        resolved = self.zero_capability_provider.resolve_workflow(
            workflow_id,
            workflow,
            requirements,
        )
        bound = resolved["bound_capabilities"]
        self.state["workflow_id"] = workflow_id
        self.state["workflow_status"] = resolved["status_after"]
        self.state["workflow"] = resolved["bound_workflow"]
        self.state["missing_capabilities"] = (
            []
            if resolved["status_after"] == "READY"
            else [
                event["capability"]
                for event in resolved["resolution_events"]
                if event["validation_status"] != "PASSED"
            ]
        )
        self.state["bound_capabilities"] = bound
        self.state["metrics"]["capabilities_resolved"] = len(bound)
        self.state["dependency_mode"].update(resolved["dependency_mode"])
        return resolved

    def run_workflow(self, workflow_id: str) -> dict[str, Any]:
        result = self.workflow_runner.run(
            workflow_id=workflow_id,
            workflow=self.state.get("workflow") or {},
            context_version=self.state["context"].get("version"),
            bound_capabilities=self.state["bound_capabilities"],
        )
        self.state["workflow_id"] = workflow_id
        self.state["workflow_status"] = result["status"]
        self.state["run_id"] = result["run_id"]
        self.state["timeline"] = deepcopy(result["timeline"])
        self.state["recommendation"] = deepcopy(result["recommendation"])
        self.state["metrics"]["workflow_runs"] = max(self.state["metrics"]["workflow_runs"], 1)
        self.state["metrics"]["estimated_cost_savings"] = result["recommendation"][
            "expected_impact"
        ]["estimated_cost_savings"]
        self.state["dependency_mode"].update(result["dependency_mode"])
        return result

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
                "workflow_runner": "fixture",
            },
            "context": {
                "context_id": None,
                "version": None,
                "source_cards": [],
                "last_diff": [],
            },
            "workflow_id": None,
            "workflow": None,
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

demo_store = DemoStore()
