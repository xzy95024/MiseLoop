import type {
  DemoPhase,
  DemoState,
  DependencyMode,
  IntakeId,
  IntakeUploadPayload,
  StageId,
} from "../demoState/demoState";

export type ApiEnvelope<TData> = {
  success: boolean;
  message: string;
  data: TData;
  meta: {
    request_id: string;
    dependency_mode?: DependencyMode | Partial<Record<string, DependencyMode>>;
    context_version?: string;
    fallback_available?: boolean;
  };
  timestamp: string;
};

export type ApiErrorEnvelope = ApiEnvelope<null> & {
  success: false;
  error_code: string;
};

export type DashboardResponse = ApiEnvelope<{
  restaurant: { id: string; name: string };
  dependency_mode: Partial<Record<"nexla" | "zero" | "workflow_generator", DependencyMode>>;
  context: {
    context_id?: string;
    version?: string;
    source_cards: DashboardSourceCard[];
    last_diff: DashboardContextDiff[];
  } | null;
  workflow: {
    workflow_id?: string;
    status: DemoPhase | "DRAFT" | "FAILED" | "RESOLVING_CAPABILITIES";
    missing_capabilities: string[];
    bound_capabilities: DashboardBoundCapability[];
  };
  timeline: DashboardTimelineItem[];
  recommendation: Partial<DashboardRecommendation> | null;
  metrics: {
    capabilities_resolved: number;
    workflow_runs: number;
    self_corrections: number;
    estimated_cost_savings: number;
  };
}>;

export type DashboardSourceCard = {
  type?: string;
  source_id?: string;
  status?: string;
  mapped_fields?: number;
  raw_input_type?: string;
  normalized_context_field?: string;
  freshness?: string;
};

export type DashboardBoundCapability = {
  name?: string;
  provider?: string;
  capability_id?: string;
  validation_status?: string;
  input_schema?: Record<string, string>;
  output_schema?: Record<string, string>;
  sample_result?: Record<string, number>;
};

export type DashboardTimelineItem = {
  step_id?: string;
  label?: string;
  status?: string;
  summary?: string;
  evidence?: string;
};

export type DashboardRecommendation = {
  title: string;
  summary: string;
  requires_approval: boolean;
  approval_status: string;
  expected_impact: {
    stockout_risk_reduction?: number;
    estimated_cost_savings?: number;
    prep_waste_reduction?: number;
  };
  plan_items: Array<{
    item: string;
    action: string;
    reason: string;
  }>;
};

export type DashboardContextDiff = {
  path?: string;
  label?: string;
  before?: string | number;
  after?: string | number;
  impact?: string;
};

export type HealthResponse = ApiEnvelope<{
  dependency_mode: Partial<Record<"nexla" | "zero" | "workflow_generator", DependencyMode>>;
}>;

export type DemoApi = {
  mode: "fixture" | "real";
  reset(): Promise<DemoState>;
  setStage(state: DemoState, stage: StageId): Promise<DemoState>;
  updateOwnerGoal(state: DemoState, ownerGoal: string): Promise<DemoState>;
  addIntakeSample(state: DemoState, intakeId: IntakeId): Promise<DemoState>;
  addIntakeUpload(
    state: DemoState,
    intakeId: IntakeId,
    payload: IntakeUploadPayload,
  ): Promise<DemoState>;
  advance(state: DemoState): Promise<DemoState>;
};
