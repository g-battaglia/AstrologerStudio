// Frequently reused UI component prop types
// Keep runtime-free (types only)

import type { Subject } from './subjects'

export interface DeleteSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: Subject | null
  error: string | null
  isDeleting: boolean
  onConfirm: () => void
}

export interface EditSubjectDialogProps<FormType> {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: Subject | null
  error: string | null
  form: FormType
  isUpdating: boolean
  onSubmit: () => void
}

export interface ColumnActionsProps {
  openEditDialog: (subject: Subject) => void
  openDeleteDialog: (subject: Subject) => void
}
