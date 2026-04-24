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
  const days = Math.floor((new Date() - new Date(goal.lastCheckIn)) / 86400000)
  return days >= 7
}

export default function GoalCard({ goal, taskCount, completedTaskCount, onEdit, onDelete, onSetProgress, onComplete }) {
  const { checkInGoal } = useGoals()
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState(goal.progress)
  const [showCheckIn, setShowCheckIn] = useState(false)

  const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
  const days = daysUntil(goal.targetDate)
  const isOverdue = days !== null && days < 0 && goal.status !== 'completed'
  const due = checkInDue(goal)

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
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 ${goal.status === 'completed' ? 'opacity-60' : ''}`}
        style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ color: meta.color, background: `${meta.color}18` }}
              >
                {meta.label}
              </span>
              {goal.status === 'completed' && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">Done</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{goal.title}</h3>
            {goal.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {goal.status !== 'completed' && (
              <button
                onClick={() => onComplete(goal.id)}
                title="Mark complete"
                className="p-1.5 rounded-lg hover:bg-green-50 text-gray-300 hover:text-green-600 cursor-pointer transition-colors"
              >
                <Icon name="check-circle" size={15} />
              </button>
            )}
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-300 hover:text-gray-600 cursor-pointer transition-colors"
            >
              <Icon name="edit" size={15} />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer transition-colors"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Progress</span>
            {!editingProgress ? (
              <button
                onClick={() => { setEditingProgress(true); setProgressInput(goal.progress) }}
                className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer font-medium tabular-nums"
              >
                {goal.progress}%
              </button>
            ) : (
              <form onSubmit={submitProgress} className="flex items-center gap-1">
                <input
                  type="number" min={0} max={100}
                  value={progressInput}
                  onChange={e => setProgressInput(e.target.value)}
                  className="w-12 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 tabular-nums"
                  autoFocus
                />
                <span className="text-xs text-gray-400">%</span>
                <button type="submit" className="text-xs text-blue-600 font-medium cursor-pointer">Set</button>
                <button type="button" onClick={() => setEditingProgress(false)} className="text-xs text-gray-400 cursor-pointer">
                  <Icon name="x" size={12} />
                </button>
              </form>
            )}
          </div>
          <ProgressBar value={goal.progress} color={meta.color} height={6} />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{taskCount > 0 ? `${completedTaskCount}/${taskCount} tasks` : 'No tasks linked'}</span>
          <div className="flex items-center gap-2">
            {goal.status === 'active' && days !== null && (
              <span className={`${isOverdue ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
              </span>
            )}
          </div>
        </div>

        {due && (
          <button
            onClick={() => setShowCheckIn(true)}
            className="w-full py-2 rounded-lg border border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon name="trending-up" size={13} />
            Weekly check-in due
          </button>
        )}
      </div>

      {showCheckIn && (
        <CheckInModal goal={goal} onSubmit={handleCheckIn} onClose={() => setShowCheckIn(false)} />
      )}
    </>
  )
}
