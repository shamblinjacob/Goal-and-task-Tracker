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
