/**
 * FinFlow AI — Role-Aware Notification Context (Part 47)
 *
 * - Notifications are role-specific — a CUSTOMER never sees internal audit events
 * - Polls backend audit trail for the active journey and maps events to role-relevant notifications
 * - Does NOT generate random fake notifications
 * - Falls back to empty state gracefully when backend is unavailable
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserRole } from '../types';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  journeyId?: string;
  category?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Maps backend audit event types to role-relevant notifications
// Returns null if this event is not relevant for the given role
function mapAuditEventToNotification(
  event: any,
  role: UserRole,
  journeyId: string,
  existingIds: Set<string>
): NotificationItem | null {
  const eventType: string = (event.event_type || event.event || '').toUpperCase();
  const actor = event.actor || event.performed_by || '';
  const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently';
  const id = `audit_${journeyId}_${event.event_id || event.id || eventType + '_' + timestamp}`;

  if (existingIds.has(id)) return null;

  // Role-specific event filtering (Part 47)
  switch (role) {
    case 'CUSTOMER':
      if (eventType.includes('DECISION') || eventType.includes('APPROVED') || eventType.includes('DECLINED')) {
        return { id, title: 'Decision Update', message: 'Your application decision has been updated. View your dashboard for details.', timestamp, type: 'INFO', read: false, journeyId, category: 'Decision' };
      }
      if (eventType.includes('DOCUMENT') && eventType.includes('REQUEST')) {
        return { id, title: 'Document Required', message: 'Additional documents have been requested for your application.', timestamp, type: 'WARNING', read: false, journeyId, category: 'Documents' };
      }
      if (eventType.includes('NEXT_ACTION') || eventType.includes('ACTION_REQUIRED')) {
        return { id, title: 'Action Required', message: 'Your loan officer has a next step ready. Check your journey tracker.', timestamp, type: 'INFO', read: false, journeyId, category: 'Journey' };
      }
      return null;

    case 'RM':
      if (eventType.includes('ASSIGNMENT') || eventType.includes('ASSIGNED')) {
        return { id, title: 'New Case Assignment', message: `Case ${journeyId} has been assigned to you for underwriting.`, timestamp, type: 'INFO', read: false, journeyId, category: 'Assignment' };
      }
      if (eventType.includes('EVIDENCE') && eventType.includes('MISSING')) {
        return { id, title: 'Missing Evidence', message: `Evidence gaps detected in case ${journeyId}. Customer follow-up required.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Evidence' };
      }
      if (eventType.includes('REVIEW') || eventType.includes('ESCALAT')) {
        return { id, title: 'Review Required', message: `Case ${journeyId} has been flagged for RM review by Risk.`, timestamp, type: 'ALERT', read: false, journeyId, category: 'Review' };
      }
      if (eventType.includes('SLA') || eventType.includes('OVERDUE')) {
        return { id, title: 'SLA Warning', message: `Case ${journeyId} is approaching SLA breach. Immediate action needed.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'SLA' };
      }
      return null;

    case 'RM_SUPERVISOR':
      if (eventType.includes('SLA') || eventType.includes('OVERDUE')) {
        return { id, title: 'SLA Breach Alert', message: `SLA breach detected for ${journeyId}. Intervention may be required.`, timestamp, type: 'ALERT', read: false, journeyId, category: 'Operations' };
      }
      if (eventType.includes('ESCALAT')) {
        return { id, title: 'Escalation Received', message: `Case ${journeyId} has been escalated to operations supervisor.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Escalation' };
      }
      return null;

    case 'RISK_OFFICER':
      if (eventType.includes('HIGH_RISK') || eventType.includes('FRAUD')) {
        return { id, title: 'High-Risk Signal', message: `Fraud or high-risk pattern detected in case ${journeyId}. Immediate review required.`, timestamp, type: 'ALERT', read: false, journeyId, category: 'Risk' };
      }
      if (eventType.includes('INCONSISTENCY') || eventType.includes('DISCREPANCY')) {
        return { id, title: 'Data Inconsistency Flagged', message: `Evidence inconsistency detected in ${journeyId}. Manual verification required.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Evidence' };
      }
      if (eventType.includes('LINKED') || eventType.includes('NETWORK')) {
        return { id, title: 'Potential Linked Application', message: `Suspicious network linkage identified for ${journeyId}. Trust graph updated.`, timestamp, type: 'ALERT', read: false, journeyId, category: 'Fraud' };
      }
      if (eventType.includes('REVIEW_REQUEST') || eventType.includes('HUMAN_REVIEW')) {
        return { id, title: 'Review Requested', message: `Human review requested for case ${journeyId}.`, timestamp, type: 'INFO', read: false, journeyId, category: 'Review' };
      }
      return null;

    case 'RISK_MANAGER':
      if (eventType.includes('ESCALAT') && eventType.includes('RISK')) {
        return { id, title: 'High-Risk Escalation', message: `Case ${journeyId} escalated to Senior Risk Governance desk.`, timestamp, type: 'ALERT', read: false, journeyId, category: 'Escalation' };
      }
      if (eventType.includes('EXCEPTION') || eventType.includes('POLICY_DEVIATION')) {
        return { id, title: 'Policy Exception', message: `Underwriting exception recorded for ${journeyId}. Supervisory sign-off required.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Exception' };
      }
      if (eventType.includes('OVERRIDE')) {
        return { id, title: 'Override Requires Ratification', message: `Human override executed on ${journeyId}. Manager review required.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Override' };
      }
      return null;

    case 'CREDIT_APPROVER':
      if (eventType.includes('PENDING') || eventType.includes('AWAITING_APPROVAL') || eventType.includes('ESCALAT')) {
        return { id, title: 'Decision Awaiting Approval', message: `Case ${journeyId} has been submitted to the Credit Sanction Committee for final sanction.`, timestamp, type: 'INFO', read: false, journeyId, category: 'Approval' };
      }
      return null;

    case 'AUDIT_OFFICER':
      if (eventType.includes('FINDING') || eventType.includes('AUDIT')) {
        return { id, title: 'Audit Finding', message: `New audit finding logged for ${journeyId}. Review required.`, timestamp, type: 'INFO', read: false, journeyId, category: 'Audit' };
      }
      if (eventType.includes('OVERRIDE')) {
        return { id, title: 'Override Pattern Detected', message: `Override activity recorded for ${journeyId}. Included in governance review queue.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Override' };
      }
      if (eventType.includes('GOVERNANCE') || eventType.includes('REVIEW')) {
        return { id, title: 'Governance Review Required', message: `Case ${journeyId} has been flagged for independent governance review.`, timestamp, type: 'WARNING', read: false, journeyId, category: 'Governance' };
      }
      return null;

    default:
      return null;
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Role and journeyId are loaded from localStorage to avoid circular context imports
  const getRole = (): UserRole =>
    (localStorage.getItem('finflow_role') as UserRole) || 'CUSTOMER';
  const getJourneyId = (): string =>
    localStorage.getItem('finflow_journey') || 'jrn_priya_001';

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const id = `notif_${Date.now()}`;
    if (seenIdsRef.current.has(id)) return;
    seenIdsRef.current.add(id);
    setNotifications((prev) => [{
      ...item,
      id,
      timestamp: 'Just now',
      read: false,
    }, ...prev]);
  };

  const fetchBackendNotifications = useCallback(async () => {
    const role = getRole();
    const journeyId = getJourneyId();
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
    const token = localStorage.getItem('finflow_token') || `demo-${role.toLowerCase()}`;

    try {
      const response = await fetch(`${baseUrl}/journeys/${journeyId}/audit`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return;

      const events: any[] = await response.json();
      if (!Array.isArray(events) || events.length === 0) return;

      const newNotifications: NotificationItem[] = [];
      for (const event of events.slice(0, 15)) {
        const notif = mapAuditEventToNotification(event, role, journeyId, seenIdsRef.current);
        if (notif) {
          seenIdsRef.current.add(notif.id);
          newNotifications.push(notif);
        }
      }

      if (newNotifications.length > 0) {
        setNotifications((prev) => {
          const combined = [...newNotifications, ...prev];
          // Deduplicate by id, keep max 20
          const seen = new Set<string>();
          return combined.filter((n) => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          }).slice(0, 20);
        });
      }
    } catch {
      // Network unavailable — silent fail, no fake data injected
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchBackendNotifications();
  }, [fetchBackendNotifications]);

  // Initial fetch on mount, then poll every 90 seconds
  useEffect(() => {
    fetchBackendNotifications();
    const interval = setInterval(fetchBackendNotifications, 90_000);
    return () => clearInterval(interval);
  }, [fetchBackendNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
