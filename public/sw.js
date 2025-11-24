/**
 * Service Worker for Push Notifications
 * 
 * This service worker handles:
 * - Push notifications from the server
 * - Notification clicks
 * - Background sync (if needed)
 */

const CACHE_NAME = 'somlink-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let notificationData = {
    title: 'Somnia Event',
    body: 'A new blockchain event occurred',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'somlink-notification',
    requireInteraction: false,
    data: {
      url: '/',
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || '/',
          projectId: data.projectId,
          eventType: data.eventType,
          transactionHash: data.transactionHash,
        },
      };
    } catch (e) {
      // If JSON parsing fails, try text
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      // Add action buttons if needed
      actions: notificationData.data.projectId
        ? [
            {
              action: 'view',
              title: 'View Project',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ]
        : [],
    })
  );
});

// Notification click event - handle when user clicks notification
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  if (action === 'dismiss') {
    return; // Just close the notification
  }

  // Default action or 'view' action - open the app
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional - for offline support)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  // Implement background sync logic if needed
});

