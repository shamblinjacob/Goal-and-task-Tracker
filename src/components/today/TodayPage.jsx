import { useState, useRef } from 'react'
import { useDataContext } from '../../context/DataContext'
import { useNotifications } from '../../hooks/useNotifications'
import { useTheme } from '../../hooks/useTheme'
import { toDateString } from '../../utils/dateUtils'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'
import HabitCheckIn from './HabitCheckIn'
import DailyVoiceCapture from './DailyVoiceCapture'
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
    goals, tasks, habits, accounts, transactions, holdings, journal,
    workspaceId,
    toggleTask, archiveTask, addTask,
    toggleToday, archiveHabit, isCompletedToday, getStreak, getLast7, isRecurringDone,
    getWeeklyReview, checkInGoal, getJournalEntry, importData, isMyItem,
  } = useDataContext()

  const importInputRef = useRef(null)
  const [importMsg, setImportMsg] = useState('')
  const { dark, toggleTheme } = useTheme()

  const [showAllFocus,    setShowAllFocus]    = useState(false)
  const [showReview,      setShowReview]      = useState(false)
  const [showDailyVoice,  setShowDailyVoice]  = useState(false)

  const today = toDateString()

  const activeHabits   = habits.filter(h => !h.archived && isMyItem(h))
  const doneHabits     = activeHabits.filter(h => h.completions?.includes(today))
  const pendingHabits  = activeHabits.filter(h => !h.completions?.includes(today))

  const myTasks        = tasks.filter(t => isMyItem(t))
  const dueTodayTasks  = myTasks.filter(t => !t.completed && !t.archived && t.dueDate === today)
  const overdueTasks   = myTasks.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < today)
  const highPriTasks   = myTasks.filter(t => !t.completed && !t.archived && t.priority === 'high' && (!t.dueDate || t.dueDate > today))
  const focusTasks     = [...overdueTasks, ...dueTodayTasks, ...highPriTasks]

  const weeklyGoals    = goals.filter(g => g.status === 'active' && g.type === 'weekly' && (isMyItem(g) || g.shared))
  const activeGoals    = goals.filter(g => g.status === 'active' && g.type !== 'weekly' && g.description && (isMyItem(g) || g.shared))
  const habitPct       = activeHabits.length ? Math.round((doneHabits.length / activeHabits.length) * 100) : 0

  const topStreaks = activeHabits
    .map(h => ({ habit: h, streak: getStreak(h) }))
    .filter(({ streak }) => streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3)

  const [showSettings, setShowSettings] = useState(false)

  // Smart Today picks — scoped to this user's items + shared goals
  const visibleGoals = goals.filter(g => isMyItem(g) || g.shared)
  const oneTask  = pickOneTask(myTasks, today, isRecurringDone)
  const oneHabit = pickOneHabit(activeHabits, getLast7, isCompletedToday)
  const oneGoal  = pickOneGoal(visibleGoals)
  const hasAnyFocus = oneTask || oneHabit || oneGoal

  // Celebratory clear state
  const allClear = activeHabits.length > 0
    && habitPct === 100
    && overdueTasks.length === 0
    && dueTodayTasks.length === 0

  // Journal status
  const todayJournal = getJournalEntry(today)
  const journalStarted = todayJournal && Object.values(todayJournal).some(v => typeof v === 'string' && v.trim())

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

  function exportAllData() {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(), workspaceId,
      goals, tasks, habits, accounts, transactions, holdings, journal,
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `goaltracker-backup-${today}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const summary = await importData(parsed)
      const totalAdded = Object.values(summary.added).reduce((s, n) => s + n, 0)
      const totalSkipped = Object.values(summary.skipped).reduce((s, n) => s + n, 0)
      setImportMsg(totalAdded === 0
        ? `No new items — all ${totalSkipped} items already exist.`
        : `Imported ${totalAdded} item${totalAdded === 1 ? '' : 's'}${totalSkipped > 0 ? ` (${totalSkipped} skipped — already existed)` : ''}.`)
    } catch {
      setImportMsg('Could not read that file. Make sure it\'s a JSON export from this app.')
    }
    e.target.value = ''
  }

  function exportTransactionsCSV() {
    const headers = ['Date','Type','Description','Amount','Category','Note','Recurring']
    const rows = [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(tx => [
        tx.date, tx.type,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.type === 'income' ? tx.amount : -tx.amount,
        tx.category || '',
        `"${(tx.note || '').replace(/"/g, '""')}"`,
        tx.recurring ? (tx.recurring.freq || 'yes') : 'no',
      ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `transactions-${today}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function dismissReview() {
    localStorage.setItem('reviewDismissed', reviewInfo.weekId)
    setReviewDismissed(true)
  }

  function handleDailyVoiceSave({ habitIds, tasks: voiceTasks }) {
    for (const id of habitIds) {
      const h = habits.find(h => h.id === id)
      if (h && !h.completions?.includes(today)) toggleToday(id)
    }
    for (const t of voiceTasks) {
      addTask({
        title:       t.title,
        description: '',
        goalId:      null,
        priority:    t.priority || 'medium',
        category:    'other',
        dueDate:     t.dueDate || '',
        recurring:   null,
      })
    }
    setShowDailyVoice(false)
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

      {/* Voice check-in */}
      <button
        onClick={() => setShowDailyVoice(true)}
        className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Icon name="mic" size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900">Voice check-in</p>
          <p className="text-xs text-blue-600">Complete habits &amp; add tasks by speaking</p>
        </div>
        <Icon name="chevron-right" size={14} className="text-blue-400 shrink-0" />
      </button>

      {/* Journal status */}
      <button
        onClick={() => onNavigate('journal')}
        className={`w-full rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-colors text-left ${
          journalStarted
            ? 'bg-green-50 border border-green-200'
            : 'bg-white border border-gray-100 hover:bg-gray-50'
        }`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${journalStarted ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Icon name="book" size={16} className={journalStarted ? 'text-green-600' : 'text-gray-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${journalStarted ? 'text-green-900' : 'text-gray-700'}`}>
            {journalStarted ? 'Journal written today ✓' : 'Journal — tap to reflect'}
          </p>
          <p className={`text-xs mt-0.5 ${journalStarted ? 'text-green-600' : 'text-gray-400'}`}>
            {journalStarted ? 'Entry in progress' : 'Daily reflection keeps momentum'}
          </p>
        </div>
        <Icon name="chevron-right" size={14} className={journalStarted ? 'text-green-400' : 'text-gray-300'} />
      </button>

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
                <div className="w-11 h-11 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-500 tabular-nums leading-none">{streak}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">days</span>
                <span className="text-xs text-gray-500 text-center leading-tight line-clamp-2">{habit.title}</span>
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
                <button
                  key={habit.id}
                  onClick={() => toggleToday(habit.id)}
                  className={`w-full text-left bg-white rounded-xl border px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors ${done ? 'border-green-200' : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${done ? 'border-green-400 bg-green-400' : 'border-gray-300'}`}>
                      {done && <Icon name="check" size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm font-medium truncate ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {habit.title}
                    </span>
                  </div>
                  <span className={`ml-3 shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {done ? 'Done ✓' : 'Tap'}
                  </span>
                </button>
              )
            })}
          </div>
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
              <div
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3"
                style={{ borderLeftWidth: 3, borderLeftColor: '#8b5cf6' }}
              >
                <div className="mt-0.5 w-6 h-6 rounded-lg bg-purple-50 text-purple-500 shrink-0 flex items-center justify-center">
                  <Icon name="target" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">The one goal</p>
                  <p className="text-base font-semibold text-gray-900 leading-snug mt-0.5">{oneGoal.goal.title}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    Stalled {oneGoal.daysIdle} days · currently {oneGoal.goal.progress}%
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      onClick={() => checkInGoal(oneGoal.goal.id, Math.min(100, (oneGoal.goal.progress || 0) + 5), '')}
                      className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold cursor-pointer hover:bg-purple-100 transition-colors"
                    >+5%</button>
                    <button
                      onClick={() => checkInGoal(oneGoal.goal.id, Math.min(100, (oneGoal.goal.progress || 0) + 10), '')}
                      className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold cursor-pointer hover:bg-purple-100 transition-colors"
                    >+10%</button>
                    <button
                      onClick={() => onNavigate('goals')}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >Full check-in →</button>
                  </div>
                </div>
              </div>
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
                    <div key={task.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
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
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Celebratory all-clear state */}
      {allClear && !hasAnyFocus && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Icon name="check" size={20} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">You're clear for today</p>
            <p className="text-xs text-green-700 mt-0.5">All habits done, no urgent tasks. Great work — keep it up.</p>
          </div>
        </div>
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
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon name={dark ? 'sun' : 'moon'} size={15} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Dark mode</p>
                  <p className="text-xs text-gray-400">{dark ? 'On' : 'Off'} · follows your preference</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${dark ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <WidgetPanel />
            {/* Data export & import */}
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon name="download" size={15} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Backup &amp; restore</p>
                  <p className="text-xs text-gray-400">Export, then re-import to restore</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportAllData}
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                  Export JSON
                </button>
                <button onClick={() => importInputRef.current?.click()}
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                  Import JSON
                </button>
                {transactions.length > 0 && (
                  <button onClick={exportTransactionsCSV}
                    className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                    Tx CSV
                  </button>
                )}
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
              {importMsg && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{importMsg}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                Import only adds items that don't already exist — safe to re-run.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {showReview      && <WeeklyReviewModal onClose={() => setShowReview(false)} />}
      {showDailyVoice  && <DailyVoiceCapture habits={habits} onSave={handleDailyVoiceSave} onClose={() => setShowDailyVoice(false)} />}
    </div>
  )
}
