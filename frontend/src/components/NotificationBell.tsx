"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, X, ExternalLink } from "lucide-react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";

const TYPE_STYLES: Record<string, string> = {
  credential_expiry: "border-l-amber-500 bg-amber-500/10",
  verification_complete: "border-l-green-500 bg-green-500/10",
  sharing_request: "border-l-blue-500 bg-blue-500/10",
  system_update: "border-l-purple-500 bg-purple-500/10",
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
  return (
    <div
      className={`p-3 border-l-2 rounded-r transition-colors cursor-pointer hover:bg-white/5 ${
        notification.read ? "opacity-60" : ""
      } ${TYPE_STYLES[notification.type] || "border-l-gray-500 bg-gray-500/10"}`}
      onClick={() => onRead(notification.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{notification.title}</p>
          <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-[10px] text-white/40 mt-1">{formatTime(notification.timestamp)}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear(notification.id);
          }}
          className="shrink-0 p-0.5 text-white/30 hover:text-white/70 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearNotification } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const recent = notifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-green-400 hover:text-green-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <a
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
              >
                View all <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="overflow-y-auto max-h-72">
            {recent.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onClear={clearNotification}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
