# Push Notifications with User Preferences

## Overview

The push notification system now supports **user-specific percentage thresholds** and **per-project subscriptions**. Users can monitor multiple projects with different thresholds, and notifications are only sent when the volume change meets their individual settings.

## Key Features

✅ **User-specific percentage thresholds** - Each user sets their own threshold (e.g., 5%, 10%, 20%)  
✅ **Per-project subscriptions** - Users can monitor multiple projects independently  
✅ **No duplicate subscriptions** - Multiple users monitoring the same project share the same push subscription  
✅ **Smart notification filtering** - Only sends notifications when percentage change meets user's threshold  
✅ **Volume tracking** - Tracks last notified volume to calculate percentage changes accurately  

---

## How It Works

### 1. User Subscribes to Push Notifications

When a user enables push notifications:
- A unique `user_id` is generated and stored in localStorage
- The push subscription is saved with the `user_id`
- Multiple devices can use the same `user_id` (user gets notifications on all devices)

### 2. User Sets Project Preferences

For each project they want to monitor:
- User sets a percentage threshold (e.g., 5%)
- Preference is saved in `user_notification_preferences` table
- User can enable/disable notifications per project

### 3. Event Detection & Notification Logic

When a blockchain event occurs:
1. Tracker detects the event and updates volume
2. For each user monitoring that project:
   - Calculate percentage change: `((current_volume - last_notified_volume) / last_notified_volume) * 100`
   - Check if `|percentage_change| >= user_threshold`
   - If yes: Send notification to all user's devices
   - If no: Skip (don't send notification)
3. Update `last_notified_volume` for users who received notifications

### 4. Multiple Users, Same Project

- User A monitors Project X with 5% threshold
- User B monitors Project X with 10% threshold
- Both users share the same push subscription endpoint (no duplicates)
- Each user gets notifications based on their own threshold
- If volume changes 7%:
  - User A gets notification (7% >= 5%)
  - User B doesn't (7% < 10%)

---

## Database Schema

### `user_notification_preferences` Table

```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,              -- User identifier
  project_id UUID NOT NULL,           -- Project being monitored
  percentage_threshold DECIMAL(5,2),  -- Threshold (e.g., 5.00 = 5%)
  enabled BOOLEAN DEFAULT true,       -- Enable/disable notifications
  last_notified_volume INTEGER,       -- Last volume when notification was sent
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, project_id)         -- One preference per user per project
);
```

### `push_subscriptions` Table (Updated)

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,      -- Push service endpoint
  p256dh TEXT NOT NULL,               -- Public key
  auth TEXT NOT NULL,                 -- Auth secret
  user_id TEXT,                       -- User identifier (NEW)
  user_agent TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## API Endpoints

### Subscribe to Push Notifications

```http
POST /api/push/subscribe
Content-Type: application/json

{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userId": "user_123",
  "userAgent": "Mozilla/5.0..."
}
```

### Manage Project Preferences

**Get all preferences for a user:**
```http
GET /api/push/preferences?userId=user_123
```

**Create/update preference:**
```http
POST /api/push/preferences
Content-Type: application/json

{
  "userId": "user_123",
  "projectId": "project-uuid",
  "percentageThreshold": 5.0,
  "enabled": true
}
```

**Delete preference:**
```http
DELETE /api/push/preferences?userId=user_123&projectId=project-uuid
```

---

## Frontend Usage

### 1. Enable Push Notifications (One-time)

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { subscribe, userId } = usePushNotifications();
  
  const handleEnable = async () => {
    await subscribe();
    console.log('User ID:', userId);
  };
  
  return <button onClick={handleEnable}>Enable Notifications</button>;
}
```

### 2. Set Project Notification Preferences

```tsx
import ProjectNotificationSettings from '@/components/ProjectNotificationSettings';

function ProjectPage({ project }) {
  return (
    <ProjectNotificationSettings
      projectId={project.id}
      projectName={project.name}
    />
  );
}
```

The component provides:
- Toggle to enable/disable notifications for the project
- Input to set percentage threshold
- Save/Delete buttons

### 3. Custom Implementation

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function CustomSettings({ projectId }) {
  const { userId, getUserId } = usePushNotifications();
  const [threshold, setThreshold] = useState(5);
  
  const savePreference = async () => {
    const response = await fetch('/api/push/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || getUserId(),
        projectId: projectId,
        percentageThreshold: threshold,
        enabled: true,
      }),
    });
    // Handle response...
  };
  
  return (
    <div>
      <input
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />
      <button onClick={savePreference}>Save</button>
    </div>
  );
}
```

---

## Backend Logic

### Notification Sending Flow

```typescript
// In lib/volume-tracker.ts - handleProjectEvent()

// When event occurs:
1. Update volume (unique_wallets count)
2. Call sendPushToProjectSubscribers(projectId, currentVolume, payload)

// In lib/push-notifications.ts - sendPushToProjectSubscribers()

1. Get all users monitoring this project (from user_notification_preferences)
2. For each user:
   a. Get their threshold and last_notified_volume
   b. Calculate: percentageChange = ((currentVolume - lastVolume) / lastVolume) * 100
   c. If |percentageChange| >= threshold:
      - Get all user's push subscriptions (devices)
      - Send notification to all devices
      - Update last_notified_volume = currentVolume
   d. If |percentageChange| < threshold:
      - Skip (don't send notification)
3. Return stats: { sent, failed, skipped }
```

---

## Example Scenarios

### Scenario 1: First Notification

- User sets 5% threshold for Project A
- Project A volume: 0 → 10 wallets
- Calculation: `((10 - 0) / 0) * 100` = undefined (division by zero)
- Logic: If `lastVolume === 0` and `currentVolume > 0`, send notification
- Result: ✅ Notification sent, `last_notified_volume = 10`

### Scenario 2: Threshold Met

- User has 5% threshold
- Last notified: 100 wallets
- Current: 110 wallets
- Calculation: `((110 - 100) / 100) * 100` = 10%
- Check: `10% >= 5%` ✅
- Result: ✅ Notification sent, `last_notified_volume = 110`

### Scenario 3: Threshold Not Met

- User has 10% threshold
- Last notified: 100 wallets
- Current: 107 wallets
- Calculation: `((107 - 100) / 100) * 100` = 7%
- Check: `7% < 10%` ❌
- Result: ⏭️ Notification skipped, `last_notified_volume` unchanged

### Scenario 4: Multiple Users, Same Project

- Project X: 100 → 110 wallets (10% increase)
- User A: 5% threshold → ✅ Gets notification
- User B: 10% threshold → ✅ Gets notification
- User C: 15% threshold → ⏭️ No notification

---

## Setup Instructions

### 1. Run Database Migrations

```sql
-- Run migrations/create_user_notification_preferences.sql
-- This creates the user_notification_preferences table
```

### 2. Update Existing Push Subscriptions

If you have existing subscriptions, you may need to add `user_id`:

```sql
-- Add user_id to existing subscriptions (optional)
-- Users will get a new user_id on next subscription
```

### 3. Use the Components

```tsx
// In your project detail page
import ProjectNotificationSettings from '@/components/ProjectNotificationSettings';

<ProjectNotificationSettings
  projectId={project.id}
  projectName={project.project_name}
/>
```

---

## Benefits

1. **No Spam** - Users only get notifications when changes are significant to them
2. **Customizable** - Each user sets their own sensitivity
3. **Efficient** - No duplicate subscriptions for the same project
4. **Scalable** - Works with many users monitoring many projects
5. **Accurate** - Tracks last notified volume to calculate real percentage changes

---

## Testing

1. **Enable notifications** for a user
2. **Set preference** for a project (e.g., 5% threshold)
3. **Trigger events** that change volume:
   - Small change (< threshold) → No notification
   - Large change (>= threshold) → Notification sent
4. **Check database**:
   - `user_notification_preferences.last_notified_volume` should update
   - `push_subscriptions` should have user_id set

---

## Troubleshooting

**Notifications not sending:**
- Check user has enabled notifications for the project
- Verify percentage threshold is set
- Check if volume change meets threshold
- Look at tracker logs for `skipped` count

**Multiple notifications for same event:**
- Ensure `last_notified_volume` is being updated
- Check for duplicate preferences (should be unique per user+project)

**User not receiving notifications:**
- Verify push subscription exists with correct `user_id`
- Check preference is enabled
- Verify threshold is met
- Check browser notification permissions

