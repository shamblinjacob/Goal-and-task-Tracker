import { useState } from 'react'
import Modal from '../shared/Modal'

export default function CheckInModal({ goal, onSubmit, onClose }) {
  const [progress, setProgress] = useState(goal.progress)
  const [note, setNote] = useState('')

  const daysSince = goal.lastCheckIn
    ? Math.floor((new Date() - new Date(goal.lastCheckIn)) / 86400000)
    : null

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(progress, note)
  }

  return (
    <Modal title="Weekly check-in" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-900">{goal.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {daysSince === null
              ? 'First check-in'
              : daysSince === 0
              ? 'Last updated today'
              : `Last updated ${daysSince} day${daysSince > 1 ? 's' : ''} ago`}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Progress</label>
            <span className="text-2xl font-bold text-gray-900">{progress}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={5}
            value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#3b82f6' }}
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {goal.progress !== progress && (
          <div className="text-xs text-gray-500 text-center">
            {goal.progress}% → <span className="font-semibold text-blue-600">{progress}%</span>
            {progress > goal.progress
              ? ` (+${progress - goal.progress}%)`
              : ` (${progress - goal.progress}%)`}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What did you accomplish this week?
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Completed the first module, ran 3 times this week..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          Save check-in
        </button>
      </form>
    </Modal>
  )
}
