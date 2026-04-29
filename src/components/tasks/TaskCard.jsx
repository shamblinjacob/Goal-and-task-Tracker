import Icon from '../shared/Icon'
import SwipeableItem from '../shared/SwipeableItem'
import ConfirmDelete from '../shared/ConfirmDelete'
import { vibrate } from '../../utils/haptics'
import { formatRelativeDate } from '../../utils/dateUtils'

const PRIORITY_META = {
  high:   { color: '#ef4444', label: 'High' },
  medium: { color: '#f59e0b', label: 'Medium' },
  low:    { color: '#10b981', label: 'Low' },
}

const CATEGORY_META = {
  health:   { label: 'Health',   color: '#10b981' },
  career:   { label: 'Career',   color: '#3b82f6' },
  personal: { label: 'Personal', color: '#8b5cf6' },
  finance:  { label: 'Finance',  color: '#f59e0b' },
  learning: { label: 'Learning', color: '#ec4899' },
  other:    { label: 'Other',    color: '#6b7280' },
}

const RECUR_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T12:00:00') - new Date()) / 86400000)
}

export default function TaskCard({ task, goalTitle, onToggle, onEdit, onDelete, onArchive, onRestore, showDragHandle, isRecurringDone }) {
  const meta      = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const days      = daysUntil(task.dueDate)
  const isOverdue = days !== null && days < 0
  const isDone    = task.recurring ? isRecurringDone?.(task) : task.completed

  function handleToggle() {
    vibrate(12)
    onToggle(task.id)
  }

  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 p-3.5 flex items-start gap-3 transition-opacity ${isDone ? 'opacity-40' : ''}`}>
      {showDragHandle && (
        <div className="mt-0.5 text-gray-300 cursor-grab active:cursor-grabbing shrink-0 touch-none" style={{ touchAction: 'none' }}>
          <Icon name="grip-vertical" size={14} />
        </div>
      )}
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
          isDone
            ? (task.recurring ? 'border-indigo-400 bg-indigo-400' : 'border-blue-500 bg-blue-500')
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {isDone && <Icon name="check" size={10} className="text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            {task.archived ? (
              <button onClick={() => onRestore(task.id)} className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-500 cursor-pointer transition-colors text-xs font-medium px-2">
                Restore
              </button>
            ) : (
              <>
                <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
                  <Icon name="edit" size={13} />
                </button>
                <ConfirmDelete onConfirm={() => onDelete(task.id)} size={13} />
              </>
            )}
          </div>
        </div>
        {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />
            {meta.label}
          </span>
          {task.recurring && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex items-center gap-1">
              <Icon name="repeat" size={10} />
              {RECUR_LABEL[task.recurring] || task.recurring}
            </span>
          )}
          {task.category && task.category !== 'other' && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ color: (CATEGORY_META[task.category] || CATEGORY_META.other).color, background: `${(CATEGORY_META[task.category] || CATEGORY_META.other).color}18` }}
            >
              {(CATEGORY_META[task.category] || CATEGORY_META.other).label}
            </span>
          )}
          {goalTitle && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-28">{goalTitle}</span>
          )}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 font-medium ${
              isOverdue && !isDone ? 'text-red-500' :
              days === 0  && !isDone ? 'text-amber-500' :
              'text-gray-400 font-normal'
            }`}>
              <Icon name="calendar" size={11} />
              {isOverdue && !isDone
                ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                : formatRelativeDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (task.archived || isDone) return inner

  return (
    <SwipeableItem
      onComplete={handleToggle}
      onArchive={() => onArchive(task.id)}
      completeLabel="Complete"
    >
      {inner}
    </SwipeableItem>
  )
}
