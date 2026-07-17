from fastapi.testclient import TestClient

from backend.main import app


def test_api_shell_demo_flow():
    client = TestClient(app)

    reset = client.post("/api/demo/reset", json={"restaurant_id": "restaurant_001"})
    assert reset.status_code == 200
    assert reset.json()["data"]["workflow"]["status"] == "EMPTY"

    build = client.post(
        "/api/context/build",
        json={
            "restaurant_id": "restaurant_001",
            "source_mode": "live",
            "sources": [
                {"type": "sales", "source_id": "sales_last_year"},
                {"type": "inventory", "source_id": "inventory_current"},
                {"type": "supplier_prices", "source_id": "supplier_prices_q3"},
            ],
        },
    )
    assert build.status_code == 200
    assert build.json()["data"]["context_version"] == "ctx_v001"

    generate = client.post(
        "/api/agents/generate",
        json={
            "context_id": "ctx_001",
            "owner_goal": "Create a weekend prep agent for this Friday",
        },
    )
    assert generate.status_code == 200
    assert generate.json()["data"]["status"] == "BLOCKED"

    resolve = client.post(
        "/api/workflows/wf_weekend_prep_001/resolve-capabilities",
        json={"mode": "auto", "allow_fixture_fallback": True},
    )
    assert resolve.status_code == 200
    assert resolve.json()["data"]["status_after"] == "READY"

    run = client.post(
        "/api/workflows/wf_weekend_prep_001/run",
        json={"context_version": "ctx_v001", "run_mode": "demo"},
    )
    assert run.status_code == 200
    assert run.json()["data"]["status"] == "COMPLETED_WITH_RECOMMENDATION"

    update = client.post(
        "/api/context/update",
        json={"context_id": "ctx_001", "update_type": "supplier_price_file_arrived"},
    )
    assert update.status_code == 200
    assert update.json()["data"]["new_context_version"] == "ctx_v002"

    rerun = client.post(
        "/api/workflows/wf_weekend_prep_001/rerun",
        json={"previous_run_id": "run_001", "new_context_version": "ctx_v002"},
    )
    assert rerun.status_code == 200
    assert rerun.json()["data"]["status"] == "PATCHED_RECOMMENDATION"

    dashboard = client.get("/api/dashboard")
    assert dashboard.status_code == 200
    metrics = dashboard.json()["data"]["metrics"]
    assert metrics["capabilities_resolved"] == 2
    assert metrics["workflow_runs"] == 2
    assert metrics["self_corrections"] == 1
