"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bell, X, ExternalLink } from "lucide-react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

const TYPE_STYLES: Record<string, string> = {
  credential_expiry: "border-l-amber-500 bg-amber-500/10",
  verification_complete: "border-l-green-500 bg-green-500/10",
  sharing_request: "border-l-blue-500 bg-blue-500/10",
  system_update: "border-l-purple-500 bg-purple-500/10",
};

const TYPE_LABELS: Record<string, string> = {
  credential_expiry: "Credential expiry alert",
  verification_complete: "Verification complete",
  sharing_request: "Sharing request",
  system_update: "System update",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationItem({
  notification,
  onRead,
  onClear,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const { announceToScreenReader } = useAccessibility();

  const handleRead = useCallback(() => {
    onRead(notification.id);
    announceToScreenReader(`Opened notification: ${notification.title}`);
  }, [notification, onRead, announceToScreenReader]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear(notification.id);
      announceToScreenReader(`Dismissed notification: ${notification.title}`);
    },
    [notification, onClear, announceToScreenReader]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRead();
      }
    },
    [handleRead]
  );

  return (
    <div
      className={`p-3 border-l-2 rounded-r transition-colors cursor-pointer hover:bg-white/5 ${
        notification.read ? "opacity-60" : ""
      } ${TYPE_STYLES[notification.type] || "border-l-gray-500 bg-gray-500/10"}`}
      onClick={handleRead}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`${TYPE_LABELS[notification.type] || "Notification"}: ${notification.title}`}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{notification.title}</p>
          <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-[10px] text-white/40 mt-1">
            {formatTime(notification.timestamp)}
          </p>
        </div>
        <button
          onClick={handleClear}
          className="shrink-0 p-0.5 text-white/30 hover:text-white/70 transition-colors"
          aria-label={`Dismiss notification: ${notification.title}`}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearNotification } =
    useNotifications();
  const { announceToScreenReader } = useAccessibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
        announceToScreenReader("Notifications panel closed");
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, announceToScreenReader]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const newState = !prev;
      announceToScreenReader(newState ? "Notifications panel opened" : "Notifications panel closed");
      return newState;
    });
  }, [announceToScreenReader]);

  const recent = notifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? "notifications-panel" : undefined}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full px-1"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
          role="dialog"
          aria-label="Notifications"
          aria-modal="false"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 id="notifications-heading" className="text-sm font-semibold text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    markAllRead();
                    announceToScreenReader("All notifications marked as read");
                  }}
                  className="text-[11px] text-green-400 hover:text-green-300 transition-colors"
                  aria-label="Mark all notifications as read"
                >
                  Mark all read
                </button>
              )}
              <a
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
                aria-label="View all notifications"
              >
                View all <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div
            className="overflow-y-auto max-h-72"
            role="list"
            aria-labelledby="notifications-heading"
          >
            {recent.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm" role="status">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
                <p>No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => (
                <div key={n.id} role="listitem">
                  <NotificationItem
                    notification={n}
                    onRead={markAsRead}
                    onClear={clearNotification}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
