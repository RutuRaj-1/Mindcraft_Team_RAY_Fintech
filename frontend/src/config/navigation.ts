import { UserRole } from '../types';

export interface NavItemConfig {
  label: string;
  path: string;
  iconName: string;
  badge?: string;
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

/**
 * Enterprise RBAC Navigation Configuration
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
            { label: 'Customer Portal', path: '/customer', iconName: 'Home' },
            { label: 'Apply for Working Capital', path: '/customer/apply', iconName: 'FilePlus' },
            { label: 'Live Journey State', path: `/customer/journey/${activeJourneyId}`, iconName: 'GitCommit' },
            { label: 'Documents & Verification', path: `/customer/documents/${activeJourneyId}`, iconName: 'FileText' },
            { label: 'Cash Flow Intelligence', path: `/customer/cashflow/${activeJourneyId}`, iconName: 'TrendingUp' },
            { label: 'What-If Simulator', path: `/customer/what-if/${activeJourneyId}`, iconName: 'Sparkles' },
            { label: 'Explainable Decision', path: `/customer/decision/${activeJourneyId}`, iconName: 'Award' },
          ],
        },
      ];

    case 'RM':
      return [
        {
          title: 'First-Line RM Desk',
          items: [
            { label: 'RM Pipeline Queue', path: '/rm', iconName: 'Users' },
            { label: 'Case Intake & Assist', path: `/rm/cases/${activeJourneyId}`, iconName: 'CheckCircle2' },
            { label: 'Audit Timeline', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
          ],
        },
      ];

    case 'RM_SUPERVISOR':
      return [
        {
          title: 'Operations Management',
          items: [
            { label: 'Operations Command', path: '/operations', iconName: 'Building2' },
            { label: 'RM Underwriting Queue', path: '/rm', iconName: 'Users' },
            { label: 'Case SLA & Escalation', path: `/rm/cases/${activeJourneyId}`, iconName: 'CheckCircle2' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
          ],
        },
      ];

    case 'RISK_OFFICER':
      return [
        {
          title: 'Second-Line Risk Desk',
          items: [
            { label: 'Risk & Fraud Intelligence', path: '/risk', iconName: 'ShieldAlert' },
            { label: 'Case Review & Challenge', path: `/risk/cases/${activeJourneyId}`, iconName: 'Compass' },
            { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
          ],
        },
      ];

    case 'RISK_MANAGER':
      return [
        {
          title: 'Supervisory Risk Desk',
          items: [
            { label: 'Senior Risk Desk (≤₹1Cr)', path: '/risk-manager', iconName: 'Scale' },
            { label: 'Risk & Fraud Intelligence', path: '/risk', iconName: 'ShieldAlert' },
            { label: 'Supervisory Review', path: `/risk/cases/${activeJourneyId}`, iconName: 'Compass' },
            { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
          ],
        },
      ];

    case 'CREDIT_APPROVER':
      return [
        {
          title: 'Credit Sanction Committee',
          items: [
            { label: 'Credit Sanction Chamber', path: '/approvals', iconName: 'Award' },
            { label: 'Executive Case Review', path: `/risk/cases/${activeJourneyId}`, iconName: 'Compass' },
            { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
          ],
        },
      ];

    case 'AUDIT_OFFICER':
      return [
        {
          title: 'Third-Line Audit & Governance',
          items: [
            { label: 'Audit & Governance Console', path: '/audit', iconName: 'ClipboardCheck' },
            { label: 'Cross-Portfolio Replay', path: `/risk/replay/${activeJourneyId}`, iconName: 'RotateCcw' },
            { label: 'Independent Case Review', path: `/risk/cases/${activeJourneyId}`, iconName: 'Compass' },
          ],
        },
      ];

    case 'SYS_ADMIN':
    case 'ADMIN':
      return [
        {
          title: 'Technical Administration',
          items: [
            { label: 'System Observability', path: '/admin', iconName: 'Cpu' },
            { label: 'Hackathon Benchmarks', path: '/demo', iconName: 'Sparkles' },
          ],
        },
      ];

    default:
      return [
        {
          title: 'SME Journey',
          items: [
            { label: 'Customer Portal', path: '/customer', iconName: 'Home' },
            { label: 'Apply for Working Capital', path: '/customer/apply', iconName: 'FilePlus' },
          ],
        },
      ];
  }
};
