/**
 * React Hook for Push Notifications
 * 
 * Handles:
 * - Service worker registration
 * - Push subscription management
 * - Permission requests
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
  getUserId: () => string;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      if (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      ) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError('Push notifications are not supported in this browser');
      }
    };

    checkSupport();
  }, []);

  // Register service worker and check subscription status
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setSwRegistration(registration);

        // Check if already subscribed
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Service worker registration failed:', err);
        setError('Failed to register service worker: ' + err.message);
        setIsLoading(false);
      }
    };

    registerServiceWorker();
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    return permission;
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!swRegistration) {
      throw new Error('Service worker not registered');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission first
      await requestPermission();

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      // Convert subscription to JSON
      const subscriptionJson: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      // Get or generate user ID (you can customize this logic)
      // For now, we'll use localStorage to persist user ID
      let userId = localStorage.getItem('push_notification_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('push_notification_user_id', userId);
      }

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionJson,
          userAgent: navigator.userAgent,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      console.log('✅ Successfully subscribed to push notifications');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to subscribe');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!swRegistration) {
      throw new Error('Service worker not registered');
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      // Unsubscribe from push service
      await subscription.unsubscribe();

      // Remove from server
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to remove subscription from server');
      }

      setIsSubscribed(false);
      console.log('✅ Successfully unsubscribed from push notifications');
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      setError(err.message || 'Failed to unsubscribe');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration]);

  const getUserId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    let userId = localStorage.getItem('push_notification_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('push_notification_user_id', userId);
    }
    return userId;
  }, []);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(getUserId());
    }
  }, [getUserId]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    userId,
    subscribe,
    unsubscribe,
    requestPermission,
    getUserId,
  };
}

// Helper: Convert VAPID key from base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

