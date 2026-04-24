import { useState } from 'react'

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

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal title *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Run a half marathon"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Why does this goal matter to you?"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
          <input
            type="date"
            value={form.targetDate}
            onChange={e => set('targetDate', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
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
