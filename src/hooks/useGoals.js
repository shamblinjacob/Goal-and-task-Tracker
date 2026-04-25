import { useDataContext, CATEGORY_COLORS } from '../context/DataContext'

export function useGoals() {
  const ctx = useDataContext()
  return {
    goals: ctx.goals,
    addGoal: ctx.addGoal, updateGoal: ctx.updateGoal, deleteGoal: ctx.deleteGoal,
    setProgress: ctx.setProgress, completeGoal: ctx.completeGoal, checkInGoal: ctx.checkInGoal,
    toggleMilestone: ctx.toggleMilestone,
    logWeeklyEntry: ctx.logWeeklyEntry, deleteWeeklyEntry: ctx.deleteWeeklyEntry,
    archiveGoal: ctx.archiveGoal, restoreGoal: ctx.restoreGoal,
    reorderGoals: ctx.reorderGoals,
    CATEGORY_COLORS,
  }
}
