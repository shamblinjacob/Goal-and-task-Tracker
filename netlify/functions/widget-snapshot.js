// Returns the daily snapshot for the iOS Scriptable widget.
//
//   GET /.netlify/functions/widget-snapshot?token=XYZ&today=2026-04-27
//
// The token is looked up in Firestore (collection `widget_tokens`) to find the
// associated workspaceId; the function then reads tasks/habits/goals via the
// Firestore REST API (which works because the project's existing security
// model already allows unauthenticated reads from the client).
//
// Env vars required (already present from VITE_ build-time vars):
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_API_KEY

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID
const API_KEY    = process.env.VITE_FIREBASE_API_KEY

const REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// ── Firestore REST helpers ──────────────────────────────────────────────────

function unwrap(v) {
  if (!v) return null
  if (v.stringValue    !== undefined) return v.stringValue
  if (v.integerValue   !== undefined) return Number(v.integerValue)
  if (v.doubleValue    !== undefined) return v.doubleValue
  if (v.booleanValue   !== undefined) return v.booleanValue
  if (v.nullValue      !== undefined) return null
  if (v.timestampValue !== undefined) return v.timestampValue
  if (v.arrayValue) return (v.arrayValue.values || []).map(unwrap)
  if (v.mapValue)   return flatten(v.mapValue.fields || {})
  return null
}

function flatten(fields = {}) {
  const out = {}
  for (const [k, v] of Object.entries(fields)) out[k] = unwrap(v)
  return out
}

async function getDoc(path) {
  const res = await fetch(`${REST_BASE}/${path}?key=${API_KEY}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { id: path.split('/').pop(), ...flatten(data.fields) }
}

async function listDocs(path) {
  const docs = []
  let pageToken = ''
  do {
    const url = `${REST_BASE}/${path}?key=${API_KEY}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`)
    const data = await res.json()
    for (const d of data.documents || []) {
      docs.push({ id: d.name.split('/').pop(), ...flatten(d.fields) })
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return docs
}

// ── Snapshot computation ────────────────────────────────────────────────────

function dueLabel(dueDate, today) {
  if (!dueDate) return ''
  const a = new Date(dueDate + 'T12:00:00')
  const b = new Date(today    + 'T12:00:00')
  const days = Math.round((a - b) / 86400000)
  if (days <  0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

function priorityRank(p) {
  if (p === 'high')   return 0
  if (p === 'medium') return 1
  return 2
}

function isRecurringDone(task, today) {
  if (!task.recurring || !task.lastCompletedDate) return false
  if (task.recurring === 'daily')   return task.lastCompletedDate === today
  if (task.recurring === 'monthly') return task.lastCompletedDate.slice(0, 7) === today.slice(0, 7)
  if (task.recurring === 'weekly') {
    // Monday-based week start
    const d   = new Date(today + 'T12:00:00')
    const dow = d.getDay()
    const start = new Date(d)
    start.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    const startStr = start.toISOString().slice(0, 10)
    return task.lastCompletedDate >= startStr
  }
  return false
}

function pickTopTasks(tasks, today) {
  const open = tasks.filter(t => {
    if (t.archived) return false
    if (t.recurring) return !isRecurringDone(t, today)
    return !t.completed
  })

  open.sort((a, b) => {
    const aOver = a.dueDate && a.dueDate <  today
    const bOver = b.dueDate && b.dueDate <  today
    const aDue  = a.dueDate && a.dueDate === today
    const bDue  = b.dueDate && b.dueDate === today
    if (aOver !== bOver) return aOver ? -1 : 1            // overdue first
    if (aDue  !== bDue)  return aDue  ? -1 : 1            // then due today
    const pr = priorityRank(a.priority) - priorityRank(b.priority)
    if (pr !== 0) return pr                               // then by priority
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) // sooner first
    if (a.dueDate) return -1
    if (b.dueDate) return  1
    return 0
  })

  return open.slice(0, 3).map(t => ({
    title:    t.title || '',
    due:      dueLabel(t.dueDate, today),
    priority: t.priority || 'medium',
  }))
}

function pickTopGoal(goals) {
  const active = goals.filter(g => g.status === 'active' && g.type !== 'weekly')
  if (active.length === 0) return null
  active.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return b.order - a.order
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return  1
    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })
  const g = active[0]
  return { title: g.title || '', progress: Number(g.progress) || 0 }
}

function habitStats(habits, today) {
  const active = habits.filter(h => !h.archived)
  const done   = active.filter(h => Array.isArray(h.completions) && h.completions.includes(today))
  return { habitsDone: done.length, habitsTotal: active.length }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async (req) => {
  if (!PROJECT_ID || !API_KEY) {
    return Response.json({ error: 'Server not configured' }, { status: 500 })
  }

  const url   = new URL(req.url)
  const token = url.searchParams.get('token')
  const today = url.searchParams.get('today') || new Date().toISOString().slice(0, 10)

  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  try {
    const tokenDoc = await getDoc(`widget_tokens/${token}`)
    if (!tokenDoc?.workspaceId) {
      return Response.json({ error: 'Invalid token' }, { status: 401 })
    }
    const workspaceId = tokenDoc.workspaceId

    const [tasks, habits, goals] = await Promise.all([
      listDocs(`workspaces/${workspaceId}/tasks`),
      listDocs(`workspaces/${workspaceId}/habits`),
      listDocs(`workspaces/${workspaceId}/goals`),
    ])

    const snapshot = {
      today,
      ...habitStats(habits, today),
      tasks:   pickTopTasks(tasks, today),
      topGoal: pickTopGoal(goals),
      generatedAt: new Date().toISOString(),
    }

    return new Response(JSON.stringify(snapshot), {
      status:  200,
      headers: {
        'content-type':  'application/json',
        // Scriptable refreshes ~every 15 min; allow short edge caching
        'cache-control': 'public, max-age=60',
      },
    })
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 502 })
  }
}
