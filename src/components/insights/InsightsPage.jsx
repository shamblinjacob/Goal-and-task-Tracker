import { useState, useMemo } from 'react'
import { useDataContext } from '../../context/DataContext'
import { toDateString } from '../../utils/dateUtils'
import { computeWeeklyStats, getReviewWeek, formatWeekRange } from '../../utils/weeklyReview'
import Icon from '../shared/Icon'
import ProgressBar from '../shared/ProgressBar'
import GoalProgressChart from './GoalProgressChart'
import HabitHeatmap from './HabitHeatmap'
import SyncPanel from '../shared/SyncPanel'

const CATEGORY_META = {
  health:   { label: 'Health',   color: '#10b981' },
  career:   { label: 'Career',   color: '#3b82f6' },
  personal: { label: 'Personal', color: '#8b5cf6' },
  finance:  { label: 'Finance',  color: '#f59e0b' },
  learning: { label: 'Learning', color: '#ec4899' },
  other:    { label: 'Other',    color: '#6b7280' },
}

const RANGES = [
  { key: '7d',  label: '7 days',  days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All',     days: null },
]

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Pure helpers ───────────────────────────────────────────────────────────
function startOfRange(days) {
  if (days === null) return new Date(0)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days + 1)
  return d
}

// Longest consecutive-day streak ever, given an array of YYYY-MM-DD strings.
function longestStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const sorted = [...completions].sort()
  let best = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00')
    const cur  = new Date(sorted[i]     + 'T12:00:00')
    const diff = Math.round((cur - prev) / 86400000)
    if (diff === 1)        run++
    else if (diff === 0)   continue
    else                   run = 1
    if (run > best) best = run
  }
  return best
}

function currentStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const set = new Set(completions)
  let streak = 0
  const cursor = new Date()
  for (;;) {
    const key = toDateString(cursor)
    if (set.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (streak === 0) {
      // Allow yesterday-only as a still-active streak
      cursor.setDate(cursor.getDate() - 1)
      if (set.has(toDateString(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
      else break
    } else break
  }
  return streak
}

// ── Weekly digest (unchanged) ──────────────────────────────────────────────
function WeeklyDigest({ tasks, habits, goals }) {
  const [copied, setCopied] = useState(false)
  const { weekStart, weekEnd } = getReviewWeek()
  const stats = computeWeeklyStats({ tasks, habits, goals, weekStart, weekEnd })

  function buildDigestText() {
    const range = formatWeekRange(weekStart, weekEnd)
    const lines = [`Weekly Digest — ${range}`, '']
    if (stats.habitsTotal > 0) {
      lines.push(`HABITS  ${stats.habitsDone}/${stats.habitsTotal} completions (${stats.habitPct}%)`)
      if (stats.bestHabit)  lines.push(`  Best:        ${stats.bestHabit.habit.title} (${stats.bestHabit.done}/7)`)
      if (stats.worstHabit && stats.worstHabit !== stats.bestHabit)
        lines.push(`  Needs work:  ${stats.worstHabit.habit.title} (${stats.worstHabit.done}/7)`)
      lines.push('')
    }
    lines.push(`TASKS   ${stats.tasksCompleted} completed this week`, '')
    if (stats.goalMovement.length > 0) {
      lines.push('GOALS')
      for (const { goal, before, after, change } of stats.goalMovement) {
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→'
        lines.push(`  ${arrow} ${goal.title}: ${before}% → ${after}%${change !== 0 ? ` (${change > 0 ? '+' : ''}${change})` : ''}`)
      }
      lines.push('')
    }
    lines.push('— GoalTracker')
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildDigestText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Weekly digest</h3>
          <p className="text-xs text-gray-400 mt-0.5">{formatWeekRange(weekStart, weekEnd)}</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
        >
          <Icon name={copied ? 'check' : 'copy'} size={12} />
          {copied ? 'Copied!' : 'Copy text'}
        </button>
      </div>
      <div className="space-y-2 text-sm">
        {stats.habitsTotal > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">Habits</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${stats.habitPct}%` }} />
                </div>
                <span className="text-xs text-gray-600 tabular-nums shrink-0">{stats.habitsDone}/{stats.habitsTotal} · {stats.habitPct}%</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">Tasks</span>
          <span className="text-xs text-gray-700"><span className="font-semibold">{stats.tasksCompleted}</span> completed</span>
        </div>
        {stats.goalMovement.length > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-xs font-semibold text-gray-400 w-14 shrink-0 pt-0.5">Goals</span>
            <div className="space-y-1 flex-1">
              {stats.goalMovement.slice(0, 3).map(({ goal, before, after, change }) => (
                <div key={goal.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-gray-700 truncate">{goal.title}</span>
                  <span className="text-gray-400 tabular-nums shrink-0">{before}% → {after}%</span>
                  <span className={`font-semibold tabular-nums w-8 text-right shrink-0 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {change > 0 ? '+' : ''}{change || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Day-of-week productivity ───────────────────────────────────────────────
function DayOfWeekChart({ tasksInRange }) {
  const counts = useMemo(() => {
    const out = [0, 0, 0, 0, 0, 0, 0]
    for (const t of tasksInRange) {
      if (!t.completedAt) continue
      const d = new Date(t.completedAt)
      out[d.getDay()]++
    }
    return out
  }, [tasksInRange])

  const max = Math.max(...counts, 1)
  const total = counts.reduce((s, c) => s + c, 0)
  if (total === 0) return null

  const bestIdx = counts.indexOf(Math.max(...counts))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600">Best day of the week</h3>
        <span className="text-xs text-gray-400">{total} tasks</span>
      </div>
      <div className="flex items-end gap-1.5 h-20 mb-1.5">
        {counts.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-gray-500 tabular-nums">{c || ''}</span>
            <div
              className={`w-full rounded-t transition-all ${i === bestIdx && c > 0 ? 'bg-blue-500' : 'bg-blue-200'}`}
              style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? '4px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {DOW_LABELS.map((l, i) => (
          <span key={l} className={`flex-1 text-center text-[10px] ${i === bestIdx ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Journal consistency ────────────────────────────────────────────────────
function JournalConsistency({ journal, days }) {
  const stats = useMemo(() => {
    const start = startOfRange(days)
    const inRange = journal.filter(j => new Date(j.date + 'T12:00:00') >= start)
    const written = inRange.length
    const possible = days || Math.max(1, Math.ceil((new Date() - new Date(journal[journal.length - 1]?.date || toDateString()) + 'T12:00:00') / 86400000))
    const totalDays = days || Math.max(possible, written)
    const pct = totalDays > 0 ? Math.round((written / totalDays) * 100) : 0

    // Average filled-fields-per-entry (depth)
    const depth = inRange.length === 0 ? 0 :
      Math.round(inRange.reduce((s, j) => {
        const fields = ['wentWell', 'didntGo', 'grateful', 'tomorrow', 'notes']
        return s + fields.filter(f => j[f]?.trim()).length
      }, 0) / inRange.length * 10) / 10

    return { written, totalDays, pct, depth }
  }, [journal, days])

  if (journal.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-xs font-semibold text-gray-600 mb-3">Journal consistency</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{stats.pct}%</div>
          <div className="text-xs text-gray-400 leading-tight">Days with an entry</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{stats.written}</div>
          <div className="text-xs text-gray-400 leading-tight">Entries written</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{stats.depth}</div>
          <div className="text-xs text-gray-400 leading-tight">Avg fields per entry</div>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar value={stats.pct} color={stats.pct >= 80 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#ef4444'} height={4} />
      </div>
    </div>
  )
}

// ── Goal velocity ──────────────────────────────────────────────────────────
function GoalVelocity({ goals, days }) {
  const rows = useMemo(() => {
    const start = startOfRange(days)
    return goals
      .filter(g => g.status === 'active' && g.type !== 'weekly')
      .map(g => {
        const checkIns = (g.checkIns || []).filter(c => new Date(c.date + 'T12:00:00') >= start)
        if (checkIns.length < 2) return null
        const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date))
        const first  = sorted[0]
        const last   = sorted[sorted.length - 1]
        const spanDays = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000))
        const change = last.progress - first.progress
        const perWeek = (change / spanDays) * 7
        const remaining = 100 - (g.progress || 0)
        const weeksLeft = perWeek > 0 ? Math.round(remaining / perWeek) : null
        return { goal: g, perWeek: Math.round(perWeek * 10) / 10, weeksLeft, checkInCount: checkIns.length }
      })
      .filter(Boolean)
      .sort((a, b) => b.perWeek - a.perWeek)
  }, [goals, days])

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-xs font-semibold text-gray-600 mb-3">Goal velocity</h3>
      <p className="text-[11px] text-gray-400 mb-3">Average progress per week, based on check-ins in this range.</p>
      <div className="space-y-2.5">
        {rows.map(({ goal, perWeek, weeksLeft }) => {
          const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
          const pace = perWeek <= 0 ? 'Stalled'
                     : weeksLeft === null ? '—'
                     : weeksLeft <= 1 ? 'Done this week'
                     : `~${weeksLeft} wk to finish`
          const paceColor = perWeek <= 0 ? 'text-red-500' : perWeek >= 5 ? 'text-green-600' : 'text-amber-600'
          return (
            <div key={goal.id} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
              <span className="flex-1 text-sm text-gray-800 truncate">{goal.title}</span>
              <span className={`text-xs font-semibold tabular-nums shrink-0 ${paceColor}`}>
                {perWeek > 0 ? '+' : ''}{perWeek}%/wk
              </span>
              <span className="text-xs text-gray-400 shrink-0 w-24 text-right">{pace}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const { goals, tasks, habits, journal } = useDataContext()
  const [rangeKey, setRangeKey] = useState('30d')
  const range = RANGES.find(r => r.key === rangeKey) || RANGES[1]
  const days  = range.days

  const activeGoals  = goals.filter(g => g.status === 'active')
  const activeTasks  = tasks.filter(t => !t.archived)
  const activeHabits = habits.filter(h => !h.archived)

  const start = useMemo(() => startOfRange(days), [days])

  // ── Range-based stats ─────────────────────────────────────────────────────
  const { habitConsistency, habitsDone, habitsPossible, tasksCompleted, checkIns, tasksInRange } = useMemo(() => {
    const dayCount = days || Math.max(1, Math.ceil((new Date() - start) / 86400000))
    const habitsDone = activeHabits.reduce((sum, h) =>
      sum + (h.completions || []).filter(d => new Date(d + 'T12:00:00') >= start).length, 0
    )
    const habitsPossible = activeHabits.length * (days || dayCount)
    const habitConsistency = habitsPossible > 0 ? Math.round((habitsDone / habitsPossible) * 100) : 0

    const tasksInRange = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= start)
    const tasksCompleted = tasksInRange.length

    const checkIns = activeGoals.reduce((sum, g) =>
      sum + (g.checkIns || []).filter(c => new Date(c.date + 'T12:00:00') >= start).length, 0
    )

    return { habitConsistency, habitsDone, habitsPossible, tasksCompleted, checkIns, tasksInRange }
  }, [activeHabits, activeGoals, tasks, start, days])

  // ── Per-habit stats ───────────────────────────────────────────────────────
  const perHabitStats = useMemo(() => {
    return activeHabits.map(h => {
      const completions = h.completions || []
      const inRange = completions.filter(d => new Date(d + 'T12:00:00') >= start)
      const created = new Date(h.createdAt)
      const rangeDays = days || Math.max(1, Math.ceil((new Date() - Math.max(start, created)) / 86400000))
      const totalDays = Math.min(rangeDays, days || rangeDays)
      const rate = totalDays > 0 ? Math.round((inRange.length / totalDays) * 100) : 0
      return {
        habit: h,
        rate,
        hits: inRange.length,
        totalDays,
        currentStreak: currentStreak(completions),
        longestStreak: longestStreak(completions),
      }
    }).sort((a, b) => b.rate - a.rate)
  }, [activeHabits, start, days])

  // ── Task category breakdown (in range) ────────────────────────────────────
  const sortedCategories = useMemo(() => {
    const stats = {}
    for (const t of activeTasks) {
      const cat = t.category || 'other'
      if (!stats[cat]) stats[cat] = { total: 0, done: 0, pending: 0 }
      stats[cat].total++
      if (t.completed) stats[cat].done++
      else             stats[cat].pending++
    }
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [activeTasks])

  const isEmpty = activeGoals.length === 0 && activeHabits.length === 0 && activeTasks.length === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-400 text-xs mt-0.5">Your trends and analytics</p>
      </div>

      {/* Time-range selector */}
      {!isEmpty && (
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                rangeKey === r.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Weekly digest */}
      {(habits.length > 0 || tasks.length > 0 || goals.length > 0) && (
        <WeeklyDigest tasks={tasks} habits={habits} goals={goals} />
      )}

      {/* Range stats */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <Icon name="repeat" size={14} className="text-gray-400 mb-1" />
            <div className="text-xl font-bold text-gray-900 tabular-nums">{habitConsistency}%</div>
            <div className="text-xs text-gray-500 leading-tight">Habit consistency</div>
            <div className="text-xs text-gray-400 mt-0.5">{habitsDone}/{habitsPossible}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <Icon name="check-square" size={14} className="text-gray-400 mb-1" />
            <div className="text-xl font-bold text-gray-900 tabular-nums">{tasksCompleted}</div>
            <div className="text-xs text-gray-500 leading-tight">Tasks done</div>
            <div className="text-xs text-gray-400 mt-0.5">{range.label.toLowerCase()}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <Icon name="trending-up" size={14} className="text-gray-400 mb-1" />
            <div className="text-xl font-bold text-gray-900 tabular-nums">{checkIns}</div>
            <div className="text-xs text-gray-500 leading-tight">Goal check-ins</div>
            <div className="text-xs text-gray-400 mt-0.5">{range.label.toLowerCase()}</div>
          </div>
        </div>
      )}

      {/* Best day of the week */}
      {tasksInRange.length > 0 && (
        <DayOfWeekChart tasksInRange={tasksInRange} />
      )}

      {/* Goal velocity */}
      {activeGoals.filter(g => g.type !== 'weekly').length > 0 && (
        <GoalVelocity goals={goals} days={days} />
      )}

      {/* Goal progress charts */}
      {activeGoals.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Goal progress over time</h2>
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const meta = CATEGORY_META[goal.category] || CATEGORY_META.other
              return (
                <div key={goal.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="text-sm font-medium text-gray-800 truncate">{goal.title}</span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {(goal.checkIns || []).length} check-in{(goal.checkIns || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <GoalProgressChart goal={goal} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Habit analytics */}
      {activeHabits.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Habits</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
            <HabitHeatmap habits={habits} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">{range.label} stats per habit</h3>
            <div className="space-y-3">
              {perHabitStats.map(({ habit, rate, hits, totalDays, currentStreak, longestStreak }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate flex-1 font-medium">{habit.title}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0 tabular-nums">
                      {hits}/{totalDays}
                      <span className="ml-1.5 font-semibold text-gray-700">{rate}%</span>
                    </span>
                  </div>
                  <ProgressBar value={rate} color={rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'} height={4} />
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Icon name="flame" size={10} className="text-amber-400" />
                      <span className="tabular-nums font-semibold text-gray-600">{currentStreak}</span> current
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="trending-up" size={10} className="text-green-500" />
                      <span className="tabular-nums font-semibold text-gray-600">{longestStreak}</span> best ever
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tasks by category */}
      {activeTasks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks by category</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="space-y-3">
              {sortedCategories.map(([cat, stats]) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.other
                const donePct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                        <span className="text-sm text-gray-700">{meta.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">
                        <span className="font-semibold text-gray-700">{stats.done}</span>
                        <span className="text-gray-400">/{stats.total}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${donePct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Journal consistency */}
      {journal.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Journal</h2>
          <JournalConsistency journal={journal} days={days} />
        </section>
      )}

      {/* Sync — visible on mobile only (desktop has it in the sidebar) */}
      <section className="lg:hidden">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Device sync</h2>
        <SyncPanel />
      </section>

      {/* Empty state for brand new users */}
      {isEmpty && (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="bar-chart" size={24} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Nothing to visualize yet</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Add goals, tasks, or habits and your stats will appear here.
          </p>
        </div>
      )}
    </div>
  )
}
