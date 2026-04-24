import { useLocalStorage } from './useLocalStorage'

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage('tasks', [])

  function addTask(data) {
    const task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description || '',
      goalId: data.goalId || null,
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [task, ...prev])
    return task.id
  }

  function updateTask(id, updates) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
        : t
    ))
  }

  function getTasksForGoal(goalId) {
    return tasks.filter(t => t.goalId === goalId)
  }

  return { tasks, addTask, updateTask, deleteTask, toggleTask, getTasksForGoal }
}
