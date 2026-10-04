import { UserRole } from '../types';

export interface NavItemConfig {
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  requiredPermission?: string;
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

/**
 * Enterprise FinFlow Role Permissions Matrix (Part 25)
 * Defines capabilities and access bounds per institutional role.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  CUSTOMER: [
    'view:own_journey',
    'view:own_documents',
    'upload:own_documents',
    'view:own_decision',
    'view:own_cashflow',
    'simulate:what_if',
    'apply:loan',
  ],
  RM: [
    'view:assigned_queue',
    'view:assigned_cases',
    'intake:case',
    'request:documents',
    'add:case_note',
    'escalate:to_risk',
    'escalate:to_supervisor',
    'reconcile:evidence',
    'view:timeline',
  ],
  RM_SUPERVISOR: [
    'view:team_overview',
    'view:rm_workload',
    'view:active_cases',
    'view:sla_breaches',
    'reassign:cases',
    'approve:operational_exceptions',
    'escalate:to_risk_manager',
    'inspect:case_notes',
    'view:timeline',
  ],
  RISK_OFFICER: [
    'view:risk_dashboard',
    'view:risk_queue',
    'view:high_risk_cases',
    'view:inconsistencies',
    'view:fraud_signals',
    'review:evidence',
    'view:trust_graph',
    'view:cashflow_intelligence',
    'view:shap_explanation',
    'review:policy',
    'recommend:override',
    'execute:fast_track_sanction_tier1', // ≤ ₹25 Lakhs
    'challenge:case',
    'add:compliance_note',
    'flag:inconsistency',
    'view:decision_replay',
  ],
  RISK_MANAGER: [
    'view:senior_risk_dashboard',
    'view:escalated_cases',
    'view:high_risk_portfolio',
    'view:exceptions',
    'supervise:risk_reviews',
    'review:model_policy_consistency',
    'approve:tier2_sanction', // ≤ ₹1 Crore
    'review:overrides',
    'assess:decision_quality',
    'view:decision_replay',
    'view:audit_summary',
  ],
  CREDIT_APPROVER: [
    'view:approval_dashboard',
    'view:pending_decisions',
    'view:exception_cases',
    'view:high_value_cases',
    'view:credit_packages',
    'sanction:tier3_unlimited', // > ₹1 Crore
    'reject:loan',
    'return:for_information',
    'escalate:committee',
    'view:decision_history',
    'view:decision_replay',
  ],
  AUDIT_OFFICER: [
    'read:all_cases',
    'read:evidence_provenance',
    'read:decision_history',
    'read:human_reviews',
    'read:overrides',
    'read:model_versions',
    'read:policy_versions',
    'write:audit_findings',
    'write:audit_comments',
    'update:audit_status',
    'view:decision_replay',
    'view:audit_log',
  ],
  SYS_ADMIN: [
    'manage:users',
    'manage:roles',
    'view:system_health',
    'view:api_health',
    'view:auth_status',
    'manage:configuration',
    'view:integration_status',
    'view:system_logs',
    'control:demo_hub',
  ],
  ADMIN: [
    'manage:users',
    'manage:roles',
    'view:system_health',
    'view:api_health',
    'view:auth_status',
    'manage:configuration',
    'view:integration_status',
    'view:system_logs',
    'control:demo_hub',
  ],
};

/**
 * Check if a role possesses a specific permission.
 */
export const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Enterprise RBAC Navigation Generator
 * Enforces strict separation of duties and prevents any cross-role navigation leakage.
 */
export const getRoleNavigation = (
  role: UserRole,
  activeJourneyId: string
): NavSectionConfig[] => {
  switch (role) {
    case 'CUSTOMER':
      return [
        {
          title: 'SME Working Capital Journey',
          items: [
            { label: 'Customer Portal', path: '/customer', iconName: 'Home', requiredPermission: 'view:own_journey' },
            { label: 'MSME Profile & Vault', path: '/customer/profile', iconName: 'Building2', requiredPermission: 'view:own_documents' },
            { label: 'Apply for Working Capital', path: '/customer/apply', iconName: 'FilePlus', requiredPermission: 'apply:loan' },
            { label: 'Live Journey State', path: activeJourneyId ? `/customer/journey/${activeJourneyId}` : '/customer', iconName: 'GitCommit', requiredPermission: 'view:own_journey' },
            { label: 'Documents & Verification', path: activeJourneyId ? `/customer/documents/${activeJourneyId}` : '/customer/profile?tab=vault', iconName: 'FileText', requiredPermission: 'view:own_documents' },
            { label: 'Cash Flow Intelligence', path: activeJourneyId ? `/customer/cashflow/${activeJourneyId}` : '/customer', iconName: 'TrendingUp', requiredPermission: 'view:own_cashflow' },
            { label: 'What-If Simulator', path: activeJourneyId ? `/customer/what-if/${activeJourneyId}` : '/customer', iconName: 'Sparkles', requiredPermission: 'simulate:what_if' },
            { label: 'Explainable Decision', path: activeJourneyId ? `/customer/decision/${activeJourneyId}` : '/customer', iconName: 'Award', requiredPermission: 'view:own_decision' },
          ],
        },
      ];

    case 'RM':
      return [
        {
          title: 'RM Workspace',
          items: [
            { label: 'Dashboard', path: '/rm', iconName: 'LayoutDashboard', requiredPermission: 'view:assigned_queue' },
            { label: 'Underwriting Queue', path: '/rm?tab=underwriting_queue', iconName: 'Users', requiredPermission: 'view:assigned_queue' },
            { label: 'Assigned Applications', path: '/rm?tab=assigned_applications', iconName: 'CheckCircle2', requiredPermission: 'view:assigned_cases' },
            { label: 'Pending Verification', path: '/rm?tab=pending_verification', iconName: 'Clock', requiredPermission: 'view:assigned_cases' },
            { label: 'Needs Review', path: '/rm?tab=needs_review', iconName: 'AlertTriangle', requiredPermission: 'view:assigned_cases' },
            { label: 'Case Reconciliation', path: '/rm?tab=case_reconciliation', iconName: 'ShieldCheck', requiredPermission: 'reconcile:evidence' },
            { label: 'Customer Follow-up', path: '/rm?tab=customer_followup', iconName: 'MessageSquare', requiredPermission: 'request:documents' },
            { label: 'Escalations', path: '/rm?tab=escalations', iconName: 'Send', requiredPermission: 'escalate:to_risk' },
            { label: 'Performance / SLA', path: '/rm?tab=performance_sla', iconName: 'TrendingUp', requiredPermission: 'view:assigned_queue' },
            { label: 'Active Case Workspace', path: `/rm/cases/${activeJourneyId}`, iconName: 'FileSpreadsheet', requiredPermission: 'view:assigned_cases' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:timeline' },
          ],
        },
      ];

    case 'RM_SUPERVISOR':
      return [
        {
          title: 'RM Supervisor Command',
          items: [
            { label: 'Team Overview', path: '/rm-supervisor?tab=team_overview', iconName: 'Building2', requiredPermission: 'view:team_overview' },
            { label: 'RM Workload', path: '/rm-supervisor?tab=rm_workload', iconName: 'Users', requiredPermission: 'view:rm_workload' },
            { label: 'Active Cases', path: '/rm-supervisor?tab=active_cases', iconName: 'Activity', requiredPermission: 'view:active_cases' },
            { label: 'SLA Breaches', path: '/rm-supervisor?tab=sla_breaches', iconName: 'Clock', requiredPermission: 'view:sla_breaches' },
            { label: 'Escalations', path: '/rm-supervisor?tab=escalations', iconName: 'AlertTriangle', requiredPermission: 'escalate:to_risk_manager' },
            { label: 'Reassignment Desk', path: '/rm-supervisor?tab=reassignment', iconName: 'ArrowRightLeft', requiredPermission: 'reassign:cases' },
            { label: 'Customer Follow-up', path: '/rm-supervisor?tab=customer_followup', iconName: 'PhoneCall', requiredPermission: 'inspect:case_notes' },
            { label: 'Override Patterns', path: '/rm-supervisor?tab=override_patterns', iconName: 'Layers', requiredPermission: 'view:team_overview' },
            { label: 'Operational Exceptions', path: '/rm-supervisor?tab=exceptions', iconName: 'ShieldAlert', requiredPermission: 'approve:operational_exceptions' },
            { label: 'Team Activity Feed', path: '/rm-supervisor?tab=team_activity', iconName: 'Compass', requiredPermission: 'view:team_overview' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:timeline' },
          ],
        },
      ];

    case 'RISK_OFFICER':
      return [
        {
          title: 'Risk & Compliance Workspace',
          items: [
            { label: 'Risk Dashboard', path: '/risk', iconName: 'ShieldAlert', requiredPermission: 'view:risk_dashboard' },
            { label: 'Review Queue', path: '/risk?tab=review_queue', iconName: 'ListFilter', requiredPermission: 'view:risk_queue' },
            { label: 'High-Risk Cases', path: '/risk?tab=high_risk', iconName: 'AlertOctagon', requiredPermission: 'view:high_risk_cases' },
            { label: 'Inconsistencies', path: '/risk?tab=inconsistencies', iconName: 'AlertTriangle', requiredPermission: 'view:inconsistencies' },
            { label: 'Potential Linked Cases', path: '/risk?tab=fraud_signals', iconName: 'Network', requiredPermission: 'view:fraud_signals' },
            { label: 'Evidence Review', path: '/risk?tab=evidence_review', iconName: 'FileCheck', requiredPermission: 'review:evidence' },
            { label: 'Trust Graph Visualizer', path: '/risk?tab=trust_graph', iconName: 'Share2', requiredPermission: 'view:trust_graph' },
            { label: 'Cash-Flow Intelligence', path: '/risk?tab=cashflow', iconName: 'TrendingUp', requiredPermission: 'view:cashflow_intelligence' },
            { label: 'Model Explanation (SHAP)', path: '/risk?tab=model_explanation', iconName: 'Cpu', requiredPermission: 'view:shap_explanation' },
            { label: 'Policy Review & Norms', path: '/risk?tab=policy_review', iconName: 'BookOpen', requiredPermission: 'review:policy' },
            { label: 'Underwriter Overrides', path: '/risk?tab=overrides', iconName: 'Scale', requiredPermission: 'recommend:override' },
            { label: 'Audit Events Ledger', path: '/risk?tab=audit_events', iconName: 'History', requiredPermission: 'view:decision_replay' },
            { label: 'Structured Case Review', path: `/risk/cases/${activeJourneyId}`, iconName: 'FileCheck2', requiredPermission: 'challenge:case' },
            { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:decision_replay' },
          ],
        },
      ];

    case 'RISK_MANAGER':
      return [
        {
          title: 'Supervisory Risk Desk',
          items: [
            { label: 'Senior Risk Dashboard', path: '/risk-manager', iconName: 'Scale', requiredPermission: 'view:senior_risk_dashboard' },
            { label: 'Escalated Cases', path: '/risk-manager?tab=escalated_cases', iconName: 'AlertOctagon', requiredPermission: 'view:escalated_cases' },
            { label: 'High-Risk Portfolio', path: '/risk-manager?tab=high_risk_cases', iconName: 'ShieldAlert', requiredPermission: 'view:high_risk_portfolio' },
            { label: 'Risk Exceptions', path: '/risk-manager?tab=exceptions', iconName: 'AlertTriangle', requiredPermission: 'view:exceptions' },
            { label: 'Risk Officer Reviews', path: '/risk-manager?tab=officer_reviews', iconName: 'Users', requiredPermission: 'supervise:risk_reviews' },
            { label: 'Model / Policy Consistency', path: '/risk-manager?tab=consistency', iconName: 'Compass', requiredPermission: 'review:model_policy_consistency' },
            { label: 'Override Review & Sanction', path: '/risk-manager?tab=override_review', iconName: 'Gavel', requiredPermission: 'approve:tier2_sanction' },
            { label: 'Decision Quality Metrics', path: '/risk-manager?tab=decision_quality', iconName: 'CheckCircle2', requiredPermission: 'assess:decision_quality' },
            { label: 'Audit Summary', path: '/risk-manager?tab=audit_summary', iconName: 'ClipboardCheck', requiredPermission: 'view:audit_summary' },
            { label: 'Supervisory Case Review', path: `/risk/cases/${activeJourneyId}`, iconName: 'Compass', requiredPermission: 'supervise:risk_reviews' },
            { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:decision_replay' },
          ],
        },
      ];

    case 'CREDIT_APPROVER':
      return [
        {
          title: 'Credit Sanction Committee',
          items: [
            { label: 'Approval Dashboard', path: '/credit-approval', iconName: 'Award', requiredPermission: 'view:approval_dashboard' },
            { label: 'Pending Decisions', path: '/credit-approval?tab=pending_decisions', iconName: 'Clock', requiredPermission: 'view:pending_decisions' },
            { label: 'Exception Cases', path: '/credit-approval?tab=exception_cases', iconName: 'AlertTriangle', requiredPermission: 'view:exception_cases' },
            { label: 'High-Value Cases (>₹1Cr)', path: '/credit-approval?tab=high_value_cases', iconName: 'Building2', requiredPermission: 'view:high_value_cases' },
            { label: 'Credit Packages', path: '/credit-approval?tab=credit_packages', iconName: 'FolderCheck', requiredPermission: 'view:credit_packages' },
            { label: 'Decision History', path: '/credit-approval?tab=decision_history', iconName: 'History', requiredPermission: 'view:decision_history' },
            { label: 'Committee Case Chamber', path: `/risk/cases/${activeJourneyId}`, iconName: 'Gavel', requiredPermission: 'sanction:tier3_unlimited' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:decision_replay' },
          ],
        },
      ];

    case 'AUDIT_OFFICER':
      return [
        {
          title: 'Third-Line Audit & Governance',
          items: [
            { label: 'Audit Dashboard', path: '/audit', iconName: 'ClipboardCheck', requiredPermission: 'read:all_cases' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw', requiredPermission: 'view:decision_replay' },
            { label: 'Audit Log Ledger', path: '/audit?tab=audit_log', iconName: 'History', requiredPermission: 'view:audit_log' },
            { label: 'Overrides Ledger', path: '/audit?tab=overrides', iconName: 'Scale', requiredPermission: 'read:overrides' },
            { label: 'Role Activity Monitor', path: '/audit?tab=role_activity', iconName: 'Users', requiredPermission: 'read:all_cases' },
            { label: 'Evidence Provenance', path: '/audit?tab=evidence_provenance', iconName: 'ShieldCheck', requiredPermission: 'read:evidence_provenance' },
            { label: 'Policy Version History', path: '/audit?tab=policy_history', iconName: 'BookOpen', requiredPermission: 'read:policy_versions' },
            { label: 'Model Version History', path: '/audit?tab=model_history', iconName: 'Cpu', requiredPermission: 'read:model_versions' },
            { label: 'Review Findings & Inquiry', path: '/audit?tab=review_findings', iconName: 'FileSpreadsheet', requiredPermission: 'write:audit_findings' },
            { label: 'Suspicious Activity Patterns', path: '/audit?tab=suspicious_patterns', iconName: 'Network', requiredPermission: 'read:all_cases' },
          ],
        },
      ];

    case 'SYS_ADMIN':
    case 'ADMIN':
      return [
        {
          title: 'Technical Infrastructure Custodian',
          items: [
            { label: 'User Management', path: '/admin?tab=users', iconName: 'Users', requiredPermission: 'manage:users' },
            { label: 'Role Management', path: '/admin?tab=roles', iconName: 'Shield', requiredPermission: 'manage:roles' },
            { label: 'System Health', path: '/admin?tab=system_health', iconName: 'Activity', requiredPermission: 'view:system_health' },
            { label: 'API Health', path: '/admin?tab=api_health', iconName: 'Server', requiredPermission: 'view:api_health' },
            { label: 'Firebase / Auth Status', path: '/admin?tab=auth_status', iconName: 'Lock', requiredPermission: 'view:auth_status' },
            { label: 'Configuration Matrix', path: '/admin?tab=config', iconName: 'Settings', requiredPermission: 'manage:configuration' },
            { label: 'Integration Status', path: '/admin?tab=integrations', iconName: 'Layers', requiredPermission: 'view:integration_status' },
            { label: 'System Logs', path: '/admin?tab=logs', iconName: 'Terminal', requiredPermission: 'view:system_logs' },
            { label: 'Demo Hub Controls', path: '/demo', iconName: 'Sparkles', requiredPermission: 'control:demo_hub' },
          ],
        },
      ];

    default:
      return [
        {
          title: 'SME Portal',
          items: [
            { label: 'Customer Portal', path: '/customer', iconName: 'Home', requiredPermission: 'view:own_journey' },
            { label: 'Apply for Working Capital', path: '/customer/apply', iconName: 'FilePlus', requiredPermission: 'apply:loan' },
          ],
        },
      ];
  }
};
