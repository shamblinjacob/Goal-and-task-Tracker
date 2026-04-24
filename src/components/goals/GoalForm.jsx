import { useState } from 'react'
import Icon from '../shared/Icon'

const CATEGORIES = [
  { value: 'health',   label: 'Health' },
  { value: 'career',   label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'finance',  label: 'Finance' },
  { value: 'learning', label: 'Learning' },
  { value: 'other',    label: 'Other' },
]

export default function GoalForm({ onSubmit, initial = {} }) {
  const [form, setForm] = useState({
    title:       initial.title       || '',
    description: initial.description || '',
    category:    initial.category    || 'personal',
    targetDate:  initial.targetDate  || '',
  })
  const [milestones, setMilestones] = useState(
    (initial.milestones || []).map(m => ({ ...m })) ||
    []
  )

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

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
    if (!form.title.trim()) return
    onSubmit({ ...form, milestones: milestones.filter(m => m.title.trim()) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal title *</label>
        <input
          type="text" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Run a half marathon"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(shown as motivation)</span></label>
        <textarea
          value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Why does this goal matter to you?"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
          <input
            type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Milestones <span className="text-gray-400 font-normal">(optional, steps toward the goal)</span>
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

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          {initial.title ? 'Save changes' : 'Add goal'}
        </button>
      </div>
    </form>
  )
}
