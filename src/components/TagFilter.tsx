'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface TagFilterProps {
  /** All unique tags from the dataset */
  allTags: string[]
  /** Currently selected tags */
  selectedTags: string[]
  /** Callback when selection changes */
  onSelectionChange: (tags: string[]) => void
}

export function TagFilter({ allTags, selectedTags, onSelectionChange }: TagFilterProps) {
  const [open, setOpen] = useState(false)

  const sortedTags = useMemo(() => [...allTags].sort((a, b) => a.localeCompare(b)), [allTags])

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectionChange(selectedTags.filter((t) => t !== tag))
    } else {
      onSelectionChange([...selectedTags, tag])
    }
  }

  if (allTags.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 border-dashed">
            <Tag className="mr-2 h-4 w-4" />
            Tags
            {selectedTags.length > 0 && (
              <>
                <span className="mx-2 h-4 w-px bg-border" />
                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                  {selectedTags.length}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selectedTags.length > 3 ? (
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal flex items-center gap-1">
                      {selectedTags.length} selected
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectionChange([])
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            onSelectionChange([])
                          }
                        }}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ) : (
                    selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-sm px-1 font-normal flex items-center gap-1"
                      >
                        {tag}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionChange(selectedTags.filter((t) => t !== tag))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              onSelectionChange(selectedTags.filter((t) => t !== tag))
                            }
                          }}
                          className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {sortedTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <CommandItem key={tag} value={tag} onSelect={() => toggleTag(tag)}>
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                          isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{tag}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
