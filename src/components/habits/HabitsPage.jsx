import { useState } from 'react'
import { useHabits } from '../../hooks/useHabits'
import { useGoals } from '../../hooks/useGoals'
import HabitCard from './HabitCard'
import HabitForm from './HabitForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit, isCompletedToday } = useHabits()
  const { goals } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const goalMap = Object.fromEntries(goals.map(g => [g.id, g]))
  const doneToday = habits.filter(h => isCompletedToday(h)).length
  const total = habits.length

  function handleAdd(data) {
    addHabit(data)
    setShowForm(false)
  }

  function handleEdit(data) {
    updateHabit(editing.id, data)
    setEditing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Habits</h1>
          <p className="text-gray-500 text-sm mt-1">Build consistency with daily routines.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
          style={{ background: '#3b82f6' }}
        >
          <span className="text-lg leading-none">+</span> New habit
        </button>
      </div>

      {total > 0 && (
        <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-3xl font-bold text-gray-900">
            {doneToday}/{total}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">habits done today</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {doneToday === total
                ? '🎉 Perfect day! All habits complete.'
                : doneToday === 0
                ? 'Get started — mark your first habit for today!'
                : `${total - doneToday} remaining for today`}
            </div>
          </div>
          {total > 0 && (
            <div className="ml-auto flex-1 max-w-32">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-400 transition-all duration-500"
                  style={{ width: `${(doneToday / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {habits.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="No habits yet"
          subtitle="Add daily habits to build consistent routines and track your streaks."
          action={{ label: 'Add your first habit', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              goalTitle={habit.goalId ? goalMap[habit.goalId]?.title : null}
              onEdit={setEditing}
              onDelete={deleteHabit}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="New habit" onClose={() => setShowForm(false)}>
          <HabitForm onSubmit={handleAdd} goals={goals} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit habit" onClose={() => setEditing(null)}>
          <HabitForm onSubmit={handleEdit} initial={editing} goals={goals} />
        </Modal>
      )}
    </div>
  )
}
