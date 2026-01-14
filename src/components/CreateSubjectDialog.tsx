'use client'

import type { KeyboardEventHandler } from 'react'
import { useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { CreateSubjectInput } from '@/types/subjects'
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

interface CreateSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string | null
  form: UseFormReturn<CreateSubjectInput>
  isCreating: boolean
  onSubmit: () => void
}

export function CreateSubjectDialog({
  open,
  onOpenChange,
  error,
  form,
  isCreating,
  onSubmit,
}: CreateSubjectDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const nameRegister = form.register('name', { required: 'Name is required' })

  const handleFormKeyDown: KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key !== 'Tab' || e.defaultPrevented) return
    if (typeof navigator === 'undefined' || !/firefox/i.test(navigator.userAgent)) return

    const selector =
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    const container = e.currentTarget
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })

    if (focusables.length === 0) return

    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const current = active && (active.matches(selector) ? active : active.closest<HTMLElement>(selector))
    const currentIndex = current ? focusables.indexOf(current) : -1

    e.preventDefault()
    const nextIndex = e.shiftKey
      ? currentIndex <= 0
        ? focusables.length - 1
        : currentIndex - 1
      : currentIndex === -1 || currentIndex === focusables.length - 1
        ? 0
        : currentIndex + 1

    focusables[nextIndex]?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isCreating && onOpenChange(o)}>
      <DialogContent
        className="sm:max-w-3xl"
        onOpenAutoFocus={(e) => {
          // Avoid focusing the dialog container; focus the first field.
          e.preventDefault()
          // Defer to ensure the portal content is mounted.
          requestAnimationFrame(() => nameInputRef.current?.focus())
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>Create a new subject by filling the fields below.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={onSubmit}
          onKeyDown={handleFormKeyDown}
          className="flex flex-col gap-4 mt-2 max-h-[80vh] overflow-y-auto pr-1 px-1"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="create_name">
              Name
            </label>
            <input
              id="create_name"
              className="border rounded px-2 py-1 text-sm bg-background"
              placeholder="e.g. Mario Rossi"
              {...nameRegister}
              ref={(el) => {
                nameRegister.ref(el)
                nameInputRef.current = el
              }}
              disabled={isCreating}
            />
            {form.formState.errors.name && (
              <span className="text-xs text-destructive">{form.formState.errors.name.message as string}</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="create_birthDate">
                Birth date
              </label>
              <input
                id="create_birthDate"
                type="date"
                className="border rounded px-2 py-1 text-sm bg-background w-full min-w-0"
                value={(() => {
                  const v = form.watch('birthDate')
                  if (!v) return ''
                  const d = new Date(v)
                  if (isNaN(d.getTime())) return ''
                  return d.toISOString().split('T')[0]
                })()}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    form.setValue('birthDate', '')
                  } else {
                    const d = new Date(value)
                    form.setValue('birthDate', d.toISOString())
                  }
                }}
                disabled={isCreating}
              />
              {form.formState.errors.birthDate && (
                <span className="text-xs text-destructive">{form.formState.errors.birthDate.message as string}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="create_birthTime">
                Birth time
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="create_birthTime"
                    type="time"
                    step={1}
                    className="border rounded pl-8 pr-2 py-1 text-sm bg-background w-full min-w-0"
                    value={form.watch('birthTime') ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (!value) {
                        form.setValue('birthTime', undefined)
                      } else {
                        const parts = value.split(':')
                        while (parts.length < 3) parts.push('00')
                        form.setValue('birthTime', parts.slice(0, 3).join(':'))
                      }
                    }}
                    disabled={isCreating}
                  />
                </div>
              </div>
              {form.formState.errors.birthTime && (
                <span className="text-xs text-destructive">{form.formState.errors.birthTime.message as string}</span>
              )}
            </div>
          </div>
          <SubjectLocationFields form={form} disabled={isCreating} dialogOpen={open} idPrefix="create" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Rodden Rating</label>
            <Select
              value={form.watch('rodens_rating') ?? '__none__'}
              onValueChange={(v) => form.setValue('rodens_rating', v === '__none__' ? null : (v as RodensRating))}
              disabled={isCreating}
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="create_tags">
              Tags (comma or Enter)
            </label>
            <TagsInput
              value={form.watch('tags')}
              onChange={(next) => form.setValue('tags', next)}
              disabled={isCreating}
            />
          </div>
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => !isCreating && onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
