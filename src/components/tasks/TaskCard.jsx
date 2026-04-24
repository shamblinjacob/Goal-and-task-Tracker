import Icon from '../shared/Icon'

const PRIORITY_META = {
  high:   { color: '#ef4444', label: 'High' },
  medium: { color: '#f59e0b', label: 'Medium' },
  low:    { color: '#10b981', label: 'Low' },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

export default function TaskCard({ task, goalTitle, onToggle, onEdit, onDelete }) {
  const meta = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const days = daysUntil(task.dueDate)
  const isOverdue = days !== null && days < 0 && !task.completed

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-3.5 flex items-start gap-3 transition-opacity ${task.completed ? 'opacity-40' : ''}`}>
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
          task.completed ? 'border-blue-500 bg-blue-500' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {task.completed && <Icon name="check" size={10} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
              <Icon name="edit" size={13} />
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />
            {meta.label}
          </span>
          {goalTitle && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-28">
              {goalTitle}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              <Icon name="calendar" size={11} />
              {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
