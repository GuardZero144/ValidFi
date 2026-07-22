"use client";

import React, { useCallback } from "react";
import { Bell, Mail, Smartphone, Shield } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function NotificationPreferences() {
  const { preferences, updatePreferences, requestPushPermission } = useNotifications();
  const { announceToScreenReader } = useAccessibility();

  const handleToggleChange = useCallback(
    (key: keyof typeof preferences, value: boolean) => {
      updatePreferences({ [key]: value });
      const label = key.replace("notify", "").replace(/([A-Z])/g, " $1").trim();
      announceToScreenReader(`${label} notifications ${value ? "enabled" : "disabled"}`);
    },
    [updatePreferences, announceToScreenReader]
  );

  const handlePushEnable = useCallback(async () => {
    await requestPushPermission();
    announceToScreenReader("Push notifications enabled");
  }, [requestPushPermission, announceToScreenReader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    },
    []
  );

  return (
    <div className="space-y-6 text-white" role="region" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading" className="sr-only">
        Notification Preferences
      </h2>

      <div>
        <h3
          id="channels-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <Bell className="w-5 h-5 text-green-400" aria-hidden="true" />
          Notification Channels
        </h3>
        <div className="space-y-3" role="group" aria-labelledby="channels-heading">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-green-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-white/50">Receive alerts within the app</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="inapp-toggle"
              checked={preferences.inApp}
              onChange={(e) => handleToggleChange("inApp", e.target.checked)}
              className="w-4 h-4 accent-green-500"
              aria-label="In-app notifications"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-white/50">Browser push alerts</p>
              </div>
            </div>
            {preferences.push ? (
              <input
                type="checkbox"
                id="push-toggle"
                checked={true}
                onChange={() => handleToggleChange("push", false)}
                className="w-4 h-4 accent-green-500"
                aria-label="Push notifications"
              />
            ) : (
              <button
                id="push-enable-btn"
                onClick={handlePushEnable}
                onKeyDown={(e) => handleKeyDown(e, handlePushEnable)}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                aria-label="Enable push notifications"
              >
                Enable
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-white/50">Receive alerts via email</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="email-toggle"
              checked={preferences.email}
              onChange={(e) => handleToggleChange("email", e.target.checked)}
              className="w-4 h-4 accent-green-500"
              aria-label="Email notifications"
            />
          </div>

          {preferences.email && (
            <div className="pl-11">
              <label htmlFor="email-input" className="sr-only">
                Email address for notifications
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="your@email.com"
                value={preferences.emailAddress}
                onChange={(e) => updatePreferences({ emailAddress: e.target.value })}
                aria-describedby="email-help"
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500"
              />
              <p id="email-help" className="text-xs text-white/40 mt-1">
                Enter your email address to receive notification alerts
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3
          id="alerts-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <Shield className="w-5 h-5 text-green-400" aria-hidden="true" />
          Alert Types
        </h3>
        <div className="space-y-3" role="group" aria-labelledby="alerts-heading">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Credential Expiry</p>
              <p className="text-xs text-white/50">When a credential is about to expire</p>
            </div>
            <input
              type="checkbox"
              id="expiry-toggle"
              checked={preferences.notifyExpiry}
              onChange={(e) => handleToggleChange("notifyExpiry", e.target.checked)}
              className="w-4 h-4 accent-green-500"
              aria-label="Credential expiry notifications"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Verification Complete</p>
              <p className="text-xs text-white/50">When credential verification finishes</p>
            </div>
            <input
              type="checkbox"
              id="verification-toggle"
              checked={preferences.notifyVerification}
              onChange={(e) => handleToggleChange("notifyVerification", e.target.checked)}
              className="w-4 h-4 accent-green-500"
              aria-label="Verification complete notifications"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div>
              <p className="text-sm font-medium">Sharing Requests</p>
              <p className="text-xs text-white/50">When someone requests your credentials</p>
            </div>
            <input
              type="checkbox"
              id="sharing-toggle"
              checked={preferences.notifySharing}
              onChange={(e) => handleToggleChange("notifySharing", e.target.checked)}
              className="w-4 h-4 accent-green-500"
              aria-label="Sharing request notifications"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
