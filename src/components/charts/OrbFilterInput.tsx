import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface OrbFilterInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  step?: number
  min?: number
  max?: number
  className?: string
}

export function OrbFilterInput({ value, onChange, step = 0.5, min = 0.1, max = 180, className }: OrbFilterInputProps) {
  return (
    <div
      className={cn(
        'relative flex items-center h-8 w-40 rounded-md border border-input bg-background shadow-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
      title="Max Orb Filter"
    >
      <span className="absolute left-2 text-sm text-muted-foreground pointer-events-none">Orb:</span>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder="Default"
        value={value === undefined ? '' : value}
        onChange={(e) => {
          const val = e.target.value
          onChange(val === '' ? undefined : Number(val))
        }}
        className="h-full flex-1 border-none bg-transparent pl-10 pr-2 py-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:font-bold placeholder:text-foreground"
      />
      {value !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mr-1 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onChange(undefined)}
          title="Reset to default"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
