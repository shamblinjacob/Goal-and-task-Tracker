import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useGoals } from '../../hooks/useGoals'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'

const FILTERS = [
  { value: 'pending',   label: 'To do' },
  { value: 'completed', label: 'Done' },
  { value: 'all',       label: 'All' },
]

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = useTasks()
  const { goals } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [goalFilter, setGoalFilter] = useState('all')

  const filtered = tasks
    .filter(t => {
      if (filter === 'pending') return !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
    .filter(t => goalFilter === 'all' ? true : t.goalId === goalFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  function handleAdd(data) {
    addTask(data)
    setShowForm(false)
  }

  function handleEdit(data) {
    updateTask(editing.id, data)
    setEditing(null)
  }

  const goalMap = Object.fromEntries(goals.map(g => [g.id, g]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Short-term Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">Break your goals into actionable steps.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
          style={{ background: '#3b82f6' }}
        >
          <span className="text-lg leading-none">+</span> New task
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">
                {f.value === 'all' ? tasks.length : tasks.filter(t => f.value === 'pending' ? !t.completed : t.completed).length}
              </span>
            </button>
          ))}
        </div>
        {goals.length > 0 && (
          <select
            value={goalFilter}
            onChange={e => setGoalFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-600"
          >
            <option value="all">All goals</option>
            <option value="">No goal</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="✅"
          title={filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          subtitle={filter === 'completed' ? 'Complete some tasks and they\'ll appear here.' : 'Add your first task to start making progress.'}
          action={filter !== 'completed' ? { label: 'Add your first task', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              goalTitle={task.goalId ? goalMap[task.goalId]?.title : null}
              onToggle={toggleTask}
              onEdit={setEditing}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="New task" onClose={() => setShowForm(false)}>
          <TaskForm onSubmit={handleAdd} goals={goals} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit task" onClose={() => setEditing(null)}>
          <TaskForm onSubmit={handleEdit} initial={editing} goals={goals} />
        </Modal>
      )}
    </div>
  )
}
