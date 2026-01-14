import type { DeleteSubjectDialogProps } from '@/types/ui'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export function DeleteSubjectDialog({
  open,
  onOpenChange,
  subject,
  error,
  isDeleting,
  onConfirm,
}: DeleteSubjectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !isDeleting && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete subject?</AlertDialogTitle>
          <AlertDialogDescription>
            {subject ? (
              <span>
                Are you sure you want to delete <strong>{subject.name}</strong>? This action cannot be undone.
              </span>
            ) : (
              'No subject selected.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!subject || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
