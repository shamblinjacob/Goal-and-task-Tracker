import { useEffect, useRef, useState } from 'react'
import Icon from '../shared/Icon'
import { vibrate } from '../../utils/haptics'
import { parseDailyCheckIn } from '../../utils/parseDailyCheckIn'

// Multi-action voice check-in: speak habits you completed + tasks to add.
// Fuzzy-matches spoken text against habit names (handles conjugation),
// then extracts tasks from "also add a task…" clauses.
export default function DailyVoiceCapture({ habits, onSave, onClose }) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null
  const supported = !!SR

  const [transcript, setTranscript] = useState('')
  const [listening,  setListening]  = useState(false)
  const [error,      setError]      = useState('')
  const [manual,     setManual]     = useState(!supported)
  const [parsed,     setParsed]     = useState(null)
  const [checkedIds, setCheckedIds] = useState(new Set())

  const recRef   = useRef(null)
  const finalRef = useRef('')

  useEffect(() => {
    if (!supported || manual) return
    const rec = new SR()
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = 'en-US'

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += txt + ' '
        else interim += txt
      }
      setTranscript((finalRef.current + interim).trim())
    }
    rec.onerror = (e) => {
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : `Recognition error: ${e.error}`)
      }
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    try { rec.start(); setListening(true); vibrate(10) }
    catch (err) { setError(String(err.message || err)) }

    return () => { try { rec.stop() } catch {} }
  }, [SR, supported, manual])

  // Debounced re-parse when transcript changes
  useEffect(() => {
    if (!transcript.trim()) { setParsed(null); setCheckedIds(new Set()); return }
    const handle = setTimeout(() => {
      const result = parseDailyCheckIn(transcript, habits)
      setParsed(result)
      setCheckedIds(new Set(result.matchedHabits.map(h => h.id)))
    }, 400)
    return () => clearTimeout(handle)
  }, [transcript, habits])

  function toggleListening() {
    if (listening) {
      try { recRef.current?.stop() } catch {}
    } else {
      try { recRef.current?.start(); setListening(true) }
      catch (e) { setError(String(e.message || e)) }
    }
  }

  function toggleHabit(id) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    try { recRef.current?.stop() } catch {}
    vibrate(15)
    onSave({
      habitIds: [...checkedIds],
      tasks:    parsed?.tasks || [],
    })
  }

  const habitCount = checkedIds.size
  const taskCount  = parsed?.tasks?.length || 0
  const canSave    = habitCount + taskCount > 0

  const saveLabel = !canSave
    ? 'Save'
    : `Save (${[
        habitCount && `${habitCount} habit${habitCount > 1 ? 's' : ''}`,
        taskCount  && `${taskCount} task${taskCount > 1 ? 's' : ''}`,
      ].filter(Boolean).join(' + ')})`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Voice check-in</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">×</button>
        </div>

        {!manual && supported && (
          <button
            onClick={toggleListening}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
              listening ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            {listening ? 'Listening — tap to pause' : 'Tap to resume'}
          </button>
        )}

        {!manual ? (
          <div className="min-h-[72px] p-3 bg-gray-50 rounded-xl text-sm text-gray-800 leading-relaxed">
            {transcript || (
              <span className="text-gray-400">
                Say what you did today — mention habits by name. Say "also add a task" to log something too.
              </span>
            )}
          </div>
        ) : (
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            autoFocus
            rows={4}
            placeholder='e.g. "I woke up, weighed myself, took my creatine. Also add a task low priority finish homework by friday"'
            className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-800 leading-relaxed border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        )}

        {/* Matched habits */}
        {parsed && parsed.matchedHabits.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Habits to complete</p>
            <div className="space-y-1.5">
              {parsed.matchedHabits.map(h => (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-left transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                    checkedIds.has(h.id) ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {checkedIds.has(h.id) && <Icon name="check" size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-gray-800">{h.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parsed tasks */}
        {parsed && parsed.tasks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {parsed.tasks.length === 1 ? 'Task to add' : 'Tasks to add'}
            </p>
            <div className="space-y-1.5">
              {parsed.tasks.map((t, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-medium text-gray-800">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.dueDate && (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <Icon name="calendar" size={11} /> {t.dueDate}
                      </span>
                    )}
                    {t.priority !== 'medium' && (
                      <span className={`text-xs font-medium ${t.priority === 'high' ? 'text-red-500' : 'text-green-600'}`}>
                        {t.priority} priority
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nothing recognized yet */}
        {parsed && parsed.matchedHabits.length === 0 && parsed.tasks.length === 0 && transcript.trim() && (
          <p className="text-xs text-gray-400 text-center">
            No habits matched yet — try mentioning habit names more directly.
          </p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          {supported && (
            <button
              onClick={() => { setManual(m => !m); setError('') }}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium cursor-pointer hover:bg-gray-200"
              title={manual ? 'Use voice' : 'Type instead'}
            >
              <Icon name={manual ? 'mic' : 'edit'} size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium cursor-pointer hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-blue-700"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
