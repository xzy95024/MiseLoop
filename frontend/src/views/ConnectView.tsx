import type { DemoState, IntakeId } from "../lib/demoState/demoState";

type ConnectViewProps = {
  demoState: DemoState;
  onIntakeSample: (intakeId: IntakeId) => void;
};

export function ConnectView({ demoState, onIntakeSample }: ConnectViewProps) {
  const contextBuilt = demoState.phase !== "EMPTY";
  const hasSources = demoState.sourceCards.length > 0;

  return (
    <div className="stage-panel active">
      <div className="intake-tray">
        {demoState.intakeItems.map((item) => (
          <article className="intake-chip" key={item.id}>
            <span className={item.status === "READY" ? "status approval" : "status mapped"}>
              {item.status}
            </span>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
            <button
              className="sample-button"
              disabled={contextBuilt}
              onClick={() => onIntakeSample(item.id)}
              type="button"
            >
              {item.sampleAction}
            </button>
          </article>
        ))}
      </div>

      {hasSources ? (
        <div className="source-grid">
          {demoState.sourceCards.map((source) => (
            <article className="source-card" key={source.id}>
              <div className="source-top">
                <span className={`source-icon ${source.tone}`}>{source.icon}</span>
                <span className={source.status === "MAPPED" ? "status mapped" : "status approval"}>
                  {contextBuilt ? "Nexla ready" : source.status}
                </span>
              </div>
              <h3>{source.title}</h3>
              <p>{source.copy}</p>
              <div className="source-meta">
                <span>{source.rawInputType}</span>
                <span>{source.normalizedField}</span>
              </div>
              <div className="metric-row">
                <strong>{source.mappedFields} fields</strong>
                <span>{source.freshness}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-source-state">
          <span className="status approval">Waiting for inputs</span>
          <h3>No source cards yet</h3>
          <p>
            Pick a sample above to show how raw files, email, receipt photos, and voice notes become
            Nexla-ready Restaurant Context inputs.
          </p>
        </div>
      )}

      <div className="context-summary">
        <div>
          <span className="summary-label">Context version</span>
          <strong>{contextBuilt ? demoState.contextVersion : "not built"}</strong>
        </div>
        <div>
          <span className="summary-label">Source cards</span>
          <strong>{demoState.sourceCards.length}</strong>
        </div>
        <div>
          <span className="summary-label">Build endpoint</span>
          <strong>/api/context/build</strong>
        </div>
      </div>
    </div>
  );
}
