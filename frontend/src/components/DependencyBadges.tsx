import type { DemoState, DependencyMode } from "../lib/demoState/demoState";

type DependencyBadgesProps = {
  dependencyMode: DemoState["dependencyMode"];
};

const LABELS: Array<{ key: keyof DemoState["dependencyMode"]; label: string }> = [
  { key: "zero", label: "Zero" },
  { key: "nexla", label: "Nexla" },
  { key: "workflow_generator", label: "Workflow" },
];

function getModeClass(mode: DependencyMode | undefined) {
  if (mode === "live") return "mode-pill live";
  if (mode === "cached") return "mode-pill cached";
  return "mode-pill fixture";
}

export function DependencyBadges({ dependencyMode }: DependencyBadgesProps) {
  return (
    <>
      {LABELS.map(({ key, label }) => {
        const mode = dependencyMode[key] ?? "fixture";
        return (
          <span className={getModeClass(mode)} key={key}>
            {label} {mode}
          </span>
        );
      })}
    </>
  );
}
