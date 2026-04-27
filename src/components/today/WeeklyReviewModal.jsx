import { useState, useMemo } from 'react'
import { useDataContext } from '../../context/DataContext'
import Modal from '../shared/Modal'
import ProgressBar from '../shared/ProgressBar'
import Icon from '../shared/Icon'
import { computeWeeklyStats, formatWeekRange, getReviewWeek } from '../../utils/weeklyReview'

export default function WeeklyReviewModal({ onClose }) {
  const { tasks, habits, goals, saveWeeklyReview, getWeeklyReview } = useDataContext()

  const { weekStart, weekEnd, weekId } = useMemo(() => getReviewWeek(), [])
  const stats    = useMemo(
    () => computeWeeklyStats({ tasks, habits, goals, weekStart, weekEnd }),
    [tasks, habits, goals, weekStart, weekEnd],
  )
  const existing = getWeeklyReview(weekId)

  const [whatWorked,  setWhatWorked]  = useState(existing?.whatWorked  || '')
  const [whatBetter,  setWhatBetter]  = useState(existing?.whatBetter  || '')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await saveWeeklyReview(weekId, {
        weekStart: stats.startStr,
        weekEnd:   stats.endStr,
        whatWorked,
        whatBetter,
        snapshot: {
          habitsDone:     stats.habitsDone,
          habitsTotal:    stats.habitsTotal,
          habitPct:       stats.habitPct,
          tasksCompleted: stats.tasksCompleted,
          goalMovement:   stats.goalMovement.map(g => ({
            goalId: g.goal.id, title: g.goal.title, before: g.before, after: g.after, change: g.change,
          })),
        },
      })
      setSaved(true)
      setTimeout(onClose, 800)
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Weekly review · ${formatWeekRange(weekStart, weekEnd)}`} onClose={onClose}>
      <div className="space-y-5">

        {/* Habits */}
        {stats.habitsTotal > 0 && (
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Habits</span>
              <span className="text-xs text-gray-500 tabular-nums">{stats.habitsDone}/{stats.habitsTotal} · {stats.habitPct}%</span>
            </div>
            <ProgressBar value={stats.habitPct} color="#10b981" height={6} />
            <div className="mt-2 space-y-1 text-xs">
              {stats.bestHabit && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium">Best</span>
                  <span className="text-gray-700 truncate">{stats.bestHabit.habit.title}</span>
                  <span className="ml-auto tabular-nums text-gray-400">{stats.bestHabit.done}/7</span>
                </div>
              )}
              {stats.worstHabit && stats.worstHabit !== stats.bestHabit && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-medium">Slipping</span>
                  <span className="text-gray-700 truncate">{stats.worstHabit.habit.title}</span>
                  <span className="ml-auto tabular-nums text-gray-400">{stats.worstHabit.done}/7</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tasks */}
        <section>
          <div className="flex items-center gap-2">
            <Icon name="check-square" size={14} className="text-blue-500" />
            <span className="text-sm text-gray-700">
              <span className="font-bold tabular-nums">{stats.tasksCompleted}</span>
              <span className="text-gray-500"> task{stats.tasksCompleted === 1 ? '' : 's'} completed</span>
            </span>
          </div>
        </section>

        {/* Goal movement */}
        {stats.goalMovement.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Goal movement</h3>
            <div className="space-y-1.5">
              {stats.goalMovement.map(({ goal, before, after, change }) => (
                <div key={goal.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-gray-700 truncate">{goal.title}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{before}% → {after}%</span>
                  <span
                    className={`text-xs font-semibold tabular-nums w-12 text-right ${
                      change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {change > 0 ? '+' : ''}{change}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reflection prompts */}
        <section>
          <label className="block text-xs font-semibold text-gray-600 mb-1">What worked this week?</label>
          <textarea
            value={whatWorked}
            onChange={e => setWhatWorked(e.target.value)}
            rows={3}
            placeholder="Wins, what felt easy, what to keep doing…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </section>
        <section>
          <label className="block text-xs font-semibold text-gray-600 mb-1">What gets better next week?</label>
          <textarea
            value={whatBetter}
            onChange={e => setWhatBetter(e.target.value)}
            rows={3}
            placeholder="Friction points, one specific change to make…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
          style={{ background: '#3b82f6' }}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : existing ? 'Update review' : 'Save review'}
        </button>
      </div>
    </Modal>
  )
}
