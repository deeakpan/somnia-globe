# Quick Setup Guide - Push Notifications

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install web-push
```

### 2. Generate VAPID Keys
```bash
npm run generate:vapid-keys
```

Copy the output and add to your `.env` file:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_EMAIL=mailto:your-email@example.com
```

### 3. Create Database Table
Run the SQL in `migrations/create_push_subscriptions_table.sql` in your Supabase SQL editor.

### 4. Add Button to Your App
```tsx
import PushNotificationButton from '@/components/PushNotificationButton';

// In your component:
<PushNotificationButton />
```

### 5. Test It!
1. Start your dev server: `npm run dev`
2. Start tracker: `npm run tracker`
3. Click "Enable Notifications" in your app
4. Trigger a blockchain event
5. You should receive a notification! 🎉

---

## 📱 Platform Support

- ✅ **Android Chrome** - Full support
- ✅ **iOS Safari 16.4+** - Requires "Add to Home Screen" (PWA)
- ✅ **Desktop Chrome/Firefox/Edge** - Full support
- ❌ **iOS Safari < 16.4** - Not supported

---

## 📚 Full Documentation

See [README_PUSH_NOTIFICATIONS.md](./README_PUSH_NOTIFICATIONS.md) for complete documentation.

---

## 🔧 Troubleshooting

**"Push notifications not supported"**
- Ensure HTTPS (or localhost)
- Check browser compatibility

**"VAPID key not configured"**
- Run `npm run generate:vapid-keys`
- Add keys to `.env`
- Restart dev server

**"Service worker failed"**
- Check `public/sw.js` exists
- Check browser console for errors

**"Notifications not appearing"**
- Check browser notification permissions
- Verify subscription in database
- Check tracker server logs

---

## 🎯 What's Included

✅ Service Worker (`public/sw.js`)
✅ Web App Manifest (`public/manifest.json`)
✅ React Hook (`hooks/usePushNotifications.ts`)
✅ Button Component (`components/PushNotificationButton.tsx`)
✅ API Routes (`/api/push/subscribe`, `/api/push/unsubscribe`)
✅ Server Integration (automatic in tracker)
✅ Database Schema (SQL migration)
✅ Complete Documentation

---

## 📖 Next Steps

1. Customize notification messages in `lib/volume-tracker.ts`
2. Add project-specific subscriptions (see README)
3. Add user authentication for user-specific notifications
4. Configure notification preferences UI

