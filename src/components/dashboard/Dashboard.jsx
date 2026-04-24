import { useGoals } from '../../hooks/useGoals'
import { useTasks } from '../../hooks/useTasks'
import { useHabits } from '../../hooks/useHabits'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'

const CATEGORY_META = {
  health:   { label: 'Health',   color: '#10b981' },
  career:   { label: 'Career',   color: '#3b82f6' },
  personal: { label: 'Personal', color: '#8b5cf6' },
  finance:  { label: 'Finance',  color: '#f59e0b' },
  learning: { label: 'Learning', color: '#ec4899' },
  other:    { label: 'Other',    color: '#6b7280' },
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon name={icon} size={16} className="text-gray-400" />
        <span className="text-xs text-gray-400">{sub}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { goals } = useGoals()
  const { tasks } = useTasks()
  const { habits, isCompletedToday, getStreak } = useHabits()

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const pendingTasks   = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const doneHabitsToday = habits.filter(h => isCompletedToday(h)).length
  const topStreak = habits.reduce((max, h) => Math.max(max, getStreak(h)), 0)
  const avgGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
    : 0

  const overdueTasks      = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date())
  const highPriorityTasks = tasks.filter(t => !t.completed && t.priority === 'high')
  const checkInsDue       = activeGoals.filter(g => !g.lastCheckIn || Math.floor((new Date() - new Date(g.lastCheckIn)) / 86400000) >= 7)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-400 text-xs mt-0.5">Your progress at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon="target"      label="Active goals"   value={activeGoals.length}  sub={`${completedGoals.length} done`} />
        <StatCard icon="check-square" label="Tasks pending"  value={pendingTasks.length} sub={`${completedTasks.length} done`} />
        <StatCard icon="repeat"      label="Habits today"   value={`${doneHabitsToday}/${habits.length}`} sub={habits.length > 0 ? `${Math.round((doneHabitsToday / habits.length) * 100)}%` : '—'} />
        <StatCard icon="flame"       label="Best streak"    value={topStreak}           sub="days" />
      </div>

      <div className="space-y-4">
        {/* Goal progress */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Goal progress</h2>
            {activeGoals.length > 0 && (
              <span className="text-xs text-gray-400">avg {avgGoalProgress}%</span>
            )}
          </div>
          {activeGoals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No active goals.</p>
              <button onClick={() => onNavigate('goals')} className="mt-2 text-sm text-blue-500 cursor-pointer hover:underline">
                Add a goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 5).map(goal => {
                const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                        <span className="text-xs text-gray-700 truncate">{goal.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-2 shrink-0 tabular-nums">{goal.progress}%</span>
                    </div>
                    <ProgressBar value={goal.progress} color={meta.color} height={5} />
                  </div>
                )
              })}
              {activeGoals.length > 5 && (
                <button onClick={() => onNavigate('goals')} className="text-xs text-blue-500 hover:underline cursor-pointer">
                  +{activeGoals.length - 5} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Needs attention */}
        {(overdueTasks.length > 0 || highPriorityTasks.length > 0 || checkInsDue.length > 0 || (habits.length > 0 && doneHabitsToday < habits.length)) && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Needs attention</h2>
            <div className="space-y-2">
              {checkInsDue.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="text-xs font-semibold text-blue-700 mb-1">
                    {checkInsDue.length} goal check-in{checkInsDue.length > 1 ? 's' : ''} due
                  </div>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    {checkInsDue.slice(0, 3).map(g => <li key={g.id} className="truncate">— {g.title}</li>)}
                  </ul>
                  <button onClick={() => onNavigate('goals')} className="text-xs text-blue-500 hover:underline cursor-pointer mt-1">
                    Go to goals
                  </button>
                </div>
              )}
              {overdueTasks.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-xs font-semibold text-red-600 mb-1">
                    {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                  </div>
                  <ul className="text-xs text-red-500 space-y-0.5">
                    {overdueTasks.slice(0, 3).map(t => <li key={t.id} className="truncate">— {t.title}</li>)}
                  </ul>
                </div>
              )}
              {highPriorityTasks.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-xs font-semibold text-amber-700 mb-1">
                    {highPriorityTasks.length} high-priority task{highPriorityTasks.length > 1 ? 's' : ''}
                  </div>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {highPriorityTasks.slice(0, 3).map(t => <li key={t.id} className="truncate">— {t.title}</li>)}
                  </ul>
                </div>
              )}
              {habits.length > 0 && doneHabitsToday < habits.length && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-600">
                    {habits.length - doneHabitsToday} habit{habits.length - doneHabitsToday > 1 ? 's' : ''} remaining today
                  </div>
                  <ul className="text-xs text-gray-500 space-y-0.5 mt-1">
                    {habits.filter(h => !isCompletedToday(h)).slice(0, 3).map(h => <li key={h.id} className="truncate">— {h.title}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Habit streaks */}
        {habits.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Habit streaks</h2>
            <div className="grid grid-cols-2 gap-2">
              {habits.map(habit => {
                const streak = getStreak(habit)
                const done = isCompletedToday(habit)
                return (
                  <div
                    key={habit.id}
                    className={`p-3 rounded-lg border text-center ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{streak}</div>
                    <div className="text-xs text-gray-400">days</div>
                    <div className="text-xs font-medium text-gray-700 mt-1 truncate">{habit.title}</div>
                    <div className={`text-xs mt-0.5 ${done ? 'text-green-600' : 'text-gray-400'}`}>
                      {done ? 'Done' : 'Pending'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
