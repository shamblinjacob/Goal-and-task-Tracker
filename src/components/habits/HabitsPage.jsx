import { useState } from 'react'
import { useHabits } from '../../hooks/useHabits'
import { useGoals } from '../../hooks/useGoals'
import HabitCard from './HabitCard'
import HabitForm from './HabitForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import Icon from '../shared/Icon'

const FILTERS = [
  { value: 'active',   label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit, isCompletedToday, archiveHabit, restoreHabit } = useHabits()
  const { goals } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [filter, setFilter]     = useState('active')

  const goalMap      = Object.fromEntries(goals.map(g => [g.id, g]))
  const activeHabits = habits.filter(h => !h.archived)
  const doneToday    = activeHabits.filter(h => isCompletedToday(h)).length
  const total        = activeHabits.length
  const pct          = total > 0 ? Math.round((doneToday / total) * 100) : 0

  const filtered = filter === 'active'
    ? activeHabits
    : habits.filter(h => h.archived)

  function handleAdd(data)  { addHabit(data); setShowForm(false) }
  function handleEdit(data) { updateHabit(editing.id, data); setEditing(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Habits</h1>
          <p className="text-gray-400 text-xs mt-0.5">Daily routines and streaks</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          <Icon name="plus" size={15} />
          New habit
        </button>
      </div>

      <div className="flex gap-1.5 mb-5">
        {FILTERS.map(f => {
          const count = f.value === 'active' ? activeHabits.length : habits.filter(h => h.archived).length
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                filter === f.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.label} <span className="opacity-50 text-xs ml-0.5">{count}</span>
            </button>
          )
        })}
      </div>

      {filter === 'active' && total > 0 && (
        <div className="mb-5 p-4 bg-white rounded-xl border border-gray-100 flex items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{doneToday}/{total}</div>
            <div className="text-xs text-gray-400 mt-0.5">habits done today</div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {doneToday === total && total > 0 ? 'All done for today' : `${total - doneToday} remaining`}
            </div>
          </div>
        </div>
      )}

      {filter === 'active' && total > 0 && (
        <p className="text-xs text-gray-400 mb-3">Swipe right to mark done · swipe left to archive</p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="repeat"
          title={filter === 'archived' ? 'Nothing archived' : 'No habits yet'}
          subtitle={filter === 'archived' ? 'Archived habits appear here.' : 'Add daily habits to build consistent routines and track streaks.'}
          action={filter === 'active' ? { label: 'Add your first habit', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              goalTitle={habit.goalId ? goalMap[habit.goalId]?.title : null}
              onEdit={setEditing}
              onDelete={deleteHabit}
              onArchive={archiveHabit}
              onRestore={restoreHabit}
            />
          ))}
        </div>
      )}

      {showForm && <Modal title="New habit" onClose={() => setShowForm(false)}><HabitForm onSubmit={handleAdd} goals={goals} /></Modal>}
      {editing   && <Modal title="Edit habit" onClose={() => setEditing(null)}><HabitForm onSubmit={handleEdit} initial={editing} goals={goals} /></Modal>}
    </div>
  )
}
