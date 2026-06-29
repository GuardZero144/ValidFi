"use client";

import React from "react";
import { Bell, Mail, Smartphone, Shield } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

export function NotificationPreferences() {
  const { preferences, updatePreferences, requestPushPermission } = useNotifications();

  return (
    <div className="space-y-6 text-white">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-400" />
          Notification Channels
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-white/50">Receive alerts within the app</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.inApp}
              onChange={(e) => updatePreferences({ inApp: e.target.checked })}
              className="w-4 h-4 accent-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-white/50">Browser push alerts</p>
              </div>
            </div>
            {preferences.push ? (
              <input
                type="checkbox"
                checked={true}
                onChange={() => updatePreferences({ push: false })}
                className="w-4 h-4 accent-green-500"
              />
            ) : (
              <button
                onClick={requestPushPermission}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Enable
              </button>
            )}
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-white/50">Receive alerts via email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) => updatePreferences({ email: e.target.checked })}
              className="w-4 h-4 accent-green-500"
            />
          </label>

          {preferences.email && (
            <div className="pl-11">
              <input
                type="email"
                placeholder="your@email.com"
                value={preferences.emailAddress}
                onChange={(e) => updatePreferences({ emailAddress: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          Alert Types
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Credential Expiry</p>
              <p className="text-xs text-white/50">When a credential is about to expire</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyExpiry}
              onChange={(e) => updatePreferences({ notifyExpiry: e.target.checked })}
              className="w-4 h-4 accent-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Verification Complete</p>
              <p className="text-xs text-white/50">When credential verification finishes</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyVerification}
              onChange={(e) => updatePreferences({ notifyVerification: e.target.checked })}
              className="w-4 h-4 accent-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Sharing Requests</p>
              <p className="text-xs text-white/50">When someone requests your credentials</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifySharing}
              onChange={(e) => updatePreferences({ notifySharing: e.target.checked })}
              className="w-4 h-4 accent-green-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
