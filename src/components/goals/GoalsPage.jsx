import { useState } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useTasks } from '../../hooks/useTasks'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal } = useGoals()
  const { getTasksForGoal } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('active')

  const filtered = goals.filter(g => filter === 'all' ? true : g.status === filter)

  function handleAdd(data) {
    addGoal(data)
    setShowForm(false)
  }

  function handleEdit(data) {
    updateGoal(editing.id, data)
    setEditing(null)
  }

  const FILTERS = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Long-term Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Set big-picture targets and track your progress over time.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
          style={{ background: '#3b82f6' }}
        >
          <span className="text-lg leading-none">+</span> New goal
        </button>
      </div>

      <div className="flex gap-2 mb-6">
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
              {f.value === 'all' ? goals.length : goals.filter(g => g.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title={filter === 'completed' ? 'No completed goals yet' : 'No goals yet'}
          subtitle={filter === 'completed' ? 'Keep going — completed goals will appear here.' : 'Set your first big-picture goal to get started.'}
          action={filter !== 'completed' ? { label: 'Add your first goal', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(goal => {
            const goalTasks = getTasksForGoal(goal.id)
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                taskCount={goalTasks.length}
                completedTaskCount={goalTasks.filter(t => t.completed).length}
                onEdit={setEditing}
                onDelete={deleteGoal}
                onSetProgress={setProgress}
                onComplete={completeGoal}
              />
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title="New goal" onClose={() => setShowForm(false)}>
          <GoalForm onSubmit={handleAdd} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit goal" onClose={() => setEditing(null)}>
          <GoalForm onSubmit={handleEdit} initial={editing} />
        </Modal>
      )}
    </div>
  )
}
