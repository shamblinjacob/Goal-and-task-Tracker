import { useDataContext } from '../context/DataContext'

export function useTasks() {
  const ctx = useDataContext()
  return {
    tasks: ctx.tasks,
    addTask: ctx.addTask, updateTask: ctx.updateTask, deleteTask: ctx.deleteTask,
    toggleTask: ctx.toggleTask, getTasksForGoal: ctx.getTasksForGoal,
    archiveTask: ctx.archiveTask, restoreTask: ctx.restoreTask,
  }
}
