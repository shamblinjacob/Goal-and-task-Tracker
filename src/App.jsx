import { useState, useRef, useEffect } from 'react'
import { DataProvider } from './context/DataContext'
import { useGoals } from './hooks/useGoals'
import { useTasks } from './hooks/useTasks'
import { useHabits } from './hooks/useHabits'
import Icon from './components/shared/Icon'
import TodayPage   from './components/today/TodayPage'
import GoalsPage   from './components/goals/GoalsPage'
import TasksPage   from './components/tasks/TasksPage'
import HabitsPage  from './components/habits/HabitsPage'
import SyncPanel   from './components/shared/SyncPanel'

const TABS = [
  { id: 'today',  label: 'Today',  icon: 'sun' },
  { id: 'goals',  label: 'Goals',  icon: 'target' },
  { id: 'tasks',  label: 'Tasks',  icon: 'check-square' },
  { id: 'habits', label: 'Habits', icon: 'repeat' },
]

function AppShell() {
  const [page, setPage] = useState('today')
  const { goals } = useGoals()
  const { tasks } = useTasks()
  const { habits, isCompletedToday } = useHabits()

  const today = new Date().toISOString().split('T')[0]

  const badges = {
    tasks:  tasks.filter(t => !t.completed && !t.archived).length || null,
    habits: habits.filter(h => !h.archived && !h.completions?.includes(today)).length || null,
    goals:  goals.filter(g => g.status === 'active').length || null,
  }

  // ── Horizontal swipe between tabs ─────────────────────────────────────────
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)
  const axisLocked  = useRef(null)

  function onMainTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
    axisLocked.current  = null
  }

  function onMainTouchMove(e) {
    if (swipeStartX.current === null) return
    const dx = e.touches[0].clientX - swipeStartX.current
    const dy = e.touches[0].clientY - swipeStartY.current
    if (!axisLocked.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
  }

  function onMainTouchEnd(e) {
    if (swipeStartX.current === null || axisLocked.current !== 'h') {
      swipeStartX.current = null; return
    }
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(dx) < 50) return
    const idx = TABS.findIndex(t => t.id === page)
    if (dx < 0 && idx < TABS.length - 1) setPage(TABS[idx + 1].id)
    if (dx > 0 && idx > 0)               setPage(TABS[idx - 1].id)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="px-5 py-6 border-b border-gray-100">
          <span className="font-bold text-gray-900 tracking-tight">GoalTracker</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                page === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
              {badges[tab.id] && (
                <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {badges[tab.id]}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <SyncPanel />
        </div>
      </aside>

      {/* Main content — swipeable between tabs */}
      <main
        className="flex-1 lg:ml-60 pb-20 lg:pb-0"
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {page === 'today'  && <TodayPage  onNavigate={setPage} />}
          {page === 'goals'  && <GoalsPage  />}
          {page === 'tasks'  && <TasksPage  />}
          {page === 'habits' && <HabitsPage />}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 cursor-pointer relative transition-colors ${
                page === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon name={tab.icon} size={20} />
              <span className="text-xs font-medium">{tab.label}</span>
              {badges[tab.id] && (
                <span className="absolute top-2 right-1/4 w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full bg-blue-500 text-white leading-none">
                  {badges[tab.id] > 9 ? '9+' : badges[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}
