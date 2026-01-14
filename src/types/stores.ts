// Store-related types used by zustand stores

export interface TablePreferencesState {
  columnVisibility: Record<string, Record<string, boolean>>
  setColumnVisibility: (tableId: string, visibility: Record<string, boolean>) => void
  resetTable: (tableId: string) => void
  resetAll: () => void
}

export interface BearState {
  bears: number
  increase: (by: number) => void
}
