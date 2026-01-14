'use client'

import { AlertCircle, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ChartErrorStateProps {
  title?: string
  error?: Error | string | null
  onRetry?: () => void
}

export function ChartErrorState({ title = 'Unable to load chart', error, onRetry }: ChartErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false)
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[90%] my-4 rounded-lg border border-dashed bg-muted/20">
      <div className="rounded-full bg-muted p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        We encountered an issue while retrieving the chart data. This might be due to a temporary connection issue.
      </p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2 mb-6">
          <RefreshCcw className="h-4 w-4" />
          Retry Calculation
        </Button>
      )}

      {errorMessage && (
        <div className="text-sm">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 mx-auto text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? (
              <>
                Hide Technical Details <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show Technical Details <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>

          {showDetails && (
            <div className="mt-2 text-left max-w-md mx-auto rounded bg-muted/50 p-3 font-mono text-xs overflow-x-auto border">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
