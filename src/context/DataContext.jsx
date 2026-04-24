import { createContext, useContext, useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const DataContext = createContext(null)

export const CATEGORY_COLORS = {
  health:   '#10b981',
  career:   '#3b82f6',
  personal: '#8b5cf6',
  finance:  '#f59e0b',
  learning: '#ec4899',
  other:    '#6b7280',
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function toDateString(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export function DataProvider({ children }) {
  const [workspaceId, setWorkspaceIdState] = useState(() => {
    const stored = localStorage.getItem('workspaceId')
    if (stored) return stored
    const id = generateCode()
    localStorage.setItem('workspaceId', id)
    return id
  })

  const [goals,  setGoals]  = useState(() => isFirebaseConfigured ? [] : readLocal('goals',  []))
  const [tasks,  setTasks]  = useState(() => isFirebaseConfigured ? [] : readLocal('tasks',  []))
  const [habits, setHabits] = useState(() => isFirebaseConfigured ? [] : readLocal('habits', []))

  // Persist to localStorage when not using Firebase
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('goals',  JSON.stringify(goals))  }, [goals])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('tasks',  JSON.stringify(tasks))  }, [tasks])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('habits', JSON.stringify(habits)) }, [habits])

  // Firebase real-time listeners
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const byDate = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
    const toList = snap => snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate)

    const unsubs = [
      onSnapshot(collection(db, 'workspaces', workspaceId, 'goals'),  snap => setGoals(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'tasks'),  snap => setTasks(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'habits'), snap => setHabits(toList(snap))),
    ]
    return () => unsubs.forEach(u => u())
  }, [workspaceId])

  // -- Workspace --
  function joinWorkspace(code) {
    const id = code.trim().toUpperCase()
    localStorage.setItem('workspaceId', id)
    setWorkspaceIdState(id)
  }

  // -- Goals --
  async function addGoal(data) {
    const id = crypto.randomUUID()
    const goal = {
      id, title: data.title, description: data.description || '',
      category: data.category || 'other', targetDate: data.targetDate || null,
      progress: 0, status: 'active', createdAt: new Date().toISOString(),
      lastCheckIn: null, checkIns: [],
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'goals', id), goal)
    else setGoals(prev => [goal, ...prev])
    return id
  }

  async function updateGoal(id, updates) {
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'goals', id), updates)
    else setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  async function deleteGoal(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'goals', id))
    else setGoals(prev => prev.filter(g => g.id !== id))
  }

  function setProgress(id, progress) {
    return updateGoal(id, { progress: Math.max(0, Math.min(100, progress)) })
  }

  function completeGoal(id) {
    return updateGoal(id, { status: 'completed', progress: 100 })
  }

  function checkInGoal(id, progress, note) {
    const today = toDateString()
    const goal = goals.find(g => g.id === id)
    const entry = { date: today, progress, note: note || '' }
    const checkIns = [...(goal?.checkIns || []), entry]
    return updateGoal(id, { progress: Math.max(0, Math.min(100, progress)), lastCheckIn: today, checkIns })
  }

  // -- Tasks --
  async function addTask(data) {
    const id = crypto.randomUUID()
    const task = {
      id, title: data.title, description: data.description || '',
      goalId: data.goalId || null, priority: data.priority || 'medium',
      dueDate: data.dueDate || null, completed: false, completedAt: null,
      createdAt: new Date().toISOString(),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'tasks', id), task)
    else setTasks(prev => [task, ...prev])
    return id
  }

  async function updateTask(id, updates) {
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'tasks', id), updates)
    else setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function deleteTask(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'tasks', id))
    else setTasks(prev => prev.filter(t => t.id !== id))
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    return updateTask(id, {
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
    })
  }

  function getTasksForGoal(goalId) {
    return tasks.filter(t => t.goalId === goalId)
  }

  // -- Habits --
  async function addHabit(data) {
    const id = crypto.randomUUID()
    const habit = {
      id, title: data.title, description: data.description || '',
      goalId: data.goalId || null, completions: [],
      createdAt: new Date().toISOString(),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'habits', id), habit)
    else setHabits(prev => [habit, ...prev])
    return id
  }

  async function updateHabit(id, updates) {
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'habits', id), updates)
    else setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  async function deleteHabit(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'habits', id))
    else setHabits(prev => prev.filter(h => h.id !== id))
  }

  function toggleToday(id) {
    const habit = habits.find(h => h.id === id)
    if (!habit) return
    const today = toDateString()
    const done = habit.completions.includes(today)
    return updateHabit(id, {
      completions: done
        ? habit.completions.filter(d => d !== today)
        : [...habit.completions, today],
    })
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
        if (streak === 0) {
          cursor.setDate(cursor.getDate() - 1)
          if (dateStr === toDateString(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1) }
          else break
        } else break
      }
    }
    return streak
  }

  function getLast7(habit) {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ date: toDateString(d), done: habit.completions.includes(toDateString(d)) })
    }
    return days
  }

  return (
    <DataContext.Provider value={{
      goals, tasks, habits,
      workspaceId, isFirebaseConfigured,
      joinWorkspace,
      addGoal, updateGoal, deleteGoal, setProgress, completeGoal, checkInGoal, CATEGORY_COLORS,
      addTask, updateTask, deleteTask, toggleTask, getTasksForGoal,
      addHabit, updateHabit, deleteHabit, toggleToday, isCompletedToday, getStreak, getLast7,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDataContext() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('Must be inside DataProvider')
  return ctx
}
