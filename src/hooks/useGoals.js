import { useDataContext, CATEGORY_COLORS } from '../context/DataContext'

export function useGoals() {
  const { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal, checkInGoal } = useDataContext()
  return { goals, addGoal, updateGoal, deleteGoal, setProgress, completeGoal, checkInGoal, CATEGORY_COLORS }
}
