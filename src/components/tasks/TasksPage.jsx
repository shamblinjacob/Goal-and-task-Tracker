import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useGoals } from '../../hooks/useGoals'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import Icon from '../shared/Icon'

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
    .filter(t => filter === 'pending' ? !t.completed : filter === 'completed' ? t.completed : true)
    .filter(t => goalFilter === 'all' ? true : t.goalId === goalFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  function handleAdd(data) { addTask(data); setShowForm(false) }
  function handleEdit(data) { updateTask(editing.id, data); setEditing(null) }

  const goalMap = Object.fromEntries(goals.map(g => [g.id, g]))

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-400 text-xs mt-0.5">Short-term actions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          <Icon name="plus" size={15} />
          New task
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1.5">
          {FILTERS.map(f => {
            const count = f.value === 'all' ? tasks.length : tasks.filter(t => f.value === 'pending' ? !t.completed : t.completed).length
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  filter === f.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f.label} <span className="opacity-50 text-xs ml-0.5">{count}</span>
              </button>
            )
          })}
        </div>
        {goals.length > 0 && (
          <select
            value={goalFilter}
            onChange={e => setGoalFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-500"
          >
            <option value="all">All goals</option>
            <option value="">No goal</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="check-square"
          title={filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          subtitle={filter === 'completed' ? 'Completed tasks will appear here.' : 'Break your goals down into actionable steps.'}
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
