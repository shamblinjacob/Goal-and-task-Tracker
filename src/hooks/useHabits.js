import { useLocalStorage } from './useLocalStorage'

function toDateString(date = new Date()) {
  return date.toISOString().split('T')[0]
}

export function useHabits() {
  const [habits, setHabits] = useLocalStorage('habits', [])

  function addHabit(data) {
    const habit = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description || '',
      goalId: data.goalId || null,
      completions: [],
      createdAt: new Date().toISOString(),
    }
    setHabits(prev => [habit, ...prev])
    return habit.id
  }

  function updateHabit(id, updates) {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  function deleteHabit(id) {
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  function toggleToday(id) {
    const today = toDateString()
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      const done = h.completions.includes(today)
      return {
        ...h,
        completions: done
          ? h.completions.filter(d => d !== today)
          : [...h.completions, today],
      }
    }))
  }

  function isCompletedToday(habit) {
    return habit.completions.includes(toDateString())
  }

  function getStreak(habit) {
    if (habit.completions.length === 0) return 0
    const sorted = [...habit.completions].sort().reverse()
    let streak = 0
    let cursor = new Date()
    for (const dateStr of sorted) {
      const expected = toDateString(cursor)
      if (dateStr === expected) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        // Allow missing today — check yesterday as start
        if (streak === 0) {
          cursor.setDate(cursor.getDate() - 1)
          if (dateStr === toDateString(cursor)) {
            streak++
            cursor.setDate(cursor.getDate() - 1)
          } else {
            break
          }
        } else {
          break
        }
      }
    }
    return streak
  }

  function getLast7(habit) {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        date: toDateString(d),
        done: habit.completions.includes(toDateString(d)),
      })
    }
    return days
  }

  return { habits, addHabit, updateHabit, deleteHabit, toggleToday, isCompletedToday, getStreak, getLast7 }
}
