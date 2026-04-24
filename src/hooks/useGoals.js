import { useDataContext, CATEGORY_COLORS } from '../context/DataContext'

export function useGoals() {
  const ctx = useDataContext()
  return {
    goals: ctx.goals,
    addGoal: ctx.addGoal, updateGoal: ctx.updateGoal, deleteGoal: ctx.deleteGoal,
    setProgress: ctx.setProgress, completeGoal: ctx.completeGoal, checkInGoal: ctx.checkInGoal,
    archiveGoal: ctx.archiveGoal, restoreGoal: ctx.restoreGoal,
    CATEGORY_COLORS,
  }
}
