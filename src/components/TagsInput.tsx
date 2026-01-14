import { useCallback, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

export interface TagsInputProps {
  value: string[] | null | undefined
  onChange: (next: string[] | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  maxTags?: number
}

export function TagsInput({
  value,
  onChange,
  disabled,
  placeholder = 'e.g. musician, actor',
  className,
  maxTags = 10,
}: TagsInputProps) {
  const tags = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const [inputValue, setInputValue] = useState('')

  const commitToken = useCallback(
    (token: string) => {
      const t = token.trim()
      if (!t) return
      const seen = new Set(tags)
      if (seen.has(t)) return
      const next = tags.slice(0, maxTags)
      if (next.length >= maxTags) return
      next.push(t)
      onChange(next.length ? next : null)
    },
    [tags, maxTags, onChange],
  )

  const removeAt = (idx: number) => {
    const next = tags.filter((_, i) => i !== idx)
    onChange(next.length ? next : null)
  }

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const val = e.target.value
    // If input contains comma, split and commit all but the last part
    if (val.includes(',')) {
      const parts = val.split(',')
      // Commit all parts except the last one (which might be empty or still being typed)
      for (let i = 0; i < parts.length - 1; i++) {
        commitToken(parts[i]!)
      }
      // Keep the last part in the input
      setInputValue(parts[parts.length - 1] || '')
    } else {
      setInputValue(val)
    }
  }

  const commitFromBuffer = () => {
    const parts = inputValue.split(',')
    for (const p of parts) commitToken(p)
    setInputValue('')
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && inputValue.trim() !== '')) {
      e.preventDefault()
      commitFromBuffer()
      return
    }
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault()
      removeAt(tags.length - 1)
    }
  }

  const onBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    if (inputValue.trim() !== '') {
      commitFromBuffer()
    }
  }

  return (
    <div
      className={cn(
        'border rounded px-2 py-1 bg-background outline-none',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((t, i) => (
          <Badge key={`${t}-${i}`} variant="secondary" className="flex items-center gap-1">
            <span>{t}</span>
            <button
              type="button"
              aria-label={`Remove ${t}`}
              className="-mr-0.5 inline-flex items-center justify-center rounded hover:bg-secondary-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring/40"
              onClick={() => removeAt(i)}
              disabled={disabled}
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          type="text"
          className="flex-1 min-w-24 bg-transparent outline-none text-sm py-1"
          value={inputValue}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled || tags.length >= maxTags}
        />
      </div>
    </div>
  )
}
