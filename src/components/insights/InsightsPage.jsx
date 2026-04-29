import { useState } from 'react'
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

function WeeklyDigest({ tasks, habits, goals }) {
  const [copied, setCopied] = useState(false)
  const { weekStart, weekEnd, weekId } = getReviewWeek()
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

export default function InsightsPage() {
  const { goals, tasks, habits } = useDataContext()

  const activeGoals   = goals.filter(g => g.status === 'active')
  const activeTasks   = tasks.filter(t => !t.archived)
  const activeHabits  = habits.filter(h => !h.archived)

  // ── This week stats ───────────────────────────────────────────────────────
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const habitsDoneThisWeek = activeHabits.reduce((sum, h) =>
    sum + (h.completions || []).filter(d => new Date(d + 'T12:00:00') >= weekAgo).length, 0
  )
  const habitsPossibleThisWeek = activeHabits.length * 7
  const habitConsistency = habitsPossibleThisWeek > 0
    ? Math.round((habitsDoneThisWeek / habitsPossibleThisWeek) * 100) : 0

  const tasksCompletedThisWeek = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= weekAgo).length
  const checkInsThisWeek = activeGoals.reduce((sum, g) =>
    sum + (g.checkIns || []).filter(c => new Date(c.date + 'T12:00:00') >= weekAgo).length, 0
  )

  // ── Task category breakdown ───────────────────────────────────────────────
  const categoryStats = {}
  for (const t of activeTasks) {
    const cat = t.category || 'other'
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, done: 0, pending: 0 }
    categoryStats[cat].total++
    if (t.completed) categoryStats[cat].done++
    else             categoryStats[cat].pending++
  }
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total)

  // ── Habit per-habit stats ─────────────────────────────────────────────────
  const perHabitStats = activeHabits.map(h => {
    const created = new Date(h.createdAt)
    const daysAvailable = Math.max(1, Math.ceil((new Date() - created) / 86400000))
    const totalDays = Math.min(daysAvailable, 30)   // last 30 days cap
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - totalDays + 1)
    const hits = (h.completions || []).filter(d => new Date(d + 'T12:00:00') >= cutoff).length
    const rate = totalDays > 0 ? Math.round((hits / totalDays) * 100) : 0
    return { habit: h, rate, hits, totalDays }
  }).sort((a, b) => b.rate - a.rate)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-400 text-xs mt-0.5">Your trends and analytics</p>
      </div>

      {/* Weekly digest */}
      {(habits.length > 0 || tasks.length > 0 || goals.length > 0) && (
        <WeeklyDigest tasks={tasks} habits={habits} goals={goals} />
      )}

      {/* This week stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <Icon name="repeat" size={14} className="text-gray-400 mb-1" />
          <div className="text-xl font-bold text-gray-900 tabular-nums">{habitConsistency}%</div>
          <div className="text-xs text-gray-500 leading-tight">Habit consistency</div>
          <div className="text-xs text-gray-400 mt-0.5">{habitsDoneThisWeek}/{habitsPossibleThisWeek} this week</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <Icon name="check-square" size={14} className="text-gray-400 mb-1" />
          <div className="text-xl font-bold text-gray-900 tabular-nums">{tasksCompletedThisWeek}</div>
          <div className="text-xs text-gray-500 leading-tight">Tasks done</div>
          <div className="text-xs text-gray-400 mt-0.5">this week</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <Icon name="trending-up" size={14} className="text-gray-400 mb-1" />
          <div className="text-xl font-bold text-gray-900 tabular-nums">{checkInsThisWeek}</div>
          <div className="text-xs text-gray-500 leading-tight">Goal check-ins</div>
          <div className="text-xs text-gray-400 mt-0.5">this week</div>
        </div>
      </div>

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
            <h3 className="text-xs font-semibold text-gray-600 mb-3">30-day completion rate</h3>
            <div className="space-y-2.5">
              {perHabitStats.map(({ habit, rate, hits, totalDays }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate flex-1">{habit.title}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0 tabular-nums">
                      {hits}/{totalDays}
                      <span className="ml-1.5 font-semibold text-gray-700">{rate}%</span>
                    </span>
                  </div>
                  <ProgressBar value={rate} color={rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'} height={4} />
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

      {/* Sync — visible on mobile only (desktop has it in the sidebar) */}
      <section className="lg:hidden">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Device sync</h2>
        <SyncPanel />
      </section>

      {/* Empty state for brand new users */}
      {activeGoals.length === 0 && activeHabits.length === 0 && activeTasks.length === 0 && (
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
