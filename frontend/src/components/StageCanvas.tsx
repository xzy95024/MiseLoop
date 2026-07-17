import {
  isActionDisabled,
  type DemoState,
  type IntakeId,
  type StageId,
} from "../lib/demoState/demoState";
import { ConnectView } from "../views/ConnectView";
import { GenerateView } from "../views/GenerateView";
import { LearnView } from "../views/LearnView";
import { ResolveView } from "../views/ResolveView";
import { RunView } from "../views/RunView";

type StageCanvasProps = {
  actionLabel: string;
  demoState: DemoState;
  kicker: string;
  onIntakeSample: (intakeId: IntakeId) => void;
  onPrimaryAction: () => void;
  stage: StageId;
  title: string;
};

export function StageCanvas({
  actionLabel,
  demoState,
  kicker,
  onIntakeSample,
  onPrimaryAction,
  stage,
  title,
}: StageCanvasProps) {
  return (
    <section className="main-canvas" aria-live="polite">
      <div className="canvas-header">
        <div>
          <p className="eyebrow">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <button
          className="primary-button"
          disabled={isActionDisabled(demoState.phase)}
          onClick={onPrimaryAction}
          type="button"
        >
          {actionLabel}
        </button>
      </div>

      {stage === "connect" && <ConnectView demoState={demoState} onIntakeSample={onIntakeSample} />}
      {stage === "generate" && <GenerateView phase={demoState.phase} />}
      {stage === "resolve" && <ResolveView phase={demoState.phase} />}
      {stage === "run" && <RunView phase={demoState.phase} />}
      {stage === "learn" && <LearnView demoState={demoState} />}
    </section>
  );
}
