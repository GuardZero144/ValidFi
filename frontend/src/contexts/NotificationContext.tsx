"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type NotificationType = "credential_expiry" | "verification_complete" | "sharing_request" | "system_update";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  emailAddress: string;
  notifyExpiry: boolean;
  notifyVerification: boolean;
  notifySharing: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  clearNotification: (id: string) => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  requestPushPermission: () => Promise<boolean>;
  allNotifications: AppNotification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "validfi_notifications";
const PREFS_KEY = "validfi_notification_prefs";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  push: false,
  email: false,
  emailAddress: "",
  notifyExpiry: true,
  notifyVerification: true,
  notifySharing: true,
};

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setNotifications(JSON.parse(stored));
      const storedPrefs = localStorage.getItem(PREFS_KEY);
      if (storedPrefs) setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) });
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback(
    (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const newNotif: AppNotification = {
        ...notif,
        id: generateId(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 100));
      return newNotif;
    },
    []
  );

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      updatePreferences({ push: true });
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      return true;
    }
    return false;
  }, [updatePreferences]);

  const allNotifications = notifications;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        markAsRead,
        markAllRead,
        addNotification,
        clearNotification,
        updatePreferences,
        requestPushPermission,
        allNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
