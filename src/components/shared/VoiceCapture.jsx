import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { vibrate } from '../../utils/haptics'
import { parseTaskInput } from '../../utils/parseTaskInput'

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

// Voice → task. Auto-starts recognition on open. Live transcript shows what
// it heard; tap "Save task" to parse + create. Falls back to a typed input
// when Web Speech is unavailable (older browsers, some PWAs).
export default function VoiceCapture({ onSave, onClose }) {
  const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
  const supported = !!SR

  const [transcript, setTranscript] = useState('')
  const [listening,  setListening]  = useState(false)
  const [error,      setError]      = useState('')
  const [manual,     setManual]     = useState(!supported)

  const recRef     = useRef(null)
  const finalRef   = useRef('')

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
      // "no-speech" and "aborted" are routine — surface only useful errors
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : `Recognition error: ${e.error}`)
      }
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      vibrate(10)
    } catch (err) {
      setError(String(err.message || err))
    }

    return () => { try { rec.stop() } catch {} }
  }, [SR, supported, manual])

  function handleSave() {
    try { recRef.current?.stop() } catch {}
    const text = transcript.trim()
    if (!text) { onClose(); return }
    const parsed = parseTaskInput(text)
    if (!parsed.title) { setError("Couldn't extract a task — try again."); return }
    vibrate(15)
    onSave(parsed)
  }

  function toggleListening() {
    if (listening) {
      try { recRef.current?.stop() } catch {}
    } else {
      try { recRef.current?.start(); setListening(true) } catch (e) { setError(String(e.message || e)) }
    }
  }

  // Live preview of how the input will be parsed
  const preview = transcript.trim() ? parseTaskInput(transcript) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Quick add task</h3>
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
          <div className="min-h-[80px] p-3 bg-gray-50 rounded-xl text-sm text-gray-800 leading-relaxed">
            {transcript || <span className="text-gray-400">Speak a task — try "Email landlord tomorrow" or "Urgent: call dentist Friday"</span>}
          </div>
        ) : (
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            autoFocus
            rows={3}
            placeholder='e.g. "Email landlord tomorrow" or "Urgent: call dentist Friday"'
            className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-800 leading-relaxed border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        )}

        {/* Live parse preview */}
        {preview?.title && (
          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span className="text-gray-400">Will save as:</span>
            <span className="font-semibold text-gray-700">{preview.title}</span>
            {preview.dueDate && (
              <span className="text-blue-600 flex items-center gap-1">
                <Icon name="calendar" size={11} /> {preview.dueDate}
              </span>
            )}
            {preview.priority !== 'medium' && (
              <span className="flex items-center gap-1" style={{ color: PRIORITY_COLOR[preview.priority] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[preview.priority] }} />
                {preview.priority}
              </span>
            )}
          </div>
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
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium cursor-pointer hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!transcript.trim()}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-blue-700"
          >
            Save task
          </button>
        </div>
      </div>
    </div>
  )
}
