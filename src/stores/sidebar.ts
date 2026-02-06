import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarState = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  reset: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      open: true,
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      reset: () => set({ open: true }),
    }),
    { name: 'sidebar-state' },
  ),
)
