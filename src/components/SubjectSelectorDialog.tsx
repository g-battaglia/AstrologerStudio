import * as React from 'react'
import { User } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useSubjects } from '@/hooks/useSubjects'
import { useDateFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate } from '@/lib/utils/date'
import { Subject } from '@/types/subjects'

interface SubjectSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (subject: Subject) => void
  title?: string
}

export function SubjectSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select a Subject',
}: SubjectSelectorDialogProps) {
  const { query } = useSubjects()
  const subjects = query.data || []
  const dateFormat = useDateFormat()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <CommandInput
          placeholder="Search subjects..."
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList>
        <CommandEmpty>No subject found.</CommandEmpty>
        <CommandGroup heading={title}>
          {subjects.map((subject) => (
            <CommandItem
              key={subject.id}
              value={subject.name}
              onSelect={() => {
                onSelect(subject)
                onOpenChange(false)
              }}
            >
              <User className="mr-2 h-4 w-4 opacity-50" />
              <span>{subject.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {subject.birth_datetime ? formatDisplayDate(subject.birth_datetime, dateFormat) : ''}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
