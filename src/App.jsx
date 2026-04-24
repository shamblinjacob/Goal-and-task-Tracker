import { useState } from 'react'
import { DataProvider } from './context/DataContext'
import { useGoals } from './hooks/useGoals'
import { useTasks } from './hooks/useTasks'
import { useHabits } from './hooks/useHabits'
import Icon from './components/shared/Icon'
import Dashboard from './components/dashboard/Dashboard'
import GoalsPage from './components/goals/GoalsPage'
import TasksPage from './components/tasks/TasksPage'
import HabitsPage from './components/habits/HabitsPage'
import SyncPanel from './components/shared/SyncPanel'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'goals',     label: 'Goals',    icon: 'target' },
  { id: 'tasks',     label: 'Tasks',    icon: 'check-square' },
  { id: 'habits',    label: 'Habits',   icon: 'repeat' },
]

function AppShell() {
  const [page, setPage] = useState('dashboard')
  const { goals } = useGoals()
  const { tasks } = useTasks()
  const { habits, isCompletedToday } = useHabits()

  const badges = {
    goals:  goals.filter(g => g.status === 'active').length || null,
    tasks:  tasks.filter(t => !t.completed).length || null,
    habits: habits.filter(h => !isCompletedToday(h)).length || null,
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="px-5 py-6 border-b border-gray-100">
          <span className="font-bold text-gray-900 tracking-tight">GoalTracker</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                page === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
              {badges[item.id] && (
                <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {badges[item.id]}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <SyncPanel />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 lg:ml-60 pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'goals'     && <GoalsPage />}
          {page === 'tasks'     && <TasksPage />}
          {page === 'habits'    && <HabitsPage />}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
        <div className="flex">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 cursor-pointer transition-colors relative ${
                page === item.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-xs font-medium">{item.label}</span>
              {badges[item.id] && (
                <span className="absolute top-2 right-1/4 w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full bg-blue-500 text-white leading-none">
                  {badges[item.id] > 9 ? '9+' : badges[item.id]}
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
