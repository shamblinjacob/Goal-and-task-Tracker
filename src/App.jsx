import { useState, useRef, useEffect } from 'react'
import { DataProvider } from './context/DataContext'
import { useTheme } from './hooks/useTheme'
import { useGoals } from './hooks/useGoals'
import { useTasks } from './hooks/useTasks'
import { useHabits } from './hooks/useHabits'
import { toDateString } from './utils/dateUtils'
import Icon from './components/shared/Icon'
import VoiceCapture from './components/shared/VoiceCapture'
import TodayPage    from './components/today/TodayPage'
import GoalsPage    from './components/goals/GoalsPage'
import TasksPage    from './components/tasks/TasksPage'
import HabitsPage   from './components/habits/HabitsPage'
import JournalPage  from './components/journal/JournalPage'
import InsightsPage from './components/insights/InsightsPage'
import FinancePage  from './components/finance/FinancePage'
import SyncPanel    from './components/shared/SyncPanel'

const TABS = [
  { id: 'today',    label: 'Today',    icon: 'sun' },
  { id: 'goals',    label: 'Goals',    icon: 'target' },
  { id: 'tasks',    label: 'Tasks',    icon: 'check-square' },
  { id: 'habits',   label: 'Habits',   icon: 'repeat' },
  { id: 'journal',  label: 'Journal',  icon: 'book' },
  { id: 'finance',  label: 'Finance',  icon: 'dollar' },
  { id: 'insights', label: 'Insights', icon: 'bar-chart' },
]

// Pages that show the FAB (floating add button) on mobile
const FAB_PAGES = new Set(['tasks', 'goals', 'habits', 'finance'])

function AppShell() {
  useTheme()   // applies dark class on mount based on localStorage / system pref
  const [page, setPage] = useState('today')
  const [fabTrigger, setFabTrigger] = useState(0)
  const [showVoice, setShowVoice]   = useState(false)
  const { goals } = useGoals()
  const { tasks, addTask } = useTasks()
  const { habits, isCompletedToday } = useHabits()

  function handleVoiceSave(parsed) {
    addTask({
      title:       parsed.title,
      description: '',
      goalId:      null,
      priority:    parsed.priority || 'medium',
      category:    'other',
      dueDate:     parsed.dueDate || '',
      recurring:   null,
    })
    setShowVoice(false)
  }

  const today = toDateString()

  const badges = {
    tasks:  tasks.filter(t => !t.completed && !t.archived).length || null,
    habits: habits.filter(h => !h.archived && !h.completions?.includes(today)).length || null,
    goals:  goals.filter(g => g.status === 'active').length || null,
  }

  // ── Horizontal swipe between tabs ─────────────────────────────────────────
  // Tuned to be deliberate, not twitchy:
  //   - 16px before locking to an axis (avoids stealing slow vertical scrolls)
  //   - 90px minimum horizontal travel
  //   - dx must be at least 1.7× dy at release (clear horizontal intent)
  //   - swipe must complete in under 600ms (a slow drag is not a swipe)
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)
  const swipeStartT = useRef(0)
  const axisLocked  = useRef(null)

  function onMainTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
    swipeStartT.current = Date.now()
    axisLocked.current  = null
  }

  function onMainTouchMove(e) {
    if (swipeStartX.current === null) return
    const dx = e.touches[0].clientX - swipeStartX.current
    const dy = e.touches[0].clientY - swipeStartY.current
    if (!axisLocked.current && (Math.abs(dx) > 16 || Math.abs(dy) > 16)) {
      axisLocked.current = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'h' : 'v'
    }
  }

  function onMainTouchEnd(e) {
    if (swipeStartX.current === null || axisLocked.current !== 'h') {
      swipeStartX.current = null; return
    }
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    const dt = Date.now() - swipeStartT.current
    swipeStartX.current = null
    if (Math.abs(dx) < 90)              return   // not far enough
    if (Math.abs(dx) < Math.abs(dy)*1.7) return  // not clearly horizontal
    if (dt > 600)                        return  // too slow to be a swipe
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
        className="flex-1 lg:ml-60 pb-20 lg:pb-0 overflow-x-hidden"
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {page === 'today'    && <TodayPage onNavigate={setPage} />}
          {page === 'goals'    && <GoalsPage fabTrigger={fabTrigger} />}
          {page === 'tasks'    && <TasksPage fabTrigger={fabTrigger} />}
          {page === 'habits'   && <HabitsPage fabTrigger={fabTrigger} />}
          {page === 'journal'  && <JournalPage />}
          {page === 'finance'  && <FinancePage fabTrigger={fabTrigger} />}
          {page === 'insights' && <InsightsPage />}
        </div>
      </main>

      {/* Mobile FABs — voice quick-add (always visible) + page-aware add */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
        <button
          onClick={() => setShowVoice(true)}
          className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-600 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          aria-label="Voice add task"
        >
          <Icon name="mic" size={20} />
        </button>
        {FAB_PAGES.has(page) && (
          <button
            onClick={() => setFabTrigger(n => n + 1)}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-blue-700 active:scale-95 transition-transform"
            aria-label="Add"
          >
            <Icon name="plus" size={26} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {showVoice && <VoiceCapture onSave={handleVoiceSave} onClose={() => setShowVoice(false)} />}

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 cursor-pointer relative transition-colors min-w-0 ${
                page === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon name={tab.icon} size={18} />
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
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
