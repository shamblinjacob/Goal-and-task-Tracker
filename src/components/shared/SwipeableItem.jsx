import { useRef, useState } from 'react'
import Icon from './Icon'

const THRESHOLD = 72   // px needed to commit the action
const MAX       = 100  // max drag distance

export default function SwipeableItem({ onComplete, onArchive, completeLabel = 'Done', children }) {
  const startX  = useRef(null)
  const startY  = useRef(null)
  const [offset, setOffset] = useState(0)
  const [locked, setLocked] = useState(null)   // 'h' | 'v' — axis lock after first move
  const [animating, setAnimating] = useState(false)

  function onTouchStart(e) {
    if (animating) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    setLocked(null)
  }

  function onTouchMove(e) {
    if (startX.current === null || animating) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Lock axis on first significant move
    if (!locked) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      setLocked(Math.abs(dx) > Math.abs(dy) ? 'h' : 'v')
      return
    }
    if (locked === 'v') return

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault()
    const clamped = Math.max(-MAX, Math.min(MAX, dx))
    // Only allow right-swipe if onComplete exists, left-swipe if onArchive exists
    if (clamped > 0 && !onComplete) return
    if (clamped < 0 && !onArchive)  return
    setOffset(clamped)
  }

  function onTouchEnd() {
    if (startX.current === null) return
    startX.current = null

    const committed = Math.abs(offset) >= THRESHOLD
    if (committed) {
      setAnimating(true)
      if (offset > 0 && onComplete) {
        setTimeout(() => { onComplete(); setOffset(0); setAnimating(false) }, 250)
      } else if (offset < 0 && onArchive) {
        setTimeout(() => { onArchive(); setOffset(0); setAnimating(false) }, 250)
      } else {
        setOffset(0); setAnimating(false)
      }
    } else {
      setOffset(0)
    }
  }

  const pct = Math.abs(offset) / THRESHOLD
  const isRight = offset > 0
  const isLeft  = offset < 0

  return (
    <div className="relative overflow-hidden rounded-xl select-none">
      {/* Right-swipe reveal (complete) */}
      {onComplete && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start px-5 bg-green-500 rounded-xl transition-opacity"
          style={{ width: Math.max(0, offset), opacity: isRight ? Math.min(1, pct) : 0 }}
        >
          <Icon name="check" size={20} className="text-white" strokeWidth={2.5} />
          <span className="text-white text-xs font-semibold ml-1.5">{completeLabel}</span>
        </div>
      )}
      {/* Left-swipe reveal (archive) */}
      {onArchive && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-5 bg-gray-400 rounded-xl transition-opacity"
          style={{ width: Math.max(0, -offset), opacity: isLeft ? Math.min(1, pct) : 0 }}
        >
          <span className="text-white text-xs font-semibold mr-1.5">Archive</span>
          <Icon name="archive" size={20} className="text-white" />
        </div>
      )}

      {/* Card content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? 'transform 0.2s ease' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
