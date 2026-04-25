import { useState, useEffect } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useTasks } from '../../hooks/useTasks'
import GoalCard from './GoalCard'
import WeeklyGoalCard from './WeeklyGoalCard'
import GoalForm from './GoalForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import Icon from '../shared/Icon'

const FILTERS = [
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Done' },
  { value: 'archived',  label: 'Archived' },
]

export default function GoalsPage({ fabTrigger = 0 }) {
  const { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal, archiveGoal, restoreGoal, reorderGoals } = useGoals()
  const { getTasksForGoal } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [filter, setFilter]     = useState('active')
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => { if (fabTrigger > 0) setShowForm(true) }, [fabTrigger])

  const filtered       = goals.filter(g => g.status === filter)
  const weeklyGoals    = filtered.filter(g => g.type === 'weekly')
  const regularGoals   = filtered.filter(g => g.type !== 'weekly')

  function handleAdd(data)  { addGoal(data); setShowForm(false) }
  function handleEdit(data) { updateGoal(editing.id, data); setEditing(null) }

  function handleDrop() {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      const next = [...regularGoals]
      const [item] = next.splice(dragFrom, 1)
      next.splice(dragOver, 0, item)
      reorderGoals([...weeklyGoals, ...next])
    }
    setDragFrom(null)
    setDragOver(null)
  }

  const isEmpty = filtered.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-400 text-xs mt-0.5">Long-term targets and weekly recurring goals</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          <Icon name="plus" size={15} />
          New goal
        </button>
      </div>

      <div className="flex gap-1.5 mb-5">
        {FILTERS.map(f => {
          const count = goals.filter(g => g.status === f.value).length
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                filter === f.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.label} <span className="opacity-50 text-xs ml-0.5">{count}</span>
            </button>
          )
        })}
      </div>

      {isEmpty ? (
        <EmptyState
          icon="target"
          title={filter === 'archived' ? 'Nothing archived' : filter === 'completed' ? 'No completed goals yet' : 'No goals yet'}
          subtitle={filter === 'archived' ? 'Archived goals appear here.' : filter === 'completed' ? 'Completed goals will appear here.' : 'Add a long-term goal or a weekly recurring goal to get started.'}
          action={filter === 'active' ? { label: 'Add your first goal', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-5">

          {/* Weekly recurring goals */}
          {weeklyGoals.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weekly recurring</h2>
              <div className="space-y-3">
                {weeklyGoals.map(goal => (
                  <WeeklyGoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={filter === 'active' ? setEditing : undefined}
                    onArchive={filter === 'active' ? archiveGoal : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Long-term goals */}
          {regularGoals.length > 0 && (
            <section>
              {weeklyGoals.length > 0 && (
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Long-term goals</h2>
              )}
              {filter === 'active' && regularGoals.length > 1 && (
                <p className="text-xs text-gray-400 mb-2">Drag <Icon name="grip-vertical" size={11} className="inline" /> to reorder</p>
              )}
              <div className="space-y-3">
                {regularGoals.map((goal, i) => {
                  const goalTasks = getTasksForGoal(goal.id)
                  return (
                    <div
                      key={goal.id}
                      draggable={filter === 'active'}
                      onDragStart={() => setDragFrom(i)}
                      onDragEnter={() => setDragOver(i)}
                      onDragOver={e => e.preventDefault()}
                      onDragEnd={handleDrop}
                      className={`transition-opacity ${dragFrom === i ? 'opacity-40' : ''}`}
                      style={dragOver === i && dragFrom !== i ? { boxShadow: '0 -2px 0 0 #3b82f6', borderRadius: '12px' } : {}}
                    >
                      <GoalCard
                        goal={goal}
                        taskCount={goalTasks.length}
                        completedTaskCount={goalTasks.filter(t => t.completed).length}
                        onEdit={setEditing}
                        onDelete={deleteGoal}
                        onSetProgress={setProgress}
                        onComplete={completeGoal}
                        onArchive={archiveGoal}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {filter === 'archived' && filtered.length > 0 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 mb-2">Restore a goal to make it active again</p>
              {filtered.map(g => (
                <button key={g.id} onClick={() => restoreGoal(g.id)} className="text-xs text-blue-500 hover:underline cursor-pointer mr-3">
                  Restore "{g.title}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && <Modal title="New goal" onClose={() => setShowForm(false)}><GoalForm onSubmit={handleAdd} /></Modal>}
      {editing   && <Modal title="Edit goal" onClose={() => setEditing(null)}><GoalForm onSubmit={handleEdit} initial={editing} /></Modal>}
    </div>
  )
}
