import type {
  ContextDiff,
  DemoPhase,
  DemoState,
  Recommendation,
  RunTimelineItem,
  SourceCard,
} from "../demoState/demoState";
import type {
  DashboardContextDiff,
  DashboardRecommendation,
  DashboardResponse,
  DashboardSourceCard,
  DashboardTimelineItem,
} from "./contracts";

const PHASE_BY_WORKFLOW_STATUS: Partial<Record<string, DemoPhase>> = {
  DRAFT: "CONTEXT_READY",
  BLOCKED: "BLOCKED",
  READY: "READY",
  RUNNING: "RUNNING",
  COMPLETED_WITH_RECOMMENDATION: "COMPLETED_WITH_RECOMMENDATION",
  PATCHED_RECOMMENDATION: "PATCHED_RECOMMENDATION",
};

export function mapDashboardToDemoState(
  fallbackState: DemoState,
  dashboard: DashboardResponse,
): DemoState {
  const workflowStatus = dashboard.data.workflow.status;
  const nextPhase = PHASE_BY_WORKFLOW_STATUS[workflowStatus] ?? fallbackState.phase;

  return {
    ...fallbackState,
    phase: nextPhase,
    dependencyMode: {
      ...fallbackState.dependencyMode,
      ...dashboard.data.dependency_mode,
    },
    contextVersion: dashboard.data.context?.version ?? fallbackState.contextVersion,
    workflowId: dashboard.data.workflow.workflow_id ?? fallbackState.workflowId,
    sourceCards: mapSourceCards(dashboard.data.context?.source_cards, fallbackState.sourceCards),
    runTimeline: mapTimeline(dashboard.data.timeline, fallbackState.runTimeline),
    recommendation: mapRecommendation(dashboard.data.recommendation, fallbackState.recommendation),
    contextDiff: mapContextDiff(dashboard.data.context?.last_diff, fallbackState.contextDiff),
    metrics: {
      capabilitiesResolved: dashboard.data.metrics.capabilities_resolved,
      workflowRuns: dashboard.data.metrics.workflow_runs,
      selfCorrections: dashboard.data.metrics.self_corrections,
      estimatedCostSavings: dashboard.data.metrics.estimated_cost_savings,
    },
    responseTitle: "GET /api/dashboard",
    response: dashboard,
  };
}

function mapSourceCards(
  sourceCards: DashboardSourceCard[] | undefined,
  fallback: SourceCard[],
): SourceCard[] {
  if (!sourceCards || sourceCards.length === 0) {
    return fallback;
  }

  return sourceCards.map((card, index) => {
    const type = normalizeSourceType(card.type);
    return {
      id: card.source_id ?? `${type}_${index + 1}`,
      type,
      title: toTitle(card.source_id ?? card.type ?? "Source"),
      rawInputType: card.raw_input_type ?? "Nexla",
      normalizedField: card.normalized_context_field ?? type,
      mappedFields: card.mapped_fields ?? 0,
      freshness: card.freshness ?? "Fresh",
      icon: getSourceIcon(type),
      tone: getSourceTone(type),
      status: card.status === "PARSED" ? "PARSED" : "MAPPED",
      copy: "Mapped by Nexla into Restaurant Context.",
    };
  });
}

function normalizeSourceType(type: string | undefined): SourceCard["type"] {
  if (
    type === "sales" ||
    type === "inventory" ||
    type === "supplier_prices" ||
    type === "manager_notes" ||
    type === "purchase_history"
  ) {
    return type;
  }

  return "supplier_prices";
}

function getSourceIcon(type: SourceCard["type"]) {
  if (type === "sales") return "S";
  if (type === "inventory") return "I";
  if (type === "supplier_prices") return "P";
  if (type === "manager_notes") return "V";
  return "R";
}

function getSourceTone(type: SourceCard["type"]): SourceCard["tone"] {
  if (type === "sales") return "tomato";
  if (type === "inventory") return "green";
  if (type === "supplier_prices") return "amber";
  if (type === "manager_notes") return "green";
  return "blue";
}

function mapTimeline(
  timeline: DashboardTimelineItem[] | undefined,
  fallback: RunTimelineItem[],
): RunTimelineItem[] {
  if (!timeline || timeline.length === 0) {
    return fallback;
  }

  return timeline.map((item, index) => ({
    id: item.step_id ?? `step_${index + 1}`,
    label: item.label ?? toTitle(item.step_id ?? `Step ${index + 1}`),
    status: normalizeTimelineStatus(item.status),
    summary: item.summary ?? "Workflow step updated from dashboard.",
    evidence: item.evidence ?? "dashboard",
  }));
}

function normalizeTimelineStatus(status: string | undefined): RunTimelineItem["status"] {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  return "PENDING";
}

function mapRecommendation(
  recommendation: Partial<DashboardRecommendation> | null,
  fallback: Recommendation,
): Recommendation {
  if (!recommendation || Object.keys(recommendation).length === 0) {
    return fallback;
  }

  return {
    title: recommendation.title ?? fallback.title,
    summary: recommendation.summary ?? fallback.summary,
    requiresApproval: recommendation.requires_approval ?? fallback.requiresApproval,
    approvalStatus:
      recommendation.approval_status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : fallback.approvalStatus,
    expectedImpact: {
      stockoutRiskReduction:
        recommendation.expected_impact?.stockout_risk_reduction ??
        fallback.expectedImpact.stockoutRiskReduction,
      estimatedCostSavings:
        recommendation.expected_impact?.estimated_cost_savings ??
        fallback.expectedImpact.estimatedCostSavings,
      prepWasteReduction:
        recommendation.expected_impact?.prep_waste_reduction ?? fallback.expectedImpact.prepWasteReduction,
    },
    planItems: recommendation.plan_items ?? fallback.planItems,
  };
}

function mapContextDiff(
  diff: DashboardContextDiff[] | undefined,
  fallback: ContextDiff[],
): ContextDiff[] {
  if (!diff || diff.length === 0) {
    return fallback;
  }

  return diff.map((item, index) => ({
    path: item.path ?? `context.diff.${index + 1}`,
    label: item.label ?? toTitle(item.path ?? `Change ${index + 1}`),
    before: String(item.before ?? "unknown"),
    after: String(item.after ?? "unknown"),
    impact: item.impact ?? "Dashboard context changed.",
  }));
}

function toTitle(value: string): string {
  return value
    .replace(/[_./-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
