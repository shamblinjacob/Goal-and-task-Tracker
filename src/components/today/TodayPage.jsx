import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'
import { useNotifications } from '../../hooks/useNotifications'
import { toDateString } from '../../utils/dateUtils'
import SwipeableItem from '../shared/SwipeableItem'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'
import HabitCheckIn from './HabitCheckIn'
import WidgetPanel from './WidgetPanel'
import WeeklyReviewModal from './WeeklyReviewModal'
import Modal from '../shared/Modal'
import WeeklyGoalCard from '../goals/WeeklyGoalCard'
import { pickOneTask, pickOneHabit, pickOneGoal } from '../../utils/pickFocus'
import { getReviewWeek, formatWeekRange } from '../../utils/weeklyReview'

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
    toggleToday, archiveHabit, isCompletedToday, getStreak, getLast7, isRecurringDone,
    getWeeklyReview,
  } = useDataContext()

  const [showAllFocus, setShowAllFocus]   = useState(false)
  const [showReview,   setShowReview]     = useState(false)

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

  const [showSettings, setShowSettings] = useState(false)

  // Smart Today picks
  const oneTask  = pickOneTask(tasks, today, isRecurringDone)
  const oneHabit = pickOneHabit(habits, getLast7, isCompletedToday)
  const oneGoal  = pickOneGoal(goals)
  const hasAnyFocus = oneTask || oneHabit || oneGoal

  // Weekly review banner — show Sun-Wed of the week after a week ends, when
  // the user hasn't filled it in yet and hasn't dismissed it for that week.
  const reviewInfo  = getReviewWeek()
  const reviewSaved = !!getWeeklyReview(reviewInfo.weekId)
  const dow         = new Date().getDay()                   // 0=Sun … 6=Sat
  const inWindow    = dow === 0 || dow === 1 || dow === 2 || dow === 3
  const [reviewDismissed, setReviewDismissed] = useState(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('reviewDismissed') === reviewInfo.weekId
  )
  const showReviewBanner = inWindow && !reviewSaved && !reviewDismissed
                            && (tasks.length > 0 || habits.length > 0 || goals.length > 0)

  function dismissReview() {
    localStorage.setItem('reviewDismissed', reviewInfo.weekId)
    setReviewDismissed(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{formatDate(new Date())}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{greeting()}</h1>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Settings"
        >
          <Icon name="settings" size={18} />
        </button>
      </div>

      {/* Weekly review banner */}
      {showReviewBanner && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Icon name="bar-chart" size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">Your weekly review is ready</p>
            <p className="text-xs text-blue-700 mt-0.5">{formatWeekRange(reviewInfo.weekStart, reviewInfo.weekEnd)} · ~2 minutes</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowReview(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                Start review
              </button>
              <button onClick={dismissReview} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Right now — Smart Today: one task, one habit, one goal */}
      {hasAnyFocus && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Right now</h2>
          <div className="space-y-3">

            {oneTask && (() => {
              const isOver = oneTask.dueDate && oneTask.dueDate < today
              const isDue  = oneTask.dueDate === today
              const accent = isOver ? '#ef4444' : isDue ? '#f59e0b' : '#3b82f6'
              return (
                <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
                  <button
                    onClick={() => toggleTask(oneTask.id)}
                    className="mt-0.5 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-blue-500 shrink-0 cursor-pointer transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">The one task</p>
                    <p className="text-base font-semibold text-gray-900 leading-snug mt-0.5">{oneTask.title}</p>
                    <p className="text-xs mt-1" style={{ color: accent }}>
                      {isOver ? 'Overdue — knock it out first.'
                        : isDue ? 'Due today.'
                        : oneTask.priority === 'high' ? 'High priority.'
                        : 'Up next.'}
                      {oneTask.goalId && goals.find(g => g.id === oneTask.goalId) &&
                        <span className="text-blue-500 ml-2">→ {goals.find(g => g.id === oneTask.goalId)?.title}</span>}
                    </p>
                  </div>
                </div>
              )
            })()}

            {oneHabit && (() => {
              const h = oneHabit.habit
              return (
                <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3" style={{ borderLeftWidth: 3, borderLeftColor: '#10b981' }}>
                  <button
                    onClick={() => toggleToday(h.id)}
                    className="mt-0.5 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 shrink-0 cursor-pointer transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">The one habit</p>
                    <p className="text-base font-semibold text-gray-900 leading-snug mt-0.5">{h.title}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {oneHabit.reason === 'struggling'
                        ? `Skipped ${oneHabit.missed} of last 7 — get back on it.`
                        : 'Don\'t break the chain.'}
                    </p>
                  </div>
                </div>
              )
            })()}

            {oneGoal && (
              <button
                onClick={() => onNavigate('goals')}
                className="w-full bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors text-left"
                style={{ borderLeftWidth: 3, borderLeftColor: '#8b5cf6' }}
              >
                <div className="mt-0.5 w-6 h-6 rounded-lg bg-purple-50 text-purple-500 shrink-0 flex items-center justify-center">
                  <Icon name="target" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">The one goal</p>
                  <p className="text-base font-semibold text-gray-900 leading-snug mt-0.5">{oneGoal.goal.title}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    Stalled {oneGoal.daysIdle} days at {oneGoal.goal.progress}% — open to plan a next step.
                  </p>
                </div>
              </button>
            )}

            {focusTasks.length > 1 && (
              <button
                onClick={() => setShowAllFocus(v => !v)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center gap-1 py-1"
              >
                <Icon name={showAllFocus ? 'chevron-down' : 'chevron-right'} size={12} />
                {showAllFocus ? 'Hide' : `Show all ${focusTasks.length} focus tasks`}
              </button>
            )}

            {showAllFocus && focusTasks.length > 1 && (
              <div className="space-y-2 pt-1">
                {focusTasks.filter(t => t.id !== oneTask?.id).map(task => {
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
                                <Icon name="alert" size={11} />Overdue
                              </span>
                            )}
                            {task.dueDate === today && !isOverdue && (
                              <span className="text-xs text-amber-600 font-medium">Due today</span>
                            )}
                            {task.priority === 'high' && !isOverdue && task.dueDate !== today && (
                              <span className="text-xs text-gray-500 font-medium">High priority</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </SwipeableItem>
                  )
                })}
              </div>
            )}
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

      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)}>
          <div className="space-y-4">
            <WidgetPanel />
          </div>
        </Modal>
      )}

      {showReview && <WeeklyReviewModal onClose={() => setShowReview(false)} />}
    </div>
  )
}
