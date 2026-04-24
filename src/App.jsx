import { useState } from 'react'
import Dashboard from './components/dashboard/Dashboard'
import GoalsPage from './components/goals/GoalsPage'
import TasksPage from './components/tasks/TasksPage'
import HabitsPage from './components/habits/HabitsPage'
import { useGoals } from './hooks/useGoals'
import { useTasks } from './hooks/useTasks'
import { useHabits } from './hooks/useHabits'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'goals',     label: 'Goals',     icon: '🎯' },
  { id: 'tasks',     label: 'Tasks',     icon: '✅' },
  { id: 'habits',    label: 'Habits',    icon: '🔄' },
]

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
      {count}
    </span>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { goals } = useGoals()
  const { tasks } = useTasks()
  const { habits, isCompletedToday } = useHabits()

  const pendingTasks = tasks.filter(t => !t.completed).length
  const habitsDueToday = habits.filter(h => !isCompletedToday(h)).length
  const activeGoals = goals.filter(g => g.status === 'active').length

  const badges = {
    goals: activeGoals || null,
    tasks: pendingTasks || null,
    habits: habitsDueToday || null,
  }

  function navigate(id) {
    setPage(id)
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: '#3b82f6' }}
            >G</div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">GoalTracker</div>
              <div className="text-xs text-gray-400">Progress made simple</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                page === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              <NavBadge count={badges[item.id]} />
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">All data stored locally</div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: '#3b82f6' }}
          >G</div>
          <span className="font-bold text-gray-900 text-sm">GoalTracker</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-gray-100 p-4 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                  page === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
                <NavBadge count={badges[item.id]} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto p-6">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'goals'     && <GoalsPage />}
          {page === 'tasks'     && <TasksPage />}
          {page === 'habits'    && <HabitsPage />}
        </div>
      </main>
    </div>
  )
}
