import { DependencyBadges } from "./DependencyBadges";
import type { DemoState } from "../lib/demoState/demoState";

type InspectorDrawerProps = {
  demoState: DemoState;
  isOpen: boolean;
  onToggle: () => void;
};

export function InspectorDrawer({ demoState, isOpen, onToggle }: InspectorDrawerProps) {
  return (
    <aside className={isOpen ? "inspector" : "inspector collapsed"}>
      <button
        aria-expanded={isOpen}
        className="inspector-toggle"
        onClick={onToggle}
        type="button"
      >
        Inspector
      </button>
      <div className="inspector-content">
        <div className="inspector-header">
          <p className="eyebrow">Runtime evidence</p>
          <h2>{demoState.responseTitle}</h2>
        </div>

        <section>
          <span className="summary-label">Demo phase</span>
          <div className="mode-stack">
            <span className="status phase">{demoState.phase}</span>
            {demoState.contextVersion && <span className="mode-pill fixture">{demoState.contextVersion}</span>}
          </div>
        </section>

        <section>
          <span className="summary-label">Dependency mode</span>
          <div className="mode-stack">
            <DependencyBadges dependencyMode={demoState.dependencyMode} />
          </div>
        </section>

        <section>
          <span className="summary-label">Current mock response</span>
          <pre>{JSON.stringify(demoState.response, null, 2)}</pre>
        </section>
      </div>
    </aside>
  );
}
