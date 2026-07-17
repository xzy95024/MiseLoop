"""Zero capability provider boundary.

P0 uses a fixture catalog with the same shape the API needs from Zero. A later
Zero CLI adapter can replace the catalog lookup without changing the store or
API contract.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any


class ZeroCapabilityProvider:
    def __init__(self, catalog_path: str | Path | None = None) -> None:
        backend_root = Path(__file__).resolve().parents[1]
        self.catalog_path = Path(
            catalog_path or backend_root / "data" / "fixtures" / "zero_capabilities.json"
        )

    def search(self, requirement: dict[str, Any] | str) -> list[dict[str, Any]]:
        name = requirement if isinstance(requirement, str) else requirement.get("name")
        if not name:
            return []
        return [
            deepcopy(capability)
            for capability in self._load_catalog()
            if capability.get("name") == name
        ]

    def sample_test(self, capability: dict[str, Any]) -> dict[str, Any]:
        sample_output = deepcopy(capability.get("sample_output") or {})
        output_schema = capability.get("output_schema") or {}
        missing_fields = [
            field for field in output_schema if field not in sample_output
        ]
        validation_status = "FAILED" if missing_fields else "PASSED"
        return {
            "capability": capability.get("name"),
            "provider": capability.get("provider", "fixture"),
            "capability_id": capability.get("capability_id"),
            "validation_status": validation_status,
            "sample_input": deepcopy(capability.get("sample_input") or {}),
            "sample_output": sample_output,
            "input_schema": deepcopy(capability.get("input_schema") or {}),
            "output_schema": deepcopy(output_schema),
            "missing_output_fields": missing_fields,
            "source": "zero_capabilities.json",
        }

    def bind(self, workflow: dict[str, Any], capability: dict[str, Any]) -> dict[str, Any]:
        bound_workflow = deepcopy(workflow)
        capability_name = capability.get("name")
        for step in bound_workflow.get("steps", []):
            if step.get("type") == "capability" and step.get("capability") == capability_name:
                step["provider"] = capability.get("provider", "fixture")
                step["capability_id"] = capability.get("capability_id")
                step["validation_status"] = "PASSED"
        return bound_workflow

    def resolve_workflow(
        self,
        workflow_id: str,
        workflow: dict[str, Any],
        requirements: list[dict[str, Any] | str],
    ) -> dict[str, Any]:
        resolution_events = []
        bound_capabilities = []
        bound_workflow = deepcopy(workflow)

        for requirement in requirements:
            candidates = self.search(requirement)
            if not candidates:
                resolution_events.append(self._missing_event(requirement))
                continue

            capability = candidates[0]
            event = self.sample_test(capability)
            resolution_events.append(event)
            if event["validation_status"] != "PASSED":
                continue

            bound_workflow = self.bind(bound_workflow, capability)
            bound_capabilities.append(
                {
                    "name": capability["name"],
                    "provider": capability.get("provider", "fixture"),
                    "capability_id": capability["capability_id"],
                    "input_schema": deepcopy(capability.get("input_schema") or {}),
                    "output_schema": deepcopy(capability.get("output_schema") or {}),
                    "validation_status": event["validation_status"],
                    "sample_result": deepcopy(event["sample_output"]),
                    "source": "zero_capabilities.json",
                }
            )

        status_after = "READY" if len(bound_capabilities) == len(requirements) else "BLOCKED"
        return {
            "workflow_id": workflow_id,
            "status_before": "BLOCKED",
            "status_after": status_after,
            "resolution_events": resolution_events,
            "bound_capabilities": bound_capabilities,
            "bound_workflow": bound_workflow,
            "dependency_mode": {"zero": self._dependency_mode(bound_capabilities)},
        }

    def _load_catalog(self) -> list[dict[str, Any]]:
        data = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        return data.get("capabilities", [])

    def _dependency_mode(self, capabilities: list[dict[str, Any]]) -> str:
        if capabilities and all(capability.get("provider") == "zero" for capability in capabilities):
            return "live"
        return "fixture"

    def _missing_event(self, requirement: dict[str, Any] | str) -> dict[str, Any]:
        name = requirement if isinstance(requirement, str) else requirement.get("name")
        return {
            "capability": name,
            "provider": "fixture",
            "capability_id": None,
            "validation_status": "FAILED",
            "sample_output": {},
            "input_schema": {},
            "output_schema": {},
            "missing_output_fields": [],
            "source": "zero_capabilities.json",
        }
