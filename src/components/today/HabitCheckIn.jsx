import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'
import Icon from '../shared/Icon'

const CONFIDENCE_COLORS = {
  high:   '#10b981',
  medium: '#f59e0b',
  low:    '#9ca3af',
}

export default function HabitCheckIn() {
  const { habits, toggleToday, isCompletedToday } = useDataContext()
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState(null)
  const [error, setError]     = useState(null)

  const activeHabits = habits.filter(h => !h.archived)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || activeHabits.length === 0) return

    setLoading(true)
    setError(null)
    setMatches(null)

    try {
      const res = await fetch('/.netlify/functions/habit-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          habits: activeHabits.map(h => ({ id: h.id, title: h.title, description: h.description })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 502) throw new Error('AI service error. Try again in a moment.')
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      const validMatches = (data.matches || []).filter(m => activeHabits.some(h => h.id === m.habitId))
      setMatches(validMatches)
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'No connection. Your API key may not be configured yet.'
        : err.message)
    }
    setLoading(false)
  }

  function confirmAndMark() {
    matches.forEach(m => {
      const habit = activeHabits.find(h => h.id === m.habitId)
      if (habit && !isCompletedToday(habit)) toggleToday(m.habitId)
    })
    setText('')
    setMatches(null)
  }

  function toggleMatch(habitId) {
    setMatches(prev => prev.filter(m => m.habitId !== habitId))
  }

  if (activeHabits.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="zap" size={15} className="text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-900">AI Check-in</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3">Tell me in plain English what you did today</p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Did my morning run, meditated 10 mins, skipped reading"
          rows={2}
          disabled={loading || !!matches}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none disabled:opacity-60"
        />
        {!matches && (
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5"
            style={{ background: '#3b82f6' }}
          >
            {loading ? 'Processing…' : 'Match my habits'}
          </button>
        )}
      </form>

      {error && (
        <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
          {error}
        </div>
      )}

      {matches && (
        <div className="mt-3 space-y-2">
          {matches.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-xs text-gray-500">No habits matched.</p>
              <button onClick={() => { setText(''); setMatches(null) }} className="text-xs text-blue-500 hover:underline cursor-pointer mt-1">
                Try again
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-700">
                Found {matches.length} habit{matches.length > 1 ? 's' : ''}:
              </p>
              <div className="space-y-1.5">
                {matches.map(m => {
                  const habit = activeHabits.find(h => h.id === m.habitId)
                  if (!habit) return null
                  return (
                    <div key={m.habitId} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <Icon name="check" size={14} className="text-green-500 mt-0.5 shrink-0" strokeWidth={3} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{habit.title}</span>
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ color: CONFIDENCE_COLORS[m.confidence], background: `${CONFIDENCE_COLORS[m.confidence]}18` }}
                          >
                            {m.confidence}
                          </span>
                        </div>
                        {m.reasoning && <p className="text-xs text-gray-400 mt-0.5">{m.reasoning}</p>}
                      </div>
                      <button onClick={() => toggleMatch(m.habitId)} className="p-1 rounded text-gray-300 hover:text-red-500 cursor-pointer">
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmAndMark}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90"
                  style={{ background: '#10b981' }}
                >
                  Mark {matches.length} done
                </button>
                <button
                  onClick={() => { setText(''); setMatches(null) }}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
