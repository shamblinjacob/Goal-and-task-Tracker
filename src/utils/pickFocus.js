// "Smart Today" — pick the single most urgent task, the most-skipped habit,
// and the most stalled goal. Returns null when nothing qualifies.

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export function pickOneTask(tasks, today, isRecurringDone) {
  const open = tasks.filter(t => {
    if (t.archived) return false
    if (t.recurring) return !isRecurringDone(t)
    return !t.completed
  })
  if (open.length === 0) return null

  open.sort((a, b) => {
    const aOver = a.dueDate && a.dueDate <  today
    const bOver = b.dueDate && b.dueDate <  today
    if (aOver !== bOver) return aOver ? -1 : 1
    if (aOver && bOver)  return a.dueDate.localeCompare(b.dueDate) // older overdue first

    const aDue = a.dueDate === today
    const bDue = b.dueDate === today
    if (aDue !== bDue) return aDue ? -1 : 1

    const pr = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
    if (pr !== 0) return pr

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return  1
    return 0
  })

  return open[0]
}

// Habit the user is most likely losing — lowest 7-day completion, must not
// already be done today, and only consider habits with ≥3 days of history so
// brand-new habits don't get flagged immediately.
export function pickOneHabit(habits, getLast7, isCompletedToday) {
  const eligible = habits.filter(h => {
    if (h.archived) return false
    if (isCompletedToday(h)) return false
    return true
  })
  if (eligible.length === 0) return null

  const scored = eligible.map(h => {
    const last7    = getLast7(h)
    const doneDays = last7.filter(d => d.done).length
    return { habit: h, doneDays, missed: 7 - doneDays }
  })

  // Only flag if at least 2 of last 7 were missed (so doing-fine habits don't
  // get singled out). Otherwise, fall back to the oldest pending habit.
  const struggling = scored.filter(s => s.missed >= 2)
  if (struggling.length > 0) {
    struggling.sort((a, b) => a.doneDays - b.doneDays || a.missed - b.missed)
    return { ...struggling[0], reason: 'struggling' }
  }
  scored.sort((a, b) => a.doneDays - b.doneDays)
  return { ...scored[0], reason: 'pending' }
}

// Long-term goal that's been stalled the longest. Stalled = no check-in,
// progress change, or completion in N+ days. Returns null when no goal has
// been idle for ≥7 days.
export function pickOneGoal(goals) {
  const active = goals.filter(g => g.status === 'active' && g.type !== 'weekly')
  if (active.length === 0) return null

  function lastMovement(g) {
    const candidates = []
    if (g.lastCheckIn) candidates.push(g.lastCheckIn)
    if (Array.isArray(g.checkIns)) {
      for (const c of g.checkIns) if (c?.date) candidates.push(c.date)
    }
    if (g.createdAt) candidates.push(g.createdAt)
    if (candidates.length === 0) return null
    return candidates.sort().pop()
  }

  function daysIdle(g) {
    const ref = lastMovement(g)
    if (!ref) return 0
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
  }

  const sorted = [...active].sort((a, b) => daysIdle(b) - daysIdle(a))
  const top = sorted[0]
  const idle = daysIdle(top)
  if (idle < 7) return null
  return { goal: top, daysIdle: idle }
}
