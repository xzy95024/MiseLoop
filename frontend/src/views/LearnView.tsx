import type { DemoState } from "../lib/demoState/demoState";

type LearnViewProps = {
  demoState: DemoState;
};

export function LearnView({ demoState }: LearnViewProps) {
  const patched = demoState.phase === "PATCHED_RECOMMENDATION";
  const contextDiff =
    demoState.contextDiff.length > 0
      ? demoState.contextDiff
      : [
          {
            path: "supplier_price.by_item.tomato.vendor_a.price",
            label: "Vendor A tomato price",
            before: "$2.10",
            after: "waiting",
            impact: "Apply a supplier price update to trigger self-correction.",
          },
        ];
  const recommendationDiff =
    demoState.recommendationDiff.length > 0
      ? demoState.recommendationDiff
      : [
          {
            field: "supplier.tomato.primary",
            label: "Tomato supplier",
            before: "Vendor A",
            after: "waiting",
            reason: "Loop has not rerun against the new context yet.",
          },
        ];

  return (
    <div className="stage-panel active learn-layout">
      <section className="learn-hero">
        <div>
          <span className={patched ? "status ready" : "status approval"}>
            {patched ? "PATCHED_RECOMMENDATION" : "CONTEXT CHANGE READY"}
          </span>
          <h3>{patched ? "Loop self-corrected the purchase plan" : "New supplier data is waiting"}</h3>
          <p>
            {patched
              ? "Nexla detected the supplier price change, Loop reran the workflow, and the recommendation changed without developer reconfiguration."
              : "Apply the context update to simulate a new supplier price file arriving through Nexla."}
          </p>
        </div>
        <div className="learn-version-card">
          <span className="summary-label">Context version</span>
          <strong>{demoState.contextVersion ?? "ctx_v001"}</strong>
          <span className="summary-label">Run</span>
          <strong>{demoState.runId ?? "run_001"}</strong>
        </div>
      </section>

      <section className="correction-rail">
        <article className={patched ? "correction-step complete" : "correction-step"}>
          <span>01</span>
          <strong>Nexla observes context diff</strong>
          <p>Supplier price file arrived and updated Restaurant Context.</p>
        </article>
        <article className={patched ? "correction-step complete" : "correction-step"}>
          <span>02</span>
          <strong>Loop reruns workflow</strong>
          <p>Validated workflow runs again against the new context version.</p>
        </article>
        <article className={patched ? "correction-step complete" : "correction-step"}>
          <span>03</span>
          <strong>Plan patched</strong>
          <p>Recommendation changes supplier choice and expected savings.</p>
        </article>
      </section>

      <section className="diff-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nexla context diff</p>
            <h3>What changed in Restaurant Context</h3>
          </div>
          <span className={patched ? "mode-pill fixture" : "status approval"}>
            {patched ? "ctx_v002" : "pending"}
          </span>
        </div>
        <div className="context-diff-list">
          {contextDiff.map((diff) => (
            <article className="context-diff-item" key={diff.path}>
              <span className="summary-label">{diff.label}</span>
              <div className="diff-values">
                <strong>{diff.before}</strong>
                <span>to</span>
                <strong>{diff.after}</strong>
              </div>
              <p>{diff.impact}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="diff-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recommendation diff</p>
            <h3>Before and after plan</h3>
          </div>
          <span className={patched ? "status ready" : "status approval"}>
            {patched ? "self-correction 1" : "waiting"}
          </span>
        </div>
        <div className="recommendation-diff-list">
          {recommendationDiff.map((diff) => (
            <article className="recommendation-diff-item" key={diff.field}>
              <span className="summary-label">{diff.label}</span>
              <div className="diff-view compact">
                <div className="diff-column">
                  <span className="summary-label">Before</span>
                  <h3>{diff.before}</h3>
                </div>
                <div className="diff-arrow">to</div>
                <div className="diff-column after">
                  <span className="summary-label">After</span>
                  <h3>{diff.after}</h3>
                </div>
              </div>
              <p>{diff.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="context-summary learn-summary">
        <div>
          <span className="summary-label">Self corrections</span>
          <strong>{demoState.metrics.selfCorrections}</strong>
        </div>
        <div>
          <span className="summary-label">Workflow runs</span>
          <strong>{demoState.metrics.workflowRuns}</strong>
        </div>
        <div>
          <span className="summary-label">Estimated savings</span>
          <strong>${demoState.metrics.estimatedCostSavings.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
