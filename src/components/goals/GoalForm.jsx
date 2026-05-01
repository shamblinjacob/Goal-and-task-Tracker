import { useState, useEffect, useRef } from 'react'
import Icon from '../shared/Icon'
import { parseGoalInput } from '../../utils/parseGoalInput'
import { vibrate } from '../../utils/haptics'

const CATEGORIES = [
  { value: 'health',   label: 'Health' },
  { value: 'career',   label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'finance',  label: 'Finance' },
  { value: 'learning', label: 'Learning' },
  { value: 'other',    label: 'Other' },
]

const UNIT_PRESETS = ['miles', 'km', 'minutes', 'hours', 'sessions', 'days', 'pages', 'reps']

function VoiceGoalSheet({ onApply, onClose }) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null
  const supported = !!SR

  const [transcript, setTranscript] = useState('')
  const [listening,  setListening]  = useState(false)
  const [error,      setError]      = useState('')
  const recRef    = useRef(null)
  const finalRef  = useRef('')

  useEffect(() => {
    if (!supported) return
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
  }, [SR, supported])

  function handleApply() {
    try { recRef.current?.stop() } catch {}
    const parsed = parseGoalInput(transcript)
    if (!parsed.title) { setError("Couldn't extract a goal — try again."); return }
    vibrate(15)
    onApply(parsed)
  }

  const preview = transcript.trim() ? parseGoalInput(transcript) : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Speak your goal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">×</button>
        </div>

        {supported ? (
          <div className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ${
            listening ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            {listening ? 'Listening…' : 'Stopped'}
          </div>
        ) : (
          <p className="text-xs text-gray-500">Voice not supported on this browser — type instead.</p>
        )}

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={3}
          placeholder='e.g. "Run a half marathon by October, health goal" or "Learn Spanish by end of year, learning"'
          className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-800 leading-relaxed border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />

        {preview?.title && (
          <div className="text-xs text-gray-500 space-y-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div><span className="text-gray-400">Title:</span> <span className="font-semibold text-gray-800">{preview.title}</span></div>
            <div><span className="text-gray-400">Category:</span> <span className="font-medium text-gray-700">{preview.category}</span></div>
            {preview.targetDate && (
              <div><span className="text-gray-400">Target date:</span> <span className="font-medium text-gray-700">{preview.targetDate}</span></div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium cursor-pointer hover:bg-gray-200">Cancel</button>
          <button
            onClick={handleApply}
            disabled={!transcript.trim()}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-blue-700"
          >
            Use this
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoalForm({ onSubmit, initial = {} }) {
  const [type, setType] = useState(initial.type || 'regular')

  // Regular goal fields
  const [form, setForm] = useState({
    title:       initial.title       || '',
    description: initial.description || '',
    category:    initial.category    || 'personal',
    targetDate:  initial.targetDate  || '',
  })
  const [milestones, setMilestones] = useState(
    (initial.milestones || []).map(m => ({ ...m }))
  )

  // Weekly goal fields
  const [weeklyForm, setWeeklyForm] = useState({
    title:       initial.title       || '',
    description: initial.description || '',
    category:    initial.category    || 'health',
    target:      initial.target      || '',
    unit:        initial.unit        || '',
  })

  const [showVoice, setShowVoice] = useState(false)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }
  function setW(field, val) { setWeeklyForm(f => ({ ...f, [field]: val })) }

  function applyVoice(parsed) {
    setForm(f => ({
      ...f,
      title:       parsed.title       || f.title,
      category:    parsed.category    || f.category,
      targetDate:  parsed.targetDate  || f.targetDate,
    }))
    setShowVoice(false)
  }

  function addMilestone() {
    setMilestones(prev => [...prev, { id: crypto.randomUUID(), title: '', completed: false }])
  }
  function updateMilestoneTitle(id, title) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, title } : m))
  }
  function removeMilestone(id) {
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (type === 'weekly') {
      if (!weeklyForm.title.trim() || !weeklyForm.target || !weeklyForm.unit.trim()) return
      onSubmit({ ...weeklyForm, type: 'weekly', target: Number(weeklyForm.target) })
    } else {
      if (!form.title.trim()) return
      onSubmit({ ...form, milestones: milestones.filter(m => m.title.trim()) })
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Type toggle — only show when creating (no initial type set) */}
      {!initial.type && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('regular')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${type === 'regular' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Long-term goal
          </button>
          <button
            type="button"
            onClick={() => setType('weekly')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${type === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Weekly recurring
          </button>
        </div>
      )}

      {type === 'weekly' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal title *</label>
            <input
              type="text" value={weeklyForm.title} onChange={e => setW('title', e.target.value)}
              placeholder="e.g. Run 20 miles per week"
              className={inputCls} required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekly target *</label>
              <input
                type="number" min="0.1" step="any"
                value={weeklyForm.target} onChange={e => setW('target', e.target.value)}
                placeholder="e.g. 20"
                className={inputCls} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <input
                type="text"
                value={weeklyForm.unit} onChange={e => setW('unit', e.target.value)}
                placeholder="miles, sessions…"
                list="unit-presets"
                className={inputCls} required
              />
              <datalist id="unit-presets">
                {UNIT_PRESETS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={weeklyForm.category} onChange={e => setW('category', e.target.value)}
                className={inputCls + ' bg-white'}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={weeklyForm.description} onChange={e => setW('description', e.target.value)}
              placeholder="Any notes about this goal"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>
        </>
      ) : (
        <>
          {!initial.title && (
            <button
              type="button"
              onClick={() => setShowVoice(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <Icon name="mic" size={14} />
              Speak your goal — fills the form for you
            </button>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal title *</label>
            <input
              type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Run a half marathon"
              className={inputCls} required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(shown as motivation)</span></label>
            <textarea
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Why does this goal matter to you?"
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category} onChange={e => set('category', e.target.value)}
                className={inputCls + ' bg-white'}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
              <input
                type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Milestones <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <button type="button" onClick={addMilestone} className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                <Icon name="plus" size={12} /> Add
              </button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No milestones yet. Add milestones to automatically track progress.</p>
            ) : (
              <div className="space-y-1.5">
                {milestones.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                    <input
                      type="text" value={m.title} onChange={e => updateMilestoneTitle(m.id, e.target.value)}
                      placeholder={`Milestone ${i + 1}`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button" onClick={() => removeMilestone(m.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          {initial.title ? 'Save changes' : 'Add goal'}
        </button>
      </div>

      {showVoice && <VoiceGoalSheet onApply={applyVoice} onClose={() => setShowVoice(false)} />}
    </form>
  )
}
