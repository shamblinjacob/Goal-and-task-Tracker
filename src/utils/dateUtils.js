// Returns YYYY-MM-DD using LOCAL date components (not UTC).
// Using toISOString() is wrong for daily tracking because it shifts the date
// by ±1 day relative to the user's wall clock in non-UTC timezones.
export function toDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns YYYY-MM (local month) — used for spending/cash-flow grouping.
export function toMonthString(date = new Date()) {
  return toDateString(date).slice(0, 7)
}

// Human-readable relative date: "Today", "Tomorrow", "Wednesday", "May 15", …
export function formatRelativeDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const diffDays = Math.round((date - today) / 86400000)
  if (diffDays === 0)  return 'Today'
  if (diffDays === 1)  return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays >= 2 && diffDays <= 6)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  const sameYear = date.getFullYear() === today.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
