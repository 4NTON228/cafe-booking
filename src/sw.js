/* Сервис-воркер: кэш оболочки/данных (как раньше) + обработка пуш-уведомлений. */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

// Офлайн-навигация отдаёт оболочку приложения (SPA).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/rest\//, /^\/auth\//, /^\/functions\//, /^\/realtime\//],
}))

// Чтение данных Supabase: онлайн — свежее, офлайн — из кэша.
registerRoute(
  ({ url, request }) => url.href.includes('/rest/v1/') && request.method === 'GET',
  new NetworkFirst({ cacheName: 'supabase-rest', networkTimeoutSeconds: 4 }),
)
// Шрифты — из кэша.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'google-fonts' }),
)

// Приход пуша → показать уведомление.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  const title = data.title || 'Манилов'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

// Тап по уведомлению → открыть/сфокусировать приложение.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate?.(url); return c.focus() }
      }
      return self.clients.openWindow(url)
    }),
  )
})

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())
