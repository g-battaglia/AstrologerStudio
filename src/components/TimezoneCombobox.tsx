import * as React from 'react'
import { ChevronsUpDownIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getAllTimezones } from '@/lib/geo/timezones'
import { cn } from '@/lib/utils/cn'

interface TimezoneComboboxProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  side?: 'top' | 'bottom'
}

export function TimezoneCombobox({
  value,
  onChange,
  disabled,
  placeholder = 'Select timezone...',
  className,
  side = 'top',
}: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const zones = React.useMemo(() => getAllTimezones(), [])
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return zones.filter((z) => z.toLowerCase().includes(q))
  }, [query, zones])

  const label = value || placeholder
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [contentWidth, setContentWidth] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (!open) return
    const measure = () => setContentWidth(triggerRef.current?.offsetWidth)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between w-full hover:bg-transparent dark:hover:bg-transparent', className)}
          disabled={disabled}
          ref={triggerRef}
        >
          {label}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        avoidCollisions={false}
        className="p-0 max-h-[360px] overflow-hidden"
        style={{ width: contentWidth }}
      >
        <Command>
          <CommandInput placeholder="Search timezone..." value={query} onValueChange={setQuery} className="h-10" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <CheckIcon className={cn('mr-2 h-4 w-4', value === tz ? 'opacity-100' : 'opacity-0')} />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
