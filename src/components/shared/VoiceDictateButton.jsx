import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { vibrate } from '../../utils/haptics'

// Inline mic button that dictates speech directly into a text field.
// Appends final transcripts to whatever's already in the field; user keeps typing.
// Tap once to start, tap again to stop.
export default function VoiceDictateButton({ value, onChange, size = 14, title = 'Dictate' }) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null
  const supported = !!SR

  const [listening, setListening] = useState(false)
  const recRef     = useRef(null)
  const valueRef   = useRef(value || '')

  // Keep the latest value in a ref so the recognition callback always
  // appends to the up-to-date field state.
  useEffect(() => { valueRef.current = value || '' }, [value])

  useEffect(() => () => { try { recRef.current?.stop() } catch {} }, [])

  if (!supported) return null

  function start() {
    const rec = new SR()
    rec.continuous     = true
    rec.interimResults = false
    rec.lang           = 'en-US'

    rec.onresult = (e) => {
      let appended = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) appended += e.results[i][0].transcript
      }
      if (!appended) return
      const cur  = valueRef.current
      const next = cur && !cur.endsWith(' ') ? cur + ' ' + appended.trim() : cur + appended.trim()
      valueRef.current = next
      onChange(next)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setListening(false)
      }
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      vibrate(8)
    } catch {}
  }

  function stop() {
    try { recRef.current?.stop() } catch {}
    setListening(false)
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? 'Stop dictating' : title}
      className={`p-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${
        listening
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="flex items-center gap-1">
        {listening && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        <Icon name="mic" size={size} />
      </span>
    </button>
  )
}
