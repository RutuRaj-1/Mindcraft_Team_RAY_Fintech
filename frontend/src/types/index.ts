export type UserRole = "CUSTOMER" | "RM" | "RISK_OFFICER" | "ADMIN";

export type JourneyStage = 
  | "INTENT_CAPTURE"
  | "EVIDENCE_COLLECTION"
  | "VERIFICATION"
  | "RISK_ASSESSMENT"
  | "EXPLAINABLE_DECISION"
  | "NEXT_BEST_ACTION"
  | "HUMAN_REVIEW"
  | "SANCTIONED"
  | "REJECTED";

export type RiskBand = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
export type DecisionOutcome = "APPROVED" | "CONDITIONAL_APPROVAL" | "NEEDS_REVIEW" | "REJECTED";
export type ActionType = "UPLOAD_DOCUMENT" | "VERIFY_DISCREPANCY" | "OFFER_ACCEPTANCE" | "OFFICER_REVIEW" | "CO_SIGN_SANCTION" | "ADD_COLLATERAL";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  business_id?: string;
}

export interface IntentPayload {
  product_type: string;
  requested_amount: number;
  tenor_months: number;
  purpose: string;
  business_name: string;
  annual_turnover: number;
  vintage_months: number;
  pan?: string;
  gstin?: string;
  industry_sector?: string;
}

export interface JourneyStep {
  stage: JourneyStage;
  entered_at: string;
  completed_at?: string;
  duration_seconds?: number;
  notes?: string;
}

export interface JourneyRecord {
  journey_id: string;
  applicant_id: string;
  current_stage: JourneyStage;
  status: string;
  intent: IntentPayload;
  history: JourneyStep[];
  application_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  document_id: string;
  application_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  sha256_hash: string;
  status: string;
  page_count: number;
  uploaded_at: string;
  verified_at?: string;
  extracted_fields_count: number;
  extracted_fields?: Record<string, any>;
  is_duplicate?: boolean;
  duplicate_of?: string | null;
  source?: string;
  issuer?: string;
  badge?: string;
  verification_status?: string;
  ocr_status?: string;
  storage_path?: string;
  evidence_items?: EvidenceItem[];
}

export interface EvidenceItem {
  evidence_id: string;
  document_id: string;
  application_id: string;
  field_name: string;
  field_value: any;
  normalized_value?: any;
  confidence: number;
  page_number: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
  sha256_source_hash: string;
  extraction_engine: string;
  extraction_method?: string;
  verification_status?: string;
  source_text?: string;
  source_page?: number;
  version?: number;
  is_latest?: boolean;
  timestamp?: string;
  created_at?: string;
}

export interface DigiLockerCredential {
  credential_type: string;
  doc_type: string;
  title: string;
  issuer: string;
  issuer_id: string;
  doc_uri: string;
  status: string;
  badge: string;
  issued_date: string;
}

export interface DiscrepancyItem {
  field: string;
  doc_a_name: string;
  doc_a_value: any;
  doc_b_name: string;
  doc_b_value: any;
  variance_pct: number;
  severity: string;
  explanation: string;
}

export interface InconsistencyRecord {

  inconsistency_id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'REVIEW_REQUIRED';
  fields_involved: string[];
  documents_involved: string[];
  values: Record<string, any>;
  expected_range: Record<string, any>;
  explanation: string;
  status: string;
  variance_pct?: number;
}

export interface ConsistencyReport {
  report_id: string;
  application_id: string;
  is_consistent: boolean;
  discrepancy_score: number;
  flagged_count: number;
  discrepancies: DiscrepancyItem[];
  inconsistencies?: InconsistencyRecord[];
  severity_breakdown?: {
    INFO?: number;
    WARNING?: number;
    REVIEW_REQUIRED?: number;
    TOTAL_CHECKS?: number;
  };
  summary?: string;
  generated_at?: string;
}

export interface CrossCheckCounterpart {
  source: string;
  doc_type: string;
  page: number;
  field: string;
  value: string;
  variance_pct: number;
  status: string;
}

export interface EvidenceHistoryVersion {
  evidence_id: string;
  version: number;
  is_latest: boolean;
  value: any;
  normalized_value: any;
  confidence: number;
  created_at: string;
}

export interface EvidenceProvenanceTrace {
  evidence_id: string;
  application_id: string;
  field_name: string;
  display_label: string;
  document: {
    document_id: string;
    file_name: string;
    doc_type: string;
    page_count: number;
    file_url?: string;
    sha256_hash: string;
  };
  page: number;
  field: string;
  original_extracted_value: any;
  normalized_value: any;
  confidence: number;
  confidence_percent: number;
  cross_check_status: string;
  cross_checks: CrossCheckCounterpart[];
  status: string;
  tolerance_rule: string;
  sha256_hash: string;
  extraction_method: string;
  source_text?: string;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  history?: EvidenceHistoryVersion[];
}


export interface MonthlyCashFlow {
  month: string;
  inflow: number;
  outflow: number;
  net_flow: number;
  closing_balance: number;
  emi_outflow?: number;
}

export interface CashFlowAnomalyRecord {
  anomaly_id: string;
  anomaly_type: string;
  severity: 'INFO' | 'WARNING' | 'REVIEW_REQUIRED';
  month_affected?: string;
  description: string;
  value_observed?: number;
  expected_range?: string;
}

export interface HealthIndicator {
  indicator_id: string;
  label: string;
  metric_name: string;
  value: number;
  unit: string;
  status: 'HEALTHY' | 'ADEQUATE' | 'STRESSED' | 'CRITICAL';
  explanation: string;
  benchmark?: string;
}

export interface CashFlowMetrics {
  metric_id: string;
  application_id: string;
  // Core averages
  avg_monthly_inflow: number;
  avg_monthly_outflow: number;
  operating_cash_flow: number;
  net_monthly_surplus: number;
  // Obligation analysis
  existing_monthly_emi: number;
  proposed_monthly_emi: number;
  total_monthly_obligations: number;
  surplus_after_obligations: number;
  debt_service_burden_pct: number;
  // Risk ratios
  dscr: number;
  cash_burn_rate: number;
  working_capital_buffer_days: number;
  volatility_index: number;
  seasonality_ratio: number;
  // Trend & analysis
  monthly_trend: MonthlyCashFlow[];
  anomalies: CashFlowAnomalyRecord[];
  health_indicators: HealthIndicator[];
}

export interface HardRuleEvaluation {
  rule_id: string;
  rule_name: string;
  passed: boolean;
  threshold_value: any;
  actual_value: any;
  failure_reason?: string;
  policy_citation: string;
}

export interface RiskAssessment {
  risk_id: string;
  application_id: string;
  all_hard_rules_passed: boolean;
  hard_rules: HardRuleEvaluation[];
  probability_of_default: number;
  risk_score: number;
  risk_band: RiskBand;
  model_version: string;
  calculated_at: string;
}

export interface SHAPFeatureImpact {
  feature_name: string;
  feature_display_name: string;
  feature_value: any;
  shap_value: number;
  direction: "INCREASES_RISK" | "REDUCES_RISK";
  importance_rank: number;
}

export interface SHAPAttribution {
  shap_id: string;
  risk_id: string;
  application_id: string;
  base_value: number;
  model_output: number;
  features: SHAPFeatureImpact[];
}

export interface PolicyCitation {
  clause_id: string;
  title: string;
  excerpt: string;
  relevance_score: number;
}

export interface SHAPFactor {
  feature_name: string;
  feature_display_name: string;
  feature_value: number;
  shap_value: number;
  direction: 'REDUCES_RISK' | 'INCREASES_RISK' | string;
  importance_rank: number;
  impact_type?: string;
}

export interface SHAPFactorsPayload {
  positive_factors: SHAPFactor[];
  negative_factors: SHAPFactor[];
  base_value: number;
  model_output: number;
  all_factors: SHAPFactor[];
}

export interface PolicyReference {
  clause_id: string;
  title: string;
  excerpt: string;
  relevance_score?: number;
  effective_date?: string;
}

export interface EvidenceReference {
  field_name: string;
  value: string;
  source_document?: string;
  confidence?: number;
  document_id?: string;
  page?: number;
}

export interface HardPolicyConstraint {
  rule_id: string;
  rule_name: string;
  passed: boolean;
  threshold?: any;
  actual_value?: any;
  failure_reason?: string;
  policy_citation?: string;
}

export interface DecisionRecord {
  decision_id: string;
  application_id: string;
  outcome: DecisionOutcome;
  approved_amount: number;
  interest_rate: number;
  tenor_months: number;
  confidence_score: number;
  reasoning: string;
  policy_citations: PolicyCitation[];
  evidence_citations: string[];
  decided_by: string;
  decided_at: string;

  // Extended Explainable Decision fields
  summary?: string;
  risk_score?: number;
  risk_band?: string;
  key_reasons?: string[];
  shap_factors?: SHAPFactorsPayload;
  policy_references?: PolicyReference[];
  evidence_references?: EvidenceReference[];
  warnings?: string[];
  missing_evidence?: string[];
  hard_policy_constraints?: HardPolicyConstraint[];
  confidence?: number;
  generatedAt?: string;
  modelVersion?: string;
  explanationVersion?: string;
}

export interface NextBestActionItem {
  action_id: string;
  priority: number;
  title: string;
  description: string;
  action_type: ActionType | string;
  cta_label: string;
  safe_guardrail_status: string;
  safety_confidence: number;
  target_persona?: string;

  // Transparent Ranking & Execution Fields
  recommendedAction?: string;
  reason?: string;
  actor?: string;
  requiredInput?: string;
  estimatedImpact?: string;
  status?: string;
}

export type NextBestAction = NextBestActionItem;

export interface NextBestActionsResponse {
  application_id: string;
  primary_action: NextBestActionItem;
  alternative_actions: NextBestActionItem[];

  recommendedAction?: string;
  reason?: string;
  priority?: number;
  actor?: string;
  requiredInput?: string;
  estimatedImpact?: string;
  status?: string;
}

export interface SafeActionExecutionRequest {
  action_type: string;
  target_stage?: string;
  task_details?: Record<string, any>;
  evidence_type?: string;
  reviewer_role?: string;
  notification_message?: string;
  audit_notes?: string;
  details?: Record<string, any>;
}

export interface SafeActionExecutionResult {
  success: boolean;
  action_type: string;
  application_id: string;
  actor_id: string;
  actor_role: string;
  timestamp: string;
  guardrail_status: string;
  message: string;
  details: Record<string, any>;
  audit_event_id: string;
}

export interface TrustGraphNode {
  id: string;
  label: string;
  node_type: string;
  risk_level: string;
  trust_score: number;
  details?: Record<string, any>;
}

export interface TrustGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
  flagged?: boolean;
  flag_reason?: string;
}

export interface TrustGraph {
  graph_id: string;
  application_id: string;
  nodes: TrustGraphNode[];
  edges: TrustGraphEdge[];
  circular_trading_detected: boolean;
  network_risk_score: number;
  cross_app_duplicate_signals: string[];
}

export interface WhatIfRequest {
  requestedLoanAmount?: number;
  requested_loan_amount?: number;
  loanTenure?: number;
  loan_tenure?: number;
  estimatedInterestRate?: number;
  estimated_interest_rate?: number;
  declaredRevenueAdjustment?: number;
  declared_revenue_adjustment?: number;
  existingObligations?: number;
  existing_obligations?: number;
  revenue_delta_pct?: number;
  tenor_months?: number;
  buffer_days_delta?: number;
  collateral_offered_amount?: number;
}

export interface RiskFeatureChange {
  feature: string;
  label: string;
  baseValue: number;
  simulatedValue: number;
  delta: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  unit: string;
}

export interface BaseApplicationValues {
  requestedLoanAmount: number;
  loanTenure: number;
  estimatedInterestRate: number;
  annualTurnover: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  existingObligations: number;
  estimatedEMI: number;
  monthlySurplus: number;
  obligationRatio: number;
  dscr: number;
  riskScore: number;
  riskBand: string;
}

export interface ModifiedValues {
  requestedLoanAmount: number;
  loanTenure: number;
  estimatedInterestRate: number;
  declaredRevenueAdjustment: number;
  annualTurnover: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  existingObligations: number;
}

export interface CalculatedAffordabilityMetrics {
  estimatedEMI: number;
  baseEMI: number;
  emiDelta: number;
  monthlySurplus: number;
  baseSurplus: number;
  surplusDelta: number;
  obligationRatio: number;
  baseObligationRatio: number;
  obligationRatioDelta: number;
  dscr: number;
  baseDscr: number;
  dscrDelta: number;
  totalPayable: number;
  totalInterest: number;
  cashFlowBurden: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface WhatIfResponse {
  scenarioId: string;
  applicationId: string;
  baseApplicationValues: BaseApplicationValues;
  modifiedValues: ModifiedValues;
  calculatedMetrics: CalculatedAffordabilityMetrics;
  estimatedEMI: number;
  cashFlowBurden: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskFeatureChanges: RiskFeatureChange[];
  riskScore: number;
  riskBand: RiskBand;
  explanation: string;
  disclaimer: string;
  createdAt: string;

  // Legacy fields
  original_dscr: number;
  simulated_dscr: number;
  original_risk_score: number;
  simulated_risk_score: number;
  original_risk_band: RiskBand;
  simulated_risk_band: RiskBand;
  original_approved_amount: number;
  simulated_approved_amount: number;
  original_interest_rate: number;
  simulated_interest_rate: number;
  outcome: DecisionOutcome;
  insights: string[];
}

export interface WhatIfHistoryResponse {
  journeyId: string;
  applicationId: string;
  scenarios: WhatIfResponse[];
  latest?: WhatIfResponse;
  count: number;
}

export interface JourneyFrictionMetrics {
  journey_id: string;
  total_time_seconds: number;
  friction_score: number;
  bottleneck_stage?: JourneyStage;
  resubmissions_count: number;
  warnings: string[];
}

export interface QueueItem {
  journey_id: string;
  application_id: string;
  business_name: string;
  requested_amount: number;
  current_stage: string;
  status: string;
  decision_outcome: string;
  approved_amount?: number;
  trust_score?: number;
  risk_band?: string;
  is_consistent: boolean;
  discrepancy_count: number;
  created_at: string;
}

export interface NormalizedIntent {
  product_type: string;
  requested_amount: number;
  purpose: string;
  business_type: string;
  business_vintage: string;
  business_vintage_months: number;
  declared_revenue: number;
  declared_revenue_annual: number;
  existing_obligations: number;
  existing_obligations_monthly: number;
  intent_summary: string;
  confidence_score: number;
  parser_used: string;
  missing_evidence_requirements: string[];
}

export interface NextActionInfo {
  action_id: string;
  action_type: string;
  title: string;
  description: string;
  cta_label: string;
  target_stage?: string | null;
  safe_guardrail_status?: string;
  safety_confidence?: number;
}

export interface IntentSubmitResponse {
  journey_id: string;
  application_id: string;
  current_stage: string;
  status: string;
  next_action: NextActionInfo;
  created_at: string;
  business_name: string;
  requested_amount: number;
  message: string;
  missing_evidence_requirements: string[];
  raw_customer_intent?: {
    natural_text: string;
    answers: Record<string, any>;
  };
  normalized_structured_intent?: NormalizedIntent;
}
