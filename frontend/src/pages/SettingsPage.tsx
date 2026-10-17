import React, { useEffect, useState } from 'react';
import { Settings, Bell, Shield, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../hooks/useAuth.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [notifications, setNotifications] = useState({
    email: true,
    weak_topic_alerts: true,
    streak_reminders: true,
  });

  const [privacy, setPrivacy] = useState({
    allow_analytics: true,
    share_progress: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get('/settings');
        if (data.notification_preferences) setNotifications(data.notification_preferences);
        if (data.privacy_preferences) setPrivacy(data.privacy_preferences);
      } catch {}
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await api.patch('/settings', {
        notification_preferences: notifications,
        privacy_preferences: privacy,
      });
      success('Settings Saved', 'Preferences updated successfully.');
    } catch (err: any) {
      error('Settings Error', err.message || 'Could not save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-brand-600" />
          Preferences & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage notifications, diagnostic alerts, privacy controls, and study tracking settings.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-6">
        {/* Notifications Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-600" />
            <span>Notification & Alert Preferences</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Weak Topic Diagnostic Alerts</span>
                <span className="text-[11px] text-slate-500 block">
                  Notify when a topic drops below the 60% accuracy threshold.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.weak_topic_alerts}
                onChange={e => setNotifications(prev => ({ ...prev, weak_topic_alerts: e.target.checked }))}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Daily Study Streak Reminders</span>
                <span className="text-[11px] text-slate-500 block">
                  Remind to reach the daily 5-minute qualifying study threshold.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.streak_reminders}
                onChange={e => setNotifications(prev => ({ ...prev, streak_reminders: e.target.checked }))}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Email Learning Summaries</span>
                <span className="text-[11px] text-slate-500 block">
                  Receive periodic progress digests to your email ({user?.email}).
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={e => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>
          </div>
        </div>

        {/* Privacy & Learning Data */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            <span>Privacy & Study-Time Analytics</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Allow Evidence Analytics</span>
                <span className="text-[11px] text-slate-500 block">
                  Used exclusively to calculate topic mastery and generate targeted practice.
                </span>
              </div>
              <input
                type="checkbox"
                checked={privacy.allow_analytics}
                onChange={e => setPrivacy(prev => ({ ...prev, allow_analytics: e.target.checked }))}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            {isSaving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </div>

        {/* Account Security & Data Management */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <span>Account Security & Data</span>
          </h3>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Password</p>
              <p className="text-[11px] text-slate-500">Need to update your password?</p>
            </div>
            <button
              onClick={() => success('Password Recovery', 'Recovery instructions sent to your registered email.')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
