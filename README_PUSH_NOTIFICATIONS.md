# Push Notifications Integration Guide

Complete guide for integrating browser push notifications into your Somlink application. This enables real-time notifications for iOS Safari, Android Chrome, and desktop browsers when blockchain events occur.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Database Setup](#database-setup)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [iOS Specific Setup](#ios-specific-setup)
8. [Android Specific Setup](#android-specific-setup)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

The push notification system consists of:

- **Service Worker** (`public/sw.js`) - Handles push events in the background
- **Web App Manifest** (`public/manifest.json`) - Required for PWA/iOS support
- **API Routes** - Manage subscriptions (`/api/push/subscribe`, `/api/push/unsubscribe`)
- **React Hook** (`hooks/usePushNotifications.ts`) - Frontend subscription management
- **Push Service** (`lib/push-notifications.ts`) - Server-side notification sending
- **Tracker Integration** - Automatically sends notifications on blockchain events

---

## Prerequisites

1. **HTTPS Required** - Push notifications only work over HTTPS (or localhost for development)
2. **Node.js** - Version 18+ recommended
3. **Supabase** - Database for storing subscriptions
4. **VAPID Keys** - Generated once, used for authentication

---

## Backend Setup

### Step 1: Install Dependencies

```bash
npm install web-push
```

### Step 2: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server with push services.

```bash
npm run generate:vapid-keys
```

This will output:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
```

### Step 3: Add to Environment Variables

Add the generated keys to your `.env` file:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_EMAIL=mailto:your-email@example.com
```

**⚠️ Important:**
- The public key is safe to expose (it's in `NEXT_PUBLIC_*`)
- The private key must be kept secret (never commit to git)
- The email is used as a contact for push services

### Step 4: Verify Tracker Server Integration

The tracker server (`server/tracker.ts`) automatically initializes push notifications and sends them when new wallet events are detected. No additional configuration needed!

---

## Database Setup

### Step 1: Run SQL Migration

Execute the SQL migration in your Supabase SQL editor:

```bash
# Copy the contents of migrations/create_push_subscriptions_table.sql
# and run it in Supabase SQL Editor
```

Or run it via Supabase CLI:

```bash
supabase db push
```

### Step 2: Verify Table Creation

The `push_subscriptions` table should have:
- `id` (UUID, primary key)
- `endpoint` (TEXT, unique)
- `p256dh` (TEXT) - Public key
- `auth` (TEXT) - Auth secret
- `user_agent` (TEXT, optional)
- `project_id` (UUID, optional) - For project-specific subscriptions
- `user_id` (UUID, optional) - For user-specific subscriptions
- `created_at`, `updated_at` (timestamps)

---

## Frontend Integration

### Step 1: Add the Push Notification Button

The easiest way is to use the pre-built component:

```tsx
// In any page or component
import PushNotificationButton from '@/components/PushNotificationButton';

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <PushNotificationButton 
        className="px-4 py-2 bg-blue-500 text-white rounded"
        subscribedLabel="🔔 Notifications On"
        unsubscribedLabel="🔕 Enable Notifications"
      />
    </div>
  );
}
```

### Step 2: Using the Hook Directly

For more control, use the hook directly:

```tsx
'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function CustomNotificationComponent() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return <p>Push notifications not supported in this browser</p>;
  }

  return (
    <div>
      {isSubscribed ? (
        <button onClick={unsubscribe} disabled={isLoading}>
          Disable Notifications
        </button>
      ) : (
        <button onClick={subscribe} disabled={isLoading}>
          Enable Notifications
        </button>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### Step 3: Add to Header/Navigation

Add the button to your header component:

```tsx
// components/Header.tsx or ConditionalHeader.tsx
import PushNotificationButton from '@/components/PushNotificationButton';

export default function Header() {
  return (
    <header>
      {/* ... other header content ... */}
      <PushNotificationButton className="ml-auto" />
    </header>
  );
}
```

### Step 4: Service Worker Registration

The service worker is automatically registered by the `usePushNotifications` hook. The service worker file (`public/sw.js`) must be accessible at `/sw.js`.

**Verify it's working:**
1. Open browser DevTools → Application → Service Workers
2. You should see the service worker registered
3. Check the console for any errors

---

## Testing

### Test 1: Basic Subscription

1. Open your app in the browser
2. Click "Enable Notifications"
3. Grant permission when prompted
4. Check browser console for "✅ Successfully subscribed"
5. Verify in Supabase: `SELECT * FROM push_subscriptions;`

### Test 2: Send Test Notification

You can create a test API route or use the tracker server:

```typescript
// app/api/push/test/route.ts (create this for testing)
import { NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/push-notifications';

export async function POST() {
  await sendPushToAll({
    title: 'Test Notification',
    body: 'This is a test push notification!',
    icon: '/favicon.ico',
    url: '/',
  });
  
  return NextResponse.json({ success: true });
}
```

Then call it:
```bash
curl -X POST http://localhost:3000/api/push/test
```

### Test 3: Real Event Notification

1. Trigger a blockchain event (e.g., mint an NFT)
2. The tracker server should detect it
3. A push notification should appear
4. Click the notification to verify it opens your app

---

## iOS Specific Setup

### Requirements

- iOS 16.4+ (Safari)
- User must "Add to Home Screen" (PWA)
- HTTPS required
- Valid manifest.json

### Step 1: Verify Manifest

Ensure `public/manifest.json` exists and is valid. The app layout already includes the manifest link.

### Step 2: Add to Home Screen

1. Open your app in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. Open the app from the home screen
6. Enable notifications from within the app

### Step 3: Test on iOS

1. Open the PWA from home screen
2. Click "Enable Notifications"
3. Grant permission
4. Trigger a blockchain event
5. Notification should appear even when app is closed

**Note:** iOS notifications only work when the app is added to the home screen. Regular Safari tabs won't receive push notifications.

---

## Android Specific Setup

### Requirements

- Android 4.4+ (Chrome)
- HTTPS required
- Service worker support

### Step 1: Test in Chrome

1. Open your app in Chrome on Android
2. Click "Enable Notifications"
3. Grant permission
4. Notifications should work immediately (no home screen add needed)

### Step 2: Verify Service Worker

1. Open Chrome DevTools (remote debugging)
2. Go to Application → Service Workers
3. Verify service worker is active

---

## Troubleshooting

### Issue: "Push notifications are not supported"

**Solutions:**
- Ensure you're using HTTPS (or localhost)
- Check browser compatibility (Chrome, Firefox, Safari 16.4+)
- Verify service worker registration in DevTools

### Issue: "VAPID public key not configured"

**Solutions:**
- Check `.env` file has `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Restart Next.js dev server after adding env vars
- Verify the key starts with `B` (base64 URL encoded)

### Issue: "Service worker registration failed"

**Solutions:**
- Ensure `public/sw.js` exists
- Check file permissions
- Verify Next.js config includes service worker headers
- Check browser console for specific errors

### Issue: "Notifications not appearing"

**Solutions:**
- Check browser notification permissions (Settings → Site Settings → Notifications)
- Verify subscription exists in database
- Check tracker server logs for push errors
- Test with a manual push notification first

### Issue: "iOS notifications not working"

**Solutions:**
- Ensure app is added to home screen (PWA)
- Open app from home screen, not Safari
- Check iOS version (16.4+ required)
- Verify manifest.json is valid
- Check Safari settings for the site

### Issue: "Subscription saved but notifications not sent"

**Solutions:**
- Verify tracker server is running
- Check `lib/push-notifications.ts` initialization
- Verify VAPID keys are correct
- Check server logs for web-push errors
- Test with `sendPushToAll()` manually

---

## API Reference

### Hook: `usePushNotifications()`

Returns:
```typescript
{
  isSupported: boolean;        // Browser supports push notifications
  isSubscribed: boolean;       // Currently subscribed
  isLoading: boolean;          // Operation in progress
  error: string | null;        // Error message if any
  subscribe: () => Promise<void>;      // Subscribe to notifications
  unsubscribe: () => Promise<void>;    // Unsubscribe
  requestPermission: () => Promise<NotificationPermission>; // Request permission
}
```

### Component: `PushNotificationButton`

Props:
```typescript
{
  className?: string;              // CSS classes
  subscribedLabel?: string;        // Text when subscribed
  unsubscribedLabel?: string;      // Text when not subscribed
  loadingLabel?: string;           // Text while loading
}
```

### API Route: `POST /api/push/subscribe`

Request body:
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userAgent": "Mozilla/5.0...",
  "projectId": "optional-project-id"
}
```

Response:
```json
{
  "success": true,
  "message": "Subscription saved"
}
```

### API Route: `POST /api/push/unsubscribe`

Request body:
```json
{
  "endpoint": "https://..."
}
```

Response:
```json
{
  "success": true,
  "message": "Unsubscribed"
}
```

### Server Function: `sendPushToAll(payload)`

Send notification to all subscribers:

```typescript
import { sendPushToAll } from '@/lib/push-notifications';

await sendPushToAll({
  title: 'New Event',
  body: 'A blockchain event occurred',
  icon: '/favicon.ico',
  url: '/detail/project-id',
  projectId: 'project-id',
  eventType: 'Transfer',
  transactionHash: '0x...',
});
```

---

## Advanced Usage

### Project-Specific Subscriptions

To allow users to subscribe to specific projects:

1. Add `project_id` parameter when subscribing:
```typescript
const { subscribe } = usePushNotifications();
await subscribe(); // Then update with project_id via API
```

2. Modify the subscription API to accept `projectId`
3. Use `sendPushToProjectSubscribers()` instead of `sendPushToAll()`

### User-Specific Subscriptions

If you add user authentication:

1. Add `user_id` column to `push_subscriptions` table
2. Pass `userId` when subscribing
3. Filter notifications by user

### Custom Notification Payloads

Modify the payload in `lib/volume-tracker.ts`:

```typescript
await sendPushToAll({
  title: `New ${event.eventName} Event`,
  body: `Project ${projectId} received a new interaction`,
  icon: '/favicon.ico',
  badge: '/favicon.ico',
  tag: `event-${event.transactionHash}`,
  url: `/detail/${projectId}`,
  projectId: projectId,
  eventType: event.eventName,
  transactionHash: event.transactionHash,
  requireInteraction: true, // Keep notification visible until clicked
});
```

---

## Security Considerations

1. **VAPID Private Key**: Never commit to git, keep in `.env`
2. **Subscription Validation**: Validate endpoints before storing
3. **Rate Limiting**: Consider rate limiting on subscription endpoints
4. **User Privacy**: Only send notifications users have explicitly subscribed to
5. **Expired Subscriptions**: Clean up expired subscriptions (410 errors)

---

## Production Checklist

- [ ] VAPID keys generated and added to environment variables
- [ ] Database table created (`push_subscriptions`)
- [ ] HTTPS enabled (required for production)
- [ ] Service worker registered and working
- [ ] Manifest.json valid and accessible
- [ ] Tested on iOS (PWA from home screen)
- [ ] Tested on Android (Chrome)
- [ ] Tested on desktop browsers
- [ ] Error handling implemented
- [ ] Expired subscriptions cleanup configured
- [ ] Monitoring/logging for push failures

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check service worker status in DevTools
3. Verify database subscriptions exist
4. Check tracker server logs
5. Test with manual push notification first

---

## Additional Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

