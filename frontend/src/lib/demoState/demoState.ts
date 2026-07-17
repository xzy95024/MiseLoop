export type StageId = "connect" | "generate" | "resolve" | "run" | "learn";
export type DemoPhase =
  | "EMPTY"
  | "CONTEXT_READY"
  | "BLOCKED"
  | "READY"
  | "RUNNING"
  | "COMPLETED_WITH_RECOMMENDATION"
  | "PATCHED_RECOMMENDATION";
export type IntakeId = "files" | "email" | "receipt_photo" | "voice_note";
export type IntakeStatus = "READY" | "PARSED" | "MAPPED";
export type SourceStatus = "PARSED" | "MAPPED";
export type DependencyMode = "live" | "cached" | "fixture";

export type IntegrationDiagnostics = {
  nexla?: {
    mode?: DependencyMode;
    configured?: boolean;
    configured_parts?: Record<string, boolean>;
    auth_mode?: string;
    records_path?: string;
    timeout_seconds?: number;
    cached_context_available?: boolean;
    fallback?: string;
    provider_note?: string | null;
  };
  zero?: {
    mode?: DependencyMode;
    cli_detected?: boolean;
    cli_path?: string | null;
    setup_hint?: string;
    fallback?: string;
    fallback_available?: boolean;
    provider_note?: string | null;
  };
};

export type IntakeItem = {
  id: IntakeId;
  label: string;
  detail: string;
  sampleAction: string;
  status: IntakeStatus;
};

export type SourceCard = {
  id: string;
  type: "sales" | "inventory" | "supplier_prices" | "manager_notes" | "purchase_history";
  title: string;
  rawInputType: string;
  normalizedField: string;
  mappedFields: number;
  freshness: string;
  icon: string;
  tone: "tomato" | "green" | "amber" | "blue";
  status: SourceStatus;
  copy: string;
};

export type RawInputPreview = {
  intakeId: IntakeId;
  title: string;
  kind: "files" | "email" | "receipt" | "voice";
  status: "READY" | "PARSED" | "MAPPED";
  lines: string[];
};

export type IntakeUploadPayload = {
  channel: "upload" | "paste" | "transcript";
  files: Array<{
    name: string;
    type: string;
    sizeLabel: string;
  }>;
  text: string;
};

export type ContextPreviewSection = {
  namespace: string;
  description: string;
  records: Array<{
    key: string;
    value: string;
    source: string;
  }>;
};

export type WorkflowStep = {
  id: string;
  label: string;
  type: "context" | "capability" | "decision" | "recommendation";
  status: "READY" | "MISSING" | "PENDING";
};

export type WorkflowPreview = {
  id: string;
  name: string;
  trigger: string;
  requiredCapabilities: Array<{ name: string; reason: string }>;
  steps: WorkflowStep[];
  approvalPolicy: {
    externalWrite: "manager_approval_required";
    purchaseOrder: "recommendation_only";
  };
};

export type ZeroResolutionEvent = {
  id: string;
  label: string;
  capability: string;
  status: "PENDING" | "PASSED";
  summary: string;
  provider: "zero";
  capabilityId?: string;
  sampleOutput?: Record<string, number>;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
};

export type RunTimelineItem = {
  id: string;
  label: string;
  status: "PENDING" | "COMPLETED" | "PENDING_APPROVAL";
  summary: string;
  evidence: string;
};

export type Recommendation = {
  title: string;
  summary: string;
  requiresApproval: boolean;
  approvalStatus: "NOT_CREATED" | "PENDING_APPROVAL";
  expectedImpact: {
    stockoutRiskReduction: number;
    estimatedCostSavings: number;
    prepWasteReduction: number;
  };
  planItems: Array<{
    item: string;
    action: string;
    reason: string;
  }>;
};

export type ContextDiff = {
  path: string;
  label: string;
  before: string;
  after: string;
  impact: string;
};

export type RecommendationDiff = {
  field: string;
  label: string;
  before: string;
  after: string;
  reason: string;
};

export const STAGES: Array<{ id: StageId; label: string; number: string; flagged?: boolean }> = [
  { id: "connect", label: "Connect", number: "01" },
  { id: "generate", label: "Generate", number: "02" },
  { id: "resolve", label: "Resolve", number: "03", flagged: true },
  { id: "run", label: "Run", number: "04" },
  { id: "learn", label: "Learn", number: "05" },
];

export const STAGE_COPY: Record<StageId, { kicker: string; title: string; action: string }> = {
  connect: {
    kicker: "Restaurant Context",
    title: "Messy inputs become mapped Nexla source cards.",
    action: "Build with Nexla",
  },
  generate: {
    kicker: "Goal to Workflow",
    title: "Loop generates a workflow, then shows the blocker.",
    action: "Generate Workflow",
  },
  resolve: {
    kicker: "Zero Capability Resolver",
    title: "Missing capabilities are validated, bound, and ready.",
    action: "Resolve with Zero",
  },
  run: {
    kicker: "Workflow Runner",
    title: "The agent runs through context, capabilities, and recommendation.",
    action: "Run Workflow",
  },
  learn: {
    kicker: "Context Changed",
    title: "Loop observes supplier price drift and patches the plan.",
    action: "Apply Context Update",
  },
};

export type DemoState = {
  phase: DemoPhase;
  activeStage: StageId;
  dependencyMode: Partial<Record<"nexla" | "zero" | "workflow_generator", DependencyMode>>;
  integrationDiagnostics?: IntegrationDiagnostics;
  intakeItems: IntakeItem[];
  rawInputs: RawInputPreview[];
  sourceCards: SourceCard[];
  restaurantContextPreview: ContextPreviewSection[];
  ownerGoal: string;
  workflowJsonPreview?: unknown;
  workflowPreview: WorkflowPreview;
  zeroResolutionEvents: ZeroResolutionEvent[];
  runTimeline: RunTimelineItem[];
  recommendation: Recommendation;
  contextDiff: ContextDiff[];
  recommendationDiff: RecommendationDiff[];
  contextVersion?: string;
  workflowId?: string;
  runId?: string;
  responseTitle: string;
  response: unknown;
  metrics: {
    capabilitiesResolved: number;
    workflowRuns: number;
    selfCorrections: number;
    estimatedCostSavings: number;
  };
};

type StageStatus = "current" | "complete" | "blocked" | "pending";

const PHASE_STAGE: Record<DemoPhase, StageId> = {
  EMPTY: "connect",
  CONTEXT_READY: "generate",
  BLOCKED: "resolve",
  READY: "run",
  RUNNING: "run",
  COMPLETED_WITH_RECOMMENDATION: "learn",
  PATCHED_RECOMMENDATION: "learn",
};

const STAGE_ORDER: StageId[] = ["connect", "generate", "resolve", "run", "learn"];

const DEFAULT_OWNER_GOAL = "Create a weekend prep agent for this Friday";

const INITIAL_INTAKE_ITEMS: IntakeItem[] = [
  {
    id: "files",
    label: "Files",
    detail: "Sales CSV, inventory CSV, supplier XLSX",
    sampleAction: "Use demo files",
    status: "READY",
  },
  {
    id: "email",
    label: "Email",
    detail: "Vendor price update or purchase confirmation",
    sampleAction: "Import vendor email",
    status: "READY",
  },
  {
    id: "receipt_photo",
    label: "Receipt Photo",
    detail: "Supplier invoice or register receipt",
    sampleAction: "Scan receipt",
    status: "READY",
  },
  {
    id: "voice_note",
    label: "Voice Note",
    detail: "Manager note transcribed into context",
    sampleAction: "Add voice note",
    status: "READY",
  },
];

const SOURCE_BY_INTAKE: Record<IntakeId, SourceCard[]> = {
  files: [
    {
      id: "sales_last_year",
      type: "sales",
      title: "Sales last year",
      rawInputType: "CSV",
      normalizedField: "sales.by_day, sales.by_item",
      mappedFields: 8,
      freshness: "Fresh 10:00 AM",
      icon: "S",
      tone: "tomato",
      status: "MAPPED",
      copy: "Weekend item demand, daypart patterns, comparable period.",
    },
    {
      id: "inventory_current",
      type: "inventory",
      title: "Inventory",
      rawInputType: "CSV",
      normalizedField: "inventory.on_hand, reorder_threshold",
      mappedFields: 7,
      freshness: "Fresh 10:05 AM",
      icon: "I",
      tone: "green",
      status: "MAPPED",
      copy: "On-hand stock, reorder threshold, spoilage risk.",
    },
    {
      id: "supplier_prices_q3",
      type: "supplier_prices",
      title: "Supplier prices",
      rawInputType: "XLSX",
      normalizedField: "supplier_price.by_item",
      mappedFields: 6,
      freshness: "Fresh 10:10 AM",
      icon: "P",
      tone: "amber",
      status: "MAPPED",
      copy: "Delivery speed, reliability, certifications, item price.",
    },
  ],
  email: [
    {
      id: "vendor_email_update",
      type: "supplier_prices",
      title: "Vendor email",
      rawInputType: "Email",
      normalizedField: "supplier_price.by_item.tomato",
      mappedFields: 5,
      freshness: "Fresh 10:12 AM",
      icon: "E",
      tone: "amber",
      status: "PARSED",
      copy: "Parsed supplier, item, price, delivery window, and effective date.",
    },
  ],
  receipt_photo: [
    {
      id: "invoice_photo_001",
      type: "purchase_history",
      title: "Receipt photo",
      rawInputType: "Photo",
      normalizedField: "purchase_history.by_item",
      mappedFields: 4,
      freshness: "Fresh 10:14 AM",
      icon: "R",
      tone: "blue",
      status: "PARSED",
      copy: "Extracted invoice items, quantities, vendor name, and total.",
    },
  ],
  voice_note: [
    {
      id: "manager_voice_note",
      type: "manager_notes",
      title: "Manager note",
      rawInputType: "Voice",
      normalizedField: "constraints.manager_notes",
      mappedFields: 3,
      freshness: "Fresh 10:16 AM",
      icon: "V",
      tone: "green",
      status: "PARSED",
      copy: "Transcribed a manager constraint for this weekend prep run.",
    },
  ],
};

const RAW_INPUT_BY_INTAKE: Record<IntakeId, RawInputPreview> = {
  files: {
    intakeId: "files",
    title: "Demo restaurant files",
    kind: "files",
    status: "MAPPED",
    lines: [
      "sales_last_year.csv - weekend item sales, 1,248 rows",
      "inventory.csv - on hand, reorder threshold, spoilage risk",
      "supplier_prices_q3.xlsx - item, supplier, price, delivery days",
    ],
  },
  email: {
    intakeId: "email",
    title: "Vendor email update",
    kind: "email",
    status: "PARSED",
    lines: [
      "From: produce@vendora.example",
      "Subject: Weekend tomato pricing update",
      "Roma tomatoes move from $2.10 to $2.85/lb starting Friday. Vendor B can hold $2.35/lb with 2-day delivery.",
    ],
  },
  receipt_photo: {
    intakeId: "receipt_photo",
    title: "Receipt photo OCR",
    kind: "receipt",
    status: "PARSED",
    lines: [
      "Golden Gate Produce - Invoice 1048",
      "Tomatoes 40 lb x $2.10 = $84.00",
      "Lettuce 25 ct x $1.35 = $33.75",
      "Detected total: $117.75",
    ],
  },
  voice_note: {
    intakeId: "voice_note",
    title: "Manager voice note",
    kind: "voice",
    status: "PARSED",
    lines: [
      "Transcript: Tomatoes from Vendor A got expensive.",
      "Check Vendor B this weekend before drafting purchase plan.",
      "Keep purchase orders as recommendation only.",
    ],
  },
};

const CONTEXT_PREVIEW_BY_INTAKE: Record<IntakeId, ContextPreviewSection[]> = {
  files: [
    {
      namespace: "sales.by_item",
      description: "Weekend demand baseline",
      records: [
        { key: "salmon_bowl", value: "118 weekend orders", source: "sales_last_year.csv" },
        { key: "tomato_salad", value: "86 weekend orders", source: "sales_last_year.csv" },
      ],
    },
    {
      namespace: "inventory.on_hand",
      description: "Current stock and thresholds",
      records: [
        { key: "tomato", value: "45 lb on hand / 50 lb reorder", source: "inventory.csv" },
        { key: "lettuce", value: "28 ct on hand / 30 ct reorder", source: "inventory.csv" },
      ],
    },
    {
      namespace: "supplier_price.by_item",
      description: "Supplier ranking inputs",
      records: [
        { key: "tomato.vendor_a", value: "$2.10, 2 days, reliability 0.91", source: "supplier_prices_q3.xlsx" },
        { key: "tomato.vendor_b", value: "$2.35, 2 days, reliability 0.94", source: "supplier_prices_q3.xlsx" },
      ],
    },
  ],
  email: [
    {
      namespace: "supplier_price.by_item",
      description: "Email-derived supplier update",
      records: [
        { key: "tomato.vendor_a", value: "$2.85 effective Friday", source: "vendor_email_update" },
        { key: "tomato.vendor_b", value: "$2.35 held through weekend", source: "vendor_email_update" },
      ],
    },
  ],
  receipt_photo: [
    {
      namespace: "purchase_history.by_item",
      description: "OCR-derived purchase history",
      records: [
        { key: "tomato", value: "40 lb at $2.10", source: "invoice_photo_001" },
        { key: "lettuce", value: "25 ct at $1.35", source: "invoice_photo_001" },
      ],
    },
  ],
  voice_note: [
    {
      namespace: "constraints.manager_notes",
      description: "Voice-derived operating constraints",
      records: [
        { key: "supplier_preference", value: "Check Vendor B for tomatoes", source: "manager_voice_note" },
        { key: "purchase_policy", value: "recommendation_only", source: "manager_voice_note" },
      ],
    },
  ],
};

export const DEFAULT_WORKFLOW_PREVIEW: WorkflowPreview = {
  id: "weekend-prep-agent",
  name: "Weekend Prep Agent",
  trigger: "Every Friday 9 AM",
  requiredCapabilities: [
    { name: "weather_forecast", reason: "Rain changes patio demand" },
    { name: "local_event_calendar", reason: "Nearby events change weekend demand" },
  ],
  steps: [
    { id: "load_context", label: "Load Nexla Restaurant Context", type: "context", status: "READY" },
    { id: "check_weather", label: "Check weather forecast", type: "capability", status: "MISSING" },
    { id: "check_events", label: "Check local event calendar", type: "capability", status: "MISSING" },
    { id: "rank_suppliers", label: "Rank suppliers", type: "decision", status: "PENDING" },
    { id: "patch_purchase_plan", label: "Draft purchase plan", type: "recommendation", status: "PENDING" },
  ],
  approvalPolicy: {
    externalWrite: "manager_approval_required",
    purchaseOrder: "recommendation_only",
  },
};
const FALLBACK_WORKFLOW_JSON_PREVIEW = {
    "owner_goal":  "Create a weekend prep agent for this Friday",
    "workflow":  {
                     "id":  "weekend-prep-agent",
                     "trigger":  "Every Friday 9 AM",
                     "required_capabilities":  [
                                                   {
                                                       "name":  "weather_forecast",
                                                       "reason":  "Rain changes patio demand"
                                                   },
                                                   {
                                                       "name":  "local_event_calendar",
                                                       "reason":  "Nearby events change weekend demand"
                                                   }
                                               ],
                     "approval_policy":  {
                                             "externalWrite":  "manager_approval_required",
                                             "purchaseOrder":  "recommendation_only"
                                         }
                 },
    "supply_data":  {
                        "generated_at":  "2026-07-17T22:39:48.180916+00:00",
                        "source_files":  [
                                             "sunny_farm_receipt_0716.pdf",
                                             "bay_produce_receipts.xlsx"
                                         ],
                        "extraction":  {
                                           "pdf":  {
                                                       "backend":  "nexla",
                                                       "note":  null
                                                   },
                                           "xlsx":  {
                                                        "backend":  "nexla",
                                                        "note":  null
                                                    },
                                           "nexla_timeout_seconds":  60.0
                                       },
                        "line_items":  [
                                           {
                                               "source_file":  "sunny_farm_receipt_0716.pdf",
                                               "source_type":  "pdf",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "SF-0716-002",
                                               "delivery_date":  "2026-07-16",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-23",
                                               "certification":  "USDA Organic",
                                               "supplier":  {
                                                                "raw":  "SUNNY FARM ORGANIC PRODUCE",
                                                                "canonical":  "Sunny Farm",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Nordic Fjord King Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "A",
                                                             "tier":  "premium",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  10.0,
                                                                "raw_value":  10.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  21.0,
                                                                  "raw_value":  21.0,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  210.0,
                                               "source_total":  210.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           },
                                           {
                                               "source_file":  "sunny_farm_receipt_0716.pdf",
                                               "source_type":  "pdf",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "SF-0716-002",
                                               "delivery_date":  "2026-07-16",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-23",
                                               "certification":  "USDA Organic",
                                               "supplier":  {
                                                                "raw":  "SUNNY FARM ORGANIC PRODUCE",
                                                                "canonical":  "Sunny Farm",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Nordic Fjord King Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "B",
                                                             "tier":  "standard",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  14.0,
                                                                "raw_value":  14.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  16.5,
                                                                  "raw_value":  16.5,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  231.0,
                                               "source_total":  231.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           },
                                           {
                                               "source_file":  "bay_produce_receipts.xlsx",
                                               "source_type":  "xlsx",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "BP-0710-01",
                                               "delivery_date":  "2026-07-10",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-13",
                                               "certification":  null,
                                               "supplier":  {
                                                                "raw":  "Bay Produce",
                                                                "canonical":  "Bay Produce",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "1",
                                                             "tier":  "premium",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  10.0,
                                                                "raw_value":  10.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  18.5,
                                                                  "raw_value":  18.5,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  185.0,
                                               "source_total":  185.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           },
                                           {
                                               "source_file":  "bay_produce_receipts.xlsx",
                                               "source_type":  "xlsx",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "BP-0712-01",
                                               "delivery_date":  "2026-07-12",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-15",
                                               "certification":  null,
                                               "supplier":  {
                                                                "raw":  "Bay Produce",
                                                                "canonical":  "Bay Produce",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "3",
                                                             "tier":  "economy",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  8.0,
                                                                "raw_value":  8.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  14.0,
                                                                  "raw_value":  14.0,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  112.0,
                                               "source_total":  112.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           },
                                           {
                                               "source_file":  "bay_produce_receipts.xlsx",
                                               "source_type":  "xlsx",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "BP-0715-01",
                                               "delivery_date":  "2026-07-15",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-18",
                                               "certification":  null,
                                               "supplier":  {
                                                                "raw":  "Bay Produce",
                                                                "canonical":  "Bay Produce",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "1",
                                                             "tier":  "premium",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  12.0,
                                                                "raw_value":  12.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  18.5,
                                                                  "raw_value":  18.5,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  222.0,
                                               "source_total":  222.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           },
                                           {
                                               "source_file":  "bay_produce_receipts.xlsx",
                                               "source_type":  "xlsx",
                                               "extraction_backend":  "nexla",
                                               "delivery_id":  "BP-0715-02",
                                               "delivery_date":  "2026-07-15",
                                               "delivered_to":  null,
                                               "best_by_date":  "2026-07-22",
                                               "certification":  null,
                                               "supplier":  {
                                                                "raw":  "Bay Produce",
                                                                "canonical":  "Bay Produce",
                                                                "entity_resolved":  true
                                                            },
                                               "item":  {
                                                            "raw":  "Salmon",
                                                            "canonical":  "salmon",
                                                            "entity_resolved":  true
                                                        },
                                               "grade":  {
                                                             "raw":  "2",
                                                             "tier":  "standard",
                                                             "grade_resolved":  true
                                                         },
                                               "quantity":  {
                                                                "kg":  15.0,
                                                                "raw_value":  15.0,
                                                                "raw_unit":  "kg"
                                                            },
                                               "unit_price":  {
                                                                  "per_kg":  16.2,
                                                                  "raw_value":  16.2,
                                                                  "raw_unit":  "kg",
                                                                  "currency":  "USD"
                                                              },
                                               "subtotal":  243.0,
                                               "source_total":  243.0,
                                               "checks":  {
                                                              "subtotal_consistent":  true,
                                                              "total_matches_source":  true
                                                          }
                                           }
                                       ],
                        "validation":  {
                                           "total_line_items":  6,
                                           "unresolved_items":  [

                                                                ],
                                           "unresolved_suppliers":  [

                                                                    ],
                                           "unresolved_grades":  [

                                                                 ],
                                           "total_check_failures":  [

                                                                    ],
                                           "clean":  true
                                       }
                    }
};

const ZERO_RESOLUTION_EVENTS: ZeroResolutionEvent[] = [
  {
    id: "search_weather",
    label: "Search",
    capability: "weather_forecast",
    status: "PENDING",
    summary: "Find a weather capability that accepts location and date range.",
    provider: "zero",
    inputSchema: { location: "string", date: "string" },
    outputSchema: { rain_probability: "number", temperature_f: "number" },
  },
  {
    id: "validate_weather",
    label: "Sample test",
    capability: "weather_forecast",
    status: "PENDING",
    summary: "Run sample input for San Francisco Saturday weather.",
    provider: "zero",
    capabilityId: "zero_weather_001",
    sampleOutput: { rain_probability: 82, temperature_f: 58 },
    inputSchema: { location: "string", date: "string" },
    outputSchema: { rain_probability: "number", temperature_f: "number" },
  },
  {
    id: "search_events",
    label: "Resolve",
    capability: "local_event_calendar",
    status: "PENDING",
    summary: "Find an events capability that returns expected traffic lift.",
    provider: "zero",
    inputSchema: { location: "string", weekend: "boolean" },
    outputSchema: { expected_foot_traffic_lift: "number" },
  },
  {
    id: "validate_events",
    label: "Schema validate",
    capability: "local_event_calendar",
    status: "PENDING",
    summary: "Validate event capability output against required schema.",
    provider: "zero",
    capabilityId: "zero_events_001",
    sampleOutput: { expected_foot_traffic_lift: 0.18 },
    inputSchema: { location: "string", weekend: "boolean" },
    outputSchema: { expected_foot_traffic_lift: "number" },
  },
  {
    id: "bind_capabilities",
    label: "Bind",
    capability: "workflow",
    status: "PENDING",
    summary: "Bind weather and events capabilities to workflow steps, then resume.",
    provider: "zero",
    inputSchema: { workflow_id: "string", capability_ids: "string[]" },
    outputSchema: { status_after: "READY" },
  },
];

function getZeroResolutionEvents(status: ZeroResolutionEvent["status"]): ZeroResolutionEvent[] {
  return ZERO_RESOLUTION_EVENTS.map((event) => ({ ...event, status }));
}

const RUN_TIMELINE_TEMPLATE: RunTimelineItem[] = [
  {
    id: "load_context",
    label: "Context loaded",
    status: "PENDING",
    summary: "Load Restaurant Context from Nexla provider.",
    evidence: "ctx_v001",
  },
  {
    id: "check_weather",
    label: "Weather checked",
    status: "PENDING",
    summary: "Use Zero-bound weather capability for Saturday forecast.",
    evidence: "rain_probability pending",
  },
  {
    id: "check_events",
    label: "Events checked",
    status: "PENDING",
    summary: "Use Zero-bound local event capability for weekend traffic.",
    evidence: "traffic lift pending",
  },
  {
    id: "rank_suppliers",
    label: "Suppliers ranked",
    status: "PENDING",
    summary: "Rank suppliers by price, delivery days, reliability, and certifications.",
    evidence: "ranking pending",
  },
  {
    id: "patch_purchase_plan",
    label: "Purchase plan drafted",
    status: "PENDING",
    summary: "Draft recommendation with manager approval required.",
    evidence: "approval gate pending",
  },
];

const EMPTY_RECOMMENDATION: Recommendation = {
  title: "Weekend purchase plan",
  summary: "Run the workflow to draft a recommendation from context and bound capabilities.",
  requiresApproval: true,
  approvalStatus: "NOT_CREATED",
  expectedImpact: {
    stockoutRiskReduction: 0,
    estimatedCostSavings: 0,
    prepWasteReduction: 0,
  },
  planItems: [
    {
      item: "Tomatoes",
      action: "Waiting for supplier ranking",
      reason: "Workflow has not run yet.",
    },
  ],
};

const COMPLETED_RUN_TIMELINE: RunTimelineItem[] = [
  {
    id: "load_context",
    label: "Context loaded",
    status: "COMPLETED",
    summary: "Restaurant Context loaded from Nexla provider.",
    evidence: "ctx_v001",
  },
  {
    id: "check_weather",
    label: "Weather checked",
    status: "COMPLETED",
    summary: "Rain probability is 82% for Saturday.",
    evidence: "zero_weather_001",
  },
  {
    id: "check_events",
    label: "Events checked",
    status: "COMPLETED",
    summary: "Nearby event increases expected foot traffic by 18%.",
    evidence: "zero_events_001",
  },
  {
    id: "rank_suppliers",
    label: "Suppliers ranked",
    status: "COMPLETED",
    summary: "Supplier B is ranked first for tomatoes.",
    evidence: "price 0.45, delivery 0.25, reliability 0.20",
  },
  {
    id: "patch_purchase_plan",
    label: "Purchase plan drafted",
    status: "PENDING_APPROVAL",
    summary: "Recommendation created. External write remains gated.",
    evidence: "manager approval required",
  },
];

const COMPLETED_RECOMMENDATION: Recommendation = {
  title: "Weekend purchase plan",
  summary: "Increase indoor comfort items, reduce patio-heavy prep, and switch tomato supplier.",
  requiresApproval: true,
  approvalStatus: "PENDING_APPROVAL",
  expectedImpact: {
    stockoutRiskReduction: 0.22,
    estimatedCostSavings: 143.5,
    prepWasteReduction: 0.12,
  },
  planItems: [
    {
      item: "Tomatoes",
      action: "Use Supplier B",
      reason: "Supplier B has better weekend price and reliability.",
    },
    {
      item: "Patio garnish",
      action: "Reduce prep by 18%",
      reason: "Rain probability is 82%, lowering patio-heavy demand.",
    },
    {
      item: "Indoor comfort items",
      action: "Increase prep by 12%",
      reason: "Local event traffic plus rain shifts demand indoors.",
    },
  ],
};

const CONTEXT_DIFF: ContextDiff[] = [
  {
    path: "supplier_price.by_item.tomato.vendor_a.price",
    label: "Vendor A tomato price",
    before: "$2.10",
    after: "$2.85",
    impact: "Previous tomato supplier is no longer optimal.",
  },
  {
    path: "supplier_price.by_item.tomato.vendor_b.reliability",
    label: "Vendor B reliability",
    before: "0.91",
    after: "0.94",
    impact: "Vendor B becomes the safer weekend recommendation.",
  },
];

const RECOMMENDATION_DIFF: RecommendationDiff[] = [
  {
    field: "supplier.tomato.primary",
    label: "Tomato supplier",
    before: "Vendor A",
    after: "Vendor B",
    reason: "Vendor A tomato price increased from 2.10 to 2.85.",
  },
  {
    field: "purchase_plan.estimated_savings",
    label: "Estimated savings",
    before: "$143.50",
    after: "$168.20",
    reason: "Switching tomatoes to Vendor B improves weekend cost profile.",
  },
];

const PATCHED_RECOMMENDATION: Recommendation = {
  ...COMPLETED_RECOMMENDATION,
  summary: "Supplier price changed. Loop reran the workflow and switched tomatoes to Vendor B.",
  expectedImpact: {
    ...COMPLETED_RECOMMENDATION.expectedImpact,
    estimatedCostSavings: 168.2,
  },
  planItems: [
    {
      item: "Tomatoes",
      action: "Switch to Vendor B",
      reason: "Vendor A price increased to $2.85 while Vendor B remains more reliable.",
    },
    ...COMPLETED_RECOMMENDATION.planItems.slice(1),
  ],
};

export function createInitialDemoState(): DemoState {
  return {
    phase: "EMPTY",
    activeStage: "connect",
    dependencyMode: { nexla: "fixture", zero: "live", workflow_generator: "fixture" },
    integrationDiagnostics: {
      nexla: {
        mode: "fixture",
        configured: false,
        fallback: "cached context file, then deterministic fixture",
      },
      zero: {
        mode: "fixture",
        cli_detected: false,
        fallback: "zero_capabilities.json",
        provider_note: "Zero CLI not resolved yet; waiting for capability resolution step.",
      },
    },
    intakeItems: INITIAL_INTAKE_ITEMS,
    rawInputs: [],
    sourceCards: [],
    restaurantContextPreview: [],
    ownerGoal: DEFAULT_OWNER_GOAL,
    workflowJsonPreview: FALLBACK_WORKFLOW_JSON_PREVIEW,
    workflowPreview: DEFAULT_WORKFLOW_PREVIEW,
    zeroResolutionEvents: getZeroResolutionEvents("PENDING"),
    runTimeline: RUN_TIMELINE_TEMPLATE,
    recommendation: EMPTY_RECOMMENDATION,
    contextDiff: [],
    recommendationDiff: [],
    responseTitle: "Dashboard baseline",
    response: {
      success: true,
      message: "Demo reset. Waiting for restaurant data intake.",
      data: {
        restaurant: { id: "restaurant_001", name: "MiseLoop Demo Kitchen" },
        workflow: { status: "EMPTY" },
        context: null,
      },
      meta: {
        dependency_mode: { nexla: "fixture", zero: "live" },
        request_id: "req_demo_reset",
      },
    },
    metrics: {
      capabilitiesResolved: 0,
      workflowRuns: 0,
      selfCorrections: 0,
      estimatedCostSavings: 0,
    },
  };
}

export function resetDemoState(): DemoState {
  return createInitialDemoState();
}

export function setDemoStage(state: DemoState, activeStage: StageId): DemoState {
  return { ...state, activeStage };
}

export function updateOwnerGoal(state: DemoState, ownerGoal: string): DemoState {
  return {
    ...state,
    ownerGoal,
    activeStage: "generate",
    responseTitle: "Draft owner goal",
    response: {
      success: true,
      message: "Owner goal updated locally. Generate Workflow will validate it into JSON.",
      data: {
        owner_goal: ownerGoal,
        constraints: {
          purchase_order: state.workflowPreview.approvalPolicy.purchaseOrder,
          external_write: state.workflowPreview.approvalPolicy.externalWrite,
        },
      },
      meta: {
        request_id: "req_goal_draft",
        dependency_mode: { workflow_generator: "local" },
        context_version: state.contextVersion,
      },
    },
  };
}

export function addIntakeSource(state: DemoState, intakeId: IntakeId): DemoState {
  const incomingSources = SOURCE_BY_INTAKE[intakeId];
  const incomingRawInput = RAW_INPUT_BY_INTAKE[intakeId];
  return addIntakeSourceWithRawInput(state, intakeId, incomingRawInput, {
    requestId: `req_intake_${intakeId}`,
    message: "Raw restaurant input converted into source card candidates.",
    title: `Intake sample: ${intakeId}`,
    uploaded: false,
  });
}

export function addUploadedIntakeSource(
  state: DemoState,
  intakeId: IntakeId,
  payload: IntakeUploadPayload,
): DemoState {
  const incomingRawInput = createUploadedRawInput(intakeId, payload);
  return addIntakeSourceWithRawInput(state, intakeId, incomingRawInput, {
    requestId: `req_upload_${intakeId}`,
    message: "Uploaded restaurant input parsed into source card candidates.",
    title: `Uploaded input: ${intakeId}`,
    uploaded: true,
    payload,
  });
}

function addIntakeSourceWithRawInput(
  state: DemoState,
  intakeId: IntakeId,
  incomingRawInput: RawInputPreview,
  responseOptions: {
    requestId: string;
    message: string;
    title: string;
    uploaded: boolean;
    payload?: IntakeUploadPayload;
  },
): DemoState {
  const incomingSources = SOURCE_BY_INTAKE[intakeId];
  const incomingContextSections = CONTEXT_PREVIEW_BY_INTAKE[intakeId];
  const incomingIds = new Set(incomingSources.map((source) => source.id));
  const incomingNamespaces = new Set(incomingContextSections.map((section) => section.namespace));
  const nextStatus: IntakeStatus = intakeId === "files" ? "MAPPED" : "PARSED";
  const sourceCards = [
    ...state.sourceCards.filter((source) => !incomingIds.has(source.id)),
    ...incomingSources,
  ];
  const rawInputs = [
    ...state.rawInputs.filter((input) => input.intakeId !== intakeId),
    incomingRawInput,
  ];
  const restaurantContextPreview = [
    ...state.restaurantContextPreview.filter((section) => !incomingNamespaces.has(section.namespace)),
    ...incomingContextSections,
  ];
  const intakeItems = state.intakeItems.map((item) =>
    item.id === intakeId ? { ...item, status: nextStatus } : item,
  );

  return {
    ...state,
    activeStage: "connect",
    intakeItems,
    rawInputs,
    sourceCards,
    restaurantContextPreview,
    responseTitle: responseOptions.title,
    response: {
      success: true,
      message: responseOptions.message,
      data: {
        intake_id: intakeId,
        uploaded: responseOptions.uploaded,
        upload_payload: responseOptions.payload,
        raw_input: incomingRawInput,
        source_cards: incomingSources.map(toApiSourceCard),
        restaurant_context_preview: incomingContextSections,
      },
      meta: {
        request_id: responseOptions.requestId,
        dependency_mode: { nexla: "fixture" },
      },
    },
  };
}

function createUploadedRawInput(
  intakeId: IntakeId,
  payload: IntakeUploadPayload,
): RawInputPreview {
  const base = RAW_INPUT_BY_INTAKE[intakeId];
  const fileLines = payload.files.map(
    (file) => `${file.name} - ${file.type || "unknown type"}, ${file.sizeLabel}`,
  );
  const textLines = payload.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  const lines = [...fileLines, ...textLines];

  return {
    ...base,
    title: getUploadedTitle(intakeId),
    status: intakeId === "files" ? "MAPPED" : "PARSED",
    lines: lines.length > 0 ? lines : base.lines,
  };
}

function getUploadedTitle(intakeId: IntakeId): string {
  switch (intakeId) {
    case "files":
      return "Uploaded restaurant files";
    case "email":
      return "Pasted vendor email";
    case "receipt_photo":
      return "Uploaded receipt evidence";
    case "voice_note":
      return "Uploaded voice note";
  }
}

export function getContextBuildSources(state: DemoState): SourceCard[] {
  if (state.sourceCards.length > 0) {
    return state.sourceCards;
  }

  return SOURCE_BY_INTAKE.files;
}

function getContextBuildPreview(state: DemoState): ContextPreviewSection[] {
  if (state.restaurantContextPreview.length > 0) {
    return state.restaurantContextPreview;
  }

  return CONTEXT_PREVIEW_BY_INTAKE.files;
}

function getContextBuildRawInputs(state: DemoState): RawInputPreview[] {
  if (state.rawInputs.length > 0) {
    return state.rawInputs;
  }

  return [RAW_INPUT_BY_INTAKE.files];
}

function toApiSourceCard(source: SourceCard) {
  return {
    type: source.type,
    source_id: source.id,
    raw_input_type: source.rawInputType,
    normalized_context_field: source.normalizedField,
    status: source.status,
    mapped_fields: source.mappedFields,
  };
}

export function advanceDemoState(state: DemoState): DemoState {
  switch (state.phase) {
    case "EMPTY":
      const buildSources = getContextBuildSources(state);
      const contextPreview = getContextBuildPreview(state);
      const rawInputs = getContextBuildRawInputs(state);
      return {
        ...state,
        phase: "CONTEXT_READY",
        activeStage: "generate",
        sourceCards: buildSources,
        rawInputs,
        restaurantContextPreview: contextPreview,
        intakeItems:
          state.sourceCards.length > 0
            ? state.intakeItems
            : state.intakeItems.map((item) =>
                item.id === "files" ? { ...item, status: "MAPPED" } : item,
              ),
        contextVersion: "ctx_v001",
        workflowJsonPreview: FALLBACK_WORKFLOW_JSON_PREVIEW,
        responseTitle: "POST /api/context/build",
        response: {
          success: true,
          message: "Restaurant Context built from mixed restaurant inputs.",
          data: {
            context_id: "ctx_001",
            context_version: "ctx_v001",
            freshness: {
              sales: "2026-07-17T17:00:00Z",
              inventory: "2026-07-17T17:05:00Z",
              supplier_prices: "2026-07-17T17:10:00Z",
              manager_notes: "2026-07-17T17:12:00Z",
            },
            source_cards: buildSources.map(toApiSourceCard),
            raw_inputs: rawInputs,
            restaurant_context_preview: contextPreview,
            restaurant_context: {
              sales: { by_item: [] },
              inventory: { on_hand: [] },
              supplier_price: { by_item: [] },
              constraints: { manager_notes: [] },
              external: {},
            },
          },
          meta: {
            request_id: "req_context_build",
            dependency_mode: { nexla: "fixture", zero: "live" },
            context_version: "ctx_v001",
          },
        },
        metrics: { ...state.metrics },
      };
    case "CONTEXT_READY":
      return {
        ...state,
        phase: "BLOCKED",
        activeStage: "resolve",
        workflowId: "wf_weekend_prep_001",
        responseTitle: "POST /api/agents/generate",
        response: {
          success: true,
          message: "Workflow generated and blocked by missing capabilities.",
          data: {
            workflow_id: "wf_weekend_prep_001",
            status: "BLOCKED",
            owner_goal: state.ownerGoal,
            missing_capabilities: state.workflowPreview.requiredCapabilities.map((capability) => capability.name),
            workflow: {
              id: state.workflowPreview.id,
              name: state.workflowPreview.name,
              trigger: { type: "manual_or_schedule", value: state.workflowPreview.trigger },
              required_capabilities: state.workflowPreview.requiredCapabilities,
              steps: state.workflowPreview.steps.map((step) => ({
                id: step.id,
                type: step.type,
                status: step.status,
              })),
              approval_policy: {
                external_write: state.workflowPreview.approvalPolicy.externalWrite,
                purchase_order: state.workflowPreview.approvalPolicy.purchaseOrder,
              },
            },
          },
          meta: {
            request_id: "req_agents_generate",
            dependency_mode: { workflow_generator: "fixture", nexla: "fixture" },
            context_version: state.contextVersion,
          },
        },
      };
    case "BLOCKED":
      const resolutionEvents = getZeroResolutionEvents("PASSED");
      return {
        ...state,
        phase: "READY",
        activeStage: "run",
        zeroResolutionEvents: resolutionEvents,
        responseTitle: "POST /api/workflows/{id}/resolve-capabilities",
        response: {
          success: true,
          message: "Workflow capability resolution completed.",
          data: {
            workflow_id: state.workflowId,
            status_before: "BLOCKED",
            status_after: "READY",
            resolution_events: resolutionEvents.map((event) => ({
              capability: event.capability,
              provider: event.provider,
              capability_id: event.capabilityId,
              validation_status: event.status,
              sample_output: event.sampleOutput,
              input_schema: event.inputSchema,
              output_schema: event.outputSchema,
            })),
            bound_capabilities: [
              {
                name: "weather_forecast",
                provider: "zero",
                capability_id: "zero_weather_001",
                validation_status: "PASSED",
              },
              {
                name: "local_event_calendar",
                provider: "zero",
                capability_id: "zero_events_001",
                validation_status: "PASSED",
              },
            ],
          },
          meta: {
            request_id: "req_resolve_capabilities",
            dependency_mode: { zero: "live", nexla: "fixture" },
            context_version: state.contextVersion,
          },
        },
        metrics: {
          ...state.metrics,
          capabilitiesResolved: 2,
        },
      };
    case "READY":
    case "RUNNING":
      return {
        ...state,
        phase: "COMPLETED_WITH_RECOMMENDATION",
        activeStage: "learn",
        runId: "run_001",
        runTimeline: COMPLETED_RUN_TIMELINE,
        recommendation: COMPLETED_RECOMMENDATION,
        responseTitle: "POST /api/workflows/{id}/run",
        response: {
          success: true,
          message: "Workflow completed with manager approval required.",
          data: {
            workflow_id: state.workflowId,
            run_id: "run_001",
            status: "COMPLETED_WITH_RECOMMENDATION",
            timeline: COMPLETED_RUN_TIMELINE.map((item) => ({
              step_id: item.id,
              status: item.status,
              summary: item.summary,
              evidence: item.evidence,
            })),
            recommendation: {
              title: COMPLETED_RECOMMENDATION.title,
              summary: COMPLETED_RECOMMENDATION.summary,
              requires_approval: COMPLETED_RECOMMENDATION.requiresApproval,
              approval_status: COMPLETED_RECOMMENDATION.approvalStatus,
              expected_impact: {
                stockout_risk_reduction: COMPLETED_RECOMMENDATION.expectedImpact.stockoutRiskReduction,
                estimated_cost_savings: COMPLETED_RECOMMENDATION.expectedImpact.estimatedCostSavings,
                prep_waste_reduction: COMPLETED_RECOMMENDATION.expectedImpact.prepWasteReduction,
              },
              plan_items: COMPLETED_RECOMMENDATION.planItems,
            },
          },
          meta: {
            request_id: "req_workflow_run",
            dependency_mode: { zero: "live", nexla: "fixture" },
            context_version: state.contextVersion,
          },
        },
        metrics: {
          ...state.metrics,
          workflowRuns: 1,
          estimatedCostSavings: 143.5,
        },
      };
    case "COMPLETED_WITH_RECOMMENDATION":
      return {
        ...state,
        phase: "PATCHED_RECOMMENDATION",
        activeStage: "learn",
        contextVersion: "ctx_v002",
        runId: "run_002",
        recommendation: PATCHED_RECOMMENDATION,
        contextDiff: CONTEXT_DIFF,
        recommendationDiff: RECOMMENDATION_DIFF,
        responseTitle: "POST /api/context/update + POST /api/workflows/{id}/rerun",
        response: {
          success: true,
          message: "Context changed. Loop reran the workflow and patched the recommendation.",
          data: {
            previous_context_version: "ctx_v001",
            new_context_version: "ctx_v002",
            diff: CONTEXT_DIFF,
            recommendation_diff: RECOMMENDATION_DIFF,
            rerun: {
              previous_run_id: "run_001",
              new_run_id: "run_002",
              reason: "supplier_price_file_arrived",
            },
            recommendation: {
              title: PATCHED_RECOMMENDATION.title,
              summary: PATCHED_RECOMMENDATION.summary,
              expected_impact: {
                estimated_cost_savings: PATCHED_RECOMMENDATION.expectedImpact.estimatedCostSavings,
                stockout_risk_reduction: PATCHED_RECOMMENDATION.expectedImpact.stockoutRiskReduction,
              },
              plan_items: PATCHED_RECOMMENDATION.planItems,
            },
            status: "PATCHED_RECOMMENDATION",
          },
          meta: {
            request_id: "req_context_update_rerun",
            dependency_mode: { nexla: "fixture", zero: "live" },
            context_version: "ctx_v002",
          },
        },
        metrics: {
          ...state.metrics,
          workflowRuns: 2,
          selfCorrections: 1,
          estimatedCostSavings: 168.2,
        },
      };
    case "PATCHED_RECOMMENDATION":
      return state;
  }
}

export function getPrimaryActionLabel(phase: DemoPhase): string {
  switch (phase) {
    case "EMPTY":
      return "Build with Nexla";
    case "CONTEXT_READY":
      return "Generate Workflow";
    case "BLOCKED":
      return "Resolve with Zero";
    case "READY":
    case "RUNNING":
      return "Run Workflow";
    case "COMPLETED_WITH_RECOMMENDATION":
      return "Apply Context Update";
    case "PATCHED_RECOMMENDATION":
      return "Demo Complete";
  }
}

export function getStageStatus(phase: DemoPhase, stage: StageId): StageStatus {
  const currentStage = PHASE_STAGE[phase];
  if (stage === currentStage) {
    return phase === "BLOCKED" && stage === "resolve" ? "blocked" : "current";
  }

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  return stageIndex < currentIndex ? "complete" : "pending";
}

export function isActionDisabled(phase: DemoPhase): boolean {
  return phase === "PATCHED_RECOMMENDATION";
}


