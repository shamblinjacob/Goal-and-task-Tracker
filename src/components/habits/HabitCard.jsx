import { useHabits } from '../../hooks/useHabits'
import Icon from '../shared/Icon'
import SwipeableItem from '../shared/SwipeableItem'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function HabitInner({ habit, goalTitle, onEdit, onArchive, onRestore }) {
  const { toggleToday, isCompletedToday, getStreak, getLast7 } = useHabits()
  const done   = isCompletedToday(habit)
  const streak = getStreak(habit)
  const last7  = getLast7(habit)

  return (
    <div className={`bg-white rounded-xl border p-4 flex flex-col gap-3 transition-colors ${done ? 'border-green-200' : 'border-gray-100'} ${habit.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{habit.title}</h3>
          {habit.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{habit.description}</p>}
          {goalTitle && (
            <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-full">{goalTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {habit.archived ? (
            <button onClick={() => onRestore(habit.id)} className="text-xs text-blue-500 hover:underline cursor-pointer px-2 py-1">Restore</button>
          ) : (
            <>
              <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
                <Icon name="edit" size={14} />
              </button>
              <button onClick={() => onArchive(habit.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
                <Icon name="archive" size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1">
        {last7.map((day, i) => {
          const isToday = i === 6
          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-gray-300">{DAY_LABELS[(new Date(day.date + 'T12:00:00')).getDay()]}</span>
              <div className={`w-full rounded transition-colors ${isToday ? 'h-5' : 'h-4'} ${
                day.done ? 'bg-green-400' : isToday ? 'bg-gray-100 ring-1 ring-gray-300 ring-offset-0' : 'bg-gray-100'
              }`} />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Icon name="flame" size={14} className={streak > 0 ? 'text-orange-400' : 'text-gray-300'} />
          <span className="font-semibold text-gray-700 tabular-nums">{streak}</span>
          <span className="text-xs text-gray-400">day streak</span>
        </div>
        {!habit.archived && (
          <button
            onClick={() => toggleToday(habit.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {done ? 'Done today' : 'Mark done'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function HabitCard({ habit, goalTitle, onEdit, onDelete, onArchive, onRestore }) {
  const { toggleToday } = useHabits()

  if (habit.archived) {
    return <HabitInner habit={habit} goalTitle={goalTitle} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} />
  }

  return (
    <SwipeableItem
      onComplete={() => toggleToday(habit.id)}
      onArchive={() => onArchive(habit.id)}
      completeLabel="Done"
    >
      <HabitInner habit={habit} goalTitle={goalTitle} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} />
    </SwipeableItem>
  )
}
