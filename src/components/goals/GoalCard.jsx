import { useState } from 'react'
import ProgressBar from '../shared/ProgressBar'

const CATEGORY_META = {
  health:   { emoji: '💪', color: '#10b981' },
  career:   { emoji: '💼', color: '#3b82f6' },
  personal: { emoji: '🌱', color: '#8b5cf6' },
  finance:  { emoji: '💰', color: '#f59e0b' },
  learning: { emoji: '📚', color: '#ec4899' },
  other:    { emoji: '✨', color: '#6b7280' },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

export default function GoalCard({ goal, taskCount, completedTaskCount, onEdit, onDelete, onSetProgress, onComplete }) {
  const [editing, setEditing] = useState(false)
  const [progressInput, setProgressInput] = useState(goal.progress)
  const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
  const days = daysUntil(goal.targetDate)
  const isOverdue = days !== null && days < 0 && goal.status !== 'completed'

  function submitProgress(e) {
    e.preventDefault()
    onSetProgress(goal.id, Number(progressInput))
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-opacity ${goal.status === 'completed' ? 'opacity-60' : ''}`}
      style={{ borderColor: '#e5e7eb', borderLeftWidth: 4, borderLeftColor: meta.color }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl leading-none mt-0.5">{meta.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {goal.status !== 'completed' && (
            <button
              onClick={() => onComplete(goal.id)}
              title="Mark complete"
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 cursor-pointer transition-colors"
            >✓</button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >✎</button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
          >×</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-medium">Progress</span>
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setProgressInput(goal.progress) }}
              className="text-xs text-blue-500 hover:underline cursor-pointer"
            >
              {goal.progress}%
            </button>
          ) : (
            <form onSubmit={submitProgress} className="flex items-center gap-1">
              <input
                type="number"
                min={0} max={100}
                value={progressInput}
                onChange={e => setProgressInput(e.target.value)}
                className="w-14 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
              <span className="text-xs text-gray-500">%</span>
              <button type="submit" className="text-xs text-blue-600 font-medium cursor-pointer">Set</button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 cursor-pointer">✕</button>
            </form>
          )}
        </div>
        <ProgressBar value={goal.progress} color={meta.color} height={8} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {taskCount > 0 ? `${completedTaskCount}/${taskCount} tasks` : 'No linked tasks'}
        </span>
        <div className="flex items-center gap-2">
          {goal.status === 'completed' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>
          )}
          {goal.status === 'active' && days !== null && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
              {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
