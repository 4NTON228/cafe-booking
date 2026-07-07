import { supabase } from '../supabaseClient'

// Поддерживает ли браузер пуши.
export function pushSupported() {
  return typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return sub ? 'on' : 'off'
}

// Включить уведомления: спросить разрешение, подписаться, сохранить подписку.
export async function enablePush() {
  if (!pushSupported()) return { error: 'unsupported' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { error: 'denied' }

  const reg = await navigator.serviceWorker.ready
  const { data: vapid } = await supabase.rpc('get_vapid_public')
  if (!vapid) return { error: 'no-key' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, subscription: json }, { onConflict: 'endpoint' })
  if (error) return { error: error.message }
  return { ok: true }
}
