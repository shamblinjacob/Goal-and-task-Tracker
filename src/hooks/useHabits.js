import { useDataContext } from '../context/DataContext'

export function useHabits() {
  const ctx = useDataContext()
  return {
    habits: ctx.habits,
    addHabit: ctx.addHabit, updateHabit: ctx.updateHabit, deleteHabit: ctx.deleteHabit,
    toggleToday: ctx.toggleToday, isCompletedToday: ctx.isCompletedToday,
    getStreak: ctx.getStreak, getLast7: ctx.getLast7,
    archiveHabit: ctx.archiveHabit, restoreHabit: ctx.restoreHabit,
  }
}
