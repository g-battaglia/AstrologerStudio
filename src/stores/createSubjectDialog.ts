'use client'

import { create } from 'zustand'

interface CreateSubjectDialogStore {
  open: boolean
  setOpen: (open: boolean) => void
  openDialog: () => void
  closeDialog: () => void
}

export const useCreateSubjectDialogStore = create<CreateSubjectDialogStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
}))
