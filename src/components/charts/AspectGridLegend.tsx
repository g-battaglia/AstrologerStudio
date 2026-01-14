import React from 'react'
import { cn } from '@/lib/utils/cn'

interface AspectGridLegendProps {
  rowLabel: string
  colLabel: string
  className?: string
}

export function AspectGridLegend({ rowLabel, colLabel, className }: AspectGridLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground px-2 mb-2',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium truncate max-w-[120px]">{rowLabel}</span>
        {/* Down Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3 opacity-70"
        >
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </div>
      <div className="text-muted-foreground/30 font-light">|</div>
      <div className="flex items-center gap-1.5">
        <span className="font-medium truncate max-w-[120px]">{colLabel}</span>
        {/* Right Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3 opacity-70"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
