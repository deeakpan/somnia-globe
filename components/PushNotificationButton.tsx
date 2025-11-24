/**
 * Push Notification Button Component
 * 
 * A button component that handles push notification subscription/unsubscription
 */

'use client';

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationButtonProps {
  className?: string;
  subscribedLabel?: string;
  unsubscribedLabel?: string;
  loadingLabel?: string;
}

export default function PushNotificationButton({
  className = '',
  subscribedLabel = '🔔 Notifications Enabled',
  unsubscribedLabel = '🔕 Enable Notifications',
  loadingLabel = 'Loading...',
}: PushNotificationButtonProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = async () => {
    setLocalError(null);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err: any) {
      setLocalError(err.message || 'An error occurred');
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className={`${className} opacity-50 cursor-not-allowed`}
        title="Push notifications are not supported in this browser"
      >
        Notifications Not Supported
      </button>
    );
  }

  const displayError = error || localError;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`${className} ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading
          ? loadingLabel
          : isSubscribed
          ? subscribedLabel
          : unsubscribedLabel}
      </button>
      {displayError && (
        <p className="text-sm text-red-500">{displayError}</p>
      )}
      {isSubscribed && !displayError && (
        <p className="text-sm text-green-500">
          You'll receive notifications for blockchain events
        </p>
      )}
    </div>
  );
}

