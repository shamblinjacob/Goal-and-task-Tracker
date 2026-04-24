import { useDataContext } from '../context/DataContext'

export function useTasks() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, getTasksForGoal } = useDataContext()
  return { tasks, addTask, updateTask, deleteTask, toggleTask, getTasksForGoal }
}
