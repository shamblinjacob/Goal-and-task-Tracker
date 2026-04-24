import { useState } from 'react'

export default function HabitForm({ onSubmit, initial = {}, goals = [] }) {
  const [form, setForm] = useState({
    title: initial.title || '',
    description: initial.description || '',
    goalId: initial.goalId || '',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({ ...form, goalId: form.goalId || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Habit name *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Morning run, Read 20 mins, Meditate"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional notes or details..."
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
      {goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link to goal</label>
          <select
            value={form.goalId}
            onChange={e => set('goalId', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">— No goal —</option>
            {goals.filter(g => g.status === 'active').map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: '#3b82f6' }}
        >
          {initial.title ? 'Save changes' : 'Add habit'}
        </button>
      </div>
    </form>
  )
}
