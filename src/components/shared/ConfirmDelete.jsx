import { useState } from 'react'
import Icon from './Icon'

// Two-tap delete: first tap arms the button, second tap confirms.
// Clicking anywhere else disarms it automatically.
export default function ConfirmDelete({ onConfirm, size = 13, className = '' }) {
  const [armed, setArmed] = useState(false)

  function arm(e) {
    e.stopPropagation()
    setArmed(true)
    // Disarm after 3 seconds if not confirmed
    setTimeout(() => setArmed(false), 3000)
  }

  function confirm(e) {
    e.stopPropagation()
    setArmed(false)
    onConfirm()
  }

  function cancel(e) {
    e.stopPropagation()
    setArmed(false)
  }

  if (armed) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={confirm}
          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded cursor-pointer transition-colors"
        >
          Delete?
        </button>
        <button
          onClick={cancel}
          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-1"
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={arm}
      className={`p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 cursor-pointer transition-colors ${className}`}
      title="Delete"
    >
      <Icon name="trash" size={size} />
    </button>
  )
}
