import { useState } from "react";
import { InspectorDrawer } from "./components/InspectorDrawer";
import { ProgressRail } from "./components/ProgressRail";
import { Sidebar } from "./components/Sidebar";
import { StageCanvas } from "./components/StageCanvas";
import {
  advanceDemoState,
  addIntakeSource,
  createInitialDemoState,
  getPrimaryActionLabel,
  resetDemoState,
  setDemoStage,
  STAGE_COPY,
  type IntakeId,
  type StageId,
} from "./lib/demoState/demoState";

export function App() {
  const [demoState, setDemoState] = useState(createInitialDemoState);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const stage = demoState.activeStage;
  const copy = STAGE_COPY[stage];

  function handleStageChange(nextStage: StageId) {
    setDemoState((current) => setDemoStage(current, nextStage));
  }

  function handlePrimaryAction() {
    setDemoState((current) => advanceDemoState(current));
  }

  function handleIntakeSample(intakeId: IntakeId) {
    setDemoState((current) => addIntakeSource(current, intakeId));
  }

  function handleReset() {
    setDemoState(resetDemoState());
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
            <span className="mode-pill live">Zero live</span>
            <span className="mode-pill fixture">Nexla fixture</span>
            <button className="ghost-button" onClick={handleReset} type="button">
              Reset
            </button>
          </div>
        </header>

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
            onPrimaryAction={handlePrimaryAction}
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
