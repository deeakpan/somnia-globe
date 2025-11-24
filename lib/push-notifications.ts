/**
 * Push Notification Utilities
 * 
 * Server-side functions for sending push notifications
 */

import * as webpush from 'web-push';
import { supabase } from './supabase';

// Initialize web-push with VAPID keys
export function initializePushNotifications() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
    console.warn('   Run: npm run generate:vapid-keys');
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  console.log('✅ Push notifications initialized');
  return true;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  projectId?: string;
  eventType?: string;
  transactionHash?: string;
  requireInteraction?: boolean;
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error: any) {
    // If subscription is invalid (410 Gone), we should remove it
    if (error.statusCode === 410) {
      console.log('⚠️  Subscription expired, removing from database');
      await removeExpiredSubscription(subscription.endpoint);
    } else {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }
}

/**
 * Send push notifications to all active subscriptions
 */
export async function sendPushToAll(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return { sent: 0, failed: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions found');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const promises = subscriptions.map(async (sub) => {
    try {
      await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      );
      sent++;
    } catch (error) {
      failed++;
      console.error('Failed to send to subscription:', sub.endpoint, error);
    }
  });

  await Promise.allSettled(promises);

  console.log(`📤 Push notifications sent: ${sent} successful, ${failed} failed`);
  return { sent, failed };
}

/**
 * Send push notifications to users subscribed to a project
 * Only sends if the percentage change meets their threshold
 */
export async function sendPushToProjectSubscribers(
  projectId: string,
  currentVolume: number,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; skipped: number }> {
  // Get all users who have preferences for this project
  const { data: preferences, error: prefError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, percentage_threshold, last_notified_volume, enabled')
    .eq('project_id', projectId)
    .eq('enabled', true);

  if (prefError) {
    console.error('Error fetching user preferences:', prefError);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  if (!preferences || preferences.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // Get push subscriptions for these users
  const userIds = preferences.map((p) => p.user_id);
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds);

  if (subError) {
    console.error('Error fetching subscriptions:', subError);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Create a map of user_id to preference
  const preferenceMap = new Map(
    preferences.map((p) => [p.user_id, p])
  );

  // Create a map of user_id to subscriptions (user can have multiple devices)
  const userSubscriptionsMap = new Map<string, typeof subscriptions>();
  subscriptions.forEach((sub) => {
    if (!sub.user_id) return;
    if (!userSubscriptionsMap.has(sub.user_id)) {
      userSubscriptionsMap.set(sub.user_id, []);
    }
    userSubscriptionsMap.get(sub.user_id)!.push(sub);
  });

  // Check each user's threshold and send notifications
  const updatePromises: Promise<void>[] = [];

  for (const [userId, userSubs] of userSubscriptionsMap.entries()) {
    const preference = preferenceMap.get(userId);
    if (!preference) continue;

    const lastVolume = preference.last_notified_volume || 0;
    const threshold = Number(preference.percentage_threshold);

    // Calculate percentage change
    let percentageChange = 0;
    if (lastVolume > 0) {
      percentageChange = ((currentVolume - lastVolume) / lastVolume) * 100;
    } else if (currentVolume > 0) {
      // First notification - always send if volume > 0
      percentageChange = 100;
    }

    // Check if change meets threshold
    if (Math.abs(percentageChange) < threshold) {
      skipped++;
      continue;
    }

    // Send notification to all user's devices
    const sendPromises = userSubs.map(async (sub) => {
      try {
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            ...payload,
            body: `${payload.body} (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(2)}%)`,
          }
        );
        sent++;
      } catch (error) {
        failed++;
        console.error('Failed to send to subscription:', sub.endpoint, error);
      }
    });

    await Promise.allSettled(sendPromises);

    // Update last_notified_volume for this user
    updatePromises.push(
      supabase
        .from('user_notification_preferences')
        .update({ last_notified_volume: currentVolume })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .then(() => {})
    );
  }

  // Update all preferences
  await Promise.allSettled(updatePromises);

  console.log(
    `📤 Project ${projectId}: ${sent} sent, ${failed} failed, ${skipped} skipped (threshold not met)`
  );
  return { sent, failed, skipped };
}

/**
 * Remove expired subscription from database
 */
async function removeExpiredSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Error removing expired subscription:', error);
  }
}

