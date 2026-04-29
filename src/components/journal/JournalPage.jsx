import { useState, useEffect, useRef } from 'react'
import { useDataContext } from '../../context/DataContext'
import { toDateString } from '../../utils/dateUtils'
import { pickOneGoal } from '../../utils/pickFocus'
import Icon from '../shared/Icon'
import ConfirmDelete from '../shared/ConfirmDelete'

const PROMPTS = [
  { key: 'wentWell',  label: 'What went well today?',           placeholder: 'A win, a moment of pride, something that worked…' },
  { key: 'didntGo',   label: 'What didn\'t go as planned?',     placeholder: 'A friction point, what you avoided, what you\'d redo…' },
  { key: 'grateful',  label: 'What are you grateful for?',      placeholder: 'People, small moments, anything…' },
  { key: 'tomorrow',  label: 'One thing to focus on tomorrow?', placeholder: 'The single most important thing for tomorrow.' },
]

function formatLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function AutoTextarea({ value, onChange, placeholder, rows = 2, minHeight = 60 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = ref.current.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
      style={{ minHeight }}
    />
  )
}

function PastEntry({ entry, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const filledKeys = PROMPTS.filter(p => entry[p.key]?.trim()).map(p => p.key)
  const hasNotes   = !!entry.notes?.trim()
  const summary    = filledKeys[0] ? entry[filledKeys[0]] : (entry.notes || '')

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-start gap-3 cursor-pointer text-left hover:bg-gray-50 transition-colors rounded-xl">
        <div className="w-1 self-stretch rounded-full bg-blue-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500">{formatShort(entry.date)}</p>
          {!open && summary && (
            <p className="text-sm text-gray-700 mt-1 line-clamp-2 leading-snug">{summary}</p>
          )}
          {!open && !summary && (
            <p className="text-xs text-gray-400 italic mt-1">Empty entry</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs text-gray-400">{filledKeys.length + (hasNotes ? 1 : 0)} fields</span>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} className="text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          {entry.notes?.trim() && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">Notes</p>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.notes}</p>
            </div>
          )}
          {PROMPTS.map(p => entry[p.key]?.trim() && (
            <div key={p.key}>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{p.label}</p>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{entry[p.key]}</p>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={onEdit} className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
              <Icon name="edit" size={11} /> Edit
            </button>
            <ConfirmDelete onConfirm={onDelete} size={11} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function JournalPage() {
  const {
    journal, saveJournalEntry, deleteJournalEntry,
    habits, goals, tasks, isCompletedToday, isRecurringDone,
  } = useDataContext()

  const today           = toDateString()
  const [editingDate,   setEditingDate]   = useState(today)
  const [draft,         setDraft]         = useState(null)
  const [savedAt,       setSavedAt]       = useState(null)
  const [showPrompts,   setShowPrompts]   = useState(false)
  const lastSavedRef    = useRef('')

  // Load the entry under edit whenever the date changes or the underlying
  // entry updates (e.g. via Firestore sync from another device)
  useEffect(() => {
    const existing = journal.find(j => j.date === editingDate)
    const next = existing
      ? { wentWell: '', didntGo: '', grateful: '', tomorrow: '', notes: '', ...existing }
      : { date: editingDate, wentWell: '', didntGo: '', grateful: '', tomorrow: '', notes: '' }
    setDraft(next)
    lastSavedRef.current = JSON.stringify(pickFields(next))
    // Auto-expand prompts if any prompted fields already have content
    const hasPromptContent = PROMPTS.some(p => next[p.key]?.trim())
    setShowPrompts(hasPromptContent)
  }, [editingDate, journal])

  // Debounced auto-save
  useEffect(() => {
    if (!draft) return
    const serialized = JSON.stringify(pickFields(draft))
    if (serialized === lastSavedRef.current) return
    const handle = setTimeout(async () => {
      await saveJournalEntry(editingDate, pickFields(draft))
      lastSavedRef.current = serialized
      setSavedAt(new Date())
    }, 700)
    return () => clearTimeout(handle)
  }, [draft, editingDate, saveJournalEntry])

  function setField(key, val) {
    setDraft(d => ({ ...d, [key]: val }))
  }

  // Contextual nudges — small reminders based on today's data, only on today's entry
  const nudges = []
  if (editingDate === today) {
    const activeHabits = habits.filter(h => !h.archived)
    const doneToday = activeHabits.filter(h => isCompletedToday(h)).length
    if (activeHabits.length > 0) {
      if (doneToday === activeHabits.length) nudges.push({ icon: 'check-circle', text: `All ${activeHabits.length} habits done — what helped you stay consistent?` })
      else if (doneToday === 0)              nudges.push({ icon: 'alert', text: 'No habits done today yet — anything blocking you?' })
      else                                   nudges.push({ icon: 'check', text: `${doneToday} of ${activeHabits.length} habits done — note what worked.` })
    }

    const overdueCount = tasks.filter(t => !t.archived && !t.completed && !t.recurring && t.dueDate && t.dueDate < today).length
    if (overdueCount > 0) nudges.push({ icon: 'clock', text: `${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} — what's blocking them?` })

    const stalled = pickOneGoal(goals)
    if (stalled) nudges.push({ icon: 'target', text: `"${stalled.goal.title}" stalled ${stalled.daysIdle} days — what's the smallest next step?` })

    const tasksCompletedToday = tasks.filter(t => t.completedAt && String(t.completedAt).slice(0, 10) === today).length
    if (tasksCompletedToday > 0) nudges.push({ icon: 'zap', text: `${tasksCompletedToday} task${tasksCompletedToday === 1 ? '' : 's'} completed today — celebrate the wins.` })
  }

  const answeredCount = draft ? PROMPTS.filter(p => draft[p.key]?.trim()).length : 0

  // History (entries other than the one under edit)
  const past = journal
    .filter(j => j.date !== editingDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!draft) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Journal</h1>
          <p className="text-gray-400 text-xs mt-0.5">Daily reflection</p>
        </div>
        <input
          type="date"
          value={editingDate}
          max={today}
          onChange={e => setEditingDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-600"
        />
      </div>

      {/* Date label + saved indicator */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          {editingDate === today ? 'Today' : formatLong(editingDate)}
        </p>
        {savedAt && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Icon name="check" size={11} className="text-green-500" /> Saved
          </span>
        )}
      </div>

      {/* Contextual nudges */}
      {nudges.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 space-y-1.5">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Reminders for today</p>
          {nudges.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-blue-900 leading-snug">
              <Icon name={n.icon} size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <span>{n.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick capture — notes field at the top */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Today's note</label>
        <AutoTextarea
          value={draft.notes}
          onChange={v => setField('notes', v)}
          placeholder="What's on your mind? Just type — it saves automatically."
          rows={3}
          minHeight={72}
        />
      </div>

      {/* Guided reflection — collapsible */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
        <button
          onClick={() => setShowPrompts(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-xs font-semibold text-gray-600">Guided reflection</span>
          <div className="flex items-center gap-2">
            {!showPrompts && answeredCount > 0 && (
              <span className="text-xs text-gray-400">{answeredCount} of {PROMPTS.length} answered</span>
            )}
            {!showPrompts && answeredCount === 0 && (
              <span className="text-xs text-gray-400">4 prompts</span>
            )}
            <Icon name={showPrompts ? 'chevron-down' : 'chevron-right'} size={14} className="text-gray-400" />
          </div>
        </button>
        {showPrompts && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            {PROMPTS.map(p => (
              <div key={p.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{p.label}</label>
                <AutoTextarea
                  value={draft[p.key]}
                  onChange={v => setField(p.key, v)}
                  placeholder={p.placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past entries */}
      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Past entries</h2>
          <div className="space-y-2">
            {past.map(entry => (
              <PastEntry
                key={entry.id || entry.date}
                entry={entry}
                onEdit={() => setEditingDate(entry.date)}
                onDelete={() => deleteJournalEntry(entry.date)}
              />
            ))}
          </div>
        </section>
      )}

      {past.length === 0 && (
        <p className="text-xs text-gray-400 text-center mt-6">
          Past entries will appear here. The journal auto-saves as you type.
        </p>
      )}
    </div>
  )
}

function pickFields(draft) {
  return {
    wentWell: draft.wentWell || '',
    didntGo:  draft.didntGo  || '',
    grateful: draft.grateful || '',
    tomorrow: draft.tomorrow || '',
    notes:    draft.notes    || '',
  }
}
