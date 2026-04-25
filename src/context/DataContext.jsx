import { createContext, useContext, useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { toDateString } from '../utils/dateUtils'

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

  const [goals,        setGoals]        = useState(() => isFirebaseConfigured ? [] : readLocal('goals',        []))
  const [tasks,        setTasks]        = useState(() => isFirebaseConfigured ? [] : readLocal('tasks',        []))
  const [habits,       setHabits]       = useState(() => isFirebaseConfigured ? [] : readLocal('habits',       []))
  const [accounts,     setAccounts]     = useState(() => isFirebaseConfigured ? [] : readLocal('accounts',     []))
  const [transactions, setTransactions] = useState(() => isFirebaseConfigured ? [] : readLocal('transactions', []))
  const [holdings,     setHoldings]     = useState(() => isFirebaseConfigured ? [] : readLocal('holdings',     []))

  // Persist to localStorage when not using Firebase
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('goals',        JSON.stringify(goals))        }, [goals])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('tasks',        JSON.stringify(tasks))        }, [tasks])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('habits',       JSON.stringify(habits))       }, [habits])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('accounts',     JSON.stringify(accounts))     }, [accounts])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('transactions', JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { if (!isFirebaseConfigured) localStorage.setItem('holdings',     JSON.stringify(holdings))     }, [holdings])

  // Firebase real-time listeners
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const sortItems = (a, b) => {
      // If both have an explicit drag-order, use it (desc so higher = first)
      if (a.order !== undefined && b.order !== undefined) return b.order - a.order
      if (a.order !== undefined) return -1
      if (b.order !== undefined) return  1
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    }
    const toList = snap => snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortItems)

    const unsubs = [
      onSnapshot(collection(db, 'workspaces', workspaceId, 'goals'),        snap => setGoals(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'tasks'),        snap => setTasks(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'habits'),       snap => setHabits(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'accounts'),     snap => setAccounts(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'transactions'), snap => setTransactions(toList(snap))),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'holdings'),     snap => setHoldings(toList(snap))),
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

    if (data.type === 'weekly') {
      const goal = {
        id, title: data.title, description: data.description || '',
        category: data.category || 'health',
        type: 'weekly',
        target: Number(data.target) || 1,
        unit: data.unit || 'sessions',
        status: 'active',
        createdAt: new Date().toISOString(),
        entries: [],
      }
      if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'goals', id), goal)
      else setGoals(prev => [goal, ...prev])
      return id
    }

    const goal = {
      id, title: data.title, description: data.description || '',
      category: data.category || 'other', targetDate: data.targetDate || null,
      progress: 0, status: 'active', order: Date.now(), createdAt: new Date().toISOString(),
      lastCheckIn: null, checkIns: [],
      milestones: (data.milestones || []).filter(m => m.title?.trim()).map((m, i) => ({
        id: m.id || crypto.randomUUID(),
        title: m.title,
        completed: !!m.completed,
        completedAt: m.completedAt || null,
        order: i,
      })),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'goals', id), goal)
    else setGoals(prev => [goal, ...prev])
    return id
  }

  async function logWeeklyEntry(goalId, value, note = '') {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const entry = { id: crypto.randomUUID(), date: toDateString(), value: Number(value), note }
    return updateGoal(goalId, { entries: [...(goal.entries || []), entry] })
  }

  async function deleteWeeklyEntry(goalId, entryId) {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    return updateGoal(goalId, { entries: (goal.entries || []).filter(e => e.id !== entryId) })
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

  function archiveGoal(id) {
    return updateGoal(id, { status: 'archived' })
  }

  function restoreGoal(id) {
    return updateGoal(id, { status: 'active' })
  }

  function reorderGoals(newArray) {
    const base = Date.now()
    const orderMap = Object.fromEntries(newArray.map((g, i) => [g.id, base - i * 1000]))
    setGoals(prev => prev.map(g => orderMap[g.id] !== undefined ? { ...g, order: orderMap[g.id] } : g))
    if (isFirebaseConfigured)
      newArray.forEach((g, i) =>
        updateDoc(doc(db, 'workspaces', workspaceId, 'goals', g.id), { order: base - i * 1000 }).catch(() => {})
      )
  }

  function toggleMilestone(goalId, milestoneId) {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const milestones = (goal.milestones || []).map(m => {
      if (m.id !== milestoneId) return m
      const completed = !m.completed
      return { ...m, completed, completedAt: completed ? new Date().toISOString() : null }
    })
    // Auto-update progress when all milestones exist
    const updates = { milestones }
    if (milestones.length > 0) {
      const pct = Math.round((milestones.filter(m => m.completed).length / milestones.length) * 100)
      updates.progress = pct
    }
    return updateGoal(goalId, updates)
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
      category: data.category || 'other',
      recurring: data.recurring || null,   // 'daily' | 'weekly' | 'monthly' | null
      lastCompletedDate: null,
      order: Date.now(),
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

  function isRecurringDone(task) {
    if (!task.recurring || !task.lastCompletedDate) return false
    const today = toDateString()
    if (task.recurring === 'daily')   return task.lastCompletedDate === today
    if (task.recurring === 'monthly') return task.lastCompletedDate.slice(0, 7) === today.slice(0, 7)
    if (task.recurring === 'weekly') {
      const now = new Date()
      const day = now.getDay()
      const start = new Date(now)
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      start.setHours(0, 0, 0, 0)
      return task.lastCompletedDate >= toDateString(start)
    }
    return false
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (task.recurring) {
      const done = isRecurringDone(task)
      return updateTask(id, { lastCompletedDate: done ? null : toDateString(), completed: false })
    }
    return updateTask(id, {
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
    })
  }

  function archiveTask(id) { return updateTask(id, { archived: true }) }
  function restoreTask(id) { return updateTask(id, { archived: false }) }

  function getTasksForGoal(goalId) {
    return tasks.filter(t => t.goalId === goalId && !t.archived)
  }

  function reorderTasks(newArray) {
    const base = Date.now()
    const orderMap = Object.fromEntries(newArray.map((t, i) => [t.id, base - i * 1000]))
    setTasks(prev => prev.map(t => orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t))
    if (isFirebaseConfigured)
      newArray.forEach((t, i) =>
        updateDoc(doc(db, 'workspaces', workspaceId, 'tasks', t.id), { order: base - i * 1000 }).catch(() => {})
      )
  }

  // -- Habits --
  async function addHabit(data) {
    const id = crypto.randomUUID()
    const habit = {
      id, title: data.title, description: data.description || '',
      goalId: data.goalId || null, completions: [],
      order: Date.now(),
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

  function archiveHabit(id) { return updateHabit(id, { archived: true }) }
  function restoreHabit(id) { return updateHabit(id, { archived: false }) }

  function reorderHabits(newArray) {
    const base = Date.now()
    const orderMap = Object.fromEntries(newArray.map((h, i) => [h.id, base - i * 1000]))
    setHabits(prev => prev.map(h => orderMap[h.id] !== undefined ? { ...h, order: orderMap[h.id] } : h))
    if (isFirebaseConfigured)
      newArray.forEach((h, i) =>
        updateDoc(doc(db, 'workspaces', workspaceId, 'habits', h.id), { order: base - i * 1000 }).catch(() => {})
      )
  }

  // -- Accounts (manual financial tracking) --
  async function addAccount(data) {
    const id    = crypto.randomUUID()
    const today = toDateString()
    const bal   = Number(data.balance) || 0
    const account = {
      id,
      name:           data.name,
      type:           data.type || 'checking',
      balance:        bal,
      openingBalance: bal,                          // used for transaction-driven balance computation
      balanceHistory: [{ date: today, balance: bal }],
      createdAt: new Date().toISOString(),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'accounts', id), account)
    else setAccounts(prev => [account, ...prev])
    return id
  }

  async function updateAccountBalance(id, newBalance) {
    const account = accounts.find(a => a.id === id)
    if (!account) return
    const today = toDateString()
    const bal = Number(newBalance) || 0
    const history = [...(account.balanceHistory || [])]
    const idx = history.findIndex(h => h.date === today)
    if (idx >= 0) history[idx] = { date: today, balance: bal }
    else history.push({ date: today, balance: bal })
    const updates = { balance: bal, balanceHistory: history }
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'accounts', id), updates)
    else setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  async function updateAccount(id, updates) {
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'accounts', id), updates)
    else setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  async function deleteAccount(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'accounts', id))
    else setAccounts(prev => prev.filter(a => a.id !== id))
  }

  // -- Transactions --
  async function addTransaction(data) {
    const id = crypto.randomUUID()
    const tx = {
      id,
      date:        data.date        || toDateString(),
      description: data.description || '',
      amount:      Math.abs(Number(data.amount)) || 0,
      type:        data.type        || 'expense',   // 'expense' | 'income' | 'transfer'
      category:    data.category    || 'other',
      recurring:   data.recurring   || false,
      note:        data.note        || '',
      accountId:   data.accountId   || null,        // which account is debited/credited
      toAccountId: data.toAccountId || null,        // destination for transfers
      createdAt:   new Date().toISOString(),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'transactions', id), tx)
    else setTransactions(prev => [tx, ...prev])
    return id
  }

  async function updateTransaction(id, updates) {
    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'transactions', id), updates)
    else setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function deleteTransaction(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'transactions', id))
    else setTransactions(prev => prev.filter(t => t.id !== id))
  }

  // -- Holdings (investments) --
  async function addHolding(data) {
    const id = crypto.randomUUID()
    const holding = {
      id,
      ticker:         (data.ticker || '').toUpperCase(),
      name:           data.name         || data.ticker || '',
      shares:         Number(data.shares)       || 0,
      costBasis:      Number(data.costBasis)    || 0,
      currentValue:   Number(data.currentValue) || 0,
      currentPrice:   null,
      priceUpdatedAt: null,
      accountType:    data.accountType  || 'taxable',
      trades:         [],
      lastUpdated:    toDateString(),
      createdAt:      new Date().toISOString(),
    }
    if (isFirebaseConfigured) await setDoc(doc(db, 'workspaces', workspaceId, 'holdings', id), holding)
    else setHoldings(prev => [holding, ...prev])
    return id
  }

  async function updateHolding(id, updates) {
    const patch = { ...updates, lastUpdated: toDateString() }

    // Persist a daily value snapshot whenever currentValue changes
    if (updates.currentValue !== undefined) {
      const holding = holdings.find(h => h.id === id)
      const today   = toDateString()
      const history = [...(holding?.valueHistory || [])]
      const idx     = history.findIndex(e => e.date === today)
      const entry   = { date: today, value: Number(updates.currentValue) }
      if (idx >= 0) history[idx] = entry; else history.push(entry)
      patch.valueHistory = history
    }

    if (isFirebaseConfigured) await updateDoc(doc(db, 'workspaces', workspaceId, 'holdings', id), patch)
    else setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h))
  }

  async function deleteHolding(id) {
    if (isFirebaseConfigured) await deleteDoc(doc(db, 'workspaces', workspaceId, 'holdings', id))
    else setHoldings(prev => prev.filter(h => h.id !== id))
  }

  async function addTrade(holdingId, tradeData) {
    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) return
    const trade = {
      id:            crypto.randomUUID(),
      date:          tradeData.date || toDateString(),
      type:          tradeData.type,           // 'buy' | 'sell'
      shares:        Number(tradeData.shares),
      pricePerShare: Number(tradeData.pricePerShare),
      fee:           Number(tradeData.fee) || 0,
    }
    const trades = [...(holding.trades || []), trade]
    return updateHolding(holdingId, { trades })
  }

  async function deleteTrade(holdingId, tradeId) {
    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) return
    const trades = (holding.trades || []).filter(t => t.id !== tradeId)
    return updateHolding(holdingId, { trades })
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
      goals, tasks, habits, accounts, transactions, holdings,
      workspaceId, isFirebaseConfigured,
      joinWorkspace,
      addGoal, updateGoal, deleteGoal, setProgress, completeGoal, checkInGoal,
      toggleMilestone, logWeeklyEntry, deleteWeeklyEntry,
      archiveGoal, restoreGoal, CATEGORY_COLORS,
      addTask, updateTask, deleteTask, toggleTask, getTasksForGoal, isRecurringDone,
      archiveTask, restoreTask, reorderTasks,
      addHabit, updateHabit, deleteHabit, toggleToday, isCompletedToday, getStreak, getLast7,
      archiveHabit, restoreHabit, reorderHabits,
      reorderGoals,
      addAccount, updateAccount, updateAccountBalance, deleteAccount,
      addTransaction, updateTransaction, deleteTransaction,
      addHolding, updateHolding, deleteHolding, addTrade, deleteTrade,
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
