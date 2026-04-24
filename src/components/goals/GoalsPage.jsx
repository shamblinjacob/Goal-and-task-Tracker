import { useState } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useTasks } from '../../hooks/useTasks'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import Icon from '../shared/Icon'

const FILTERS = [
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Done' },
  { value: 'all',       label: 'All' },
]

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal } = useGoals()
  const { getTasksForGoal } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('active')

  const filtered = goals.filter(g => filter === 'all' ? true : g.status === filter)

  function handleAdd(data) { addGoal(data); setShowForm(false) }
  function handleEdit(data) { updateGoal(editing.id, data); setEditing(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-400 text-xs mt-0.5">Long-term targets and progress</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          <Icon name="plus" size={15} />
          New goal
        </button>
      </div>

      <div className="flex gap-1.5 mb-5">
        {FILTERS.map(f => {
          const count = f.value === 'all' ? goals.length : goals.filter(g => g.status === f.value).length
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

      {filtered.length === 0 ? (
        <EmptyState
          icon="target"
          title={filter === 'completed' ? 'No completed goals yet' : 'No goals yet'}
          subtitle={filter === 'completed' ? 'Completed goals will appear here.' : 'Add your first long-term goal to get started.'}
          action={filter !== 'completed' ? { label: 'Add your first goal', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
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
