import { useState } from 'react'
import { toDateString } from '../../utils/dateUtils'
import Icon from '../shared/Icon'

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TaskCalendar({ tasks, onAddTask, isRecurringDone }) {
  const today = toDateString()
  const [selectedDate, setSelectedDate] = useState(today)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const firstDay = new Date(month.year, month.month, 1)
  const lastDay  = new Date(month.year, month.month + 1, 0)
  const startPad = firstDay.getDay()  // 0 = Sunday

  // Build grid cells: padded empty slots + day numbers
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

  function dateStr(day) {
    if (!day) return ''
    const m = String(month.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${month.year}-${m}-${d}`
  }

  function tasksForDay(day) {
    const ds = dateStr(day)
    if (!ds) return []
    return tasks.filter(t => {
      if (t.archived) return false
      if (!t.dueDate) return false
      return t.dueDate === ds
    })
  }

  function prevMonth() {
    setMonth(p => {
      if (p.month === 0) return { year: p.year - 1, month: 11 }
      return { year: p.year, month: p.month - 1 }
    })
  }
  function nextMonth() {
    setMonth(p => {
      if (p.month === 11) return { year: p.year + 1, month: 0 }
      return { year: p.year, month: p.month + 1 }
    })
  }

  const selectedTasks = tasks.filter(t => {
    if (t.archived) return false
    if (!t.dueDate) return false
    return t.dueDate === selectedDate
  })

  const monthLabel = new Date(month.year, month.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <Icon name="chevron-right" size={16} className="rotate-180" />
          </button>
          <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium pb-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            const ds = dateStr(day)
            const dayTasks = tasksForDay(day)
            const isToday  = ds === today
            const isSelected = ds === selectedDate && !!day
            const hasOverdue = dayTasks.some(t => {
              const done = t.recurring ? isRecurringDone?.(t) : t.completed
              return !done
            })

            return (
              <button
                key={i}
                onClick={() => day && setSelectedDate(ds)}
                disabled={!day}
                className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs cursor-pointer transition-colors ${
                  !day ? '' :
                  isSelected ? 'bg-blue-600 text-white' :
                  isToday ? 'bg-blue-50 text-blue-700 font-semibold' :
                  'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {day && (
                  <>
                    <span className="leading-none">{day}</span>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayTasks.slice(0, 3).map(t => (
                          <span
                            key={t.id}
                            className="w-1 h-1 rounded-full"
                            style={{ background: isSelected ? 'rgba(255,255,255,0.8)' : (PRIORITY_COLOR[t.priority] || '#94a3b8') }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tasks for selected date */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">
            {selectedDate === today ? "Today's tasks" :
              new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <button onClick={onAddTask}
            className="text-xs text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-1">
            <Icon name="plus" size={12} /> Add task
          </button>
        </div>
        {selectedTasks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No tasks due this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(t => {
              const done = t.recurring ? isRecurringDone?.(t) : t.completed
              return (
                <div key={t.id} className={`flex items-center gap-2 ${done ? 'opacity-50' : ''}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[t.priority] || '#94a3b8' }} />
                  <span className={`text-sm flex-1 ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</span>
                  {done && <span className="text-xs text-green-500 font-medium">Done</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
