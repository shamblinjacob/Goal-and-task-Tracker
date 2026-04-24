import { useGoals } from '../../hooks/useGoals'
import { useTasks } from '../../hooks/useTasks'
import { useHabits } from '../../hooks/useHabits'
import ProgressBar from '../shared/ProgressBar'

const CATEGORY_META = {
  health:   { emoji: '💪', color: '#10b981' },
  career:   { emoji: '💼', color: '#3b82f6' },
  personal: { emoji: '🌱', color: '#8b5cf6' },
  finance:  { emoji: '💰', color: '#f59e0b' },
  learning: { emoji: '📚', color: '#ec4899' },
  other:    { emoji: '✨', color: '#6b7280' },
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium px-2 py-1 rounded-full text-white" style={{ background: color }}>{sub}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { goals } = useGoals()
  const { tasks } = useTasks()
  const { habits, isCompletedToday, getStreak } = useHabits()

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const pendingTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const doneHabitsToday = habits.filter(h => isCompletedToday(h)).length
  const topStreak = habits.reduce((max, h) => Math.max(max, getStreak(h)), 0)

  const avgGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0

  const overdueTasks = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false
    return new Date(t.dueDate) < new Date()
  })

  const highPriorityPending = tasks.filter(t => !t.completed && t.priority === 'high')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your progress at a glance.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🎯" label="Active goals" value={activeGoals.length} sub={`${completedGoals.length} done`} color="#3b82f6" />
        <StatCard icon="✅" label="Tasks pending" value={pendingTasks.length} sub={`${completedTasks.length} done`} color="#10b981" />
        <StatCard icon="🔄" label="Habits today" value={`${doneHabitsToday}/${habits.length}`} sub={habits.length > 0 ? `${Math.round((doneHabitsToday/habits.length)*100)}%` : '—'} color="#8b5cf6" />
        <StatCard icon="🔥" label="Best streak" value={topStreak} sub="days" color="#f59e0b" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goal progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Goal progress</h2>
            {activeGoals.length > 0 && (
              <span className="text-sm text-gray-500">avg {avgGoalProgress}%</span>
            )}
          </div>
          {activeGoals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-gray-400 text-sm">No active goals.</p>
              <button
                onClick={() => onNavigate('goals')}
                className="mt-3 text-sm text-blue-500 hover:underline cursor-pointer"
              >Add a goal →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGoals.slice(0, 5).map(goal => {
                const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate flex items-center gap-1.5">
                        <span>{meta.emoji}</span>
                        {goal.title}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 shrink-0">{goal.progress}%</span>
                    </div>
                    <ProgressBar value={goal.progress} color={meta.color} height={6} />
                  </div>
                )
              })}
              {activeGoals.length > 5 && (
                <button
                  onClick={() => onNavigate('goals')}
                  className="text-sm text-blue-500 hover:underline cursor-pointer"
                >
                  +{activeGoals.length - 5} more goals →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Needs attention</h2>
          <div className="space-y-3">
            {overdueTasks.length > 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 font-semibold text-sm">⚠ {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</span>
                </div>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {overdueTasks.slice(0, 3).map(t => (
                    <li key={t.id} className="truncate">• {t.title}</li>
                  ))}
                  {overdueTasks.length > 3 && <li className="text-red-400">+{overdueTasks.length - 3} more</li>}
                </ul>
              </div>
            )}
            {highPriorityPending.length > 0 && (
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="text-orange-600 font-semibold text-sm mb-1">🔴 {highPriorityPending.length} high-priority task{highPriorityPending.length > 1 ? 's' : ''}</div>
                <ul className="text-xs text-orange-600 space-y-0.5">
                  {highPriorityPending.slice(0, 3).map(t => (
                    <li key={t.id} className="truncate">• {t.title}</li>
                  ))}
                  {highPriorityPending.length > 3 && <li className="text-orange-400">+{highPriorityPending.length - 3} more</li>}
                </ul>
              </div>
            )}
            {habits.length > 0 && doneHabitsToday < habits.length && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <div className="text-purple-600 font-semibold text-sm mb-1">
                  🔄 {habits.length - doneHabitsToday} habit{habits.length - doneHabitsToday > 1 ? 's' : ''} remaining today
                </div>
                <ul className="text-xs text-purple-600 space-y-0.5">
                  {habits.filter(h => !isCompletedToday(h)).slice(0, 3).map(h => (
                    <li key={h.id} className="truncate">• {h.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {overdueTasks.length === 0 && highPriorityPending.length === 0 && doneHabitsToday === habits.length && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-gray-500 text-sm font-medium">You're all caught up!</p>
                <p className="text-gray-400 text-xs mt-1">No urgent items right now.</p>
              </div>
            )}
            {goals.length === 0 && tasks.length === 0 && habits.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">Add some goals, tasks, and habits to see your progress here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Habit streaks */}
      {habits.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Habit streaks</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {habits.map(habit => {
              const streak = getStreak(habit)
              const done = isCompletedToday(habit)
              return (
                <div key={habit.id} className={`p-3 rounded-xl border text-center ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="text-xl font-bold text-gray-900">{streak}</div>
                  <div className="text-xs text-gray-500 mt-0.5">day streak</div>
                  <div className="text-sm font-medium text-gray-700 mt-1 truncate">{habit.title}</div>
                  <div className={`text-xs mt-1 font-medium ${done ? 'text-green-600' : 'text-gray-400'}`}>
                    {done ? '✓ Done today' : 'Pending'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
