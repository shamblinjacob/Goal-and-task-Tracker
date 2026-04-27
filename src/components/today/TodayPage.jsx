import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'
import { useNotifications } from '../../hooks/useNotifications'
import { toDateString } from '../../utils/dateUtils'
import SwipeableItem from '../shared/SwipeableItem'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'
import HabitCheckIn from './HabitCheckIn'
import WidgetPanel from './WidgetPanel'
import WeeklyGoalCard from '../goals/WeeklyGoalCard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ── Notification setup panel ────────────────────────────────────────────────
function NotifPanel({ habits, tasks, goals }) {
  const { supported, permission, enabled, notifTime, enable, disable, setTime } = useNotifications({ habits, tasks, goals })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleEnable() {
    setLoading(true)
    const res = await enable()
    setLoading(false)
    if (!res.ok) setMsg(res.reason === 'denied' ? 'Permission denied — allow notifications in your browser settings.' : 'Notifications not supported on this browser.')
    else setMsg('')
  }

  if (!supported) return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-400">
      Notifications are not supported in this browser. For best results, add this app to your home screen.
    </div>
  )

  return (
    <div className="p-4 rounded-xl bg-white border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="bell" size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Morning briefing</span>
        </div>
        {enabled ? (
          <button onClick={disable} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Turn off</button>
        ) : (
          <button
            onClick={handleEnable}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: '#3b82f6' }}
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
        )}
      </div>

      {enabled && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-700 font-medium">Active</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Daily at</span>
            <input
              type="time"
              value={notifTime}
              onChange={e => setTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-gray-400 leading-relaxed">
          Get a daily summary of your habits, tasks, and goal motivation each morning.
          <br />
          <span className="text-gray-400">
            Tip: install the app to your home screen — iOS and Android only fire scheduled notifications reliably for installed PWAs.
          </span>
        </p>
      )}
      {enabled && (
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          If your phone doesn't get the push at the scheduled time, opening the app any time after will deliver the briefing.
        </p>
      )}

      {msg && <p className="text-xs text-red-500 mt-2">{msg}</p>}
    </div>
  )
}

// ── Today page ───────────────────────────────────────────────────────────────
export default function TodayPage({ onNavigate }) {
  const {
    goals, tasks, habits,
    toggleTask, archiveTask,
    toggleToday, archiveHabit, isCompletedToday, getStreak,
  } = useDataContext()

  const today = toDateString()

  const activeHabits   = habits.filter(h => !h.archived)
  const doneHabits     = activeHabits.filter(h => h.completions?.includes(today))
  const pendingHabits  = activeHabits.filter(h => !h.completions?.includes(today))

  const dueTodayTasks  = tasks.filter(t => !t.completed && !t.archived && t.dueDate === today)
  const overdueTasks   = tasks.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < today)
  const highPriTasks   = tasks.filter(t => !t.completed && !t.archived && t.priority === 'high' && (!t.dueDate || t.dueDate > today))
  const focusTasks     = [...overdueTasks, ...dueTodayTasks, ...highPriTasks]

  const weeklyGoals    = goals.filter(g => g.status === 'active' && g.type === 'weekly')
  const activeGoals    = goals.filter(g => g.status === 'active' && g.type !== 'weekly' && g.description)
  const habitPct       = activeHabits.length ? Math.round((doneHabits.length / activeHabits.length) * 100) : 0

  const topStreaks = activeHabits
    .map(h => ({ habit: h, streak: getStreak(h) }))
    .filter(({ streak }) => streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 font-medium">{formatDate(new Date())}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{greeting()}</h1>
      </div>

      {/* Daily snapshot */}
      {activeHabits.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">Today's progress</span>
            <span className="text-xs text-gray-400 tabular-nums">{doneHabits.length}/{activeHabits.length} habits</span>
          </div>
          <ProgressBar value={habitPct} color="#10b981" height={6} />
          {habitPct === 100 && (
            <p className="text-xs text-green-600 font-medium mt-2">All habits done today — great work!</p>
          )}
        </div>
      )}

      {/* Top streaks */}
      {topStreaks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current streaks</h2>
          <div className="grid grid-cols-3 gap-2">
            {topStreaks.map(({ habit, streak }) => (
              <div key={habit.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-1">
                <Icon name="flame" size={20} className="text-orange-400" />
                <span className="text-xl font-bold text-gray-900 tabular-nums leading-none">{streak}</span>
                <span className="text-xs text-gray-400 text-center leading-tight line-clamp-2">{habit.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly recurring goals */}
      {weeklyGoals.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">This week</h2>
          <div className="space-y-3">
            {weeklyGoals.map(goal => (
              <WeeklyGoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}

      {/* AI Check-in */}
      {activeHabits.length > 0 && (
        <section>
          <HabitCheckIn />
        </section>
      )}

      {/* Habits */}
      {activeHabits.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Habits</h2>
          <div className="space-y-2">
            {activeHabits.map(habit => {
              const done = habit.completions?.includes(today)
              return (
                <SwipeableItem
                  key={habit.id}
                  onComplete={() => toggleToday(habit.id)}
                  onArchive={() => archiveHabit(habit.id)}
                  completeLabel={done ? 'Undo' : 'Done'}
                >
                  <div className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between transition-opacity ${done ? 'border-green-200' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${done ? 'border-green-400 bg-green-400' : 'border-gray-300'}`}>
                        {done && <Icon name="check" size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm font-medium truncate ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {habit.title}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleToday(habit.id)}
                      className={`ml-3 shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {done ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                </SwipeableItem>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Swipe right to complete · swipe left to archive</p>
        </section>
      )}

      {/* Focus tasks */}
      {focusTasks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Focus tasks</h2>
          <div className="space-y-2">
            {focusTasks.map(task => {
              const isOverdue = task.dueDate && task.dueDate < today
              return (
                <SwipeableItem
                  key={task.id}
                  onComplete={() => toggleTask(task.id)}
                  onArchive={() => archiveTask(task.id)}
                  completeLabel="Complete"
                >
                  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-blue-400 shrink-0 cursor-pointer flex items-center justify-center"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOverdue && (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <Icon name="alert" size={11} />
                            Overdue
                          </span>
                        )}
                        {task.dueDate === today && !isOverdue && (
                          <span className="text-xs text-amber-600 font-medium">Due today</span>
                        )}
                        {task.priority === 'high' && !isOverdue && task.dueDate !== today && (
                          <span className="text-xs text-gray-500 font-medium">High priority</span>
                        )}
                        {task.goalId && (
                          <span className="text-xs text-blue-500 truncate max-w-28">
                            {goals.find(g => g.id === task.goalId)?.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SwipeableItem>
              )
            })}
          </div>
        </section>
      )}

      {/* Why you're doing this */}
      {activeGoals.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Why you're doing this</h2>
          <div className="space-y-2">
            {activeGoals.slice(0, 3).map(goal => (
              <div key={goal.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-blue-600 mb-1">{goal.title}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{goal.description}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <ProgressBar value={goal.progress} color="#3b82f6" height={4} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeHabits.length === 0 && focusTasks.length === 0 && activeGoals.length === 0 && weeklyGoals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="sun" size={26} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Nothing scheduled yet</h3>
          <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">
            Add some goals, tasks, and habits to see your daily focus here.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => onNavigate('goals')} className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Add goal</button>
            <button onClick={() => onNavigate('tasks')} className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Add task</button>
            <button onClick={() => onNavigate('habits')} className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Add habit</button>
          </div>
        </div>
      )}

      {/* Notification setup */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Morning briefing</h2>
        <NotifPanel habits={habits} tasks={tasks} goals={goals} />
      </section>

      {/* Home-screen widget setup */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Home-screen widget</h2>
        <WidgetPanel />
      </section>
    </div>
  )
}
