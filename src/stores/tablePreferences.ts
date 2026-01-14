import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TablePreferencesState } from '@/types/stores'

export const useTablePreferences = create<TablePreferencesState>()(
  persist(
    (set) => ({
      columnVisibility: {},
      setColumnVisibility: (tableId, visibility) =>
        set((state) => ({
          columnVisibility: { ...state.columnVisibility, [tableId]: visibility },
        })),
      resetTable: (tableId) =>
        set((state) => {
          if (!(tableId in state.columnVisibility)) return state
          const clone = { ...state.columnVisibility }
          clone[tableId] = {}
          return { columnVisibility: clone }
        }),
      resetAll: () => set({ columnVisibility: {} }),
    }),
    { name: 'table-preferences' },
  ),
)
