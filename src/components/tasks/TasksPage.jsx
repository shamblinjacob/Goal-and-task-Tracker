import { useState, useEffect } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useGoals } from '../../hooks/useGoals'
import { useDataContext } from '../../context/DataContext'
import TaskCard from './TaskCard'
import TaskCalendar from './TaskCalendar'
import TaskForm from './TaskForm'
import Modal from '../shared/Modal'
import EmptyState from '../shared/EmptyState'
import Icon from '../shared/Icon'

const FILTERS = [
  { value: 'pending',   label: 'To do' },
  { value: 'completed', label: 'Done' },
  { value: 'archived',  label: 'Archived' },
]

function sortByOrder(a, b) {
  const oa = a.order, ob = b.order
  if (oa !== undefined && ob !== undefined) return ob - oa
  if (oa !== undefined) return -1
  if (ob !== undefined) return  1
  return (b.createdAt || '').localeCompare(a.createdAt || '')
}

export default function TasksPage({ fabTrigger = 0 }) {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, archiveTask, restoreTask, reorderTasks, isRecurringDone } = useTasks()
  const { goals } = useGoals()
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState(null)
  const [filter, setFilter]             = useState('pending')
  const [goalFilter, setGoalFilter]     = useState('all')
  const [viewMode, setViewMode]         = useState('list')  // 'list' | 'calendar'
  const [dragFrom, setDragFrom]         = useState(null)
  const [dragOver, setDragOver]         = useState(null)

  // FAB trigger
  useEffect(() => { if (fabTrigger > 0) setShowForm(true) }, [fabTrigger])

  const filtered = tasks
    .filter(t => {
      if (t.archived) return filter === 'archived'
      if (t.recurring) {
        const done = isRecurringDone(t)
        if (filter === 'pending')   return !done
        if (filter === 'completed') return done
        return false
      }
      if (filter === 'pending')   return !t.completed
      if (filter === 'completed') return  t.completed
      return false
    })
    .filter(t => goalFilter === 'all' ? true : t.goalId === goalFilter)
    .sort(sortByOrder)

  function handleAdd(data)  { addTask(data); setShowForm(false) }
  function handleEdit(data) { updateTask(editing.id, data); setEditing(null) }
  const goalMap = Object.fromEntries(goals.map(g => [g.id, g]))

  // Drag-to-reorder (only on pending/to-do tab)
  function handleDrop() {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      const next = [...filtered]
      const [item] = next.splice(dragFrom, 1)
      next.splice(dragOver, 0, item)
      reorderTasks(next)
    }
    setDragFrom(null)
    setDragOver(null)
  }

  const pendingCount   = tasks.filter(t => !t.archived && (t.recurring ? !isRecurringDone(t) : !t.completed)).length
  const completedCount = tasks.filter(t => !t.archived && (t.recurring ? isRecurringDone(t) : t.completed)).length
  const archivedCount  = tasks.filter(t => t.archived).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-400 text-xs mt-0.5">Short-term actions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon name="check-square" size={15} />
            </button>
            <button onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon name="calendar" size={15} />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: '#3b82f6' }}
          >
            <Icon name="plus" size={15} />New task
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <TaskCalendar tasks={tasks} onAddTask={() => setShowForm(true)} isRecurringDone={isRecurringDone} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex gap-1.5">
              {FILTERS.map(f => {
                const count = f.value === 'pending' ? pendingCount : f.value === 'completed' ? completedCount : archivedCount
                return (
                  <button key={f.value} onClick={() => setFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                      filter === f.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {f.label} <span className="opacity-50 text-xs ml-0.5">{count}</span>
                  </button>
                )
              })}
            </div>
            {goals.length > 0 && (
              <select value={goalFilter} onChange={e => setGoalFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-500">
                <option value="all">All goals</option>
                <option value="">No goal</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            )}
          </div>

          {filter === 'pending' && filtered.length > 1 && (
            <p className="text-xs text-gray-400 mb-3">Swipe right to complete · swipe left to archive · drag <Icon name="grip-vertical" size={11} className="inline" /> to reorder</p>
          )}
          {filter !== 'pending' && filter !== 'archived' && (
            <p className="text-xs text-gray-400 mb-3">Swipe right to complete · swipe left to archive</p>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon="check-square"
              title={filter === 'archived' ? 'Nothing archived' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
              subtitle={filter === 'archived' ? 'Archived tasks appear here.' : filter === 'completed' ? 'Completed tasks will appear here.' : 'Break your goals down into actionable steps.'}
              action={filter === 'pending' ? { label: 'Add your first task', onClick: () => setShowForm(true) } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((task, i) => (
                <div
                  key={task.id}
                  draggable={filter === 'pending'}
                  onDragStart={() => setDragFrom(i)}
                  onDragEnter={() => setDragOver(i)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnd={handleDrop}
                  className={`transition-opacity ${dragFrom === i ? 'opacity-40' : ''}`}
                  style={dragOver === i && dragFrom !== i ? { boxShadow: '0 -2px 0 0 #3b82f6', borderRadius: '12px' } : {}}
                >
                  <TaskCard
                    task={task}
                    goalTitle={task.goalId ? goalMap[task.goalId]?.title : null}
                    onToggle={toggleTask}
                    onEdit={setEditing}
                    onDelete={deleteTask}
                    onArchive={archiveTask}
                    onRestore={restoreTask}
                    showDragHandle={filter === 'pending'}
                    isRecurringDone={isRecurringDone}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && <Modal title="New task" onClose={() => setShowForm(false)}><TaskForm onSubmit={handleAdd} goals={goals} /></Modal>}
      {editing   && <Modal title="Edit task" onClose={() => setEditing(null)}><TaskForm onSubmit={handleEdit} initial={editing} goals={goals} /></Modal>}
    </div>
  )
}
