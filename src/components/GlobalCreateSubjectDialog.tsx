'use client'

import { CreateSubjectDialog } from '@/components/CreateSubjectDialog'
import { useCreateSubjectDialog } from '@/hooks/useCreateSubjectDialog'

export function GlobalCreateSubjectDialog() {
  const { open, onOpenChange, error, form, isCreating, onSubmit } = useCreateSubjectDialog()

  return (
    <CreateSubjectDialog
      open={open}
      onOpenChange={onOpenChange}
      error={error}
      form={form}
      isCreating={isCreating}
      onSubmit={onSubmit}
    />
  )
}
