import { useDataContext } from '../context/DataContext'

export function useHabits() {
  const { habits, addHabit, updateHabit, deleteHabit, toggleToday, isCompletedToday, getStreak, getLast7 } = useDataContext()
  return { habits, addHabit, updateHabit, deleteHabit, toggleToday, isCompletedToday, getStreak, getLast7 }
}
