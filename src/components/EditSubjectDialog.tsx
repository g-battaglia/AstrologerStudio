'use client'

import { useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { UpdateSubjectFormInput, UpdateSubjectInput } from '@/types/subjects'
import type { EditSubjectDialogProps } from '@/types/ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Clock } from 'lucide-react'
import { RODEN_RATING_MAP, type RodensRating } from '@/types/schemas'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagsInput } from '@/components/TagsInput'
import { SubjectLocationFields } from '@/components/SubjectLocationFields'
import { useFirefoxTabHandler } from '@/hooks/useFirefoxTabHandler'
import { formatDateForInput, parseDateInput, normalizeTimeValue } from '@/lib/utils/date'

/**
 * Dialog component for editing an existing subject's details.
 *
 * Features:
 * - Name, birth date/time, location, Rodden rating, and tags fields
 * - Location autocomplete via SubjectLocationFields
 * - Firefox keyboard navigation fix via useFirefoxTabHandler
 *
 * @param props - Dialog props including form instance and handlers
 */
export function EditSubjectDialog({
  open,
  onOpenChange,
  subject,
  error,
  form,
  isUpdating,
  onSubmit,
}: EditSubjectDialogProps<UseFormReturn<UpdateSubjectFormInput, unknown, UpdateSubjectInput>>) {
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const nameRegister = form.register('name', { required: 'Name is required' })
  const handleFormKeyDown = useFirefoxTabHandler()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isUpdating && onOpenChange(o)}>
      <DialogContent
        className="sm:max-w-3xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          requestAnimationFrame(() => nameInputRef.current?.focus())
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>
            {subject ? (
              <span>
                Edit fields for subject <strong>{subject.name}</strong>.
              </span>
            ) : (
              'No subject selected.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          onKeyDown={handleFormKeyDown}
          className="flex flex-col gap-4 mt-2 max-h-[80vh] overflow-y-auto pr-1 px-1"
        >
          <input type="hidden" {...form.register('id')} />

          {/* Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="edit_username">
              Name, Nickname, or Initials
            </label>
            <input
              id="edit_username"
              className="border rounded px-2 py-1 text-sm bg-background"
              placeholder="e.g. M.R. or Client A (privacy-friendly)"
              {...nameRegister}
              ref={(el) => {
                nameRegister.ref(el)
                nameInputRef.current = el
              }}
              disabled={isUpdating}
            />
            {form.formState.errors.name && (
              <span className="text-xs text-destructive">{form.formState.errors.name.message as string}</span>
            )}
          </div>

          {/* Birth Date & Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="edit_birthDate">
                Birth date
              </label>
              <input
                id="edit_birthDate"
                type="date"
                className="border rounded px-2 py-1 text-sm bg-background w-full min-w-0"
                value={formatDateForInput(form.watch('birthDate'))}
                onChange={(e) => form.setValue('birthDate', parseDateInput(e.target.value))}
                disabled={isUpdating}
              />
              {form.formState.errors.birthDate && (
                <span className="text-xs text-destructive">{form.formState.errors.birthDate.message as string}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="edit_birthTime">
                Birth time
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="edit_birthTime"
                    type="time"
                    step={1}
                    className="border rounded pl-8 pr-2 py-1 text-sm bg-background w-full min-w-0"
                    value={form.watch('birthTime') || ''}
                    onChange={(e) => form.setValue('birthTime', normalizeTimeValue(e.target.value))}
                    disabled={isUpdating}
                  />
                </div>
              </div>
              {form.formState.errors.birthTime && (
                <span className="text-xs text-destructive">{form.formState.errors.birthTime.message as string}</span>
              )}
            </div>
          </div>

          {/* Location Fields */}
          <SubjectLocationFields form={form} disabled={isUpdating} dialogOpen={open} idPrefix="edit" />

          {/* Rodden Rating */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Rodden Rating</label>
            <Select
              value={form.watch('rodens_rating') ?? '__none__'}
              onValueChange={(v) => form.setValue('rodens_rating', v === '__none__' ? null : (v as RodensRating))}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent className="w-[--radix-select-trigger-width] max-h-60 overflow-y-auto">
                <SelectItem value="__none__">— None —</SelectItem>
                {Object.keys(RODEN_RATING_MAP).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k} — {RODEN_RATING_MAP[k as keyof typeof RODEN_RATING_MAP]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="edit_tags">
              Tags (comma or Enter)
            </label>
            <TagsInput
              value={form.watch('tags')}
              onChange={(next) => form.setValue('tags', next)}
              disabled={isUpdating}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
              {error}
            </div>
          )}

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => !isUpdating && onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
