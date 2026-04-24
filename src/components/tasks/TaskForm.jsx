import { useState } from 'react'

const PRIORITIES = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

const CATEGORIES = [
  { value: 'health',   label: 'Health' },
  { value: 'career',   label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'finance',  label: 'Finance' },
  { value: 'learning', label: 'Learning' },
  { value: 'other',    label: 'Other' },
]

export default function TaskForm({ onSubmit, initial = {}, goals = [] }) {
  const [form, setForm] = useState({
    title:       initial.title       || '',
    description: initial.description || '',
    goalId:      initial.goalId      || '',
    priority:    initial.priority    || 'medium',
    category:    initial.category    || 'other',
    dueDate:     initial.dueDate     || '',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({ ...form, goalId: form.goalId || null })
  }

  // When linking a goal, default the category to the goal's category
  function handleGoalChange(goalId) {
    const goal = goals.find(g => g.id === goalId)
    setForm(f => ({
      ...f,
      goalId,
      category: goal ? goal.category : f.category,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task title *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Register for the race"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional notes..."
          rows={2}
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
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
        <input
          type="date"
          value={form.dueDate}
          onChange={e => set('dueDate', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link to goal</label>
          <select
            value={form.goalId}
            onChange={e => handleGoalChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">— No goal —</option>
            {goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: '#3b82f6' }}
        >
          {initial.title ? 'Save changes' : 'Add task'}
        </button>
      </div>
    </form>
  )
}
