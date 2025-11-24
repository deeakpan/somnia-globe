/**
 * Component for managing notification preferences per project
 */

'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ProjectNotificationSettingsProps {
  projectId: string;
  projectName: string;
  className?: string;
}

export default function ProjectNotificationSettings({
  projectId,
  projectName,
  className = '',
}: ProjectNotificationSettingsProps) {
  const { userId, getUserId } = usePushNotifications();
  const [percentageThreshold, setPercentageThreshold] = useState(5);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing preference
  useEffect(() => {
    const loadPreference = async () => {
      const currentUserId = userId || getUserId();
      if (!currentUserId) return;

      try {
        const response = await fetch(
          `/api/push/preferences?userId=${currentUserId}`
        );
        const data = await response.json();

        if (data.success && data.preferences) {
          const pref = data.preferences.find(
            (p: any) => p.project_id === projectId
          );
          if (pref) {
            setPercentageThreshold(Number(pref.percentage_threshold));
            setEnabled(pref.enabled);
          }
        }
      } catch (err) {
        console.error('Error loading preference:', err);
      }
    };

    loadPreference();
  }, [projectId, userId, getUserId]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const currentUserId = userId || getUserId();
      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      const response = await fetch('/api/push/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          projectId: projectId,
          percentageThreshold: percentageThreshold,
          enabled: enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preference');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUserId = userId || getUserId();
      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      const response = await fetch(
        `/api/push/preferences?userId=${currentUserId}&projectId=${projectId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete preference');
      }

      setEnabled(false);
      setPercentageThreshold(5);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4">
        Notification Settings: {projectName}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <span>Enable notifications for this project</span>
          </label>
        </div>

        {enabled && (
          <div>
            <label className="block mb-2">
              Notify when volume changes by:
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={percentageThreshold}
                onChange={(e) =>
                  setPercentageThreshold(Number(e.target.value))
                }
                className="ml-2 px-2 py-1 border rounded w-20"
              />
              %
            </label>
            <p className="text-sm text-gray-500">
              You'll receive a notification when the unique wallets count
              changes by this percentage or more.
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>

          {enabled && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
            >
              Disable
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && (
          <p className="text-sm text-green-500">Settings saved successfully!</p>
        )}
      </div>
    </div>
  );
}

