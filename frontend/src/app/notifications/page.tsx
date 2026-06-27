"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Trash2 } from "lucide-react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";

const TYPE_COLORS: Record<string, string> = {
  credential_expiry: "text-amber-400",
  verification_complete: "text-green-400",
  sharing_request: "text-blue-400",
  system_update: "text-purple-400",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationHistoryPage() {
  const { allNotifications, markAsRead, markAllRead, clearNotification, unreadCount } =
    useNotifications();

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-6 h-6 text-green-400" />
                  Notification History
                </h1>
                <p className="text-sm text-white/50 mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                    : "All caught up"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1.5 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </header>

        <div className="space-y-2">
          {allNotifications.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-white/40 text-lg">No notifications yet</p>
              <p className="text-white/30 text-sm mt-1">
                Notifications about credential expiry, verification, and sharing will appear here
              </p>
            </div>
          ) : (
            allNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-4 bg-white/5 backdrop-blur-lg rounded-xl transition-colors cursor-pointer hover:bg-white/10 ${
                  !n.read ? "border-l-2 border-green-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      )}
                      <h3
                        className={`text-sm font-semibold text-white ${!n.read ? "" : "opacity-70"}`}
                      >
                        {n.title}
                      </h3>
                      <span className={`text-[10px] uppercase font-bold ${TYPE_COLORS[n.type] || "text-white/40"}`}>
                        {n.type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-white/30 mt-2">{formatDate(n.timestamp)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(n.id);
                    }}
                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
