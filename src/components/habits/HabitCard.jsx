import { useHabits } from '../../hooks/useHabits'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function HabitCard({ habit, goalTitle, onEdit, onDelete }) {
  const { toggleToday, isCompletedToday, getStreak, getLast7 } = useHabits()
  const done = isCompletedToday(habit)
  const streak = getStreak(habit)
  const last7 = getLast7(habit)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all ${done ? 'border-green-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{habit.title}</h3>
          {habit.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{habit.description}</p>
          )}
          {goalTitle && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              🎯 {goalTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(habit)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >✎</button>
          <button
            onClick={() => onDelete(habit.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
          >×</button>
        </div>
      </div>

      {/* 7-day mini calendar */}
      <div className="flex items-center gap-1">
        {last7.map((day, i) => {
          const isToday = i === 6
          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-gray-400">{DAY_LABELS[(new Date(day.date + 'T12:00:00')).getDay()]}</span>
              <div
                className={`w-full aspect-square rounded-lg transition-colors ${
                  day.done
                    ? 'bg-green-400'
                    : isToday
                    ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                    : 'bg-gray-100'
                }`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-orange-500 font-semibold">🔥 {streak}</span>
          <span className="text-gray-400 text-xs">day streak</span>
        </div>
        <button
          onClick={() => toggleToday(habit.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            done
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          {done ? '✓ Done today' : 'Mark done'}
        </button>
      </div>
    </div>
  )
}
