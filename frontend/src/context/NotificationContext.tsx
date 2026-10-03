import React, { createContext, useContext, useState, useEffect } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  journeyId?: string;
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
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Sanction Letter Ready',
    message: 'Sharma Textiles facility of ₹15,00,000 has been APPROVED with 11.5% interest rate.',
    timestamp: '2 mins ago',
    type: 'SUCCESS',
    read: false,
    journeyId: 'jrn_priya_001',
  },
  {
    id: 'notif_2',
    title: 'Adverse Network Signal Flagged',
    message: 'Apex Logistics: Circular funds routing detected with related entity Apex Intermediaries LLP.',
    timestamp: '14 mins ago',
    type: 'ALERT',
    read: false,
    journeyId: 'jrn_apex_003',
  },
  {
    id: 'notif_3',
    title: 'GST-Bank Reconciliation Complete',
    message: 'Kavita Electronics: 98.4% revenue consistency across GSTR-3B filings and bank deposits.',
    timestamp: '35 mins ago',
    type: 'INFO',
    read: true,
    journeyId: 'jrn_kavita_002',
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

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
