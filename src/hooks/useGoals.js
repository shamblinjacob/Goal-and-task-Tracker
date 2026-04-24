import { useLocalStorage } from './useLocalStorage'

const CATEGORY_COLORS = {
  health: '#10b981',
  career: '#3b82f6',
  personal: '#8b5cf6',
  finance: '#f59e0b',
  learning: '#ec4899',
  other: '#6b7280',
}

export function useGoals() {
  const [goals, setGoals] = useLocalStorage('goals', [])

  function addGoal(data) {
    const goal = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description || '',
      category: data.category || 'other',
      targetDate: data.targetDate || null,
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    setGoals(prev => [goal, ...prev])
    return goal.id
  }

  function updateGoal(id, updates) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  function setProgress(id, progress) {
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, progress: Math.max(0, Math.min(100, progress)) } : g
    ))
  }

  function completeGoal(id) {
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, status: 'completed', progress: 100 } : g
    ))
  }

  return { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal, CATEGORY_COLORS }
}
