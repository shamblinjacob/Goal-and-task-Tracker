import { useState } from 'react'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'
import CheckInModal from './CheckInModal'
import { useGoals } from '../../hooks/useGoals'

const CATEGORY_META = {
  health:   { label: 'Health',   color: '#10b981' },
  career:   { label: 'Career',   color: '#3b82f6' },
  personal: { label: 'Personal', color: '#8b5cf6' },
  finance:  { label: 'Finance',  color: '#f59e0b' },
  learning: { label: 'Learning', color: '#ec4899' },
  other:    { label: 'Other',    color: '#6b7280' },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function checkInDue(goal) {
  if (goal.status !== 'active') return false
  if (!goal.lastCheckIn) return true
  return Math.floor((new Date() - new Date(goal.lastCheckIn)) / 86400000) >= 7
}

function formatShortDate(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GoalCard({ goal, taskCount, completedTaskCount, onEdit, onDelete, onSetProgress, onComplete, onArchive }) {
  const { checkInGoal } = useGoals()
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput]     = useState(goal.progress)
  const [showCheckIn, setShowCheckIn]         = useState(false)
  const [showJournal, setShowJournal]         = useState(false)

  const meta     = CATEGORY_META[goal.category] || CATEGORY_META.other
  const days     = daysUntil(goal.targetDate)
  const isOverdue = days !== null && days < 0 && goal.status !== 'completed'
  const due      = checkInDue(goal)
  const checkIns = (goal.checkIns || []).slice().reverse()

  function submitProgress(e) {
    e.preventDefault()
    onSetProgress(goal.id, Number(progressInput))
    setEditingProgress(false)
  }

  function handleCheckIn(progress, note) {
    checkInGoal(goal.id, progress, note)
    setShowCheckIn(false)
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 ${goal.status === 'completed' || goal.status === 'archived' ? 'opacity-60' : ''}`}
        style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}18` }}>
                {meta.label}
              </span>
              {goal.status === 'completed' && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">Completed</span>}
              {goal.status === 'archived'  && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Archived</span>}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{goal.title}</h3>
            {goal.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {goal.status === 'active' && (
              <button onClick={() => onComplete(goal.id)} title="Complete" className="p-1.5 rounded-lg hover:bg-green-50 text-gray-300 hover:text-green-600 cursor-pointer transition-colors">
                <Icon name="check-circle" size={15} />
              </button>
            )}
            <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-300 hover:text-gray-600 cursor-pointer transition-colors">
              <Icon name="edit" size={15} />
            </button>
            {goal.status !== 'archived' ? (
              <button onClick={() => onArchive(goal.id)} title="Archive" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
                <Icon name="archive" size={15} />
              </button>
            ) : (
              <button onClick={() => onDelete(goal.id)} title="Delete permanently" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer transition-colors">
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Progress</span>
            {!editingProgress ? (
              <button onClick={() => { setEditingProgress(true); setProgressInput(goal.progress) }} className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer font-medium tabular-nums">
                {goal.progress}%
              </button>
            ) : (
              <form onSubmit={submitProgress} className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={progressInput} onChange={e => setProgressInput(e.target.value)}
                  className="w-12 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 tabular-nums" autoFocus />
                <span className="text-xs text-gray-400">%</span>
                <button type="submit" className="text-xs text-blue-600 font-medium cursor-pointer">Set</button>
                <button type="button" onClick={() => setEditingProgress(false)} className="text-gray-400 cursor-pointer"><Icon name="x" size={12} /></button>
              </form>
            )}
          </div>
          <ProgressBar value={goal.progress} color={meta.color} height={6} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{taskCount > 0 ? `${completedTaskCount}/${taskCount} tasks` : 'No tasks linked'}</span>
          <div className="flex items-center gap-2">
            {goal.status === 'active' && days !== null && (
              <span className={isOverdue ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-400'}>
                {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Check-in due button */}
        {due && (
          <button
            onClick={() => setShowCheckIn(true)}
            className="w-full py-2 rounded-lg border border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon name="trending-up" size={13} />
            Weekly check-in due
          </button>
        )}

        {/* Journal toggle */}
        {checkIns.length > 0 && (
          <button
            onClick={() => setShowJournal(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors w-fit"
          >
            <Icon name={showJournal ? 'chevron-down' : 'chevron-right'} size={12} />
            <Icon name="book" size={12} />
            {checkIns.length} journal entr{checkIns.length === 1 ? 'y' : 'ies'}
          </button>
        )}

        {/* Journal timeline */}
        {showJournal && (
          <div className="space-y-2 pt-1 border-t border-gray-50">
            {checkIns.map((entry, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-300 mt-0.5 shrink-0" />
                  {i < checkIns.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                </div>
                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-600">{formatShortDate(entry.date)}</span>
                    <span className="text-blue-600 font-semibold tabular-nums">{entry.progress}%</span>
                  </div>
                  {entry.note && <p className="text-gray-500 leading-relaxed">{entry.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCheckIn && (
        <CheckInModal goal={goal} onSubmit={handleCheckIn} onClose={() => setShowCheckIn(false)} />
      )}
    </>
  )
}
