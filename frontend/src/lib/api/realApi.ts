import {
  advanceDemoState,
  addIntakeSource,
  addUploadedIntakeSource,
  resetDemoState,
  setDemoStage,
  updateOwnerGoal,
  type DemoState,
  type IntakeUploadPayload,
} from "../demoState/demoState";
import { apiRequest } from "./client";
import { mapDashboardToDemoState } from "./dashboardMapper";
import type { ApiEnvelope, DashboardResponse, DemoApi } from "./contracts";

async function refreshDashboard(fallbackState: DemoState): Promise<DemoState> {
  const dashboard = await apiRequest<DashboardResponse>("/api/dashboard");
  return mapDashboardToDemoState(fallbackState, dashboard);
}

function createBuildContextBody(state: DemoState) {
  return {
    restaurant_id: "restaurant_001",
    source_mode: "live",
    sources: state.sourceCards.map((source) => ({
      type: source.type,
      source_id: source.id,
    })),
    raw_inputs: state.rawInputs,
  };
}

export const realApi: DemoApi = {
  mode: "real",
  async reset() {
    const reset = await apiRequest<ApiEnvelope<unknown>>("/api/demo/reset", {
      method: "POST",
      body: JSON.stringify({ restaurant_id: "restaurant_001" }),
    });
    const state = resetDemoState();
    return refreshDashboard({ ...state, responseTitle: "POST /api/demo/reset", response: reset });
  },
  async setStage(state, stage) {
    return setDemoStage(state, stage);
  },
  async updateOwnerGoal(state, ownerGoal) {
    return updateOwnerGoal(state, ownerGoal);
  },
  async addIntakeSample(state, intakeId) {
    return addIntakeSource(state, intakeId);
  },
  async addIntakeUpload(state, intakeId, payload) {
    // API v3 builds context in one call. Until backend file upload is wired,
    // uploads are staged locally and sent as raw_inputs during /api/context/build.
    return addUploadedIntakeSource(state, intakeId, payload);
  },
  async advance(state) {
    if (state.phase === "EMPTY") {
      const response = await apiRequest<ApiEnvelope<unknown>>("/api/context/build", {
        method: "POST",
        body: JSON.stringify(createBuildContextBody(state)),
      });
      return refreshDashboard({
        ...advanceDemoState(state),
        responseTitle: "POST /api/context/build",
        response,
      });
    }

    if (state.phase === "CONTEXT_READY") {
      const response = await apiRequest<ApiEnvelope<unknown>>("/api/agents/generate", {
        method: "POST",
        body: JSON.stringify({
          context_id: "ctx_001",
          owner_goal: state.ownerGoal,
          constraints: {
            purchase_order: state.workflowPreview.approvalPolicy.purchaseOrder,
            external_write: state.workflowPreview.approvalPolicy.externalWrite,
          },
        }),
      });
      return refreshDashboard({
        ...advanceDemoState(state),
        responseTitle: "POST /api/agents/generate",
        response,
      });
    }

    if (state.phase === "BLOCKED") {
      const response = await apiRequest<ApiEnvelope<unknown>>(
        `/api/workflows/${state.workflowId ?? "wf_weekend_prep_001"}/resolve-capabilities`,
        {
          method: "POST",
          body: JSON.stringify({ mode: "auto", allow_fixture_fallback: true }),
        },
      );
      return refreshDashboard({
        ...advanceDemoState(state),
        responseTitle: "POST /api/workflows/{id}/resolve-capabilities",
        response,
      });
    }

    if (state.phase === "READY" || state.phase === "RUNNING") {
      const response = await apiRequest<ApiEnvelope<unknown>>(
        `/api/workflows/${state.workflowId ?? "wf_weekend_prep_001"}/run`,
        {
          method: "POST",
          body: JSON.stringify({
            context_version: state.contextVersion,
            run_mode: "demo",
            auto_execute_safe_steps: true,
          }),
        },
      );
      return refreshDashboard({
        ...advanceDemoState(state),
        responseTitle: "POST /api/workflows/{id}/run",
        response,
      });
    }

    if (state.phase === "COMPLETED_WITH_RECOMMENDATION") {
      const updateResponse = await apiRequest<ApiEnvelope<unknown>>("/api/context/update", {
        method: "POST",
        body: JSON.stringify({
          context_id: "ctx_001",
          update_type: "supplier_price_file_arrived",
          fixture_name: "supplier_price_increase_tomatoes",
        }),
      });
      const rerunResponse = await apiRequest<ApiEnvelope<unknown>>(
        `/api/workflows/${state.workflowId ?? "wf_weekend_prep_001"}/rerun`,
        {
          method: "POST",
          body: JSON.stringify({
            previous_run_id: state.runId ?? "run_001",
            new_context_version: "ctx_v002",
            reason: "supplier_price_file_arrived",
          }),
        },
      );
      return refreshDashboard({
        ...advanceDemoState(state),
        responseTitle: "POST /api/context/update + POST /api/workflows/{id}/rerun",
        response: {
          success: updateResponse.success && rerunResponse.success,
          message: "Context updated and workflow rerun.",
          data: { update: updateResponse.data, rerun: rerunResponse.data },
          meta: rerunResponse.meta,
          timestamp: rerunResponse.timestamp,
        },
      });
    }

    return state;
  },
};
