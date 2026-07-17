import type { DemoState } from "../lib/demoState/demoState";

type ResolveViewProps = {
  demoState: DemoState;
};

export function ResolveView({ demoState }: ResolveViewProps) {
  const resolved = ["READY", "RUNNING", "COMPLETED_WITH_RECOMMENDATION", "PATCHED_RECOMMENDATION"].includes(
    demoState.phase,
  );
  const capabilities = demoState.workflowPreview.requiredCapabilities;
  const detailedEvents = demoState.zeroResolutionEvents.filter((event) => event.capability !== "workflow");

  return (
    <div className="stage-panel active resolve-layout">
      <div className="blocked-banner resolve-hero">
        <div>
          <span className={resolved ? "status ready" : "status blocked"}>
            {resolved ? "READY" : "BLOCKED"}
          </span>
          <h3>{resolved ? "Zero unblocked the workflow" : "Missing capabilities detected"}</h3>
        </div>
        <p>
          {resolved
            ? "weather_forecast and local_event_calendar passed sample validation and were bound to the workflow."
            : "The local registry cannot satisfy weather_forecast or local_event_calendar yet."}
        </p>
      </div>

      <section className="zero-timeline-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Zero runtime flow</p>
            <h3>Search, test, validate, bind</h3>
          </div>
          <span className={resolved ? "mode-pill live" : "status approval"}>
            {resolved ? "Zero live" : "Awaiting resolve"}
          </span>
        </div>

        <div className="zero-timeline">
          {demoState.zeroResolutionEvents.map((event) => (
            <article className={`zero-event ${event.status.toLowerCase()}`} key={event.id}>
              <span className="zero-dot" />
              <div>
                <div className="zero-event-top">
                  <strong>{event.label}</strong>
                  <span className={event.status === "PASSED" ? "status ready" : "status approval"}>
                    {event.status}
                  </span>
                </div>
                <p>{event.summary}</p>
                <small>{event.capability}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="resolve-grid">
        {capabilities.map((capability) => (
          <article className="capability-row" key={capability.name}>
            <div>
              <span className="mode-pill live">Zero</span>
              <h3>{capability.name}</h3>
              <p>{capability.reason}</p>
            </div>
            <span className={resolved ? "status ready" : "status approval"}>
              {resolved ? "Bound" : "Missing"}
            </span>
          </article>
        ))}
      </section>

      <section className="capability-detail-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Capability evidence</p>
            <h3>Sample output and schema</h3>
          </div>
        </div>

        <div className="capability-detail-grid">
          {detailedEvents.map((event) => (
            <article className="capability-detail" key={event.id}>
              <div className="capability-detail-heading">
                <strong>{event.capability}</strong>
                <span className={event.status === "PASSED" ? "status ready" : "status approval"}>
                  {event.capabilityId ?? "candidate"}
                </span>
              </div>
              <div className="schema-grid">
                <div>
                  <span className="summary-label">Output schema</span>
                  <pre>{JSON.stringify(event.outputSchema, null, 2)}</pre>
                </div>
                <div>
                  <span className="summary-label">Sample output</span>
                  <pre>{JSON.stringify(event.sampleOutput ?? {}, null, 2)}</pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
