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
    build_data = build.json()["data"]
    assert build_data["context_version"] == "ctx_v001"
    assert build_data["source_cards"]
    assert "nexla" in build.json()["meta"]["dependency_mode"]

    generate = client.post(
        "/api/agents/generate",
        json={
            "context_id": "ctx_001",
            "owner_goal": "Create a weekend prep agent for this Friday",
        },
    )
    assert generate.status_code == 200
    generate_body = generate.json()
    assert generate_body["data"]["status"] == "BLOCKED"
    assert generate_body["data"]["workflow"]["id"] == "weekend-prep-agent"
    assert generate_body["data"]["missing_capabilities"] == [
        "weather_forecast",
        "local_event_calendar",
    ]
    assert generate_body["meta"]["dependency_mode"]["workflow_generator"] == "fixture"

    resolve = client.post(
        "/api/workflows/wf_weekend_prep_001/resolve-capabilities",
        json={"mode": "auto", "allow_fixture_fallback": True},
    )
    assert resolve.status_code == 200
    resolve_body = resolve.json()
    assert resolve_body["data"]["status_after"] == "READY"
    assert resolve_body["data"]["resolution_events"][0]["source"] == "zero_capabilities.json"
    assert resolve_body["data"]["bound_capabilities"][0]["provider"] == "fixture"
    assert resolve_body["meta"]["dependency_mode"]["zero"] == "fixture"

    run = client.post(
        "/api/workflows/wf_weekend_prep_001/run",
        json={"context_version": "ctx_v001", "run_mode": "demo"},
    )
    assert run.status_code == 200
    run_body = run.json()
    assert run_body["data"]["status"] == "COMPLETED_WITH_RECOMMENDATION"
    assert [item["step_id"] for item in run_body["data"]["timeline"]] == [
        "load_context",
        "check_weather",
        "check_events",
        "rank_suppliers",
        "patch_purchase_plan",
    ]
    assert run_body["data"]["timeline"][-1]["status"] == "PENDING_APPROVAL"
    assert run_body["meta"]["dependency_mode"]["workflow_runner"] == "fixture"

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
