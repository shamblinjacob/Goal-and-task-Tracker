import { useState, useEffect } from 'react'

const SW_PATH = '/sw.js'

export function useNotifications({ habits, tasks, goals }) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [enabled, setEnabled]   = useState(() => localStorage.getItem('notifEnabled') === 'true')
  const [notifTime, setTimeState] = useState(() => localStorage.getItem('notifTime') || '08:00')
  const [swReady, setSwReady]   = useState(false)

  // Register SW once on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register(SW_PATH).then(reg => {
      reg.addEventListener('updatefound', () => {})
      navigator.serviceWorker.ready.then(() => setSwReady(true))
    }).catch(() => {})
  }, [])

  // Push fresh snapshot to SW whenever data changes and notifications are on
  useEffect(() => {
    if (!enabled || !swReady) return
    sendSchedule(notifTime, { habits, tasks, goals })
  }, [habits, tasks, goals, enabled, swReady, notifTime])

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
