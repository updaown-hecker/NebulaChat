
"use client";

import type { Notification } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  fetchUserNotifications,
  markNotificationAsRead as markNotificationAsReadFlow,
  markAllNotificationsAsRead as markAllNotificationsAsReadFlow,
} from '@/ai/flows/notification-flow';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_POLLING_INTERVAL = 15000; // Poll every 15 seconds

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchUserNotifications({ userId: user.id });
      const sortedNotifications = response.notifications.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(loadNotifications, NOTIFICATION_POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [user, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const response = await markNotificationAsReadFlow({ notificationId, userId: user.id });
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
        toast({ title: "Notification Updated", description: "Marked as read." });
      } else {
        toast({ title: "Error", description: response.message || "Failed to mark notification as read.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({ title: "Error", description: "Could not update notification status.", variant: "destructive" });
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const response = await markAllNotificationsAsReadFlow({ userId: user.id });
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({ title: "Notifications Updated", description: "All marked as read." });
      } else {
        toast({ title: "Error", description: response.message || "Failed to mark all notifications as read.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({ title: "Error", description: "Could not update all notification statuses.", variant: "destructive" });
    }
  };
  
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
