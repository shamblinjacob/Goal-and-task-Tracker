// Helpers for the weekly review feature.
// Weeks run Monday → Sunday. The "review week" is the most recently completed
// one: on Sunday, that's the week ending today; otherwise it's the week
// ending the prior Sunday.

import { toDateString } from './dateUtils'

export function getReviewWeek(today = new Date()) {
  const d = new Date(today); d.setHours(0, 0, 0, 0)
  const dow = d.getDay()                              // 0=Sun … 6=Sat
  const daysSinceSun = dow === 0 ? 0 : dow            // 0 if Sun, else 1..6
  const weekEnd   = new Date(d); weekEnd.setDate(d.getDate() - daysSinceSun)
  const weekStart = new Date(weekEnd); weekStart.setDate(weekEnd.getDate() - 6)
  return { weekStart, weekEnd, weekId: toDateString(weekStart) }
}

export function formatWeekRange(weekStart, weekEnd) {
  const opts = { month: 'short', day: 'numeric' }
  const a = weekStart.toLocaleDateString('en-US', opts)
  const b = weekEnd.toLocaleDateString('en-US', opts)
  return `${a} – ${b}`
}

export function computeWeeklyStats({ tasks, habits, goals, weekStart, weekEnd }) {
  const startStr = toDateString(weekStart)
  const endStr   = toDateString(weekEnd)

  // Habits: sum done across the 7 days
  const activeHabits = habits.filter(h => !h.archived)
  let habitsTotal = 0, habitsDone = 0
  const habitDetail = activeHabits.map(h => {
    let done = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
      const ds = toDateString(d)
      if (h.completions?.includes(ds)) done++
      habitsTotal++
    }
    habitsDone += done
    return { habit: h, done, possible: 7 }
  })
  habitDetail.sort((a, b) => b.done - a.done)
  const best  = habitDetail[0]
  const worst = habitDetail[habitDetail.length - 1]

  // Tasks: completedAt within window
  const tasksCompleted = tasks.filter(t => {
    if (!t.completedAt) return false
    const c = String(t.completedAt).slice(0, 10)
    return c >= startStr && c <= endStr
  }).length

  // Goals: progress at start of week (latest checkIn before start) → current
  const goalMovement = goals
    .filter(g => g.status === 'active' && g.type !== 'weekly')
    .map(g => {
      const past = (g.checkIns || [])
        .filter(c => c?.date && c.date < startStr)
        .sort((a, b) => a.date.localeCompare(b.date))
      const before = past.length ? Number(past[past.length - 1].progress) || 0 : 0
      const after  = Number(g.progress) || 0
      return { goal: g, before, after, change: after - before }
    })
    .sort((a, b) => b.change - a.change)

  return {
    startStr, endStr,
    habitsTotal, habitsDone,
    habitPct: habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0,
    bestHabit:  best  && best.done  > 0 ? best  : null,
    worstHabit: worst && worst.done < worst.possible ? worst : null,
    tasksCompleted,
    goalMovement,
  }
}
