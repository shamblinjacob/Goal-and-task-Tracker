const CACHE = 'goaltracker-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// Notification schedule state (persists while SW is alive)
let scheduleTime = null   // "HH:MM" e.g. "08:00"
let lastFired    = null   // date string "YYYY-MM-DD"
let snapshot     = null   // { habits, tasks, goals, today }

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE') {
    scheduleTime = e.data.time
    snapshot     = e.data.snapshot
  }
  if (e.data?.type === 'CANCEL') {
    scheduleTime = null
  }
  // Catch-up trigger from the page when the SW missed the scheduled time
  // (common on iOS / when the browser was closed overnight).
  if (e.data?.type === 'FIRE_NOW' && e.data.snapshot) {
    lastFired = e.data.today
    fireNotification(e.data.snapshot, e.data.today)
  }
})

function localDateString(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Check every 30 seconds whether it's time to fire
setInterval(() => {
  if (!scheduleTime || !snapshot) return
  const now  = new Date()
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const today = localDateString(now)
  if (hhmm < scheduleTime)    return   // not time yet
  if (lastFired === today)    return   // already fired today
  lastFired = today
  fireNotification(snapshot, today)
  // Tell any open page to mark this fired, so the catch-up logic doesn't double-fire
  self.clients.matchAll().then(list => list.forEach(c => c.postMessage({ type: 'FIRED', today })))
}, 30000)

function fireNotification({ habits = [], tasks = [], goals = [] }, today) {
  const pendingHabits = habits.filter(h => !h.archived && !h.completions?.includes(today))
  const dueTasks      = tasks.filter(t => !t.completed && !t.archived && (t.dueDate === today || t.priority === 'high'))
  const activeGoals   = goals.filter(g => g.status === 'active')

  const habitLine = pendingHabits.length
    ? `${pendingHabits.length} habit${pendingHabits.length > 1 ? 's' : ''}: ${pendingHabits.slice(0,3).map(h => h.title).join(', ')}${pendingHabits.length > 3 ? '…' : ''}`
    : 'All habits done!'

  const taskLine = dueTasks.length
    ? `${dueTasks.length} task${dueTasks.length > 1 ? 's' : ''}: ${dueTasks.slice(0,2).map(t => t.title).join(', ')}${dueTasks.length > 2 ? '…' : ''}`
    : 'No urgent tasks'

  const whyLine = activeGoals[0]?.description
    ? `Working towards: ${activeGoals[0].title} — "${activeGoals[0].description.slice(0, 80)}${activeGoals[0].description.length > 80 ? '…' : ''}"`
    : activeGoals[0] ? `Working towards: ${activeGoals[0].title}` : ''

  const body = [habitLine, taskLine, whyLine].filter(Boolean).join('\n')

  self.registration.showNotification("Good morning! Here's your day", {
    body,
    icon:             '/favicon.svg',
    badge:            '/favicon.svg',
    tag:              'morning-briefing',
    requireInteraction: true,
    actions: [
      { action: 'open',    title: 'View Today' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  })
}

self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return existing.navigate('/') }
      return clients.openWindow('/')
    }))
  }
})
