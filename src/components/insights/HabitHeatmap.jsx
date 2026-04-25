import { toDateString } from '../../utils/dateUtils'

const WEEKS = 14   // how many weeks back to show

function buildGrid(habits) {
  const active = habits.filter(h => !h.archived)
  const end = new Date()
  // Align end to today; move back to the start of the earliest week
  const start = new Date()
  start.setDate(start.getDate() - (WEEKS * 7 - 1))

  // Map date -> count completed
  const completionByDate = new Map()
  for (const h of active) {
    for (const date of h.completions || []) {
      completionByDate.set(date, (completionByDate.get(date) || 0) + 1)
    }
  }

  // Columns = weeks, rows = days-of-week (0 = Sun)
  const cols = []
  const cursor = new Date(start)
  // Align cursor back to Sunday of its week
  cursor.setDate(cursor.getDate() - cursor.getDay())

  while (cursor <= end) {
    const col = []
    for (let day = 0; day < 7; day++) {
      const d = new Date(cursor)
      d.setDate(d.getDate() + day)
      const str = toDateString(d)
      const inRange = d >= start && d <= end
      col.push({
        date: str,
        count: completionByDate.get(str) || 0,
        total: active.length,
        inRange,
      })
    }
    cols.push(col)
    cursor.setDate(cursor.getDate() + 7)
  }

  return { cols, totalHabits: active.length }
}

function colorFor(count, total) {
  if (!total || count === 0) return '#f3f4f6'
  const ratio = Math.min(1, count / total)
  if (ratio >= 1)   return '#10b981'    // all done
  if (ratio >= 0.66) return '#34d399'
  if (ratio >= 0.33) return '#86efac'
  return '#d1fae5'
}

export default function HabitHeatmap({ habits }) {
  const { cols, totalHabits } = buildGrid(habits)
  if (!totalHabits) return null

  const cellSize = 12
  const gap = 3

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-600">Completion history</h3>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-0.5">
            {['#f3f4f6', '#d1fae5', '#86efac', '#34d399', '#10b981'].map(c => (
              <div key={c} className="rounded-sm" style={{ background: c, width: 8, height: 8 }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={cols.length * (cellSize + gap)}
          height={7 * (cellSize + gap)}
          className="block"
        >
          {cols.map((col, ci) => col.map((cell, ri) => (
            <rect
              key={`${ci}-${ri}`}
              x={ci * (cellSize + gap)}
              y={ri * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={cell.inRange ? colorFor(cell.count, cell.total) : 'transparent'}
            >
              {cell.inRange && <title>{`${cell.date}: ${cell.count}/${cell.total} habits`}</title>}
            </rect>
          )))}
        </svg>
      </div>
    </div>
  )
}
