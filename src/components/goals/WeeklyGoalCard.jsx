import { useState } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { toDateString } from '../../utils/dateUtils'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  // Monday as week start
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: toDateString(start),
    end:   toDateString(end),
  }
}

function fmt(val) {
  return Number.isInteger(val) ? val : parseFloat(val.toFixed(2))
}

export default function WeeklyGoalCard({ goal, onEdit, onDelete, onArchive }) {
  const { logWeeklyEntry, deleteWeeklyEntry } = useGoals()
  const [logValue, setLogValue] = useState('')
  const [logNote,  setLogNote]  = useState('')
  const [showLog,  setShowLog]  = useState(false)
  const [showAll,  setShowAll]  = useState(false)

  const { start, end } = getWeekBounds()
  const allEntries  = goal.entries || []
  const weekEntries = allEntries.filter(e => e.date >= start && e.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date))
  const weekTotal   = weekEntries.reduce((s, e) => s + e.value, 0)
  const exceeded    = weekTotal > goal.target
  const pct         = goal.target > 0 ? Math.min(100, Math.round((weekTotal / goal.target) * 100)) : 0
  const remaining   = Math.max(0, goal.target - weekTotal)

  async function handleLog(e) {
    e.preventDefault()
    const val = parseFloat(logValue)
    if (!val || val <= 0) return
    await logWeeklyEntry(goal.id, val, logNote.trim())
    setLogValue('')
    setLogNote('')
    setShowLog(false)
  }

  const barColor = exceeded ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{goal.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Target: {goal.target} {goal.unit} / week
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 cursor-pointer">
              <Icon name="edit" size={13} />
            </button>
          )}
          {onArchive && (
            <button onClick={() => onArchive(goal.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 cursor-pointer">
              <Icon name="archive" size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-1 flex items-end justify-between">
        <span className="text-xs text-gray-500">
          <span className="text-lg font-bold text-gray-900 tabular-nums">{fmt(weekTotal)}</span>
          <span className="ml-1">{goal.unit} this week</span>
        </span>
        <span className="text-xs tabular-nums" style={{ color: barColor }}>
          {exceeded
            ? `+${fmt(weekTotal - goal.target)} over target`
            : `${fmt(remaining)} ${goal.unit} to go`}
        </span>
      </div>
      <ProgressBar value={pct} color={barColor} height={7} />
      {exceeded && (
        <p className="text-xs text-green-600 font-medium mt-1.5">
          Target hit! Keep going — every {goal.unit.replace(/s$/, '')} counts.
        </p>
      )}

      {/* This week's entries */}
      {weekEntries.length > 0 && (
        <div className="mt-3 space-y-1">
          {(showAll ? weekEntries : weekEntries.slice(0, 3)).map(entry => (
            <div key={entry.id} className="flex items-center justify-between text-xs text-gray-500">
              <span>
                <span className="font-medium text-gray-700">{fmt(entry.value)} {goal.unit}</span>
                {entry.note && <span className="text-gray-400"> — {entry.note}</span>}
                <span className="text-gray-300 ml-1.5">{entry.date}</span>
              </span>
              <button
                onClick={() => deleteWeeklyEntry(goal.id, entry.id)}
                className="ml-2 p-0.5 rounded text-gray-300 hover:text-red-400 cursor-pointer"
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
          {weekEntries.length > 3 && (
            <button onClick={() => setShowAll(v => !v)} className="text-xs text-blue-500 hover:underline cursor-pointer">
              {showAll ? 'Show less' : `Show all ${weekEntries.length} entries`}
            </button>
          )}
        </div>
      )}

      {/* Log entry */}
      {showLog ? (
        <form onSubmit={handleLog} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="number" min="0.01" step="any"
              value={logValue} onChange={e => setLogValue(e.target.value)}
              placeholder={`${goal.unit} today`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            <input
              type="text"
              value={logNote} onChange={e => setLogNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90"
              style={{ background: '#3b82f6' }}
            >
              Log {goal.unit}
            </button>
            <button
              type="button"
              onClick={() => { setShowLog(false); setLogValue(''); setLogNote('') }}
              className="px-3 py-2 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowLog(true)}
          className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
        >
          <Icon name="plus" size={14} />
          Log {goal.unit}
        </button>
      )}
    </div>
  )
}
