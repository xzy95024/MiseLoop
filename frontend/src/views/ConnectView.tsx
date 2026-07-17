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

      {demoState.rawInputs.length > 0 ? (
        <section className="raw-input-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Raw restaurant inputs</p>
              <h3>What the owner actually provided</h3>
            </div>
            <span className="status approval">messy input</span>
          </div>
          <div className="raw-input-grid">
            {demoState.rawInputs.map((input) => (
              <article className="raw-input-card" key={input.intakeId}>
                <div className="raw-input-heading">
                  <strong>{input.title}</strong>
                  <span className={input.status === "MAPPED" ? "status mapped" : "status approval"}>
                    {input.kind}
                  </span>
                </div>
                <ul>
                  {input.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="raw-input-panel empty">
          <div>
            <p className="eyebrow">Raw restaurant inputs</p>
            <h3>Click an intake sample to reveal the messy input.</h3>
          </div>
        </section>
      )}

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

      {demoState.restaurantContextPreview.length > 0 && (
        <section className="context-preview-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Nexla Restaurant Context</p>
              <h3>Unified agent-ready fields</h3>
            </div>
            <span className={contextBuilt ? "status ready" : "status approval"}>
              {contextBuilt ? "built" : "preview"}
            </span>
          </div>
          <div className="context-preview-grid">
            {demoState.restaurantContextPreview.map((section) => (
              <article className="context-preview-card" key={section.namespace}>
                <span className="summary-label">{section.namespace}</span>
                <h3>{section.description}</h3>
                <div className="context-record-list">
                  {section.records.map((record) => (
                    <div className="context-record" key={`${section.namespace}-${record.key}`}>
                      <strong>{record.key}</strong>
                      <span>{record.value}</span>
                      <small>{record.source}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
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
