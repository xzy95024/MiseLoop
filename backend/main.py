"""FastAPI shell for the MiseLoop API v3 demo contract."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .services.demo_store import demo_store, envelope


app = FastAPI(title="MiseLoop API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, Any]:
    dashboard = demo_store.dashboard()
    return envelope(
        message="MiseLoop API shell is healthy.",
        data={"dependency_mode": dashboard["dependency_mode"]},
        request_prefix="req_health",
        dependency_mode=dashboard["dependency_mode"],
        context_version=dashboard["context"].get("version"),
    )


@app.post("/api/demo/reset")
def reset_demo(_: dict[str, Any] | None = None) -> dict[str, Any]:
    data = demo_store.reset()
    return envelope(
        message="Demo reset. Waiting for restaurant data intake.",
        data=data,
        request_prefix="req_demo_reset",
        dependency_mode=data["dependency_mode"],
        context_version=data["context"].get("version"),
    )


@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    data = demo_store.dashboard()
    return envelope(
        message="Dashboard state loaded.",
        data=data,
        request_prefix="req_dashboard",
        dependency_mode=data["dependency_mode"],
        context_version=data["context"].get("version"),
    )


@app.post("/api/context/build")
def build_context(body: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.build_context(body)
    return envelope(
        message="Restaurant Context built from mixed restaurant inputs.",
        data=data,
        request_prefix="req_context_build",
        dependency_mode=data.get("dependency_mode", {"nexla": "fixture"}),
        context_version=data["context_version"],
    )


@app.post("/api/context/update")
def update_context(_: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.update_context()
    return envelope(
        message="Context changed. Supplier price diff is ready for workflow rerun.",
        data=data,
        request_prefix="req_context_update",
        dependency_mode={"nexla": "fixture"},
        context_version=data["new_context_version"],
    )


@app.post("/api/agents/generate")
def generate_agent(body: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.generate_workflow(body)
    return envelope(
        message="Workflow generated and blocked by missing capabilities.",
        data=data,
        request_prefix="req_agents_generate",
        dependency_mode=data.get("dependency_mode", {"workflow_generator": "fixture"}),
        context_version=body.get("context_id"),
    )


@app.post("/api/workflows/{workflow_id}/resolve-capabilities")
def resolve_capabilities(workflow_id: str, _: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.resolve_capabilities(workflow_id)
    return envelope(
        message="Workflow capability resolution completed.",
        data=data,
        request_prefix="req_resolve_capabilities",
        dependency_mode=data.get("dependency_mode", {"zero": "fixture"}),
        context_version=demo_store.dashboard()["context"].get("version"),
    )


@app.post("/api/workflows/{workflow_id}/run")
def run_workflow(workflow_id: str, body: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.run_workflow(workflow_id)
    return envelope(
        message="Workflow completed with manager approval required.",
        data=data,
        request_prefix="req_workflow_run",
        dependency_mode=data.get("dependency_mode", {"workflow_runner": "fixture"}),
        context_version=body.get("context_version"),
    )


@app.post("/api/workflows/{workflow_id}/rerun")
def rerun_workflow(workflow_id: str, body: dict[str, Any]) -> dict[str, Any]:
    data = demo_store.rerun_workflow(workflow_id)
    return envelope(
        message="Context diff applied and recommendation patched.",
        data=data,
        request_prefix="req_workflow_rerun",
        dependency_mode=data.get("dependency_mode", {"workflow_runner": "fixture"}),
        context_version=body.get("new_context_version"),
    )
