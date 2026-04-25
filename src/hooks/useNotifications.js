import { useState, useEffect } from 'react'
import { toDateString } from '../utils/dateUtils'

const SW_PATH = '/sw.js'

export function useNotifications({ habits, tasks, goals }) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [enabled, setEnabled]   = useState(() => localStorage.getItem('notifEnabled') === 'true')
  const [notifTime, setTimeState] = useState(() => localStorage.getItem('notifTime') || '08:00')
  const [swReady, setSwReady]   = useState(false)

  // Register SW once on mount + listen for fire-confirmation messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register(SW_PATH).then(reg => {
      reg.addEventListener('updatefound', () => {})
      navigator.serviceWorker.ready.then(() => setSwReady(true))
    }).catch(() => {})

    function onMessage(e) {
      if (e.data?.type === 'FIRED' && e.data.today) {
        localStorage.setItem('notifLastFired', e.data.today)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  // Push fresh snapshot to SW whenever data changes and notifications are on
  useEffect(() => {
    if (!enabled || !swReady) return
    sendSchedule(notifTime, { habits, tasks, goals })
  }, [habits, tasks, goals, enabled, swReady, notifTime])

  // Catch-up: if the user opens the app after their scheduled time but the SW
  // never fired (e.g. iOS killed the SW overnight), fire it now from the page.
  // This is the workaround for the platform's hard limit on background SW work.
  useEffect(() => {
    if (!enabled || !swReady) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const today = toDateString()
    if (localStorage.getItem('notifLastFired') === today) return

    const now  = new Date()
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    if (hhmm < notifTime) return   // not yet — let the SW handle it later

    // Mark fired immediately to avoid duplicates if the SW also fires
    localStorage.setItem('notifLastFired', today)

    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'FIRE_NOW', snapshot: { habits, tasks, goals }, today })
    })
  }, [enabled, swReady, habits, tasks, goals, notifTime])

  async function sendSchedule(time, snapshot) {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'SCHEDULE', time, snapshot })
  }

  async function enable(time = notifTime) {
    if (!('Notification' in window)) return { ok: false, reason: 'not-supported' }
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return { ok: false, reason: 'denied' }

    localStorage.setItem('notifEnabled', 'true')
    localStorage.setItem('notifTime', time)
    setEnabled(true)
    setTimeState(time)
    if (swReady) await sendSchedule(time, { habits, tasks, goals })
    return { ok: true }
  }

  function disable() {
    localStorage.setItem('notifEnabled', 'false')
    setEnabled(false)
    navigator.serviceWorker?.ready.then(reg => {
      reg.active?.postMessage({ type: 'CANCEL' })
    })
  }

  function setTime(time) {
    setTimeState(time)
    localStorage.setItem('notifTime', time)
    if (enabled && swReady) sendSchedule(time, { habits, tasks, goals })
  }

  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator

  return { supported, permission, enabled, notifTime, enable, disable, setTime }
}
