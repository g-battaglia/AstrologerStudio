'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface FilterOption {
  value: string
  label: string
  icon?: string
}

interface MultiSelectFilterProps {
  title: string
  /** Short title for mobile display */
  shortTitle?: string
  options: FilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
  /** Icon component to show in compact mode */
  icon?: LucideIcon
  /** If true, shows compact icon-only on mobile */
  compact?: boolean
}

export function MultiSelectFilter({
  title,
  shortTitle,
  options,
  selected,
  onChange,
  className,
  icon: Icon,
  compact = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectAll = () => {
    onChange(options.map((o) => o.value))
  }

  const clearAll = () => {
    onChange([])
  }

  const mobileTitle = shortTitle || title
  const desktopTitle = title

  const getDisplayText = (useShort: boolean) => {
    const t = useShort ? mobileTitle : desktopTitle
    if (selected.length === 0) return `No ${t}`
    if (selected.length === options.length) return `All ${t}`
    return `${selected.length} ${t}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          title={getDisplayText(false)}
          className={cn('justify-between text-xs sm:text-sm h-8 px-2 sm:px-3', compact && Icon && 'w-auto', className)}
        >
          {compact && Icon ? (
            <>
              {/* Mobile: Icon only with count */}
              <span className="flex items-center gap-1 md:hidden">
                <Icon className="h-4 w-4" />
                <span className="font-medium tabular-nums">
                  {selected.length === options.length ? 'All' : selected.length}
                </span>
              </span>
              {/* Desktop: Full text */}
              <span className="hidden md:flex md:items-center md:gap-2">
                <Icon className="h-4 w-4" />
                <span className="truncate">{getDisplayText(false)}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </span>
            </>
          ) : (
            <>
              {/* Mobile: Short title */}
              <span className="truncate sm:hidden">{getDisplayText(true)}</span>
              {/* Desktop: Full title */}
              <span className="hidden sm:inline truncate">{getDisplayText(false)}</span>
              <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={selectAll} className="justify-start font-medium text-primary">
                Select All
              </CommandItem>
              <CommandItem onSelect={clearAll} className="justify-start font-medium text-muted-foreground">
                Clear All
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => toggleOption(option.value)}>
                  <Check
                    className={cn('mr-2 h-4 w-4', selected.includes(option.value) ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="inline-flex w-6 justify-center mr-1.5 shrink-0">{option.icon}</span>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
