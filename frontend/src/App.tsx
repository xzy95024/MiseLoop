import { useState } from "react";
import { DependencyBadges } from "./components/DependencyBadges";
import { InspectorDrawer } from "./components/InspectorDrawer";
import { ProgressRail } from "./components/ProgressRail";
import { Sidebar } from "./components/Sidebar";
import { StageCanvas } from "./components/StageCanvas";
import { demoApi } from "./lib/api/demoApi";
import { createFixtureInitialState } from "./lib/api/fixtureApi";
import {
  getPrimaryActionLabel,
  STAGE_COPY,
  type IntakeUploadPayload,
  type IntakeId,
  type StageId,
} from "./lib/demoState/demoState";

export function App() {
  const [demoState, setDemoState] = useState(createFixtureInitialState);
  const [isPending, setIsPending] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const stage = demoState.activeStage;
  const copy = STAGE_COPY[stage];
  const response =
    demoState.response && typeof demoState.response === "object" && !Array.isArray(demoState.response)
      ? (demoState.response as { success?: boolean; message?: string; error_code?: string })
      : null;
  const apiError = response?.success === false ? response : null;

  async function applyApiUpdate(update: (current: typeof demoState) => Promise<typeof demoState>) {
    setIsPending(true);
    try {
      const nextState = await update(demoState);
      setDemoState(nextState);
    } catch (error) {
      setDemoState((current) => ({
        ...current,
        responseTitle: "API adapter error",
        response: {
          success: false,
          message: error instanceof Error ? error.message : "Unknown API adapter error",
          error_code: "FRONTEND_API_ADAPTER_ERROR",
          data: null,
          meta: {
            request_id: "req_frontend_adapter_error",
            fallback_available: demoApi.mode === "real",
          },
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setIsPending(false);
    }
  }

  function handleStageChange(nextStage: StageId) {
    void applyApiUpdate((current) => demoApi.setStage(current, nextStage));
  }

  function handlePrimaryAction() {
    void applyApiUpdate((current) => demoApi.advance(current));
  }

  function handleIntakeSample(intakeId: IntakeId) {
    void applyApiUpdate((current) => demoApi.addIntakeSample(current, intakeId));
  }

  function handleIntakeUpload(intakeId: IntakeId, payload: IntakeUploadPayload) {
    void applyApiUpdate((current) => demoApi.addIntakeUpload(current, intakeId, payload));
  }

  function handleOwnerGoalChange(ownerGoal: string) {
    void applyApiUpdate((current) => demoApi.updateOwnerGoal(current, ownerGoal));
  }

  async function handleReset() {
    await applyApiUpdate(() => demoApi.reset());
    setInspectorOpen(false);
  }

  return (
    <main className="app-shell">
      <Sidebar />

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">MiseLoop Demo Kitchen</p>
            <h1>Weekend Prep Agent</h1>
          </div>
          <div className="topbar-actions">
            <span className="status phase">{demoState.phase}</span>
            <span className="metric-pill">{demoState.metrics.capabilitiesResolved} capabilities</span>
            <span className="metric-pill">{demoState.metrics.workflowRuns} runs</span>
            <DependencyBadges dependencyMode={demoState.dependencyMode} />
            <span className="metric-pill">api: {demoApi.mode}</span>
            <button className="ghost-button" disabled={isPending} onClick={handleReset} type="button">
              Reset
            </button>
          </div>
        </header>

        {(isPending || apiError) && (
          <div className={apiError ? "api-banner error" : "api-banner loading"}>
            <div>
              <span className={apiError ? "status blocked" : "status approval"}>
                {apiError ? "API ERROR" : "SYNCING"}
              </span>
              <strong>{apiError ? apiError.error_code ?? "Request failed" : "API v3 request in progress"}</strong>
              <p>{apiError ? apiError.message : "Updating demo state through the API adapter."}</p>
            </div>
            {apiError && (
              <button className="ghost-button" disabled={isPending} onClick={handleReset} type="button">
                Reset state
              </button>
            )}
          </div>
        )}

        <ProgressRail
          activeStage={stage}
          demoPhase={demoState.phase}
          onStageChange={handleStageChange}
        />

        <section className={inspectorOpen ? "content-grid inspector-open" : "content-grid"}>
          <StageCanvas
            actionLabel={getPrimaryActionLabel(demoState.phase) || copy.action}
            demoState={demoState}
            kicker={copy.kicker}
            onIntakeSample={handleIntakeSample}
            onIntakeUpload={handleIntakeUpload}
            onOwnerGoalChange={handleOwnerGoalChange}
            onPrimaryAction={isPending ? undefined : handlePrimaryAction}
            stage={stage}
            title={copy.title}
          />
          <InspectorDrawer
            demoState={demoState}
            isOpen={inspectorOpen}
            onToggle={() => setInspectorOpen((current) => !current)}
          />
        </section>
      </section>
    </main>
  );
}
