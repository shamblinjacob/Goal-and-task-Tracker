import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'
import Icon from '../shared/Icon'

// The Scriptable JS that runs on the user's phone. Renders a medium (4×2)
// home-screen widget showing today's habits, top tasks, and the leading goal.
function buildScript(snapshotUrl) {
  return `// GoalTracker widget — paste into Scriptable, then add the medium widget
// to your home screen and select this script.

const SNAPSHOT_URL = "${snapshotUrl}"

const now = new Date()
const today = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`

let data = { habitsDone: 0, habitsTotal: 0, tasks: [], topGoal: null }
try {
  const req = new Request(\`\${SNAPSHOT_URL}&today=\${today}\`)
  req.timeoutInterval = 10
  data = await req.loadJSON()
} catch (e) { /* keep defaults on network failure */ }

const w = new ListWidget()
w.backgroundColor = new Color("#ffffff")
w.setPadding(14, 16, 14, 16)
w.url = "https://goaltracker.app" // change if you have a different deployed URL

// Header row
const head = w.addStack()
head.centerAlignContent()
const t1 = head.addText("Today")
t1.font = Font.boldSystemFont(13)
t1.textColor = new Color("#111827")
head.addSpacer()
const allDone = data.habitsTotal > 0 && data.habitsDone === data.habitsTotal
const hStat = head.addText(\`\${data.habitsDone}/\${data.habitsTotal} habits\${allDone ? " ✓" : ""}\`)
hStat.font = Font.semiboldSystemFont(11)
hStat.textColor = allDone ? new Color("#10b981") : new Color("#6b7280")

w.addSpacer(8)

// Tasks
if (!data.tasks || data.tasks.length === 0) {
  const e = w.addText("✨  Nothing urgent today")
  e.font = Font.systemFont(12)
  e.textColor = new Color("#9ca3af")
} else {
  for (const t of data.tasks.slice(0, 3)) {
    const row = w.addStack()
    row.centerAlignContent()

    const dot = row.addText("●")
    dot.font = Font.systemFont(9)
    dot.textColor = priorityColor(t.priority)

    row.addSpacer(8)

    const tt = row.addText(t.title)
    tt.font = Font.systemFont(12)
    tt.textColor = new Color("#1f2937")
    tt.lineLimit = 1

    row.addSpacer()

    if (t.due) {
      const dd = row.addText(t.due)
      dd.font = Font.semiboldSystemFont(10)
      dd.textColor = t.due.includes("overdue") ? new Color("#ef4444")
                   : t.due === "Today"          ? new Color("#f59e0b")
                   :                              new Color("#9ca3af")
    }

    w.addSpacer(4)
  }
}

w.addSpacer()

// Goal footer
if (data.topGoal) {
  const g = w.addStack()
  g.centerAlignContent()
  const gt = g.addText(data.topGoal.title)
  gt.font = Font.semiboldSystemFont(10)
  gt.textColor = new Color("#3b82f6")
  gt.lineLimit = 1
  g.addSpacer()
  const gp = g.addText(\`\${data.topGoal.progress}%\`)
  gp.font = Font.boldSystemFont(10)
  gp.textColor = new Color("#3b82f6")
}

function priorityColor(p) {
  if (p === "high")   return new Color("#ef4444")
  if (p === "medium") return new Color("#f59e0b")
  return new Color("#10b981")
}

// Refresh hint — Scriptable still controls actual refresh cadence
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

Script.setWidget(w)
Script.complete()`
}

function CopyBox({ value, label, lines = 6 }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <button
          onClick={copy}
          className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer flex items-center gap-1"
        >
          <Icon name={copied ? 'check' : 'copy'} size={11} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-2.5 overflow-auto font-mono leading-snug text-gray-700"
        style={{ maxHeight: `${lines * 16}px` }}
      >{value}</pre>
    </div>
  )
}

export default function WidgetPanel() {
  const { widgetToken, generateWidgetToken, clearWidgetToken, isFirebaseConfigured } = useDataContext()
  const [open, setOpen]     = useState(false)
  const [busy, setBusy]     = useState(false)

  const origin       = typeof window !== 'undefined' ? window.location.origin : ''
  const snapshotUrl  = widgetToken ? `${origin}/.netlify/functions/widget-snapshot?token=${widgetToken}` : ''
  const script       = widgetToken ? buildScript(snapshotUrl) : ''

  async function handleGenerate() {
    setBusy(true)
    try { await generateWidgetToken() }
    finally { setBusy(false) }
  }

  async function handleReset() {
    if (!confirm('This will invalidate the current widget URL. The widget on your phone will need the new script.')) return
    setBusy(true)
    try {
      await clearWidgetToken()
      await generateWidgetToken()
    } finally { setBusy(false) }
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-400">
        The home-screen widget needs Firebase sync enabled (so your phone can read your data).
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-gray-100">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-2">
          <Icon name="grid" size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">iPhone home-screen widget</span>
          {widgetToken && <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">Active</span>}
        </div>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!widgetToken ? (
            <>
              <p className="text-xs text-gray-500 leading-relaxed">
                Get a 4×2 widget on your iPhone home screen showing today's tasks, habits, and top goal.
                Generate a private URL, then paste a small script into the free <span className="font-semibold">Scriptable</span> app.
              </p>
              <button
                onClick={handleGenerate}
                disabled={busy}
                className="w-full py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
                style={{ background: '#3b82f6' }}
              >
                {busy ? 'Generating…' : 'Generate widget URL'}
              </button>
            </>
          ) : (
            <>
              <ol className="text-xs text-gray-600 space-y-1.5 leading-relaxed list-decimal pl-4">
                <li>Install <span className="font-semibold">Scriptable</span> from the App Store (free).</li>
                <li>Open Scriptable → tap <span className="font-semibold">+</span> → paste the script below → name it "GoalTracker" → tap Done.</li>
                <li>Long-press your home screen → <span className="font-semibold">+</span> → search "Scriptable" → choose <span className="font-semibold">medium</span> size → Add Widget.</li>
                <li>Long-press the widget → <span className="font-semibold">Edit Widget</span> → set <span className="font-semibold">Script</span> to "GoalTracker".</li>
              </ol>

              <CopyBox value={script} label="Scriptable script" lines={10} />

              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">Snapshot URL (advanced)</summary>
                <div className="mt-2">
                  <CopyBox value={snapshotUrl} label="Private URL — keep this secret" lines={2} />
                </div>
              </details>

              <button
                onClick={handleReset}
                disabled={busy}
                className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
              >
                {busy ? 'Working…' : 'Regenerate URL (revokes the old one)'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
