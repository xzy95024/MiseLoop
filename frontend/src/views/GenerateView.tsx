import type { DemoState } from "../lib/demoState/demoState";

type GenerateViewProps = {
  demoState: DemoState;
  onOwnerGoalChange: (ownerGoal: string) => void;
};

export function GenerateView({ demoState, onOwnerGoalChange }: GenerateViewProps) {
  const generated = demoState.phase !== "EMPTY" && demoState.phase !== "CONTEXT_READY";
  const contextReady = demoState.phase !== "EMPTY";
  const missingCapabilityNames = demoState.workflowPreview.requiredCapabilities.map(
    (capability) => capability.name,
  );
  const workflowJsonShape =
    demoState.workflowJsonPreview && typeof demoState.workflowJsonPreview === "object"
      ? { ...demoState.workflowJsonPreview, owner_goal: demoState.ownerGoal }
      : {
          owner_goal: demoState.ownerGoal,
          workflow: {
            id: demoState.workflowPreview.id,
            trigger: demoState.workflowPreview.trigger,
            required_capabilities: demoState.workflowPreview.requiredCapabilities,
            approval_policy: demoState.workflowPreview.approvalPolicy,
          },
        };

  return (
    <div className="stage-panel active generate-layout">
      <section className="goal-box">
        <span className={generated ? "status blocked" : "status ready"}>
          {generated ? "Workflow blocked" : "Owner goal"}
        </span>
        <label className="goal-label" htmlFor="owner-goal">
          What should the restaurant agent handle?
        </label>
        <textarea
          className="goal-input"
          disabled={generated}
          id="owner-goal"
          onChange={(event) => onOwnerGoalChange(event.target.value)}
          rows={3}
          value={demoState.ownerGoal}
        />
        <div className="constraint-row" aria-label="Workflow constraints">
          <span className="constraint-pill">Purchase order: recommendation only</span>
          <span className="constraint-pill">External write: manager approval</span>
          <span className="constraint-pill">LLM output: JSON only</span>
        </div>
      </section>

      <section className="workflow-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Validated workflow preview</p>
            <h3>{demoState.workflowPreview.name}</h3>
          </div>
          <span className={generated ? "status blocked" : "status approval"}>
            {generated ? "BLOCKED" : contextReady ? "Ready to generate" : "Needs context"}
          </span>
        </div>

        <div className="workflow-meta-grid">
          <div>
            <span className="summary-label">Trigger</span>
            <strong>{demoState.workflowPreview.trigger}</strong>
          </div>
          <div>
            <span className="summary-label">Context</span>
            <strong>{demoState.contextVersion ?? "not built"}</strong>
          </div>
          <div>
            <span className="summary-label">Missing capabilities</span>
            <strong>{generated ? missingCapabilityNames.length : "pending"}</strong>
          </div>
        </div>

        <div className="workflow-list">
          {demoState.workflowPreview.steps.map((step) => (
            <div
              className={["workflow-step", generated ? step.status.toLowerCase() : ""]
                .filter(Boolean)
                .join(" ")}
              key={step.id}
            >
              <span />
              <div>
                <strong>{step.label}</strong>
                <small>{step.type}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="missing-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Runtime requirements</p>
            <h3>Capabilities Zero will unblock</h3>
          </div>
        </div>
        <div className="missing-list">
          {demoState.workflowPreview.requiredCapabilities.map((capability) => (
            <article className="missing-item" key={capability.name}>
              <span className={generated ? "status blocked" : "status approval"}>
                {generated ? "Missing" : "Required"}
              </span>
              <strong>{capability.name}</strong>
              <p>{capability.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="json-preview">
        <span className="summary-label">Workflow JSON shape</span>
        <pre>
          {JSON.stringify(workflowJsonShape, null, 2)}
        </pre>
      </section>
    </div>
  );
}
